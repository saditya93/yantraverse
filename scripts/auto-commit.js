#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Auto-Commit Script
 * Commits changes with smart messages
 */

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' });
  } catch (e) {
    throw new Error(`Command failed: ${cmd}\n${e.message}`);
  }
}

function getGitStats() {
  const diff = runCommand('git diff --shortstat');
  const status = runCommand('git status --porcelain');
  return { diff, status };
}

function getPlan() {
  const planPath = path.join(process.cwd(), 'DAILY_PLAN.json');
  if (fs.existsSync(planPath)) {
    return JSON.parse(fs.readFileSync(planPath, 'utf8'));
  }
  return null;
}

function createCommitMessage() {
  const plan = getPlan();
  if (!plan) {
    return 'ai: Daily automated build';
  }

  const { category, title, complexity, estimatedLoc, testCases } = plan;
  const categoryMap = {
    'FEATURE': '✨ feat',
    'BUG': '🐛 fix',
    'PERF': '⚡ perf',
    'DOCS': '📚 docs',
    'REFACTOR': '♻️ refactor'
  };

  const prefix = categoryMap[category] || category;
  const stats = getGitStats();

  return `ai: [${category}] ${title}

${stats.diff.trim()}
Complexity: ${complexity}/10
Test Cases: ${testCases}
Est. LOC: ${estimatedLoc}

#automated #ai-generated #daily-build`;
}

async function main() {
  console.log('📤 Starting Auto-Commit Phase...');

  try {
    // Check for changes
    const status = runCommand('git status --porcelain');
    if (!status.trim()) {
      console.log('✅ No changes to commit');
      return;
    }

    console.log('📝 Changes detected:');
    console.log(status);

    // Stage all changes
    console.log('📌 Staging changes...');
    runCommand('git add -A');

    // Create commit message
    const message = createCommitMessage();
    console.log('💬 Commit message:');
    console.log(message);

    // Commit
    console.log('🔗 Committing...');
    runCommand(`git commit -m "${message.split('\n')[0]}" -m "${message.split('\n').slice(1).join('\n')}"`);

    console.log('✅ Commit successful');

    // Push (optional, requires GITHUB_TOKEN)
    if (process.env.GITHUB_TOKEN) {
      console.log('📤 Pushing to repository...');
      runCommand('git push origin main');
      console.log('✅ Push successful');
    } else {
      console.log('⚠️ GITHUB_TOKEN not set - push skipped (manual push needed)');
    }

  } catch (error) {
    console.error('❌ Commit failed:', error.message);
    process.exit(1);
  }
}

main();
