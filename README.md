# Plan-Flow

Structured AI-assisted development workflows for discovery, planning, execution, code reviews, and testing.

Works with **Claude Code**, **Cursor**, **OpenClaw**, and **Codex CLI**.

## Quick Start

```bash
npx plan-flow init
```

This interactive command installs plan-flow into your project for your chosen platform(s).

## Installation by Platform

### Claude Code

```bash
npx plan-flow init --claude
```

Installs slash commands (`.claude/commands/`), core rules (`.claude/rules/`), and reference docs (`.claude/resources/`) into your project. Creates or updates your `CLAUDE.md` with plan-flow instructions.

### Cursor

```bash
npx plan-flow init --cursor
```

Copies Cursor-compatible rules (`rules/*.mdc`) into your project.

### OpenClaw

```bash
npx plan-flow init --openclaw
```

Copies skill manifests to `skills/plan-flow/` in your project.

### Codex CLI

```bash
npx plan-flow init --codex
```

Copies skills to `.agents/skills/plan-flow/` and creates or updates your `AGENTS.md` with plan-flow instructions.

### All Platforms

```bash
npx plan-flow init --all
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

## Manual Installation

### Claude Code (Manual)

1. Copy `.claude/commands/*.md` to your project's `.claude/commands/`
2. Copy `.claude/rules/` to your project's `.claude/rules/`
3. Copy `.claude/resources/` to your project's `.claude/resources/`
4. Add the plan-flow section from `templates/shared/CLAUDE.md.template` to your `CLAUDE.md`

### Cursor (Manual)

Copy `rules/` to your project's `rules/`

### OpenClaw (Manual)

Copy `skills/plan-flow/` to your project's `skills/plan-flow/`

### Codex CLI (Manual)

1. Copy `skills/plan-flow/` to your project's `.agents/skills/plan-flow/`
2. Add the plan-flow section from `templates/shared/AGENTS.md.template` to your `AGENTS.md`

## Commands

| Command | Description |
|---------|-------------|
| `/setup` | Analyze project and generate pattern files |
| `/discovery-plan` | Create discovery document for requirements |
| `/create-plan` | Create implementation plan with phases |
| `/execute-plan` | Execute plan phases with verification |
| `/create-contract` | Create integration contract from API docs |
| `/review-code` | Review local uncommitted changes |
| `/review-pr` | Review a Pull Request |
| `/write-tests` | Generate tests for coverage target |
| `/flow` | Toggle autopilot mode on/off |
| `/brain` | Capture meeting notes, ideas, brainstorms |
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

Enable autopilot with `/flow -enable` and the full workflow runs automatically for feature requests:

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

| Usage | Description |
|-------|-------------|
| `/flow -enable` | Enable autopilot mode |
| `/flow -disable` | Disable autopilot mode |
| `/flow -status` | Check current state |

**Mandatory checkpoints** — even in autopilot, the flow always pauses for:
- **Discovery Q&A**: You answer requirements questions
- **Plan approval**: You review and approve the plan before execution

State is persisted in `flow/.autopilot` (survives session restarts).

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
├── tasklist.md        # Project task list (loaded on session start)
├── memory.md          # Persistent artifact tracker (completed work)
├── heartbeat.md       # Scheduled task definitions for the heartbeat daemon
├── log.md             # Heartbeat event log
└── ledger.md          # Persistent project learning journal
```

## Session Start Behaviors

When a session starts, plan-flow automatically loads context from your project:

- **Tasklist** (`flow/tasklist.md`) — Presents active tasks and lets you pick one to work on
- **Memory** (`flow/memory.md`) — Loads the last 7 days of completed work so context is never lost
- **Brain** (`flow/brain/index.md`) — Internalizes active features and recent error patterns
- **Ledger** (`flow/ledger.md`) — Internalizes project-specific lessons learned

## Intelligent Learn Skill

The `/learn` skill supports step-by-step teaching. When you run `/learn about <topic>`, it creates a structured curriculum stored as a brain `.md` file. Each step requires your confirmation before progressing, and confirmed steps become learned patterns.

## Project Tasklist

Each project can have a `flow/tasklist.md` with pending tasks. On session start, the tasklist is loaded and you're asked if you want to pick a task. Completed tasks are tracked in project memory.

## Project Memory

`flow/memory.md` tracks everything completed across sessions. Each entry includes a timestamp, project link, artifact type, file path, and a short summary (max 6 lines). The last 7 days of memory are loaded on every session start, ensuring plan-flow never loses knowledge.

## Heartbeat (Scheduled Automation)

The `flow/heartbeat.md` file works as a cronjob system. Define scheduled tasks and the heartbeat daemon will execute them automatically:

```
do
  daily at 10:00 PM - research about topic X, create md files and add to brain
  daily at 11:00 AM - using flow --enabled, create feature Y, execute, and push to repo
```

Manage the daemon with `/heartbeat start`, `/heartbeat stop`, and `/heartbeat status`.

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
