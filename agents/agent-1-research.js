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
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS || 1800);

const COMPACT_RESEARCH_PROMPT = `
You are a concise Node.js framework research agent.
Return strict JSON only. Keep the output small for the next planning agent.

Rules:
- Analyze only summary signals.
- Do not include long quotes, source links, benchmark tables, or exhaustive feature matrices.
- Keep every string under 180 characters.
- Include at most 5 frameworks.
- Include at most 3 complaints and 3 limitations per framework.
- Include at most 5 items in each gap section.
- Include exactly 3 recommended features for Yantravese.
- Prefer low/medium complexity, zero-dependency features.

Output shape:
{
  "research_date": "ISO date",
  "frameworks_analyzed": [
    {
      "name": "string",
      "version": "string",
      "github_stars": number,
      "weekly_downloads": number,
      "features": {
        "routing_score": number,
        "middleware_score": number,
        "typescript_score": number,
        "validation_built_in": boolean,
        "websocket_built_in": boolean,
        "openapi_built_in": boolean,
        "ai_features_score": number,
        "dx_score": number
      },
      "top_complaints": ["short item"],
      "limitations": ["short item"]
    }
  ],
  "gap_analysis": {
    "completely_missing_features": ["short item"],
    "partially_implemented_features": ["short item"],
    "ai_era_features": ["short item"],
    "workflow_gaps": ["short item"]
  },
  "recommended_features_for_yantraverse": [
    {
      "priority": 1,
      "feature_name": "string",
      "reason": "string",
      "competitive_advantage": "string",
      "estimated_loc": number
    }
  ]
}
`;

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
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: sanitizedSystemPrompt },
        { role: 'user', content: sanitizedUserMessage }
      ],
      max_tokens: GROQ_MAX_TOKENS,
      temperature: 0.2
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

function shortText(value, maxLength = 180) {
  if (value == null) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function compactList(value, maxItems, maxLength = 180) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(item => {
    if (typeof item === 'string') return shortText(item, maxLength);
    if (item && typeof item === 'object') {
      return shortText(item.feature || item.name || item.description || JSON.stringify(item), maxLength);
    }
    return shortText(item, maxLength);
  });
}

function compactResearchData(researchData) {
  return {
    research_date: researchData.research_date || new Date().toISOString(),
    frameworks_analyzed: (researchData.frameworks_analyzed || []).slice(0, 5).map(framework => ({
      name: shortText(framework.name, 60),
      version: shortText(framework.version, 40),
      github_stars: Number(framework.github_stars || 0),
      weekly_downloads: Number(framework.weekly_downloads || 0),
      features: {
        routing_score: Number(framework.features?.routing_score ?? framework.features?.routing?.score ?? 0),
        middleware_score: Number(framework.features?.middleware_score ?? framework.features?.middleware?.score ?? 0),
        typescript_score: Number(framework.features?.typescript_score ?? framework.features?.typescript?.score ?? 0),
        validation_built_in: Boolean(framework.features?.validation_built_in ?? false),
        websocket_built_in: Boolean(framework.features?.websocket_built_in ?? framework.features?.websocket?.built_in ?? false),
        openapi_built_in: Boolean(framework.features?.openapi_built_in ?? framework.features?.openapi?.built_in ?? false),
        ai_features_score: Number(framework.features?.ai_features_score ?? framework.features?.ai_features?.score ?? 0),
        dx_score: Number(framework.features?.dx_score ?? 0)
      },
      top_complaints: compactList(framework.top_complaints, 3),
      limitations: compactList(framework.limitations, 3)
    })),
    gap_analysis: {
      completely_missing_features: compactList(researchData.gap_analysis?.completely_missing_features, 5),
      partially_implemented_features: compactList(researchData.gap_analysis?.partially_implemented_features, 5),
      ai_era_features: compactList(researchData.gap_analysis?.ai_era_features, 5),
      workflow_gaps: compactList(researchData.gap_analysis?.workflow_gaps, 5)
    },
    recommended_features_for_yantraverse: (researchData.recommended_features_for_yantraverse || []).slice(0, 3).map((feature, index) => ({
      priority: Number(feature.priority || index + 1),
      feature_name: shortText(feature.feature_name, 80),
      reason: shortText(feature.reason),
      competitive_advantage: shortText(feature.competitive_advantage),
      estimated_loc: Number(feature.estimated_loc || 120)
    }))
  };
}

async function runResearchAgent() {
  try {
    console.log('🔍 AGENT 1: RESEARCH - Starting...\n');

    const systemPrompt = COMPACT_RESEARCH_PROMPT;

    const userMessage = `
      Analyze Express, Fastify, Hono, Elysia, and Koa only.
      Keep the research compact. Do not produce large JSON.
      Return ONLY valid JSON, no markdown.
    `;

    console.log('📡 Calling Groq API...');
    const research = await callGroqAPI(systemPrompt, userMessage);

    // Parse and validate JSON
    const researchData = compactResearchData(JSON.parse(research));

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
