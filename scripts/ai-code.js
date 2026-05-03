#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * AI Code Generation Script - Groq Integration
 * Generates code based on daily plan
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function readDailyPlan() {
  const planPath = path.join(process.cwd(), 'DAILY_PLAN.json');
  if (!fs.existsSync(planPath)) {
    console.error('❌ DAILY_PLAN.json not found');
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(planPath, 'utf8'));
  } catch (e) {
    console.error('❌ Failed to parse DAILY_PLAN.json:', e.message);
    return null;
  }
}

async function callGroq(prompt) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    throw new Error(`Groq API failed: ${error.message}`);
  }
}

async function main() {
  console.log('🤖 Starting AI Code Generation...');

  try {
    const plan = readDailyPlan();
    if (!plan) {
      console.log('⚠️  Could not read plan, skipping code generation');
      process.exit(0);
    }

    console.log(`📝 Plan: ${plan.category} - ${plan.title}`);

    // If no GROQ_API_KEY, skip code generation
    if (!GROQ_API_KEY) {
      console.log('⚠️  GROQ_API_KEY not set - skipping AI code generation');
      console.log('💡 Set GROQ_API_KEY in GitHub Secrets to enable AI features');
      console.log('✅ Tests and documentation updates will still run');
      process.exit(0);
    }

    console.log('🔄 Calling Groq AI for code generation...');
    const response = await callGroq(`
You are yantraverse framework code generation AI. Generate code based on this plan:

PLAN:
${JSON.stringify(plan, null, 2)}

Framework context:
- yantraverse is a Node.js web framework
- Uses native http module (zero dependencies)
- Router pattern matching with named params
- Middleware support
- File: src/index.js has main app engine
- File: src/router.js has routing logic
- File: test/run.js has test runner

Requirements:
1. Write ONLY valid JavaScript code
2. Follow existing code style (no semicolons, 2-space indent)
3. Add JSDoc comments for functions
4. Include ${plan.testCases} test cases
5. Must pass npm test
6. Max bundle size impact: <5KB

Respond with JSON:
{
  "code": "// Main implementation file content here",
  "tests": "// Test file content here",
  "files": ["src/newfile.js", "test/newfile.test.js"],
  "notes": "Any implementation notes"
}
    `);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('⚠️  No valid JSON in Groq response, skipping code creation');
      process.exit(0);
    }

    const result = JSON.parse(jsonMatch[0]);

    // Create/update files
    for (const file of result.files) {
      const filePath = path.join(process.cwd(), file);
      const dir = path.dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const content = file.includes('test') ? result.tests : result.code;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Created: ${file}`);
    }

    console.log(`\n💡 ${result.notes || 'Code generated successfully'}`);
    process.exit(0);

  } catch (error) {
    console.error('⚠️  Code generation error:', error.message);
    console.log('📝 Continuing workflow without new code...');
    process.exit(0); // Don't fail the workflow
  }
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(0);
});
