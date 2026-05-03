#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Intelligent Version Bump Script
 * Auto-increments version based on changes
 */

function getCommitsSinceLastTag() {
  try {
    const commits = execSync('git log --oneline $(git describe --tags --abbrev=0)..HEAD 2>/dev/null || git log --oneline').toString();
    return commits.split('\n').filter(line => line.trim());
  } catch (e) {
    return [];
  }
}

function analyzeCommits(commits) {
  let bugs = 0;
  let features = 0;
  let breaking = 0;
  let perf = 0;

  commits.forEach(commit => {
    if (commit.includes('fix:') || commit.includes('🐛')) bugs++;
    if (commit.includes('feat:') || commit.includes('✨')) features++;
    if (commit.includes('BREAKING') || commit.includes('💥')) breaking++;
    if (commit.includes('perf:') || commit.includes('⚡')) perf++;
  });

  return { bugs, features, breaking, perf, total: commits.length };
}

function calculateNewVersion(current, analysis, type = 'daily') {
  const [major, minor, patch] = current.split('.').map(Number);
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

  if (type === 'daily') {
    // Daily releases: 1.0.0-daily.YYYYMMDD
    return `${major}.${minor}.${patch}-daily.${date}`;
  }

  if (type === 'weekly') {
    // Weekly: Increment patch
    return `${major}.${minor}.${patch + 1}`;
  }

  if (type === 'monthly') {
    // Monthly: Smart versioning based on changes
    if (analysis.breaking >= 1) {
      return `${major + 1}.0.0`; // Major bump for breaking changes
    }
    if (analysis.features >= 5 || analysis.perf >= 3) {
      return `${major}.${minor + 1}.0`; // Minor bump for multiple features
    }
    return `${major}.${minor}.${patch + 1}`; // Patch bump for bug fixes
  }

  return current;
}

async function main() {
  const type = process.argv[2] || 'daily'; // daily | weekly | monthly

  if (!['daily', 'weekly', 'monthly'].includes(type)) {
    console.error('❌ Invalid type. Use: daily | weekly | monthly');
    process.exit(1);
  }

  console.log(`📊 Analyzing commits for ${type} version bump...`);

  try {
    const commits = getCommitsSinceLastTag();
    const analysis = analyzeCommits(commits);
    
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const currentVersion = pkg.version;
    const newVersion = calculateNewVersion(currentVersion, analysis, type);

    console.log(`\n📈 Analysis:`);
    console.log(`   Features: ${analysis.features}`);
    console.log(`   Bug fixes: ${analysis.bugs}`);
    console.log(`   Performance: ${analysis.perf}`);
    console.log(`   Breaking: ${analysis.breaking}`);

    console.log(`\n🔄 Version bump: ${currentVersion} → ${newVersion}`);

    // Update package.json
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

    // Create git tag
    try {
      execSync(`git tag v${newVersion}`);
      console.log(`✅ Created tag: v${newVersion}`);
    } catch (e) {
      console.log(`⚠️ Tag creation skipped (tag may already exist)`);
    }

    console.log(`✅ Version bumped to ${newVersion}`);
    process.exit(0);
    
  } catch (error) {
    console.error('⚠️  Version bump failed:', error.message);
    console.log('📝 Continuing workflow...');
    process.exit(0); // Don't fail the workflow
  }
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(0);
});
