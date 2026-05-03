#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * NPM Promotion Script - Optimize for npm downloads
 * Generates high-quality package metadata for npm trending
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function callGroq(prompt) {
  try {
    console.log('📡 Connecting to Groq API...');
    
    const models = [
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      'openai/gpt-oss-120b',
      'llama-3.1-8b-instant'
    ];

    let lastError = null;

    for (const model of models) {
      try {
        console.log(`  Trying model: ${model}...`);
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 1000,
            top_p: 1
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          lastError = errorData.error?.message || `${response.status}`;
          console.log(`  ✗ ${model} failed: ${lastError}`);
          continue;
        }

        const data = await response.json();
        console.log(`  ✓ Using model: ${model}`);
        return data.choices[0].message.content;
        
      } catch (modelError) {
        lastError = modelError.message;
        continue;
      }
    }

    throw new Error(`All models failed. Last error: ${lastError}`);
  } catch (error) {
    throw new Error(`Groq API failed: ${error.message}`);
  }
}

function getPackageInfo() {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  return {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    keywords: pkg.keywords || [],
    downloads: pkg.downloads || 0
  };
}

function getRecentStats() {
  try {
    const logCommand = process.platform === 'win32' 
      ? 'git log --oneline -30'
      : 'git log --oneline -30 | wc -l';
    
    let commits;
    if (process.platform === 'win32') {
      const log = execSync('git log --oneline -30').toString();
      commits = log.split('\n').filter(l => l.trim()).length;
    } else {
      commits = parseInt(execSync(logCommand).toString().trim());
    }
    
    const stats = {
      commits: commits.toString(),
      stars: 0,
      trending: 'calculating...'
    };
    return stats;
  } catch (e) {
    return { commits: '0', stars: 0 };
  }
}

async function generateNpmOptimization() {
  try {
    const pkg = getPackageInfo();
    const stats = getRecentStats();
    const date = new Date().toISOString().split('T')[0];

    if (!GROQ_API_KEY) {
      console.log('⚠️  GROQ_API_KEY not set - creating demo optimization');
      const demo = {
        description: 'Ultra-fast, zero-dependency Node.js framework. Lightning routing, middleware, security.',
        keywords: ['nodejs', 'framework', 'routing', 'middleware', 'express-alternative', 'fast', 'zero-dependencies'],
        npm_trending_strategy: 'Consistent quality updates + high performance = npm trending',
        recommended_tags: ['#nodejs', '#framework', '#performance'],
        download_hooks: [
          'Developers want fast, simple frameworks',
          'Zero dependencies = less maintenance headaches',
          'Perfect for high-traffic APIs'
        ]
      };
      fs.writeFileSync(
        path.join(process.cwd(), 'NPM_OPTIMIZATION.json'),
        JSON.stringify({ date, ...demo }, null, 2)
      );
      console.log('✅ Demo optimization created');
      return demo;
    }

    const prompt = `Optimize npm package metadata for MAXIMUM DOWNLOADS.

PACKAGE: ${pkg.name} v${pkg.version}
CURRENT DESC: ${pkg.description}
CURRENT KEYWORDS: ${pkg.keywords.join(', ')}
RECENT ACTIVITY: ${stats.commits} commits

Generate npm package metadata that:
1. Ranks HIGH in npm search (framework, routing, middleware, express alternative, fast)
2. Makes developers WANT to click and install
3. Highlights UNIQUE selling points vs Express/Fastify
4. Includes trending keywords (2026)
5. Is honest but compelling

Respond ONLY with this JSON:
{
  "description":"Compelling 1-line description for npm",
  "keywords":["keyword1","keyword2",...],
  "npm_trending_strategy":"How this version stands out",
  "recommended_tags":["#nodejs","#framework",...],
  "download_hooks":["Why developers pick this","Performance angle","Developer experience angle"]
}`;

    console.log('🚀 Generating npm optimization...');
    const response = await callGroq(prompt);
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response from Groq');
    }

    const optimization = JSON.parse(jsonMatch[0]);
    
    // Save optimization
    fs.writeFileSync(
      path.join(process.cwd(), 'NPM_OPTIMIZATION.json'),
      JSON.stringify({ date, ...optimization }, null, 2)
    );

    console.log(`✅ NPM optimization generated`);
    console.log(`📊 Keywords: ${optimization.keywords.join(', ')}`);
    console.log(`💡 Strategy: ${optimization.npm_trending_strategy}`);
    
    return optimization;

  } catch (error) {
    console.error('⚠️  NPM optimization error:', error.message);
    // Create fallback
    const demo = {
      description: 'Ultra-fast, zero-dependency Node.js framework. Lightning routing, middleware, security.',
      keywords: ['nodejs', 'framework', 'routing', 'middleware', 'express-alternative', 'fast', 'zero-dependencies'],
      npm_trending_strategy: 'Consistent quality updates + high performance = npm trending',
      recommended_tags: ['#nodejs', '#framework', '#performance'],
      download_hooks: [
        'Developers want fast, simple frameworks',
        'Zero dependencies = less maintenance headaches',
        'Perfect for high-traffic APIs'
      ]
    };
    fs.writeFileSync(
      path.join(process.cwd(), 'NPM_OPTIMIZATION.json'),
      JSON.stringify({ date: new Date().toISOString().split('T')[0], ...demo }, null, 2)
    );
    console.log('✅ Using fallback optimization');
  }
}

async function generateDownloadCopy() {
  try {
    if (!GROQ_API_KEY) {
      console.log('⚠️  GROQ_API_KEY not set - skipping copy generation');
      return;
    }

    const pkg = getPackageInfo();

    const prompt = `Write compelling copy to boost npm downloads for ${pkg.name}.

Format for NPM SEARCH RESULTS PAGE (developers scanning quickly):
- First line: Why they NEED this (solve their problem)
- Second line: Why they pick THIS over alternatives
- Hook: The ONE thing that makes it better

TONE: Direct, confident, developer-friendly (not marketing BS)
FOCUS: Speed, simplicity, no dependencies = they actually want to use it

Respond with ONLY the copy (no JSON, no markdown):`;

    console.log('✍️  Generating download-focused copy...');
    const copy = await callGroq(prompt);
    
    fs.writeFileSync(
      path.join(process.cwd(), 'NPM_COPY.txt'),
      copy
    );

    console.log('✅ Download copy saved');
    console.log(`\n📋 Copy Preview:\n${copy.substring(0, 200)}...\n`);

  } catch (error) {
    console.error('⚠️  Copy generation error:', error.message);
  }
}

async function main() {
  console.log('🎯 Starting NPM Promotion Phase...\n');

  try {
    await generateNpmOptimization();
    await generateDownloadCopy();
    
    console.log('\n✅ NPM promotion complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(0);
  }
}

main();
