#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * AI Planning Script - Groq Integration
 * Runs daily to plan next feature/fix
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function getRecentCommits() {
  try {
    const log = execSync('git log --oneline -20').toString();
    return log;
  } catch (e) {
    return 'No git history available';
  }
}

async function getUserResearch() {
  try {
    const researchPath = path.join(process.cwd(), 'USER_RESEARCH.json');
    if (fs.existsSync(researchPath)) {
      return JSON.parse(fs.readFileSync(researchPath, 'utf8'));
    }
  } catch (e) {
    return null;
  }
  return null;
}

async function getPackageStats() {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  return {
    version: pkg.version,
    name: pkg.name,
    dependencies: Object.keys(pkg.dependencies || {}).length,
    devDependencies: Object.keys(pkg.devDependencies || {}).length
  };
}

async function callGroq(prompt) {
  try {
    console.log('📡 Connecting to Groq API...');
    
    // Try models in order of preference (user-specified first, then fallbacks)
    // Updated May 2026: Using currently available production models from Groq
    const models = [
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      'openai/gpt-oss-120b',
      'llama-3.1-8b-instant'
    ];

    let lastError = null;

    for (const model of models) {
      try {
        console.log(`  Trying model: ${model}...`);
        
        const requestBody = {
          model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
          top_p: 1
        };

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json();
          lastError = errorData.error?.message || `${response.status} ${response.statusText}`;
          console.log(`  ✗ ${model} failed: ${lastError}`);
          continue;
        }

        const data = await response.json();
        console.log(`  ✓ Using model: ${model}`);
        return data.choices[0].message.content;
        
      } catch (modelError) {
        lastError = modelError.message;
        console.log(`  ✗ ${model} error: ${lastError}`);
        continue;
      }
    }

    throw new Error(`All models failed. Last error: ${lastError}`);
  } catch (error) {
    throw new Error(`Groq API failed: ${error.message}`);
  }
}

function createFallbackPlan() {
  return {
    date: new Date().toISOString().split('T')[0],
    category: 'FEATURE',
    title: 'Demo Feature',
    description: 'This is a demo plan. Set GROQ_API_KEY in GitHub Secrets to enable AI planning.',
    complexity: 3,
    estimatedLoc: 50,
    filesAffected: ['src/demo.js', 'test/demo.test.js'],
    testCases: ['Basic functionality', 'Error handling'],
    acceptance: 'Feature works correctly and is documented',
    reason: 'Testing workflow without API key'
  };
}

async function main() {
  console.log('📋 Starting AI Planning Phase...');

  try {
    // If no GROQ_API_KEY, use fallback plan for testing
    if (!GROQ_API_KEY) {
      console.log('⚠️  GROQ_API_KEY not set - using fallback demo plan');
      const dailyPlan = createFallbackPlan();
      fs.writeFileSync(
        path.join(process.cwd(), 'DAILY_PLAN.json'),
        JSON.stringify(dailyPlan, null, 2)
      );
      console.log(`✅ Demo plan created: ${dailyPlan.category} - ${dailyPlan.title}`);
      return;
    }

    const commits = await getRecentCommits();
    const stats = await getPackageStats();
    const research = await getUserResearch();
    const date = new Date().toISOString().split('T')[0];

    // Build context from research
    let researchContext = '';
    if (research && research.analysis) {
      const { patterns, recommendations } = research.analysis;
      researchContext = `
Research Data:
- Recent development: ${patterns.commitRatio || 'balanced'}
- Focus needed: ${recommendations ? recommendations[0] : 'feature development'}
- Test status: ${patterns.testStatus || 'good'}
- Code metrics: ${patterns.recentCommits || 0} recent commits
`;
    }

    const prompt = `You are planning high-quality features for yantraverse - a lightweight Node.js framework.

FRAMEWORK DETAILS:
- Zero dependencies, production framework
- Routing, middleware, static files, security (helmet), CORS, rate limiting
- Code style: no semicolons, 2-space indent, JSDoc comments
- Must be fully tested and documented
${researchContext}

QUALITY CRITERIA:
1. High-impact: Solves real problems or improves performance
2. Well-scoped: 100-250 lines of code (quality over quantity)
3. Testable: Include clear test cases and acceptance criteria
4. Production-ready: Error handling, logging, edge cases
5. Documented: Clear comments and changelog entry

Plan ONE feature/fix for TODAY that is high-impact and production-ready.

Respond ONLY with this JSON (no markdown):
{"date":"${date}","category":"FEATURE or BUG or PERF","title":"Clear action-oriented title","description":"Why this matters + what it does (2-3 sentences)","complexity":7,"estimatedLoc":180,"filesAffected":["src/file.js","test/file.test.js"],"testCases":["Test case 1","Test case 2"],"acceptance":"Clear acceptance criteria","reason":"Business/technical justification"}`;

    console.log('🔄 Calling Groq AI with user research...');
    const plan = await callGroq(prompt);
    
    // Parse JSON from response
    const jsonMatch = plan.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response from Groq');
    }

    const dailyPlan = JSON.parse(jsonMatch[0]);
    
    // Save to file
    fs.writeFileSync(
      path.join(process.cwd(), 'DAILY_PLAN.json'),
      JSON.stringify(dailyPlan, null, 2)
    );

    console.log(`✅ Plan created: ${dailyPlan.category} - ${dailyPlan.title}`);
    console.log(`📊 Complexity: ${dailyPlan.complexity}/10, Est. LOC: ${dailyPlan.estimatedLoc}`);
    console.log(`💡 Reason: ${dailyPlan.reason}`);
    console.log(`💾 Saved to DAILY_PLAN.json`);

  } catch (error) {
    console.error('❌ Planning failed:', error.message);
    // Still create a fallback plan so workflow doesn't completely fail
    const fallback = createFallbackPlan();
    fs.writeFileSync(
      path.join(process.cwd(), 'DAILY_PLAN.json'),
      JSON.stringify(fallback, null, 2)
    );
    console.log('✅ Using fallback plan');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  // Still create fallback and exit successfully
  const fallback = createFallbackPlan();
  fs.writeFileSync(
    path.join(process.cwd(), 'DAILY_PLAN.json'),
    JSON.stringify(fallback, null, 2)
  );
  process.exit(0);
});
