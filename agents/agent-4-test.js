#!/usr/bin/env node

/**
 * AGENT 4 - TEST & FIX AGENT
 * Runs tests, finds bugs, and fixes all errors
 * Input: agents/outputs/code-changes-*.json
 * Output: agents/outputs/test-report-{date}.json
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
      max_tokens: 16000,
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

function getLatestCodeChangesFile() {
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('code-changes-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No code changes found. Run Agent 3 first!');
  }
  
  return path.join(OUTPUT_DIR, files[0]);
}

async function runTestAgent() {
  try {
    console.log('🧪 AGENT 4: TEST & FIX - Starting...\n');

    // Read system prompt
    const systemPrompt = fs.readFileSync(
      path.join(__dirname, '../agents/prompts/agent-4-test.md'),
      'utf-8'
    );

    // Read latest code changes
    const codeFile = getLatestCodeChangesFile();
    console.log(`📂 Reading code changes from: ${path.basename(codeFile)}`);
    
    const codeData = JSON.parse(fs.readFileSync(codeFile, 'utf-8'));

    const userMessage = `
Here is the code output from Agent 3:

${JSON.stringify(codeData, null, 2)}

Using the detailed test & fix prompt above, perform comprehensive analysis and QA:

1. Analyze all provided code for potential bugs and issues
2. Identify type errors, logic errors, async issues, edge cases
3. Generate fixes for any identified issues
4. Create test cases that prove bugs existed and fixes work
5. Verify all 3 features work together
6. Run the full verification checklist
7. Determine if the code is ready for README update and publishing

Return ONLY valid JSON in the exact format specified. No markdown.

Be thorough - check for:
- Type safety and null checks
- Async/await correctness
- Memory leaks and event listener cleanup
- Circular requires
- Proper error handling
- Edge cases and boundary conditions
- Node 18+ compatibility
- Integration between the 3 features
    `;

    console.log('🧠 Calling Groq API for testing and analysis...');
    const testOutput = await callGroqAPI(systemPrompt, userMessage);

    // Parse and validate JSON
    const testData = JSON.parse(testOutput);

    // Add metadata
    testData.generated_timestamp = new Date().toISOString();
    testData.code_output_id = codeData.generated_timestamp;
    testData.yantraverse_version = codeData.yantraverse_version;

    // Save output
    const timestamp = new Date().toISOString().split('T')[0];
    const outputFile = path.join(OUTPUT_DIR, `test-report-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify(testData, null, 2));

    console.log('\n✅ Test & fix analysis complete!');
    console.log(`📁 Output saved to: ${outputFile}`);
    console.log(`\n📊 Test Summary:`);
    
    if (testData.test_summary) {
      console.log(`   Total tests: ${testData.test_summary.total_tests || 0}`);
      console.log(`   Passed: ${testData.test_summary.passed || 0}`);
      console.log(`   Failed: ${testData.test_summary.failed || 0}`);
    }
    
    console.log(`\n🐛 Bug Analysis:`);
    console.log(`   Bugs found: ${testData.total_bugs_found || 0}`);
    console.log(`   Bugs fixed: ${testData.total_bugs_fixed || 0}`);
    
    if (testData.summary?.bugs_by_severity) {
      console.log(`   Severity breakdown:`);
      console.log(`     Critical: ${testData.summary.bugs_by_severity.critical || 0}`);
      console.log(`     High: ${testData.summary.bugs_by_severity.high || 0}`);
      console.log(`     Medium: ${testData.summary.bugs_by_severity.medium || 0}`);
      console.log(`     Low: ${testData.summary.bugs_by_severity.low || 0}`);
    }
    
    console.log(`\n✨ Quality Metrics:`);
    console.log(`   Code quality score: ${testData.summary?.code_quality_score || 'N/A'}/100`);
    console.log(`   Test coverage: ${testData.summary?.test_coverage_percent || 'N/A'}%`);
    console.log(`   All tests passing: ${testData.all_tests_passing ? '✅ YES' : '❌ NO'}`);
    
    console.log(`\n🚀 Publication Status:`);
    console.log(`   Ready for README update: ${testData.ready_for_readme_update ? '✅ YES' : '❌ NO'}`);
    console.log(`   Ready to publish: ${testData.ready_to_publish ? '✅ YES' : '❌ NO'}`);
    
    if (testData.publish_blockers && testData.publish_blockers.length > 0) {
      console.log(`   Blockers (${testData.publish_blockers.length}):`);
      testData.publish_blockers.forEach(blocker => {
        console.log(`     ❌ ${blocker}`);
      });
    }

  } catch (error) {
    console.error('❌ Agent 4 Error:', error.message);
    process.exit(1);
  }
}

// Check for API key
if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not set. Add to GitHub Secrets or .env file');
  process.exit(1);
}

runTestAgent();
