# 🤖 Yantraverse 6-Agent Autonomous System

## Quick Start

### 1️⃣ Prerequisites
```bash
# Set environment variables
export GROQ_API_KEY="your-groq-key"
export NPM_TOKEN="your-npm-token"  # For publishing only
```

### 2️⃣ Run Agents Manually

**Run all agents (Mon-Fri workflow):**
```bash
npm run agents:all
```

**Run specific agent:**
```bash
npm run agents:research   # Agent 1
npm run agents:plan       # Agent 2
npm run agents:code       # Agent 3
npm run agents:test       # Agent 4
npm run agents:readme     # Agent 5
npm run agents:publish    # Agent 6 (Monday only)
```

### 3️⃣ Automatic Execution
Agents run automatically via GitHub Actions:
- **Monday-Friday, 9 AM UTC** - Daily pipeline (Agents 1-5)
- **Monday, 6 PM UTC** - Publishing (Agent 6)

---

## 📁 Directory Structure

```
agents/
├── agent-1-research.js      # 🔍 Research framework ecosystem
├── agent-2-plan.js          # 📋 Generate implementation plan
├── agent-3-code.js          # 💻 Write production code
├── agent-4-test.js          # 🧪 Test & auto-fix bugs
├── agent-5-readme.js        # 📖 Update documentation
├── agent-6-publish.js       # 🚀 Publish to npm & GitHub
│
├── prompts/
│   ├── agent-1-research.md  # ✅ Complete
│   ├── agent-2-plan.md      # ⏳ Awaiting prompt
│   ├── agent-3-code.md      # ⏳ Awaiting prompt
│   ├── agent-4-test.md      # ⏳ Awaiting prompt
│   ├── agent-5-readme.md    # ⏳ Awaiting prompt
│   └── agent-6-publish.md   # ⏳ Awaiting prompt
│
├── outputs/
│   ├── research-output-YYYY-MM-DD.json
│   ├── implementation-plan-YYYY-MM-DD.json
│   ├── code-changes-YYYY-MM-DD.json
│   ├── test-report-YYYY-MM-DD.json
│   ├── readme-update-YYYY-MM-DD.json
│   └── publish-log-YYYY-MM-DD.json
│
└── SYSTEM.md                # System overview & status
```

---

## 🔄 Pipeline Flow

```
MONDAY (Start Week)
    ↓
Agent 1: 🔍 RESEARCH
  Search top 7 Node.js frameworks
  Analyze 20+ features each
  Identify feature gaps
    ↓
Agent 2: 📋 PLAN
  Prioritize missing features
  Create detailed task breakdown
  Estimate complexity & LOC
    ↓
Agent 3: 💻 CODE
  Generate production-ready code
  Add tests for new features
  Update existing code
    ↓
Agent 4: 🧪 TEST & FIX
  Run test suite
  Auto-detect & fix bugs
  Re-test until passing
    ↓
Agent 5: 📖 README
  Extract implemented features
  Update README.md
  Update CHANGELOG.md
    ↓
Agent 6: 🚀 PUBLISH
  Bump semantic version
  Publish to npm
  Create GitHub Release
  Auto-commit & tag
    ↓
NEXT MONDAY (Cycle repeats)
```

---

## 📊 Status

| Agent | Name | Status | Output |
|-------|------|--------|--------|
| 1 | Research | ✅ Ready | `research-output-{date}.json` |
| 2 | Plan | ✅ Ready | `implementation-plan-{date}.json` |
| 3 | Code | ✅ Ready | `code-changes-{date}.json` |
| 4 | Test | ✅ Ready | `test-report-{date}.json` |
| 5 | README | ✅ Ready | `readme-update-{date}.json` |
| 6 | Publish | ✅ Ready (Monday only) | `publish-log-{date}.json` |

---

## 🚀 GitHub Actions Workflow

**File:** `.github/workflows/yantraverse-ai-pipeline.yml` ✅ READY

### Schedule
```yaml
# Tue-Sat at 2 AM UTC (Agents 1-4)
- cron: '0 2 * * 2-6'

# Monday at 9 AM UTC (Agents 5-6: README + Publish)
- cron: '0 9 * * 1'
```

### Manual Trigger
```bash
# Via GitHub UI
# Actions → yantraverse AI Weekly Pipeline → Run workflow
# Optional: force_publish = true (for testing)
```

---

## 🔐 Required Secrets

Add these to **GitHub Settings → Secrets and variables → Actions**:

| Secret | Source | Purpose |
|--------|--------|---------|
| `GROQ_API_KEY` | https://console.groq.com/keys | Agent inference |
| `NPM_TOKEN` | https://npmjs.com/settings/tokens | npm publishing |
| `GITHUB_TOKEN` | Automatic | GitHub API access |

---

## 📝 Adding New Agents

To add an agent:

1. **Create prompt file:**
   ```bash
   touch agents/prompts/agent-N-{name}.md
   # Write detailed system prompt
   ```

2. **Create agent script:**
   ```bash
   touch agents/agent-N-{name}.js
   # Implement agent logic
   ```

3. **Add package.json script:**
   ```json
   "agents:name": "node agents/agent-N-{name}.js"
   ```

4. **Update workflow** (`.github/workflows/6-agent-pipeline.yml`):
   - Add job for new agent
   - Set dependencies (needs)

---

## 🔍 Viewing Outputs

Agent outputs are saved to `agents/outputs/`:

```bash
# View latest research
cat agents/outputs/research-output-*.json | jq .

# View available outputs
ls -la agents/outputs/
```

On GitHub Actions, artifacts are available:
1. Go to **Actions** tab
2. Select workflow run
3. Download artifacts by agent

---

## 🛠️ Troubleshooting

### Agent fails: "GROQ_API_KEY not set"
```bash
# Set locally for testing
export GROQ_API_KEY="your-key-here"
npm run agents:research
```

### Agent stuck/timeout
```bash
# Kill agent process
pkill -f "node agents/"

# Check logs
cat agents/outputs/*.json | jq . | head -100
```

### Test failures after code generation
Agent 4 automatically detects and fixes:
- Syntax errors
- Test failures
- Type mismatches
- Logic bugs

---

## 📞 Next Steps

Agent 1 (Research) is **ready to use**. 

To enable remaining agents, provide prompts for:
- [ ] Agent 2 (Plan)
- [ ] Agent 3 (Code)
- [ ] Agent 4 (Test & Fix)
- [ ] Agent 5 (README)
- [ ] Agent 6 (Publish)

---

## 📚 References

- [System Overview](./SYSTEM.md)
- [GitHub Actions Workflow](./.github/workflows/yantraverse-ai-pipeline.yml)
- [Agent Prompts](./prompts/)

---

**All 6 agents ready! Deploy and watch the automation magic! ✨🚀**
