#!/usr/bin/env node

/**
 * AGENT 2 - PLAN AGENT
 * Converts research output into detailed implementation plan
 * Input: agents/outputs/research-output-*.json
 * Output: agents/outputs/implementation-plan-{date}.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { v4: uuidv4 } = require('crypto').randomUUID || (() => {
  // Fallback for older Node versions
  const crypto = require('crypto');
  return () => crypto.randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
})();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '../agents/outputs');
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function callGroqAPI(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    // Sanitize inputs to ensure proper JSON encoding
    const sanitizedSystemPrompt = String(systemPrompt).trim();
    const sanitizedUserMessage = String(userMessage).trim();
    
    const payload = {
      model: 'llama-3.1-70b-versatile',
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
            return reject(new Error(`Invalid API response: No choices returned. Response: ${JSON.stringify(response)}`.substring(0, 500)));
          }
          
          resolve(response.choices[0].message.content);
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}. Body: ${body.substring(0, 500)}...`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getLatestResearchFile() {
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('research-output-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No research output found. Run Agent 1 first!');
  }
  
  return path.join(OUTPUT_DIR, files[0]);
}

function getPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  return pkg.version;
}

function bumpMinorVersion(version) {
  const parts = version.split('.');
  parts[1] = String(parseInt(parts[1]) + 1);
  parts[2] = '0';
  return parts.join('.');
}

function getWeekNumber() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now - firstDay) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
}

async function runPlanningAgent() {
  try {
    console.log('📋 AGENT 2: PLANNING - Starting...\n');

    // Read system prompt
    const systemPrompt = fs.readFileSync(
      path.join(__dirname, '../agents/prompts/agent-2-plan.md'),
      'utf-8'
    );

    // Read latest research output
    const researchFile = getLatestResearchFile();
    console.log(`📂 Reading research output from: ${path.basename(researchFile)}`);
    
    const researchData = JSON.parse(fs.readFileSync(researchFile, 'utf-8'));

    // Get current version
    const currentVersion = getPackageVersion();
    const newVersion = bumpMinorVersion(currentVersion);
    const weekNumber = getWeekNumber();

    const userMessage = `
Here is the research output from Agent 1:

${JSON.stringify(researchData, null, 2)}

Current yantraverse version: ${currentVersion}
New version should be: ${newVersion}
Week number: ${weekNumber}

Using the detailed planning prompt above, generate a comprehensive implementation plan.
Select the top 3 features, provide complete technical specifications, file changes, 
implementation steps, tests, and documentation.

Return ONLY valid JSON in the exact format specified. No markdown.
    `;

    console.log('🧠 Calling Groq API for planning...');
    const planOutput = await callGroqAPI(systemPrompt, userMessage);

    // Parse and validate JSON
    const planData = JSON.parse(planOutput);

    // Add metadata
    planData.plan_id = planData.plan_id || uuidv4();
    planData.plan_date = planData.plan_date || new Date().toISOString();
    planData.week_number = weekNumber;
    planData.yantraverse_current_version = currentVersion;
    planData.yantraverse_new_version = newVersion;

    // Save output
    const timestamp = new Date().toISOString().split('T')[0];
    const outputFile = path.join(OUTPUT_DIR, `implementation-plan-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify(planData, null, 2));

    console.log('\n✅ Planning complete!');
    console.log(`📁 Output saved to: ${outputFile}`);
    console.log(`\n📊 Plan Summary:`);
    console.log(`   Features to implement: ${planData.features_to_implement?.length || 0}`);
    console.log(`   Version bump: ${currentVersion} → ${newVersion}`);
    console.log(`   Estimated LOC: ${planData.total_estimated_loc || 'N/A'}`);
    console.log(`   Implementation order: ${planData.implementation_order?.join(' → ') || 'N/A'}`);
    
    if (planData.features_to_implement && planData.features_to_implement.length > 0) {
      console.log(`\n🎯 Top 3 Features:`);
      planData.features_to_implement.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.name} (${f.estimated_loc} LOC)`);
      });
    }

  } catch (error) {
    console.error('❌ Agent 2 Error:', error.message);
    process.exit(1);
  }
}

// Check for API key
if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not set. Add to GitHub Secrets or .env file');
  process.exit(1);
}

runPlanningAgent();
