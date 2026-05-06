#!/usr/bin/env node

/**
 * AGENT 6 - PUBLISH AGENT
 * Publishes to npm and creates GitHub release
 * ONLY RUNS ON MONDAY
 * Input: All previous outputs + confirmation
 * Output: agents/outputs/publish-log-{date}.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const NPM_TOKEN = process.env.NPM_TOKEN;
const OUTPUT_DIR = path.join(__dirname, 'outputs');
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Check for required environment variables
if (!GROQ_API_KEY || !NPM_TOKEN) {
  console.error('❌ FATAL: Missing required environment variables');
  if (!GROQ_API_KEY) {
    console.error('   - GROQ_API_KEY is not set');
  }
  if (!NPM_TOKEN) {
    console.error('   - NPM_TOKEN is not set');
  }
  console.error('\n📋 Setup Instructions:');
  console.error('1. See GITHUB_SECRETS_SETUP.md');
  console.error('2. Add secrets to GitHub: Settings → Secrets and variables → Actions');
  console.error('3. Secrets needed: GROQ_API_KEY, NPM_TOKEN');
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

function isMonday() {
  // Check UTC day
  const now = new Date();
  const utcDay = now.getUTCDay();
  return utcDay === 1; // 0 = Sunday, 1 = Monday
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
      temperature: 0.3
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
          
          // Extract JSON from markdown if needed, then return
          const content = response.choices[0].message.content;
          const jsonContent = extractJSON(content);
          resolve(jsonContent);
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

function getLatestFile(prefix) {
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error(`No ${prefix} file found. Run previous agents first!`);
  }
  
  return path.join(OUTPUT_DIR, files[0]);
}

function validateJSON(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${e.message}`);
  }
}

async function runPublishAgent() {
  try {
    console.log('🚀 AGENT 6: PUBLISH - Starting...\n');

    // STEP 1: Day check
    const today = new Date();
    const utcDay = today.getUTCDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][utcDay];
    
    console.log(`📅 Day Check: ${dayName} (UTC)`);
    
    if (!isMonday() && process.env.FORCE_PUBLISH !== 'true') {
      console.log('\n⏭️  Agent 6 only runs on Mondays.');
      console.log('To force publish on other days: FORCE_PUBLISH=true npm run agents:publish\n');
      
      const output = {
        publish_approved: false,
        abort_reason: 'Not Monday',
        day_check_passed: false,
        new_version: null,
        commit_message: null,
        git_commands: [],
        npm_commands: [],
        files_to_write_before_commit: [],
        post_publish_checks: [],
        rollback_commands: [],
        github_release: null
      };
      
      const timestamp = new Date().toISOString().split('T')[0];
      const outputFile = path.join(OUTPUT_DIR, `publish-log-${timestamp}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
      
      console.log(`📁 Output: ${outputFile}`);
      process.exit(0);
    }

    console.log('✅ Monday check PASSED\n');

    // Read system prompt
    console.log('📖 Reading publish prompt...');
    const systemPrompt = fs.readFileSync(
      path.join(__dirname, 'prompts/agent-6-publish.md'),
      'utf-8'
    );

    // Read test report
    console.log('📂 Reading test report...');
    const testReportFile = getLatestFile('test-report-');
    const testReport = JSON.parse(fs.readFileSync(testReportFile, 'utf-8'));
    console.log(`   File: ${path.basename(testReportFile)}`);

    // Read readme update
    console.log('📂 Reading README update...');
    const readmeFile = getLatestFile('readme-update-');
    const readmeData = JSON.parse(fs.readFileSync(readmeFile, 'utf-8'));
    console.log(`   File: ${path.basename(readmeFile)}\n`);

    // Read current package.json
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    const currentVersion = pkg.version;

    // Build verification message
    const verificationChecks = {
      'Agent 4: ready_to_publish': testReport.ready_to_publish,
      'Agent 4: publish_blockers empty': Array.isArray(testReport.publish_blockers) && testReport.publish_blockers.length === 0,
      'Agent 4: all_tests_passing': testReport.all_tests_passing,
      'Agent 4: verification_checklist all true': testReport.verification_checklist && Object.values(testReport.verification_checklist).every(v => v === true),
      'Agent 5: readme_ready': readmeData.readme_ready,
      'Agent 5: quality_checklist all true': readmeData.quality_checklist && Object.values(readmeData.quality_checklist).every(v => v === true)
    };

    console.log('🔍 PRE-PUBLISH VERIFICATION:');
    let allChecksPassed = true;
    for (const [check, passed] of Object.entries(verificationChecks)) {
      const status = passed ? '✅' : '❌';
      console.log(`   ${status} ${check}`);
      if (!passed) allChecksPassed = false;
    }
    console.log('');

    if (!allChecksPassed) {
      console.error('❌ Some verification checks FAILED. Cannot publish.');
      
      const output = {
        publish_approved: false,
        abort_reason: 'Pre-publish verification failed',
        day_check_passed: true,
        new_version: readmeData.version_updated_to,
        commit_message: null,
        git_commands: [],
        npm_commands: [],
        files_to_write_before_commit: [],
        post_publish_checks: [],
        rollback_commands: [],
        github_release: null
      };
      
      const timestamp = new Date().toISOString().split('T')[0];
      const outputFile = path.join(OUTPUT_DIR, `publish-log-${timestamp}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
      
      process.exit(1);
    }

    console.log('✅ All verification checks PASSED\n');

    // Build user message with all context
    const userMessage = `
PUBLISH REQUEST FOR YANTRAVERSE

Current Version: ${currentVersion}
New Version: ${readmeData.version_updated_to}
Release Date: ${today.toISOString().split('T')[0]}

=== AGENT 4 TEST REPORT ===
Ready to Publish: ${testReport.ready_to_publish}
All Tests Passing: ${testReport.all_tests_passing}
Test Coverage: ${testReport.summary?.test_coverage_percent || 'N/A'}%
Bugs Fixed: ${testReport.bugs_fixed?.length || 0}

=== AGENT 5 README UPDATE ===
README Ready: ${readmeData.readme_ready}
Version Updated To: ${readmeData.version_updated_to}
Features Added: ${readmeData.features_added?.length || 0}

Version in package.json should be updated from ${currentVersion} to ${readmeData.version_updated_to}.

Using the detailed publish prompt above, generate the complete publish plan including:
1. Day check confirmation
2. Pre-publish verification summary
3. Files to write (README.md, CHANGELOG.md, package.json)
4. Git commands (in exact order)
5. npm publish command
6. GitHub release information
7. Post-publish verification commands
8. Rollback procedures if needed

Return ONLY valid JSON in the exact format specified. No markdown, no code blocks.
    `;

    console.log('🧠 Calling Groq API for publish planning...\n');
    const publishPlanStr = await callGroqAPI(systemPrompt, userMessage);

    // Parse JSON response
    let publishPlan;
    try {
      publishPlan = validateJSON(publishPlanStr);
    } catch (e) {
      console.error('❌ Failed to parse Groq response as JSON');
      console.error('Response:', publishPlanStr.substring(0, 200));
      throw e;
    }

    // Add metadata
    publishPlan.generated_timestamp = new Date().toISOString();
    publishPlan.agent_4_input_timestamp = testReport.generated_timestamp;
    publishPlan.agent_5_input_timestamp = readmeData.generated_timestamp;

    // Save output
    const timestamp = new Date().toISOString().split('T')[0];
    const outputFile = path.join(OUTPUT_DIR, `publish-log-${timestamp}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(publishPlan, null, 2));

    // Display results
    console.log('📋 PUBLISH PLAN GENERATED\n');
    console.log(`Day Check: ${publishPlan.day_check_passed ? '✅' : '❌'}`);
    console.log(`Publish Approved: ${publishPlan.publish_approved ? '✅ YES' : '❌ NO'}`);
    
    if (!publishPlan.publish_approved) {
      console.log(`Abort Reason: ${publishPlan.abort_reason}`);
      console.log('\n⏹️  Publish blocked. No git or npm operations will be performed.\n');
    } else {
      console.log(`New Version: ${publishPlan.new_version}`);
      console.log(`\n📁 Files to Write:`);
      if (publishPlan.files_to_write_before_commit && publishPlan.files_to_write_before_commit.length > 0) {
        publishPlan.files_to_write_before_commit.forEach(f => {
          console.log(`   - ${f.path}`);
        });
      }

      console.log(`\n📝 Git Commands: ${publishPlan.git_commands?.length || 0}`);
      console.log(`📦 npm Commands: ${publishPlan.npm_commands?.length || 0}`);
      
      if (publishPlan.github_release) {
        console.log(`\n🔖 GitHub Release:`);
        console.log(`   Tag: ${publishPlan.github_release.tag}`);
        console.log(`   Title: ${publishPlan.github_release.title}`);
      }
    }

    console.log(`\n✅ Publish plan saved to: ${outputFile}\n`);

  } catch (error) {
    console.error('❌ Agent 6 Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Check for required credentials
if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not set');
  process.exit(1);
}

runPublishAgent();
