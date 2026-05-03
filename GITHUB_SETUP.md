# ⚙️ GitHub Actions Setup Guide

## Quick Setup (5 minutes)

### Step 1: Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value | Where to Get |
|-------------|-------|--------------|
| `GROQ_API_KEY` | Your Groq API key | [console.groq.com](https://console.groq.com) |
| `NPM_TOKEN` | Your npm token | [npmjs.com/settings/tokens](https://npmjs.com/settings/tokens) |
| `GITHUB_TOKEN` | (Auto-generated) | Leave blank - GitHub creates this |

**How to get Groq API Key:**
1. Go to https://console.groq.com
2. Sign up / Log in
3. Create new API key
4. Copy and paste into GitHub Secrets

**How to get NPM Token:**
1. Go to https://npmjs.com/settings/tokens
2. Click "Generate New Token"
3. Select "Automation" scope
4. Copy and paste into GitHub Secrets

---

### Step 2: Enable GitHub Actions

Go to your repo → **Actions** tab → Click **"I understand my workflows, go ahead and enable them"** (if needed)

---

### Step 3: Test Manually (First Time)

1. Go to **Actions** tab
2. Click **"🤖 Daily Automation Pipeline"** workflow
3. Click **"Run workflow"** button
4. Select **main** branch
5. Click **"Run workflow"**

**Wait 2-3 minutes** for it to complete.

You should see:
- ✅ Plan job completed
- ✅ Code job completed
- ✅ Notifications

---

## What Each Workflow Does

### 🤖 Daily Automation Pipeline (`.github/workflows/daily-automation.yml`)

**Runs:** Every day at 2am UTC (or manually)

**Steps:**
1. **Plan Phase** (2am-2:15am) - Groq AI plans next feature
2. **Code Phase** (2:15am-2:45am) - Groq AI writes code + tests
3. **Quality Gates** (2:45am-3:00am) - Tests pass, coverage >85%
4. **Commit Phase** (3:00am-3:05am) - Auto-commit to main
5. **Docs Phase** (3:05am-3:10am) - Update README + CHANGELOG
6. **Weekly Release** (Every Monday) - Bump version, publish to npm

### 🧪 Tests (`.github/workflows/tests.yml`)

**Runs:** On every push + Pull Requests + Every 6 hours

**Tests on:**
- Node 18, 20, 22 (multiple versions)
- Checks code coverage

### ⚡ Benchmarks (`.github/workflows/benchmark.yml`)

**Runs:** Every Monday + Manual trigger

**Records:**
- Performance metrics
- Memory usage
- Request throughput

---

## Manual Triggers

### Trigger Daily Automation
```bash
# Via GitHub CLI
gh workflow run daily-automation.yml

# Via GitHub UI
Actions → "🤖 Daily Automation Pipeline" → "Run workflow"
```

### Trigger Tests
```bash
# Via GitHub CLI
gh workflow run tests.yml

# Via GitHub UI
Actions → "🧪 Tests" → "Run workflow"
```

### Trigger Benchmarks
```bash
# Via GitHub CLI
gh workflow run benchmark.yml

# Via GitHub UI
Actions → "⚡ Benchmarks" → "Run workflow"
```

---

## Environment Variables in Workflows

Add to workflow files if needed. Edit `.github/workflows/daily-automation.yml`:

```yaml
env:
  MAX_COMPLEXITY: 8
  MIN_TEST_COVERAGE: 85
  MAX_LOC: 300
```

---

## Troubleshooting

### ❌ "Groq API Error"
- Check `GROQ_API_KEY` is set in Secrets
- Verify key is valid at https://console.groq.com
- Wait 24 hours if you just created the key

### ❌ "GitHub API Error"
- Check `GITHUB_TOKEN` is set (it should be auto-created)
- Ensure repo has Actions enabled
- Check branch protection rules don't block automation

### ❌ "npm publish failed"
- Check `NPM_TOKEN` is set in Secrets
- Verify token has publish permissions
- Check package.json version is unique on npm

### ❌ "Tests fail in automation but pass locally"
- Check Node version: `node --version` (should match workflow)
- Check for environment variable differences
- Run: `npm ci` instead of `npm install`

---

## Monitoring & Logs

### View Workflow Logs
1. Go to **Actions** tab
2. Click workflow name
3. Click latest run
4. Click job name
5. Expand steps to see logs

### Set Up Email Notifications
Go to **Settings** → **Notifications** → Check "Email notifications" → Save

### Set Up Slack Notifications
Use GitHub Actions integration: https://github.com/marketplace/actions/slack-notify

---

## Customization

### Change Schedule
Edit `.github/workflows/daily-automation.yml`:

```yaml
schedule:
  - cron: '0 2 * * *'  # 2am UTC every day
  # OR
  - cron: '0 */6 * * *'  # Every 6 hours
  # OR
  - cron: '0 0 * * 1'  # Monday midnight (UTC)
```

[Cron syntax help](https://crontab.guru/)

### Disable Weekly Releases
Comment out in `.github/workflows/daily-automation.yml`:
```yaml
# weekly-release:
#   if: github.event.schedule == '0 2 * * 1'
```

### Increase Test Coverage Requirement
Edit `scripts/ai-plan.js`:
```javascript
// Change from 85% to 95%
coverage: 95%
```

---

## Files Created

```
yantraverse/
├── .github/workflows/
│   ├── daily-automation.yml    ← Main automation
│   ├── tests.yml               ← Test on multiple Node versions
│   └── benchmark.yml           ← Weekly performance check
├── scripts/
│   ├── ai-plan.js              ← Groq: Plans next feature
│   ├── ai-code.js              ← Groq: Writes code
│   ├── auto-commit.js          ← Git: Auto commits
│   ├── update-readme.js        ← Updates README & CHANGELOG
│   ├── bump-version.js         ← Smart versioning
│   └── gh-release.js           ← GitHub releases
├── DAILY_PLAN.json             ← Generated plan (auto)
├── CHANGELOG.md                ← Auto-generated (auto)
├── package.json                ← Updated with scripts
└── GITHUB_SETUP.md             ← This file
```

---

## Next Steps

1. ✅ Add GitHub Secrets (GROQ_API_KEY, NPM_TOKEN)
2. ✅ Run first workflow manually
3. ✅ Monitor logs and verify success
4. ✅ Wait for next scheduled run (2am UTC)
5. ✅ Check for auto-commits in main branch

---

## Support

For issues:
- Check logs in GitHub Actions tab
- Verify all secrets are set
- Ensure workflows have read/write permissions
- Contact Groq support for API issues

---

**Last Updated:** 2026-05-03
**Framework Version:** 1.0.0+
**Automation:** Groq AI + GitHub Actions
