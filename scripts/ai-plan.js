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

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not set in environment');
  process.exit(1);
}

async function getRecentCommits() {
  try {
    const log = execSync('git log --oneline -20').toString();
    return log;
  } catch (e) {
    return 'No git history available';
  }
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

async function main() {
  console.log('📋 Starting AI Planning Phase...');

  try {
    const commits = await getRecentCommits();
    const stats = await getPackageStats();
    const date = new Date().toISOString().split('T')[0];

    const prompt = `
You are yantraverse framework AI assistant. Plan ONE feature or bug fix for today (${date}).

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

Respond as JSON only:
{
  "date": "${date}",
  "category": "FEATURE|BUG|PERF|DOCS|REFACTOR",
  "title": "Brief title",
  "description": "What to build (2-3 sentences)",
  "complexity": 5,
  "estimatedLoc": 120,
  "filesAffected": ["src/file1.js", "test/file1.test.js"],
  "testCases": 3,
  "reason": "Why this is valuable"
}
    `;

    console.log('🔄 Calling Groq AI...');
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
    console.log(`💾 Saved to DAILY_PLAN.json`);

  } catch (error) {
    console.error('❌ Planning failed:', error.message);
    process.exit(1);
  }
}

main();
