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
| `/setup` | Analyze project structure, detect stack, and run security baseline |
| `/discovery-plan` | Create discovery document with iterative refinement |
| `/create-plan` | Create implementation plan with phases, evals, and complexity scores |
| `/execute-plan` | Execute plan phases with eval verification and pass@k tracking |
| `/create-contract` | Create integration contract from API docs |
| `/review-code` | Review local uncommitted changes (supports parallel review) |
| `/review-pr` | Review a Pull Request (supports parallel review) |
| `/write-tests` | Generate tests for coverage target |
| `/brain` | Capture meeting notes, ideas, and decisions into the project brain |
| `/learn` | Extract reusable patterns from the current session |
| `/flow` | Toggle autopilot mode with workflow type selection |

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

Enable autopilot with `/flow -enable` and the full workflow runs automatically:

```
You: "Add dark mode support"

  -> Contracts check (automatic)
  -> Discovery (pauses for your Q&A)
  -> Create plan (pauses for your approval)
  -> Execute plan (automatic)
  -> Review code (automatic)
  -> Archive (automatic)
```

Autopilot classifies every input and selects the appropriate workflow type. Questions, trivial tasks, and slash commands are handled normally.

| Usage | Description |
|-------|-------------|
| `/flow -enable` | Enable autopilot with default feature workflow |
| `/flow -enable bugfix` | Enable autopilot with bugfix workflow |
| `/flow -enable refactor` | Enable autopilot with refactor workflow |
| `/flow -enable security` | Enable autopilot with security workflow |
| `/flow -disable` | Disable autopilot mode |
| `/flow -status` | Check current state |

**Mandatory checkpoints** — even in autopilot, the flow always pauses for:
- **Discovery Q&A**: You answer requirements questions
- **Plan approval**: You review and approve the plan before execution

State is persisted in `flow/.autopilot` (survives session restarts).

### Workflow Types

| Type | When to Use | Steps |
|------|-------------|-------|
| **feature** (default) | New functionality, behavior changes | contracts -> discovery -> plan -> execute -> review -> archive |
| **bugfix** | Bug reports, error fixes | review (diagnostic) -> plan -> execute -> review (verify) -> archive |
| **refactor** | Code restructuring, tech debt | review (baseline) -> discovery -> plan -> execute -> review (compare) -> archive |
| **security** | Vulnerability fixes, auth changes | review (audit) -> discovery -> plan -> execute -> review (security verify) -> archive |

## Key Features

### Complexity Scoring

Every plan phase has a complexity score (0-10) that drives execution strategy:

| Score | Level | Execution Strategy |
|-------|-------|--------------------|
| 0-2 | Trivial | Aggregate with adjacent phases |
| 3-4 | Low | Aggregate if combined score <= 6 |
| 5-6 | Medium | Cautious, 1-2 phases at a time |
| 7-8 | High | Sequential, one phase at a time |
| 9-10 | Very High | Sequential with extra review |

### Eval-Driven Development

Plan phases can define **evals** — testable assertions verified after each phase with **pass@k** tracking:

```markdown
### Phase 2: API Implementation

**Evals**:
- [EVAL-1]: POST /api/users returns 201 with valid body
- [EVAL-2]: Invalid input returns 400 with validation errors

- [ ] Create user endpoint
- [ ] Add input validation
```

After execution, evals show results:

```markdown
### Phase 2: API Implementation ✅ (pass@1.5)

**Evals**:
- [EVAL-1]: ✅ (k=2) POST /api/users returns 201
- [EVAL-2]: ✅ (k=1) Invalid input returns 400
```

### Iterative Discovery Refinement

Discovery supports up to 3 rounds of refinement. After generating the discovery document, you can iteratively refine specific sections (requirements, approach, scope, risks) with targeted follow-up questions before proceeding to planning.

### Parallel Code Review

For large changesets (8+ files), reviews automatically split files into directory-based groups and spawn parallel review agents. Results are aggregated into a unified review document.

### Security Scanning

- **Setup scan**: `/setup` runs a security baseline — secret detection, `.env` hygiene check, security library inventory, and posture assessment
- **Auto scan**: Every `/execute-plan` run automatically scans changed files for secrets (Step 7.8), with results included in the handoff to code review
- **Security workflow**: Dedicated workflow type with mandatory security verification checkpoint

### Architecture Decision Records (ADRs)

During discovery, when significant architectural decisions are made (choosing between alternatives with long-term impact), ADRs are automatically generated and stored in `flow/brain/decisions/`.

### Project Brain

Automatic knowledge capture across all skills builds institutional memory:

- **Features**: History and context for each feature worked on
- **Errors**: Reusable error patterns and solutions
- **Decisions**: Architecture decision records with rationale
- **Sessions**: Daily activity logs

Brain data is Obsidian-compatible with `[[wiki-links]]` for graph visualization.

### Agent Profiles

All commands operate under structured agent profiles that control tool access:

| Profile | Commands | Capabilities |
|---------|----------|-------------|
| **read-only** | discovery, create-plan, review-code, review-pr, create-contract | Read/search only, output to `flow/` |
| **write-restricted** | brain, learn, flow | Write only to `flow/brain/`, `flow/resources/` |
| **full-access** | execute-plan, setup, write-tests | All tools, all project files |

## Directory Structure

All artifacts are stored in `flow/`:

```
flow/
├── archive/           # Completed/abandoned plans
├── brain/             # Knowledge capture (Obsidian-compatible)
│   ├── index.md       # Brain index
│   ├── features/      # Feature history
│   ├── errors/        # Error patterns
│   ├── decisions/     # ADRs and decision records
│   └── sessions/      # Daily activity logs
├── contracts/         # Integration contracts
├── discovery/         # Discovery documents
├── handoffs/          # Context transfer between commands
├── plans/             # Active implementation plans
├── references/        # Auto-generated reference materials
├── resources/         # Captured artifacts from skill execution
├── reviewed-code/     # Code review documents
├── reviewed-pr/       # PR review documents
├── state/             # Execution state for session continuity
├── audit.log          # JSONL event log for workflow observability
├── ledger.md          # Persistent project learning journal
├── log.md             # Heartbeat log of important events
└── tasklist.md        # Project todo list
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
