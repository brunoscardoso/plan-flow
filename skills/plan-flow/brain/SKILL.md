---
name: brain
description: Automatic knowledge capture system - builds a secondary brain during skill execution with Obsidian-compatible wiki-links
metadata: {"openclaw":{"requires":{"bins":["git"]}}}
user-invocable: false
---

# Brain Capture

Automatic knowledge capture that builds a secondary brain during skill execution. The brain stores features, errors, decisions, and session logs in Obsidian-compatible markdown with `[[wiki-links]]`.

## How It Works

The brain operates in two modes:

1. **Automatic Capture**: After each skill completes, process `<!-- brain-capture -->` blocks to record facts
2. **Manual Entry**: Users can invoke `/note` to capture meeting notes, ideas, and brainstorms

## File Location

```
flow/brain/
├── index.md        # Brain index (loaded at session start)
├── features/       # Feature history and context
├── errors/         # Reusable error patterns
├── decisions/      # Decision records
└── sessions/       # Daily activity logs
```

## Session Start

1. Check if `flow/brain/index.md` exists
2. If it exists, read it silently and internalize active features, recent errors, and decisions
3. Apply context naturally - never announce "I read the brain"

## What Gets Captured

| Skill | Captured Data |
|-------|--------------|
| `/setup` | Project name, stack, patterns generated |
| `/discovery` | Feature name, requirements count, Q&A exchanges |
| `/create-plan` | Phase count, complexity scores, discovery link |
| `/execute-plan` | Errors hit, user corrections, files changed |
| `/review-code` | Issues found, severity breakdown |
| `/review-pr` | PR number, review outcome |
| `/write-tests` | Coverage before/after, failures |
| `/create-contract` | Service name, endpoints documented |

## Brain vs Ledger

Both coexist:
- **Ledger** = curated lessons and opinions ("Don't do X because Y")
- **Brain** = raw factual history ("X happened during Y")

## Index Caps

- 5 recent errors (rotate oldest)
- 3 recent decisions (rotate oldest)
- 3 cross-project patterns (rotate oldest)
- Unlimited active features (move to archived when done)

## Wiki-Links

All cross-references use `[[kebab-case-name]]` format for Obsidian compatibility.
