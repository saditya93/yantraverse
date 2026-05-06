#!/usr/bin/env node

/**
 * AGENT 3 - CODE GENERATION AGENT
 * Generates production-ready code from implementation plan
 * Input: agents/outputs/implementation-plan-*.json
 * Output: agents/outputs/code-changes-{date}.json
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
      max_tokens: 16000,
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

function getLatestPlanFile() {
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('implementation-plan-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No implementation plan found. Run Agent 2 first!');
  }
  
  return path.join(OUTPUT_DIR, files[0]);
}

async function runCodeAgent() {
  try {
    console.log('💻 AGENT 3: CODE GENERATION - Starting...\n');

    // Read system prompt
    const systemPrompt = fs.readFileSync(
      path.join(__dirname, '../agents/prompts/agent-3-code.md'),
      'utf-8'
    );

    // Read latest implementation plan
    const planFile = getLatestPlanFile();
    console.log(`📂 Reading implementation plan from: ${path.basename(planFile)}`);
    
    const planData = JSON.parse(fs.readFileSync(planFile, 'utf-8'));

    const userMessage = `
Here is the implementation plan from Agent 2:

${JSON.stringify(planData, null, 2)}

Using the detailed code generation prompt above, write complete, production-ready code for all 3 features.

For each feature:
1. Write complete code for each file (create or modify)
2. Write comprehensive tests using node:test
3. Write runnable examples in examples/
4. Provide exact index.js export additions
5. Specify any package.json changes

Return ONLY valid JSON in the exact format specified. No markdown.
Include full file contents - do not use placeholders or "..."

Important:
- ZERO external dependencies (Node.js built-ins only)
- Support Node.js 18+
- All code production-ready
- Complete edge case handling
- JSDoc on all public APIs
- 100% test coverage for new features
    `;

    console.log('🧠 Calling Groq API for code generation...');
    const codeOutput = await callGroqAPI(systemPrompt, userMessage);

    // Parse and validate JSON
    const codeData = JSON.parse(codeOutput);

    // Add metadata
    codeData.generated_timestamp = new Date().toISOString();
    codeData.plan_id = planData.plan_id;
    codeData.plan_date = planData.plan_date;
    codeData.yantraverse_version = planData.yantraverse_new_version;

    // Save output
    const timestamp = new Date().toISOString().split('T')[0];
    const outputFile = path.join(OUTPUT_DIR, `code-changes-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify(codeData, null, 2));

    console.log('\n✅ Code generation complete!');
    console.log(`📁 Output saved to: ${outputFile}`);
    console.log(`\n📊 Code Summary:`);
    
    if (codeData.code_output) {
      console.log(`   Features implemented: ${codeData.code_output.length}`);
      codeData.code_output.forEach((feature, i) => {
        console.log(`   ${i + 1}. ${feature.feature_name || feature.feature_id}`);
        if (feature.files) {
          console.log(`      Files: ${feature.files.length} (${feature.files.map(f => f.action).join(', ')})`);
        }
      });
    }
    
    if (codeData.implementation_summary) {
      console.log(`\n📈 Implementation Stats:`);
      console.log(`   Total files created: ${codeData.implementation_summary.total_files_created || 0}`);
      console.log(`   Total files modified: ${codeData.implementation_summary.total_files_modified || 0}`);
      console.log(`   Estimated LOC: ${codeData.implementation_summary.total_lines_of_code || 0}`);
      console.log(`   Tests written: ${codeData.implementation_summary.tests_written || 0}`);
    }

  } catch (error) {
    console.error('❌ Agent 3 Error:', error.message);
    process.exit(1);
  }
}

// Check for API key
if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not set. Add to GitHub Secrets or .env file');
  process.exit(1);
}

runCodeAgent();
