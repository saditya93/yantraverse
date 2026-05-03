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
  if (!fs.existsSync(changelogPath)) {
    return 'No changelog available';
  }

  const content = fs.readFileSync(changelogPath, 'utf8');
  const lines = content.split('\n');
  const startIdx = lines.findIndex(l => l.includes(`[${version}]`) || l.includes('Automated'));
  
  if (startIdx === -1) return content.substring(0, 500);
  
  let endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith('##'));
  if (endIdx === -1) endIdx = Math.min(startIdx + 20, lines.length);
  
  return lines.slice(startIdx, endIdx).join('\n');
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
