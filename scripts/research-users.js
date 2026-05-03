#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * User Research & Pattern Analysis Script
 * Analyzes how users interact with yantraverse
 */

function getRecentPatterns() {
  try {
    // Get commit patterns
    const commits = execSync('git log --oneline -50').toString().split('\n').filter(l => l.trim());
    
    // Analyze test failures and passes
    let testPattern = 'stable';
    try {
      execSync('npm test 2>&1 | grep -i fail', { encoding: 'utf8' });
      testPattern = 'has-failures';
    } catch (e) {
      testPattern = 'all-passing';
    }

    // Check for common issues in commits
    const failureCount = commits.filter(c => 
      c.includes('fix') || c.includes('bug') || c.includes('revert')
    ).length;
    const featureCount = commits.filter(c => 
      c.includes('feat') || c.includes('feature') || c.includes('add')
    ).length;

    return {
      recentCommits: commits.length,
      features: featureCount,
      bugFixes: failureCount,
      testStatus: testPattern,
      commitRatio: featureCount > failureCount ? 'feature-driven' : 'stability-focused'
    };
  } catch (e) {
    return {
      recentCommits: 0,
      features: 0,
      bugFixes: 0,
      testStatus: 'unknown',
      commitRatio: 'unknown'
    };
  }
}

function getUserMetrics() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    
    return {
      version: pkg.version,
      dependencies: Object.keys(pkg.dependencies || {}).length,
      devDependencies: Object.keys(pkg.devDependencies || {}).length,
      keywords: pkg.keywords || [],
      description: pkg.description
    };
  } catch (e) {
    return {};
  }
}

function analyzeCodeMetrics() {
  try {
    // Count files and lines of code
    const srcFiles = execSync('find src -name "*.js" 2>/dev/null | wc -l').toString().trim();
    const testFiles = execSync('find test -name "*.js" 2>/dev/null | wc -l').toString().trim();
    const totalLoc = execSync('find src test -name "*.js" -exec wc -l {} + 2>/dev/null | tail -1').toString().trim().split(/\s+/)[0];

    return {
      sourceFiles: parseInt(srcFiles) || 0,
      testFiles: parseInt(testFiles) || 0,
      totalLines: parseInt(totalLoc) || 0,
      testCoverage: 'measuring'
    };
  } catch (e) {
    return {
      sourceFiles: 0,
      testFiles: 0,
      totalLines: 0
    };
  }
}

async function main() {
  console.log('📊 Analyzing user patterns and framework usage...');

  try {
    const patterns = getRecentPatterns();
    const metrics = getUserMetrics();
    const codeMetrics = analyzeCodeMetrics();

    const research = {
      timestamp: new Date().toISOString(),
      analysis: {
        patterns,
        metrics,
        codeMetrics
      },
      recommendations: generateRecommendations(patterns, codeMetrics)
    };

    // Save research data
    fs.writeFileSync(
      path.join(process.cwd(), 'USER_RESEARCH.json'),
      JSON.stringify(research, null, 2)
    );

    console.log('✅ Research Complete:');
    console.log(`   📈 Features: ${patterns.features}, Fixes: ${patterns.bugFixes}`);
    console.log(`   🧪 Test Status: ${patterns.testStatus}`);
    console.log(`   📝 Source Files: ${codeMetrics.sourceFiles}, Tests: ${codeMetrics.testFiles}`);
    console.log(`   💡 Focus: ${research.recommendations[0]}`);
    console.log('✅ Research saved to USER_RESEARCH.json');
    
    process.exit(0);

  } catch (error) {
    console.error('⚠️  Research warning:', error.message);
    process.exit(0);
  }
}

function generateRecommendations(patterns, codeMetrics) {
  const recs = [];

  if (patterns.bugFixes > patterns.features * 1.5) {
    recs.push('Focus on stability and bug fixes');
  } else if (patterns.features > patterns.bugFixes) {
    recs.push('Continue feature development with strong test coverage');
  }

  if (codeMetrics.testFiles < codeMetrics.sourceFiles * 0.5) {
    recs.push('Increase test coverage');
  }

  if (patterns.commitRatio === 'feature-driven') {
    recs.push('Plan performance optimizations');
  } else {
    recs.push('Plan new features');
  }

  return recs.length > 0 ? recs : ['Maintain current development pace'];
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(0);
});
