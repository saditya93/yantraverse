#!/usr/bin/env node

/**
 * AGENT 1 - RESEARCH AGENT
 * Searches and analyzes top Node.js frameworks
 * Outputs: research-output-{date}.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '../agents/outputs');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Check for required environment variables
if (!GROQ_API_KEY) {
  console.error('❌ FATAL: GROQ_API_KEY environment variable is not set');
  console.error('\n📋 Setup Instructions:');
  console.error('1. Get API key from: https://console.groq.com/keys');
  console.error('2. Add to GitHub Secrets: Settings → Secrets and variables → Actions');
  console.error('3. Create new secret named: GROQ_API_KEY');
  console.error('4. Re-run the workflow');
  process.exit(1);
}

// Extract JSON from markdown code fences if present
function extractJSON(text) {
  // Match ```json ... ``` or ``` ... ```
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
}

async function callGroqAPI(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    // Sanitize inputs to ensure proper JSON encoding
    const sanitizedSystemPrompt = String(systemPrompt).trim();
    const sanitizedUserMessage = String(userMessage).trim();
    
    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: sanitizedSystemPrompt },
        { role: 'user', content: sanitizedUserMessage }
      ],
      max_tokens: 8000,
      temperature: 0.7
    };
    
    let data;
    try {
      data = JSON.stringify(payload);
    } catch (e) {
      return reject(new Error(`Failed to stringify JSON payload: ${e.message}`));
    }

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data, 'utf8'),
        'Authorization': `Bearer ${GROQ_API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Check HTTP status
        if (res.statusCode !== 200) {
          return reject(new Error(`Groq API HTTP ${res.statusCode}: ${body}`));
        }
        
        try {
          const response = JSON.parse(body);
          
          // Check for API errors
          if (response.error) {
            return reject(new Error(`Groq API Error: ${response.error.message}`));
          }
          
          // Check for empty choices
          if (!response.choices || !response.choices[0]) {
            return reject(new Error(`Invalid API response: No choices returned. Response: ${JSON.stringify(response)}`));
          }
          
          // Extract JSON from markdown if needed, then return
          const content = response.choices[0].message.content;
          const jsonContent = extractJSON(content);
          resolve(jsonContent);
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}. Body: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runResearchAgent() {
  try {
    console.log('🔍 AGENT 1: RESEARCH - Starting...\n');

    const systemPrompt = fs.readFileSync(
      path.join(__dirname, '../agents/prompts/agent-1-research.md'),
      'utf-8'
    );

    const userMessage = `
      Using the detailed prompt above, search and analyze the top 7 Node.js frameworks.
      Provide comprehensive research output in the exact JSON format specified.
      Return ONLY valid JSON, no markdown.
    `;

    console.log('📡 Calling Groq API...');
    const research = await callGroqAPI(systemPrompt, userMessage);

    // Parse and validate JSON
    const researchData = JSON.parse(research);

    // Save output
    const timestamp = new Date().toISOString().split('T')[0];
    const outputFile = path.join(OUTPUT_DIR, `research-output-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify(researchData, null, 2));

    console.log('\n✅ Research complete!');
    console.log(`📁 Output saved to: ${outputFile}`);
    console.log(`\n📊 Analyzed ${researchData.frameworks_analyzed.length} frameworks`);
    console.log(`🎯 Found ${researchData.gap_analysis.completely_missing_features?.length || 0} completely missing features`);
    console.log(`⭐ Top recommendation: ${researchData.recommended_features_for_yantraverse[0]?.feature_name}`);

  } catch (error) {
    console.error('❌ Agent 1 Error:', error.message);
    process.exit(1);
  }
}

// Check for API key
if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not set. Add to GitHub Secrets or .env file');
  process.exit(1);
}

runResearchAgent();
