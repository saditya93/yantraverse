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
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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
    testCases: 2,
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

    const prompt = `
You are yantraverse framework AI assistant. Plan ONE feature or bug fix for today (${date}).

${researchContext}

Recent commits:
${commits}

Current stats:
- Version: ${stats.version}
- Dependencies: ${stats.dependencies}
- DevDependencies: ${stats.devDependencies}

Rules:
1. Small, focused changes (50-200 lines max)
2. Must include tests
3. Can be: new feature, bug fix, performance improvement, or refactor
4. Complexity: 1-10 (1=easy, 10=complex)
5. Prioritize based on research recommendations

Respond as JSON only (no markdown):
{
  "date": "${date}",
  "category": "FEATURE|BUG|PERF|DOCS|REFACTOR",
  "title": "Brief title (max 50 chars)",
  "description": "What to build (1-2 sentences)",
  "complexity": 5,
  "estimatedLoc": 120,
  "filesAffected": ["src/file1.js", "test/file1.test.js"],
  "testCases": 3,
  "reason": "Why this matters for users"
}
    `;

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
