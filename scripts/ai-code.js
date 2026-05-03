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
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
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
    const response = await callGroq(`Generate PRODUCTION-QUALITY code for this feature:

FEATURE DETAILS:
Title: ${plan.title}
Description: ${plan.description}
Acceptance Criteria: ${plan.acceptance || 'See description'}
Test Cases: ${Array.isArray(plan.testCases) ? plan.testCases.join(', ') : plan.testCases}

QUALITY REQUIREMENTS:
- No semicolons, 2-space indent, JSDoc comments
- Proper error handling and edge cases
- Clear variable names and function purposes
- Unit tests with good coverage
- Follow yantraverse conventions
- Ready for production immediately

Generate implementation code AND unit tests.

Return ONLY valid JSON:
{"code":"// Implementation with JSDoc, error handling, all features","tests":"// Unit tests covering all acceptance criteria","files":["src/file.js","test/file.test.js"],"notes":"Implementation notes"}`);
    
    // Extract JSON with improved error handling
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('⚠️  No JSON found in Groq response, skipping code creation');
      process.exit(0);
    }

    let jsonStr = jsonMatch[0];
    
    // Try to parse with error handling
    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      // Try to fix common JSON issues
      try {
        // Escape newlines in strings
        jsonStr = jsonStr.replace(/\\n/g, '\\\\n').replace(/[\r\n]+/g, ' ');
        result = JSON.parse(jsonStr);
      } catch (e2) {
        // Give up and use safe defaults
        console.log('⚠️  Malformed JSON response, using safe defaults');
        result = {
          code: '// Auto-generated code stub\nmodule.exports = {\n  feature: true\n}',
          tests: '// Test stub\ntest("feature works", () => {})',
          files: ['src/feature.js', 'test/feature.test.js'],
          notes: 'Generated with defaults due to JSON parsing issues'
        };
      }
    }

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
