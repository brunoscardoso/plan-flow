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

Installs slash commands (`.claude/commands/`) and pattern rules (`.claude/rules/`) into your project. Creates or updates your `CLAUDE.md` with plan-flow instructions.

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
3. Add the plan-flow section from `templates/shared/CLAUDE.md.template` to your `CLAUDE.md`

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

## Workflow

```
1. /setup           -> Index project patterns (run once)
2. /discovery-plan  -> Gather requirements for a feature
3. /create-plan     -> Create structured implementation plan
4. /execute-plan    -> Execute the plan phase by phase
5. /review-code     -> Review changes before committing
```

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
├── contracts/         # Integration contracts
├── discovery/         # Discovery documents
├── plans/             # Active implementation plans
├── references/        # Reference materials
├── reviewed-code/     # Code review documents
└── reviewed-pr/       # PR review documents
```

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
