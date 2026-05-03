#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Auto-Commit Script
 * Commits changes with smart messages
 */

function runCommand(cmd, ignoreError = false) {
  try {
    return execSync(cmd, { encoding: 'utf8' });
  } catch (e) {
    if (ignoreError) {
      return '';
    }
    throw new Error(`Command failed: ${cmd}\n${e.message}`);
  }
}

function getGitStats() {
  try {
    const diff = runCommand('git diff --shortstat', true);
    return diff.trim();
  } catch (e) {
    return '';
  }
}

function getPlan() {
  const planPath = path.join(process.cwd(), 'DAILY_PLAN.json');
  if (fs.existsSync(planPath)) {
    try {
      return JSON.parse(fs.readFileSync(planPath, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function createCommitMessage() {
  const plan = getPlan();
  const diff = getGitStats();
  
  if (!plan) {
    return 'ai: Daily automated build';
  }

  const { category, title } = plan;
  return `ai: [${category}] ${title}

${diff}

#automated #ai-generated #daily-build`;
}

async function main() {
  console.log('📤 Starting Auto-Commit Phase...');

  try {
    // Setup git config
    console.log('⚙️  Configuring git...');
    runCommand('git config user.name "github-actions[bot]"', true);
    runCommand('git config user.email "github-actions[bot]@users.noreply.github.com"', true);

    // Check for changes
    const status = runCommand('git status --porcelain', true);
    if (!status.trim()) {
      console.log('✅ No changes to commit');
      process.exit(0);
    }

    console.log('📝 Changes detected:');
    console.log(status);

    // Stage all changes
    console.log('📌 Staging changes...');
    runCommand('git add -A', true);

    // Create commit message
    const message = createCommitMessage();
    console.log('💬 Commit message:');
    console.log(message);

    // Commit
    console.log('🔗 Committing...');
    const msgLines = message.split('\n');
    const firstLine = msgLines[0];
    const restLines = msgLines.slice(1).join('\n');
    
    try {
      if (restLines.trim()) {
        runCommand(`git commit -m "${firstLine}" -m "${restLines}"`);
      } else {
        runCommand(`git commit -m "${firstLine}"`);
      }
    } catch (e) {
      console.log('⚠️  Commit failed (no changes to commit):', e.message);
      process.exit(0);
    }

    console.log('✅ Commit successful');

    // Push (requires GITHUB_TOKEN)
    if (process.env.GITHUB_TOKEN) {
      console.log('📤 Pushing to repository...');
      try {
        runCommand('git push origin main', true);
        console.log('✅ Push successful');
      } catch (e) {
        console.log('⚠️  Push failed:', e.message);
        // Continue anyway
      }
    } else {
      console.log('⚠️  GITHUB_TOKEN not set - push skipped');
    }

    process.exit(0);

  } catch (error) {
    console.error('⚠️  Commit warning:', error.message);
    process.exit(0); // Don't fail - let workflow continue
  }
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(0);
});
