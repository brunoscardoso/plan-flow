# Plan-Flow

Structured AI-assisted development workflows for discovery, planning, execution, code reviews, and testing.

Works with **Claude Code**, **Cursor**, **OpenClaw**, and **Codex CLI**.

## Quick Start

```bash
npx planflow-ai init
```

This interactive command installs plan-flow into your project for your chosen platform(s).

## Installation by Platform

### Claude Code

```bash
npx planflow-ai init --claude
```

Installs slash commands (`.claude/commands/`), core rules (`.claude/rules/`), and reference docs (`.claude/resources/`) into your project. Creates or updates your `CLAUDE.md` with plan-flow instructions.

### Cursor

```bash
npx planflow-ai init --cursor
```

Copies Cursor-compatible commands (`.cursor/commands/`) into your project.

### OpenClaw

```bash
npx planflow-ai init --openclaw
```

Copies skill manifests to `skills/plan-flow/` in your project.

### Codex CLI

```bash
npx planflow-ai init --codex
```

Copies skills to `.agents/skills/plan-flow/` and creates or updates your `AGENTS.md` with plan-flow instructions.

### All Platforms

```bash
npx planflow-ai init --all
```

Installs for Claude Code, Cursor, OpenClaw, and Codex CLI simultaneously.

### Options

| Flag | Description |
|------|-------------|
| `--claude` | Install for Claude Code |
| `--cursor` | Install for Cursor |
| `--openclaw` | Install for OpenClaw |
| `--codex` | Install for Codex CLI |
| `--all` | Install for all platforms |
| `--force` | Overwrite existing files |
| `--target <dir>` | Target directory (defaults to current) |

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Analyze project and generate pattern files |
| `/discovery-plan` | Create discovery document for requirements |
| `/create-plan` | Create implementation plan with phases |
| `/execute-plan` | Execute plan phases with verification |
| `/create-contract` | Create integration contract from API docs |
| `/review-code` | Review local uncommitted changes (adaptive depth + multi-agent) |
| `/review-pr` | Review a Pull Request (adaptive depth + multi-agent) |
| `/write-tests` | Generate tests for coverage target |
| `/flow` | Configure plan-flow settings (autopilot, git control, runtime options) |
| `/note` | Capture meeting notes, ideas, brainstorms |
| `/learn` | Extract reusable patterns or learn a topic step-by-step |
| `/pattern-validate` | Scan and index global brain patterns |
| `/heartbeat` | Manage scheduled automated tasks |

## Workflow

### Manual (default)

```
1. /setup           -> Index project patterns (run once)
2. /discovery-plan  -> Gather requirements for a feature
3. /create-plan     -> Create structured implementation plan
4. /execute-plan    -> Execute the plan phase by phase
5. /review-code     -> Review changes before committing
```

### Autopilot Mode

Enable autopilot with `/flow autopilot=true` and the full workflow runs automatically for feature requests:

```
You: "Add dark mode support"

  -> Contracts check (automatic)
  -> Discovery (pauses for your Q&A)
  -> Create plan (pauses for your approval)
  -> Execute plan (automatic)
  -> Review code (automatic)
  -> Archive (automatic)
```

Autopilot classifies every input and only triggers the full flow for feature requests (complexity 3+). Questions, trivial tasks, and slash commands are handled normally.

**Mandatory checkpoints** — even in autopilot, the flow always pauses for:
- **Discovery Q&A**: You answer requirements questions
- **Plan approval**: You review and approve the plan before execution

## Flow Configuration (`/flow`)

The `/flow` command is the central configuration hub. All settings use `key=value` syntax and persist in `flow/.flowconfig` (YAML).

| Setting | Values | Default | Description |
|---------|--------|---------|-------------|
| `autopilot` | `true/false` | `false` | Enable/disable autopilot mode |
| `commit` | `true/false` | `false` | Auto-commit after each completed phase |
| `push` | `true/false` | `false` | Auto-push after all phases + build/test pass |
| `branch` | any string | current branch | Target branch for git operations |

### Examples

```bash
/flow autopilot=true                    # Enable autopilot
/flow commit=true push=true             # Enable git control (works without autopilot)
/flow autopilot=true commit=true        # Enable both
/flow branch=development                # Set target branch
/flow -status                           # Show current config
/flow -reset                            # Reset everything

# Shorthand: text without key=value enables autopilot and starts flow
/flow add dark mode support             # autopilot=true + start discovery
/flow commit=true add user auth         # autopilot=true + git + start discovery
```

### Git Control

When `commit=true`, plan-flow auto-commits after each completed execution phase:

```
Phase 1: Setup types → git commit "Phase 1: Setup types — user-auth"
Phase 2: API endpoints → git commit "Phase 2: API endpoints — user-auth"
Phase 3: Tests → git commit "Phase 3: Tests — user-auth"
Build + Test pass → git commit "Complete: user-auth — all phases done"
                  → git push origin development (if push=true)
```

Git control works independently of autopilot — you can use `commit=true` with manual `/execute-plan` runs.

## Project Tasklist

Each project has a `flow/tasklist.md` that tracks work items across sessions. On session start, active tasks are summarized and you can pick one to work on.

Every command automatically updates the tasklist:
- On start: adds the task to **In Progress**
- On complete: moves it to **Done** with the date
- Next step: adds the logical follow-up to **To Do**

### Scheduled Tasks

Tasks can be scheduled for later execution by linking them to the heartbeat daemon:

```
/flow add to tasklist: implement feature X and execute in 1 hour
```

This creates a tasklist entry linked to a heartbeat one-shot task via `[[]]` references. Both files cross-reference each other for Obsidian navigation.

## Heartbeat (Scheduled Automation)

The heartbeat daemon is a background process that executes scheduled tasks defined in `flow/heartbeat.md`.

### Schedule Syntax

| Syntax | Example |
|--------|---------|
| `daily at {HH:MM AM/PM}` | `daily at 10:00 PM` |
| `every {N} hours` | `every 6 hours` |
| `every {N} minutes` | `every 30 minutes` |
| `weekly on {day} at {HH:MM}` | `weekly on Monday at 9:00 AM` |
| `in {N} hours` | `in 2 hours` (one-shot) |
| `in {N} minutes` | `in 30 minutes` (one-shot) |

### Daemon Management

```bash
npx planflow-ai heartbeat start    # Start the daemon
npx planflow-ai heartbeat stop     # Stop the daemon
npx planflow-ai heartbeat status   # Show daemon status
```

The daemon **auto-starts** during `planflow-ai init` if `flow/heartbeat.md` exists.

### One-Shot Tasks

Tasks with `in {N} hours/minutes` schedules run once and auto-disable after execution. These are used for scheduled tasklist items.

### Retry on Active Session

If a task fails because a Claude Code session is already active, the daemon retries up to 5 times at 60-second intervals instead of failing permanently.

## Code Review

`/review-code` and `/review-pr` include three layers of intelligence:

### Adaptive Depth

Review depth scales automatically based on changeset size:

| Lines Changed | Mode | Behavior |
|--------------|------|----------|
| < 50 | Lightweight | Quick-scan for security, logic bugs, and breaking changes only |
| 50–500 | Standard | Full review with pattern matching and similar implementation search |
| 500+ | Deep | Multi-pass review with file categorization, executive summary, and multi-agent analysis |

### Verification Pass

Every finding goes through a second-pass verification that re-reads surrounding context and asks structured questions to classify findings as Confirmed, Likely, or Dismissed. False positives are filtered before output.

### Severity Re-Ranking

Findings are sorted by impact (Critical > Major > Minor > Suggestion), related findings across files are grouped, and an executive summary is added when there are 5+ findings.

### Multi-Agent Parallel Review

In Deep mode (500+ lines), the review is split into 4 specialized subagents running in parallel:

| Agent | Focus | Model |
|-------|-------|-------|
| Security | Vulnerabilities, secrets, injection, auth bypass | sonnet |
| Logic & Bugs | Edge cases, null handling, race conditions | sonnet |
| Performance | N+1 queries, memory leaks, blocking I/O | sonnet |
| Pattern Compliance | Forbidden/allowed patterns, naming consistency | haiku |

The coordinator merges results, deduplicates overlapping findings, then runs verification and re-ranking.

## Complexity Scoring

Every plan phase has a complexity score (0-10):

| Score | Level | Description |
|-------|-------|-------------|
| 0-2 | Trivial | Simple, mechanical changes |
| 3-4 | Low | Straightforward implementation |
| 5-6 | Medium | Moderate complexity |
| 7-8 | High | Complex, multiple considerations |
| 9-10 | Very High | Significant complexity/risk |

## Directory Structure

All artifacts are stored in `flow/`:

```
flow/
├── archive/           # Completed/abandoned plans
├── brain/             # Automatic knowledge capture (Obsidian-compatible)
│   ├── index.md       # Brain index (loaded at session start)
│   ├── features/      # Feature history and context
│   └── errors/        # Reusable error patterns
├── contracts/         # Integration contracts
├── discovery/         # Discovery documents
├── plans/             # Active implementation plans
├── references/        # Reference materials
├── resources/         # Valuable artifacts captured during skill execution
├── reviewed-code/     # Code review documents
├── reviewed-pr/       # PR review documents
├── tasklist.md        # Project task list (updated in real-time during execution)
├── memory.md          # Persistent artifact tracker (completed work)
├── heartbeat.md       # Scheduled task definitions for the heartbeat daemon
├── log.md             # Heartbeat event log
├── ledger.md          # Persistent project learning journal
├── .flowconfig        # Central config file (autopilot, git control, settings)
└── .gitcontrol        # Git control settings (backward compat)
```

## Session Start Behaviors

When a session starts, plan-flow automatically loads context from your project:

- **Tasklist** (`flow/tasklist.md`) — Presents active tasks and lets you pick one to work on
- **Memory** (`flow/memory.md`) — Loads the last 7 days of completed work so context is never lost
- **Brain** (`flow/brain/index.md`) — Internalizes active features and recent error patterns
- **Ledger** (`flow/ledger.md`) — Internalizes project-specific lessons learned
- **Autopilot** (`flow/.flowconfig`) — If `autopilot: true`, activates automatic workflow orchestration

## Intelligent Learn Skill

The `/learn` skill supports step-by-step teaching. When you run `/learn about <topic>`, it creates a structured curriculum stored as a brain `.md` file. Each step requires your confirmation before progressing, and confirmed steps become learned patterns.

Commands also recommend `/learn` automatically when:
- New dependencies are added during execution
- Non-trivial errors are resolved (3+ attempts)
- The user corrects the approach
- A new technology or pattern is introduced

## Central Obsidian Vault

All projects are linked into a central Obsidian vault at `~/plan-flow/brain/`. Each `planflow-ai init` creates a project directory in the vault with symlinks for brain subdirectories and the tasklist. A global tasklist at `~/plan-flow/brain/tasklist.md` aggregates task counts across all projects.

Open `~/plan-flow/brain/` as an Obsidian vault to browse all projects in one graph.

## Requirements

- Node.js 18+
- `git` - For version control
- `gh` - GitHub CLI (for PR reviews)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run init CLI
node dist/cli/index.js init --all

# Development mode
npm run dev

# Run tests
npm run test
```

## License

MIT
