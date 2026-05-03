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

async function readDailyPlan() {
  const planPath = path.join(process.cwd(), 'DAILY_PLAN.json');
  if (!fs.existsSync(planPath)) {
    throw new Error('DAILY_PLAN.json not found. Run ai-plan.js first.');
  }
  return JSON.parse(fs.readFileSync(planPath, 'utf8'));
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
      temperature: 0.8,
      max_tokens: 3000
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function main() {
  console.log('🤖 Starting AI Code Generation...');

  try {
    const plan = await readDailyPlan();
    console.log(`📝 Plan: ${plan.category} - ${plan.title}`);

    // If no GROQ_API_KEY, skip code generation
    if (!GROQ_API_KEY) {
      console.log('⚠️  GROQ_API_KEY not set - skipping code generation');
      console.log('✅ To enable: Add GROQ_API_KEY to GitHub Secrets');
      process.exit(0);
    }

    const prompt = `
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
    `;

    console.log('🔄 Calling Groq AI for code generation...');
    const response = await callGroq(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response from Groq');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Create/update files
    for (let i = 0; i < result.files.length; i++) {
      const filePath = path.join(process.cwd(), result.files[i]);
      const dir = path.dirname(filePath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (result.files[i].includes('test')) {
        fs.writeFileSync(filePath, result.tests);
      } else {
        fs.writeFileSync(filePath, result.code);
      }
      
      console.log(`✅ Created: ${result.files[i]}`);
    }

    console.log(`\n💡 Implementation notes: ${result.notes}`);
    console.log('⏭️  Next: Run tests and commit');

  } catch (error) {
    console.error('❌ Code generation failed:', error.message);
    console.log('ℹ️  Continuing workflow...');
    process.exit(0); // Don't fail the workflow
  }
}

main();
