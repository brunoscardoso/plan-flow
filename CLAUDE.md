# Plan-Flow: Structured AI-Assisted Development

This project provides a structured workflow system for AI-assisted development with 8 skills for discovery, planning, execution, contracts, code reviews, and testing. It also includes the **Project Ledger** - a persistent learning journal that builds institutional memory across sessions.

## Quick Start

Use slash commands to invoke skills:

| Command | Purpose |
|---------|---------|
| `/setup` | Analyze project and generate pattern files |
| `/discovery-plan` | Create discovery document for requirements gathering |
| `/create-plan` | Create implementation plan with phases and complexity scores |
| `/execute-plan` | Execute plan phases with verification |
| `/create-contract` | Create integration contract from API docs |
| `/review-code` | Review local uncommitted changes |
| `/review-pr` | Review a Pull Request |
| `/write-tests` | Write tests to achieve coverage target |
| `/brain` | Manual brain entry (capture meeting notes, ideas, brainstorms) |
| `/learn` | Extract reusable patterns from current session |
| `/pattern-validate` | Scan and index global brain patterns for on-demand loading |
| `/heartbeat` | Manage scheduled automated tasks via the heartbeat daemon |
| `/flow` | Toggle autopilot mode with git control (`commit=true push=true`) |

## Workflow

The recommended workflow is:

1. `/setup` - Run once to index project patterns
2. `/discovery-plan` - Gather requirements for a new feature
3. `/create-plan` - Create structured implementation plan
4. `/execute-plan` - Execute the plan phase by phase
5. `/review-code` or `/review-pr` - Review changes before merging

## Core Patterns

### Complexity Scoring

Every plan phase has a complexity score (0-10):

| Score | Level | Description |
|-------|-------|-------------|
| 0-2 | Trivial | Simple, mechanical changes |
| 3-4 | Low | Straightforward implementation |
| 5-6 | Medium | Moderate complexity, some decisions |
| 7-8 | High | Complex, multiple considerations |
| 9-10 | Very High | Significant complexity/risk |

### Flow Directory Structure

All plan-flow artifacts are stored in `flow/`:

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
├── references/        # Auto-generated reference materials (tech-foundation, business-context)
├── resources/         # Valuable artifacts captured during skill execution
├── reviewed-code/     # Local code review documents
├── reviewed-pr/       # PR review documents
├── tasklist.md        # Project todo list (updated in real-time during execution)
├── memory.md          # Persistent artifact tracker (completed skill executions)
├── heartbeat.md       # Scheduled task definitions for the heartbeat daemon
├── log.md             # Heartbeat log of important events
├── ledger.md          # Persistent project learning journal
└── .gitcontrol        # Git control settings (commit/push per phase)
```

## Session Start Behaviors

- **Project Ledger**: If `flow/ledger.md` exists, read it silently and internalize learnings. Update it when you learn project-specific lessons. See `.claude/resources/core/project-ledger.md` for full rules.
- **Project Brain**: If `flow/brain/index.md` exists, read it silently and internalize active features and recent errors. See `.claude/resources/core/brain-capture.md` for full rules.
- **Project Tasklist**: If `flow/tasklist.md` exists, read it silently and present a brief summary of active tasks. See `.claude/resources/core/project-tasklist.md` for full rules.
- **Project Memory**: If `flow/memory.md` exists, read it silently and internalize the last 7 days of completed work. See `.claude/resources/core/project-memory.md` for full rules.
- **Autopilot Mode**: If `flow/.autopilot` exists, read `.claude/resources/core/autopilot-mode.md` and follow its workflow for every user input.

## Rules

Always-loaded rules are in `.claude/rules/core/`:
- `allowed-patterns.md` - Coding standards to follow
- `forbidden-patterns.md` - Anti-patterns to avoid

On-demand reference files (loaded by commands when needed) are in `.claude/resources/`:
- `core/` - Complexity scoring, project ledger rules, autopilot mode, reference index
- `patterns/` - Templates and patterns for plans, discovery, contracts
- `skills/` - Skill implementation details
- `languages/` - Language-specific patterns (TypeScript, Python)
- `tools/` - Tool-specific patterns (Jest, Pytest, auth)

## Critical Rules

1. **No Auto-Chaining**: Never auto-invoke the next command. Wait for user. **Exception**: When autopilot mode is ON (`flow/.autopilot` exists), commands auto-chain per `.claude/resources/core/autopilot-mode.md`.
2. **Complete and Stop**: After completing a skill, stop and wait for user input.
3. **Discovery First**: `/discovery-plan` is **required** before `/create-plan`. Plans cannot be created without a discovery document. No exceptions.
4. **Tests Last**: Tests are always the last phase of any implementation plan.
5. **Build at End Only**: Run `npm run build` only after ALL phases complete.
6. **No Direct DB Commands**: Never run database migrations directly - ask user to execute.

## File Naming Conventions

| Document Type | Pattern |
|--------------|---------|
| Discovery | `discovery_<feature>_v<version>.md` |
| Plan | `plan_<feature>_v<version>.md` |
| Contract | `<service>_contract.md` |
| Code Review | `review_<scope>.md` |
| PR Review | `pr_<number>.md` |

## Architecture

### CLI Entry Point

`src/cli/index.ts` is the main bin entry point. Running `npx plan-flow` or `npx plan-flow init` launches the interactive installation flow.

### Init Command

`src/cli/commands/init.ts` orchestrates platform installation:
- Platform handlers in `src/cli/handlers/` (claude, cursor, openclaw, shared)
- File utilities in `src/cli/utils/files.ts`
- Interactive prompts in `src/cli/utils/prompts.ts`

### Distributable Assets

| Directory | Target Platform | Description |
|-----------|----------------|-------------|
| `.claude/commands/` | Claude Code | Slash command definitions |
| `.claude/rules/` | Claude Code | Core rules (.md, always loaded) |
| `.claude/resources/` | Claude Code | Reference files (.md, on-demand) |
| `rules/` | Cursor | Pattern rules (.mdc) |
| `skills/plan-flow/` | OpenClaw | Skill manifests |
| `templates/` | All | CLAUDE.md template |

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

<!-- plan-flow-start -->
# Plan-Flow: Structured AI-Assisted Development

## Quick Start

| Command | Purpose |
|---------|---------|
| `/setup` | Analyze project and generate pattern files |
| `/discovery-plan` | Create discovery document for requirements gathering |
| `/create-plan` | Create implementation plan with phases and complexity scores |
| `/execute-plan` | Execute plan phases with verification |
| `/create-contract` | Create integration contract from API docs |
| `/review-code` | Review local uncommitted changes |
| `/review-pr` | Review a Pull Request |
| `/write-tests` | Write tests to achieve coverage target |
| `/brain` | Manual brain entry (capture meeting notes, ideas, brainstorms) |
| `/heartbeat` | Manage scheduled automated tasks via the heartbeat daemon |
| `/flow` | Toggle autopilot mode with git control (`commit=true push=true`) |

## Recommended Workflow

1. `/setup` - Run once to index project patterns
2. `/discovery-plan` - Gather requirements for a new feature
3. `/create-plan` - Create structured implementation plan
4. `/execute-plan` - Execute the plan phase by phase
5. `/review-code` or `/review-pr` - Review changes before merging

## Session Start Behaviors

- **Project Ledger**: If `flow/ledger.md` exists, read it silently and internalize learnings. Update it when you learn project-specific lessons. See `.claude/resources/core/project-ledger.md` for full rules.
- **Project Brain**: If `flow/brain/index.md` exists, read it silently and internalize active features and recent errors. See `.claude/resources/core/brain-capture.md` for full rules.
- **Project Tasklist**: If `flow/tasklist.md` exists, read it silently and present a brief summary of active tasks. See `.claude/resources/core/project-tasklist.md` for full rules.
- **Project Memory**: If `flow/memory.md` exists, read it silently and internalize the last 7 days of completed work. See `.claude/resources/core/project-memory.md` for full rules.
- **Autopilot Mode**: If `flow/.autopilot` exists, read `.claude/resources/core/autopilot-mode.md` and follow its workflow for every user input.

## Critical Rules

1. **No Auto-Chaining**: Never auto-invoke the next command. Wait for user. **Exception**: When autopilot mode is ON (`flow/.autopilot` exists), commands auto-chain per `.claude/resources/core/autopilot-mode.md`.
2. **Discovery First**: `/discovery-plan` is **required** before `/create-plan`. Plans cannot be created without a discovery document. No exceptions.
3. **Tests Last**: Tests are always the last phase of any implementation plan.
4. **Build at End Only**: Run `npm run build` only after ALL phases complete.

## Flow Directory Structure

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
├── reviewed-code/     # Code review documents
├── reviewed-pr/       # PR review documents
├── ledger.md          # Persistent project learning journal
└── .gitcontrol        # Git control settings (commit/push per phase)
```

## Central Vault

All projects are linked into a central Obsidian vault at `~/plan-flow/brain/`. Each `plan-flow init` creates a project directory in the vault with individual symlinks for each flow subdirectory (features, errors, decisions, discovery, plans, archive, contracts). Daily session logs live globally at `~/plan-flow/brain/daily/`. Open `~/plan-flow/brain/` as your Obsidian vault to see all projects in one graph with path-based color-coded groups.

## Complexity Scoring

Every plan phase has a complexity score (0-10):

| Score | Level | Description |
|-------|-------|-------------|
| 0-2 | Trivial | Simple, mechanical changes |
| 3-4 | Low | Straightforward implementation |
| 5-6 | Medium | Moderate complexity, some decisions |
| 7-8 | High | Complex, multiple considerations |
| 9-10 | Very High | Significant complexity/risk |

## Rules

Always-loaded rules are in `.claude/rules/core/`:
- `allowed-patterns.md` - Coding standards to follow
- `forbidden-patterns.md` - Anti-patterns to avoid

On-demand reference files (loaded by commands when needed) are in `.claude/resources/`:
- `core/` - Complexity scoring, project ledger rules, autopilot mode, reference index
- `patterns/` - Templates and patterns for plans, discovery, contracts
- `skills/` - Skill implementation details
- `languages/` - Language-specific patterns (TypeScript, Python)
- `tools/` - Tool-specific patterns (Jest, Pytest, auth)
<!-- plan-flow-end -->
