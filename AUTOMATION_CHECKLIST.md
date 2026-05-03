# 📋 Automation Setup Checklist

Complete these steps to enable full daily automation for yantraverse.

## ✅ Files Created/Updated

### GitHub Actions Workflows
- [x] `.github/workflows/daily-automation.yml` - Main automation (Plan → Code → Test → Commit)
- [x] `.github/workflows/tests.yml` - Tests on Node 18, 20, 22
- [x] `.github/workflows/benchmark.yml` - Weekly performance benchmarks

### Automation Scripts
- [x] `scripts/ai-plan.js` - Groq AI planning
- [x] `scripts/ai-code.js` - Groq AI code generation
- [x] `scripts/auto-commit.js` - Auto-commit to Git
- [x] `scripts/update-readme.js` - README + CHANGELOG updates
- [x] `scripts/bump-version.js` - Smart versioning
- [x] `scripts/gh-release.js` - GitHub release creation

### Configuration Files
- [x] `package.json` - Added automation scripts
- [x] `GITHUB_SETUP.md` - Setup instructions (detailed)
- [x] `DAILY_PLAN.json` - Template for daily plans
- [x] `CHANGELOG.md` - Automated changelog

---

## 🔐 REQUIRED: GitHub Secrets Setup (DO THIS FIRST!)

Go to: **GitHub Repo** → **Settings** → **Secrets and variables** → **Actions**

### Add 2 Secrets:

**Secret 1: GROQ_API_KEY**
1. Get from: https://console.groq.com/keys
2. Click "Create API Key"
3. Copy the key
4. Go to GitHub Secrets
5. Click "New repository secret"
6. Name: `GROQ_API_KEY`
7. Value: [paste your key]
8. Click "Add secret"

**Secret 2: NPM_TOKEN**
1. Get from: https://npmjs.com/settings/tokens
2. Click "Generate New Token"
3. Select "Automation" token type
4. Copy the token
5. Go to GitHub Secrets  
6. Click "New repository secret"
7. Name: `NPM_TOKEN`
8. Value: [paste your token]
9. Click "Add secret"

**Note:** GITHUB_TOKEN is automatic (GitHub creates it)

---

## 🚀 Test First Run (Manual)

1. Go to **Actions** tab in GitHub
2. See "🤖 Daily Automation Pipeline" workflow
3. Click it
4. Click **"Run workflow"** button
5. Keep **main** branch selected
6. Click **"Run workflow"** (green button)
7. Wait 2-3 minutes

**You should see:**
- ✅ Plan job succeeded
- ✅ Code job succeeded  
- ✅ Notify job succeeded

If any fail, check error logs.

---

## ⏰ Automatic Scheduling

Once first run succeeds, these happen automatically:

### Daily (2am UTC every day)
- ✨ Groq AI plans new feature
- 🤖 Groq AI writes code
- 🧪 Tests run automatically
- 📝 README updates with new features
- 🔗 Auto-commits to main branch

### Every 6 hours
- 🧪 Tests run on Node 18, 20, 22

### Every Monday (2am UTC)
- 📊 Performance benchmarks recorded
- 📦 Version bumped (1.0.1, 1.1.0, etc)
- 🎉 Publishes to npm
- 🏷️ Creates GitHub release

---

## 📊 What Gets Committed Daily

Each day, your main branch gets:

```
ai: [FEATURE] Add caching layer to router

+147 lines, -12 lines
Complexity: 6/10
Test Cases: 4
Est. LOC: 150

#automated #ai-generated #daily-build
```

---

## 📈 Example Timeline

```
Monday 2am UTC:
├─ 2:00 - AI plans feature
├─ 2:15 - AI writes code + tests
├─ 2:45 - Tests pass 100%
├─ 3:00 - Auto-commit: "ai: [FEATURE] ..."
├─ 3:10 - Update README/CHANGELOG
├─ 4:00 - Version bump to 1.0.1
├─ 4:15 - Publish to npm
└─ 4:30 - Create GitHub release v1.0.1

Tuesday 2am UTC:
├─ AI plans different feature
├─ AI writes code
└─ Auto-commit

... (repeats daily)

Next Monday 2am UTC:
├─ 7 days of features compiled
├─ Version bump to 1.1.0
├─ Publish to npm
└─ Create GitHub release v1.1.0
```

---

## 🎮 Manual Commands (Optional)

Run these locally if needed:

```bash
# Plan next feature
npm run ai:plan

# Generate code (requires DAILY_PLAN.json)
npm run ai:code

# Auto-commit changes
npm run ai:commit

# Update README
npm run ai:readme

# Bump version
npm run ai:version daily     # 1.0.0-daily.YYYYMMDD
npm run ai:version weekly    # 1.0.1
npm run ai:version monthly   # 1.1.0 or 2.0.0

# Create GitHub release
npm run ai:release

# Run all daily tasks
npm run ai:daily
```

---

## ⚙️ Customization Options

### Change Schedule
Edit `.github/workflows/daily-automation.yml`:

```yaml
schedule:
  - cron: '0 2 * * *'  # Current: 2am UTC daily
```

[Cron schedule syntax](https://crontab.guru)

### Disable Auto-Publish
Edit `.github/workflows/daily-automation.yml` (comment out `weekly-release` job)

### Change Complexity Limit
Edit `scripts/ai-plan.js`:

```javascript
complexity: 10,    // Max complexity (1-10)
estimatedLoc: 200  // Max lines of code
```

---

## 🐛 Troubleshooting

### Workflow fails with "GROQ_API_KEY not set"
- [ ] Go to GitHub Repo Settings → Secrets
- [ ] Verify `GROQ_API_KEY` is listed
- [ ] Check it's not empty
- [ ] Regenerate if expired

### Workflow fails with "npm publish failed"
- [ ] Verify `NPM_TOKEN` is set
- [ ] Check token hasn't expired
- [ ] Verify new version number is unique
- [ ] Check package.json `publishConfig` is correct

### Workflow stuck on "Running"
- [ ] Check GitHub Actions status: https://www.githubstatus.com/
- [ ] Wait 5 more minutes
- [ ] If still stuck, cancel and re-run manually

### Tests fail in CI but pass locally
- [ ] Check Node version: `node --version`
- [ ] Ensure CI uses same Node version
- [ ] Run: `npm ci` instead of `npm install`
- [ ] Check for environment-specific code

### No commits appearing in main branch
- [ ] Check branch protection rules don't block automation
- [ ] Verify `GITHUB_TOKEN` has write access
- [ ] Check workflow logs for error messages
- [ ] Ensure repo isn't in read-only mode

---

## 📞 Support & Docs

- **Groq API Docs**: https://console.groq.com/docs
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **npm Publishing**: https://docs.npmjs.com/cli/v7/commands/npm-publish
- **Semantic Versioning**: https://semver.org/

---

## ✨ Next Steps After Setup

1. ✅ Add GitHub Secrets (GROQ_API_KEY, NPM_TOKEN)
2. ✅ Test first workflow run manually  
3. ✅ Wait for first daily run (2am UTC)
4. ✅ Monitor first 3 days of automation
5. ✅ Adjust Groq prompts if needed
6. ✅ Update CHANGELOG manually for major milestones
7. ✅ Archive this checklist when stable

---

## 📝 Notes

- Workflows are **non-blocking** - if one fails, others continue
- All errors are **non-critical** - failures don't break main branch
- First run takes **2-3 minutes**, subsequent runs are faster
- Daily AI plans focus on **50-200 line changes** (manageable)
- Complexity is **1-10 scale** - avoids overly complex features
- Test coverage **must exceed 85%** before commit
- All commits tagged with **#automated #ai-generated**

---

**Last Updated:** 2026-05-03  
**Status:** Ready for deployment  
**Est. Time to Complete Setup:** 10 minutes
