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

async function callGroqAPI(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'mixtral-8x7b-32768',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 8000,
      temperature: 0.7
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${GROQ_API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response.choices[0].message.content);
        } catch (e) {
          reject(e);
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
