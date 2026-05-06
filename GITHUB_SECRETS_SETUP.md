# 🔐 GitHub Secrets Setup Guide

This document explains how to configure the required secrets for the **Yantraverse 6-Agent AI Pipeline**.

---

## 🚨 Required Secrets

The workflow requires **2 critical secrets**:

| Secret | Source | Purpose |
|--------|--------|---------|
| `GROQ_API_KEY` | Groq Console | Powers all 6 agents for AI analysis |
| `NPM_TOKEN` | npm Account | Authenticates npm publish (Agent 6) |

---

## 📝 Step 1: Get GROQ_API_KEY

### 1.1 Create Groq Account
- Visit: https://console.groq.com/
- Sign up or login
- Complete verification (email + phone)

### 1.2 Generate API Key
1. Go to: https://console.groq.com/keys
2. Click **"Create API Key"**
3. Name: `yantraverse-github` (optional)
4. Copy the key (starts with `gsk_`)
5. **⚠️ Save it immediately** — won't be shown again!

**Example key format:**
```
gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🎯 Step 2: Get NPM_TOKEN

### 2.1 Create npm Account
- Visit: https://npmjs.com/signup
- Or login if you have one: https://npmjs.com/login

### 2.2 Generate Authentication Token

**Option A: Automation Token (Recommended for CI/CD)**
1. Login to https://npmjs.com
2. Account → Auth Tokens
3. Click **"Generate new token"**
4. Select **"Automation"** (allows publish without 2FA)
5. Copy the token (starts with `npm_`)

**Option B: Publish Token**
1. Login to https://npmjs.com
2. Account → Auth Tokens
3. Click **"Generate new token"**
4. Select **"Publish"**
5. Copy the token

**⚠️ Automation Token is required for GitHub Actions publishing!**

**Example token format:**
```
npm_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔑 Step 3: Add Secrets to GitHub

### 3.1 Navigate to GitHub Settings
1. Go to your repository: https://github.com/saditya93/yantraverse
2. Click **Settings** (top menu)
3. Left sidebar → **Secrets and variables**
4. Click **Actions**

### 3.2 Add GROQ_API_KEY

1. Click **New repository secret**
2. **Name:** `GROQ_API_KEY`
3. **Value:** [Paste your Groq API key from Step 1.2]
4. Click **Add secret**

### 3.3 Add NPM_TOKEN

1. Click **New repository secret**
2. **Name:** `NPM_TOKEN`
3. **Value:** [Paste your npm automation token from Step 2.2]
4. Click **Add secret**

### Result
You should see both secrets listed:
```
✅ GROQ_API_KEY
✅ NPM_TOKEN
```

---

## ⚙️ Verifying Setup

### Test GROQ_API_KEY

Run a quick test locally:
```bash
export GROQ_API_KEY="gsk_xxxxx"
node agents/agent-1-research.js
```

Expected output:
```
🔍 AGENT 1: RESEARCH - Starting...
📡 Calling Groq API...
✅ Research complete!
```

### Test npm Token

```bash
npm whoami
```

Expected output:
```
your-npm-username
```

---

## 🚀 Workflow Now Ready

Once both secrets are added, the workflow is ready:

**Automatic Runs:**
- ✅ **Tuesday-Saturday, 2 AM UTC** → Agents 1-4 (Research → Code → Test)
- ✅ **Monday, 9 AM UTC** → Agents 5-6 (README → Publish to npm)

**Manual Trigger:**
- Go to: **Actions → yantraverse AI Weekly Pipeline**
- Click **Run workflow**
- Choose branch: `main`
- Optional: Check **"Force publish"** to test Agent 6

---

## 🛠️ Troubleshooting

### "Artifact not found: research-output"
**Cause:** Agent 1 failed (likely missing GROQ_API_KEY)

**Solution:**
1. Check secrets are added correctly: Settings → Secrets
2. Verify `GROQ_API_KEY` is not empty
3. Check workflow logs for error messages

### "Unable to authenticate npm"
**Cause:** NPM_TOKEN is invalid or wrong type

**Solution:**
1. Regenerate token from https://npmjs.com/settings/tokens
2. Ensure it's an **Automation** token
3. Update secret in GitHub

### "401 Unauthorized" from Groq API
**Cause:** GROQ_API_KEY is wrong or expired

**Solution:**
1. Go to https://console.groq.com/keys
2. Generate a new key
3. Update `GROQ_API_KEY` secret in GitHub

---

## 📚 Workflow Architecture

With secrets configured:

```
Tue-Sat 2 AM UTC
├─ Agent 1 (Research) → Analyzes frameworks
├─ Agent 2 (Plan) → Creates feature plan
├─ Agent 3 (Code) → Generates code
└─ Agent 4 (Test) → Verifies & fixes bugs

Monday 9 AM UTC
├─ Agent 5 (README) → Updates documentation
└─ Agent 6 (Publish) → Version bump & npm publish
```

---

## ✅ Success Checklist

- [ ] Created Groq account & got API key
- [ ] Created npm automation token
- [ ] Added `GROQ_API_KEY` to GitHub Secrets
- [ ] Added `NPM_TOKEN` to GitHub Secrets
- [ ] Ran local test: `node agents/agent-1-research.js`
- [ ] Ran local npm test: `npm whoami`
- [ ] Ready to run first workflow!

---

## 🔒 Security Notes

- ✅ Secrets are **never logged** in workflow output
- ✅ Tokens are **only used** in GitHub Actions
- ✅ Can rotate/revoke anytime from provider console
- ⚠️ **Never commit** `GROQ_API_KEY` or `NPM_TOKEN` to git

---

**Need help?** See the workflow logs at: https://github.com/saditya93/yantraverse/actions

