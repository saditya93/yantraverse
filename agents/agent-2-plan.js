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
const crypto = require('crypto');

const uuidv4 = typeof crypto.randomUUID === 'function'
  ? () => crypto.randomUUID()
  : () => crypto.randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OUTPUT_DIR = path.join(__dirname, '../agents/outputs');
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const GROQ_MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS || 2200);
const GROQ_MAX_RETRIES = Number(process.env.GROQ_MAX_RETRIES || 4);

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelayMs(statusCode, responseBody, attempt) {
  const retryAfterMatch = responseBody.match(/try again in\s+([\d.]+)s/i);
  const retryAfterSeconds = retryAfterMatch ? Number(retryAfterMatch[1]) : 0;

  if (statusCode === 429 && retryAfterSeconds > 0) {
    return Math.ceil((retryAfterSeconds + 2) * 1000);
  }

  return Math.min(60000, 2000 * Math.pow(2, attempt));
}

function createGroqError(statusCode, responseBody) {
  const error = new Error(`Groq API HTTP ${statusCode}: ${responseBody}`);
  error.statusCode = statusCode;
  error.responseBody = responseBody;
  return error;
}

async function callGroqAPIOnce(systemPrompt, userMessage) {
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
          return reject(createGroqError(res.statusCode, body));
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

async function callGroqAPI(systemPrompt, userMessage) {
  let lastError;

  for (let attempt = 0; attempt <= GROQ_MAX_RETRIES; attempt += 1) {
    try {
      return await callGroqAPIOnce(systemPrompt, userMessage);
    } catch (error) {
      lastError = error;
      const retryable = error.statusCode === 429 || (error.statusCode >= 500 && error.statusCode < 600);

      if (!retryable || attempt === GROQ_MAX_RETRIES) {
        throw error;
      }

      const delayMs = getRetryDelayMs(error.statusCode, error.responseBody || '', attempt);
      console.warn(`Groq API ${error.statusCode}; retrying in ${Math.ceil(delayMs / 1000)}s (${attempt + 1}/${GROQ_MAX_RETRIES})...`);
      await sleep(delayMs);
    }
  }

  throw lastError;
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

// Compress research data to essential fields only
function compressResearchData(researchData) {
  const recommended = (researchData.recommended_features_for_yantraverse || [])
    .slice(0, 3)
    .map(feature => ({
      priority: feature.priority,
      feature_name: feature.feature_name,
      reason: feature.reason,
      competitive_advantage: feature.competitive_advantage,
      estimated_loc: feature.estimated_loc
    }));

  return {
    gap_analysis: {
      completely_missing_features: (researchData.gap_analysis?.completely_missing_features || []).slice(0, 5),
      partially_implemented_features: (researchData.gap_analysis?.partially_implemented_features || []).slice(0, 5),
      ai_era_features: (researchData.gap_analysis?.ai_era_features || []).slice(0, 5),
      workflow_gaps: (researchData.gap_analysis?.workflow_gaps || []).slice(0, 5)
    },
    recommended_features_for_yantraverse: recommended
  };
}

function createFallbackPlan(researchData, currentVersion, newVersion, weekNumber) {
  const features = (researchData.recommended_features_for_yantraverse || []).slice(0, 3);
  const totalEstimatedLoc = features.reduce((total, feature) => total + (feature.estimated_loc || 120), 0);

  return {
    plan_id: uuidv4(),
    plan_date: new Date().toISOString(),
    week_number: weekNumber,
    yantraverse_current_version: currentVersion,
    yantraverse_new_version: newVersion,
    features_to_implement: features.map((feature, index) => {
      const id = `feature-${String(index + 1).padStart(3, '0')}`;
      const name = feature.feature_name || `Feature ${index + 1}`;

      return {
        id,
        name,
        priority: feature.priority || index + 1,
        is_unique_to_yantraverse: Boolean(feature.competitive_advantage),
        competitive_advantage: feature.competitive_advantage || 'Improves developer experience while keeping Yantravese zero-dependency.',
        estimated_loc: feature.estimated_loc || 120,
        api_design: {
          usage_example: `const yantravese = require('yantravese');\nconst app = yantravese();\n\n// Implement ${name} using this plan.`,
          method_signatures: ['app.use(middleware)', 'app.get(pattern, handler)'],
          options: {
            enabled: 'boolean - Enables the feature without changing existing behavior'
          },
          returns: 'Existing Yantravese app APIs remain backward compatible.'
        },
        files: [
          {
            path: 'src/index.js',
            action: 'modify',
            changes: `Integrate ${name} without breaking existing app factory behavior.`
          },
          {
            path: 'types/index.d.ts',
            action: 'modify',
            changes: `Add TypeScript declarations for ${name}.`
          },
          {
            path: 'test/run.js',
            action: 'modify',
            changes: `Add focused tests for ${name}.`
          },
          {
            path: 'README.md',
            action: 'modify',
            changes: `Document ${name} with a short usage example.`
          }
        ],
        implementation_steps: [
          {
            step: 1,
            description: `Review current routing and middleware flow before adding ${name}.`,
            code_hint: 'Keep changes isolated and preserve existing public APIs.'
          },
          {
            step: 2,
            description: `Implement ${name} using only Node.js built-ins.`,
            code_hint: 'Add small helper functions near the feature integration point.'
          },
          {
            step: 3,
            description: `Add tests for normal behavior, disabled behavior, and edge cases.`,
            code_hint: 'Use existing test/run.js helpers.'
          }
        ],
        tests: [
          {
            test_name: `${name} keeps existing routes working`,
            type: 'integration',
            input: 'GET request to an existing route',
            expected_output: 'Same response shape as before the feature'
          },
          {
            test_name: `${name} handles invalid input safely`,
            type: 'unit',
            input: 'Invalid or missing options',
            expected_output: 'No crash; clear fallback behavior'
          }
        ],
        jsdoc: `/**\n * ${name}.\n * Adds a backward-compatible Yantravese capability with no external dependencies.\n */`,
        readme_section_title: name,
        readme_section_content: `### ${name}\n\n${feature.reason || 'Adds a useful zero-dependency framework capability.'}`,
        changelog_line: `Add ${name}.`,
        exports_to_add: [],
        risks: [
          {
            risk: 'New behavior could affect existing middleware ordering.',
            mitigation: 'Default the feature to backward-compatible behavior and test existing middleware flow.'
          }
        ]
      };
    }),
    implementation_order: features.map((_, index) => `feature-${String(index + 1).padStart(3, '0')}`),
    total_estimated_loc: totalEstimatedLoc,
    week_capacity_loc: 500,
    capacity_percentage: `${Math.min(100, Math.round((totalEstimatedLoc / 500) * 100))}%`,
    github_commit_message: 'feat: add planned yantravese framework improvements',
    github_pr_title: 'Add Yantravese framework improvements',
    github_pr_body: 'This PR implements the selected Agent 2 fallback plan features.'
  };
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
    
    // Compress research data to reduce token usage
    const compressedResearch = compressResearchData(researchData);

    // Get current version
    const currentVersion = getPackageVersion();
    const newVersion = bumpMinorVersion(currentVersion);
    const weekNumber = getWeekNumber();

    const userMessage = `
Here is the research output from Agent 1 (compressed):

${JSON.stringify(compressedResearch, null, 2)}

Current Yantravese version: ${currentVersion}
New version should be: ${newVersion}

Using the detailed planning prompt above, generate a comprehensive implementation plan.
Select the top 3 features from the research, provide complete technical specifications.

Return ONLY valid JSON in the exact format specified.
    `;

    console.log('🧠 Calling Groq API for planning...');
    let planData;

    try {
      const planOutput = await callGroqAPI(systemPrompt, userMessage);
      planData = JSON.parse(planOutput);
    } catch (error) {
      if (error.statusCode !== 429) {
        throw error;
      }

      console.warn('Groq rate limit persisted after retries; writing deterministic fallback plan so the pipeline can continue.');
      planData = createFallbackPlan(compressedResearch, currentVersion, newVersion, weekNumber);
    }

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
