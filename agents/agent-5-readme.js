#!/usr/bin/env node

/**
 * AGENT 5 - README UPDATE AGENT
 * Updates README.md with new features and changelog
 * Input: agents/outputs/test-report-*.json + code-changes-*.json
 * Output: agents/outputs/readme-update-{date}.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '../agents/outputs');
const README_PATH = path.join(__dirname, '../README.md');

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
      model: 'llama-3.3-70b-versatile',
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

function getLatestTestReportFile() {
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('test-report-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No test report found. Run Agent 4 first!');
  }
  
  return path.join(OUTPUT_DIR, files[0]);
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

function readCurrentReadme() {
  try {
    return fs.readFileSync(README_PATH, 'utf-8');
  } catch (e) {
    console.warn('Could not read current README, will create fresh one');
    return '';
  }
}

async function runReadmeAgent() {
  try {
    console.log('📖 AGENT 5: README UPDATE - Starting...\n');

    // Read system prompt
    const systemPrompt = fs.readFileSync(
      path.join(__dirname, '../agents/prompts/agent-5-readme.md'),
      'utf-8'
    );

    // Read latest test report
    const testReportFile = getLatestTestReportFile();
    console.log(`📂 Reading test report from: ${path.basename(testReportFile)}`);
    const testReport = JSON.parse(fs.readFileSync(testReportFile, 'utf-8'));

    // Read latest code changes
    const codeChangesFile = getLatestCodeChangesFile();
    console.log(`📂 Reading code changes from: ${path.basename(codeChangesFile)}`);
    const codeChanges = JSON.parse(fs.readFileSync(codeChangesFile, 'utf-8'));

    // Read current README
    const currentReadme = readCurrentReadme();

    // Build context for README update
    const releaseContext = {
      current_readme: currentReadme,
      new_version: testReport.yantraverse_version || codeChanges.yantraverse_version || '1.1.0',
      release_date: new Date().toISOString().split('T')[0],
      features_added: codeChanges.code_output?.map(f => ({
        name: f.feature_name,
        readme_section_title: f.feature_name,
        readme_section_content: '/* Feature documentation from Agent 2 */',
        changelog_line: `Added ${f.feature_name}`,
        is_unique_to_yantraverse: true,
        usage_example: '/* Example code */'
      })) || [],
      bugs_fixed: testReport.fixes?.map(f => ({
        bug_id: f.bug_id,
        fix_description: f.fix_description
      })) || [],
      current_stats: {
        rps: '45000+',
        dependencies: 0,
        gzipped_size: '12KB',
        node_support: '18+'
      },
      all_exported_apis: [
        'yantraverse()',
        'app.get()',
        'app.post()',
        'app.put()',
        'app.delete()',
        'app.patch()',
        'app.use()',
        'app.listen()'
      ]
    };

    const userMessage = `
Here is the context for updating the README:

Current Version: ${releaseContext.new_version}
Release Date: ${releaseContext.release_date}
Features Added: ${releaseContext.features_added.length}
Bugs Fixed: ${releaseContext.bugs_fixed.length}

Current README:
\`\`\`
${currentReadme.substring(0, 1000)}
...(truncated for brevity)
\`\`\`

Full Release Context:
${JSON.stringify(releaseContext, null, 2)}

Using the detailed README update prompt above, generate a comprehensive, professional README.md update:

1. Update version badges
2. Update table of contents
3. Add new feature sections
4. Update API reference
5. Update performance section
6. Add changelog entry at the TOP
7. Quality check all content
8. Return the COMPLETE updated README.md

Make it professional, scannable, and inspiring - like Fastify's or Hono's README.
Return ONLY valid JSON with the complete README content (no truncation).
    `;

    console.log('🧠 Calling Groq API for README generation...');
    const readmeOutput = await callGroqAPI(systemPrompt, userMessage);

    // Parse and validate JSON
    const readmeData = JSON.parse(readmeOutput);

    // Add metadata
    readmeData.generated_timestamp = new Date().toISOString();
    readmeData.test_report_id = testReport.generated_timestamp;
    readmeData.code_changes_id = codeChanges.generated_timestamp;

    // Save output
    const timestamp = new Date().toISOString().split('T')[0];
    const outputFile = path.join(OUTPUT_DIR, `readme-update-${timestamp}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify(readmeData, null, 2));

    // Also update the actual README.md if ready
    if (readmeData.readme_ready && readmeData.full_readme_content) {
      fs.writeFileSync(README_PATH, readmeData.full_readme_content);
      console.log(`\n✅ README.md updated at ${README_PATH}`);
    }

    console.log('\n✅ README update complete!');
    console.log(`📁 Output saved to: ${outputFile}`);
    console.log(`\n📊 README Update Summary:`);
    console.log(`   Version: ${readmeData.version_updated_from} → ${readmeData.version_updated_to}`);
    
    if (readmeData.sections_added && readmeData.sections_added.length > 0) {
      console.log(`   Sections added: ${readmeData.sections_added.join(', ')}`);
    }
    
    if (readmeData.changes_summary) {
      console.log(`\n📝 Changes Made:`);
      console.log(`   New features documented: ${readmeData.changes_summary.new_features_documented || 0}`);
      console.log(`   Bugs fixed documented: ${readmeData.changes_summary.bugs_fixed_documented || 0}`);
      console.log(`   API entries added: ${readmeData.changes_summary.api_entries_added || 0}`);
      console.log(`   Code examples added: ${readmeData.changes_summary.code_examples_added || 0}`);
    }
    
    console.log(`\n✨ Quality Checklist:`);
    if (readmeData.quality_checklist) {
      const checks = readmeData.quality_checklist;
      console.log(`   All APIs documented: ${checks.all_apis_documented ? '✅' : '❌'}`);
      console.log(`   All examples valid: ${checks.all_examples_valid ? '✅' : '❌'}`);
      console.log(`   No outdated refs: ${checks.no_outdated_refs ? '✅' : '❌'}`);
      console.log(`   TOC accurate: ${checks.toc_accurate ? '✅' : '❌'}`);
      console.log(`   Version consistent: ${checks.version_consistent ? '✅' : '❌'}`);
      console.log(`   Changelog at top: ${checks.changelog_at_top ? '✅' : '❌'}`);
      console.log(`   No broken markdown: ${checks.no_broken_markdown ? '✅' : '❌'}`);
    }
    
    console.log(`\n🚀 README ready for publishing: ${readmeData.readme_ready ? '✅ YES' : '❌ NO'}`);

  } catch (error) {
    console.error('❌ Agent 5 Error:', error.message);
    process.exit(1);
  }
}

// Check for API key
if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not set. Add to GitHub Secrets or .env file');
  process.exit(1);
}

runReadmeAgent();
