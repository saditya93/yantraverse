#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * GitHub Release Script
 * Creates GitHub releases with changelog
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'saditya93/yantraverse';

if (!GITHUB_TOKEN) {
  console.log('⚠️  GITHUB_TOKEN not set - skipping release creation');
  process.exit(0); // Don't fail
}

async function getChangelog(version) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  let releaseNotes = `# Release ${version}\n\n`;
  
  try {
    // Get recent commits
    const commits = execSync('git log --oneline --all | head -20').toString().split('\n').filter(l => l.trim());
    
    // Categorize commits
    const features = commits.filter(c => c.includes('feat:') || c.includes('✨'));
    const fixes = commits.filter(c => c.includes('fix:') || c.includes('🐛'));
    const perf = commits.filter(c => c.includes('perf:') || c.includes('⚡'));
    const docs = commits.filter(c => c.includes('docs:') || c.includes('📚'));

    if (features.length > 0) {
      releaseNotes += '## ✨ New Features\n';
      features.forEach(f => {
        const msg = f.split('] ')[1] || f;
        releaseNotes += `- ${msg}\n`;
      });
      releaseNotes += '\n';
    }

    if (fixes.length > 0) {
      releaseNotes += '## 🐛 Bug Fixes\n';
      fixes.forEach(f => {
        const msg = f.split('] ')[1] || f;
        releaseNotes += `- ${msg}\n`;
      });
      releaseNotes += '\n';
    }

    if (perf.length > 0) {
      releaseNotes += '## ⚡ Performance Improvements\n';
      perf.forEach(p => {
        const msg = p.split('] ')[1] || p;
        releaseNotes += `- ${msg}\n`;
      });
      releaseNotes += '\n';
    }

    releaseNotes += `## 📦 Details\n`;
    releaseNotes += `**Release Date:** ${new Date().toLocaleDateString()}\n`;
    releaseNotes += `**Node.js:** ≥14\n`;
    releaseNotes += `**Status:** Production Ready\n\n`;
    releaseNotes += `[View Full Changelog](./CHANGELOG.md)\n`;

  } catch (e) {
    releaseNotes += 'See CHANGELOG.md for details';
  }

  return releaseNotes;
}

async function createGitHubRelease(version, changelog) {
  const payload = {
    tag_name: `v${version}`,
    name: `Release ${version}`,
    body: changelog,
    draft: false,
    prerelease: version.includes('daily')
  };

  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message}`);
  }

  return response.json();
}

async function main() {
  console.log('🚀 Creating GitHub Release...');

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const version = pkg.version;

    console.log(`📌 Version: ${version}`);
    console.log(`📦 Repository: ${GITHUB_REPO}`);

    const changelog = await getChangelog(version);
    console.log(`📝 Changelog length: ${changelog.length} chars`);

    const release = await createGitHubRelease(version, changelog);

    console.log(`✅ Release created: ${release.html_url}`);
    console.log(`📊 Release ID: ${release.id}`);

  } catch (error) {
    console.error('⚠️  Release creation failed:', error.message);
    console.log('📝 Continuing workflow...');
    process.exit(0); // Don't fail the workflow
  }
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(0);
});
