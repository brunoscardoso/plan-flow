# Plan-Flow: Structured AI-Assisted Development

This project provides a structured workflow system for AI-assisted development with 12+ skills for discovery, planning, execution, brainstorming, contracts, code reviews, and testing. It also includes the **Project Ledger**, **Pattern Capture**, **Model Routing**, and **Design Awareness** — building institutional memory and optimizing execution across sessions.

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
| `/brainstorm` | Free-form idea exploration with collaborative dialogue |
| `/note` | Manual brain entry (capture meeting notes, ideas, brainstorms) |
| `/learn` | Extract reusable patterns from current session |
| `/pattern-validate` | Scan and index global brain patterns for on-demand loading |
| `/heartbeat` | Manage scheduled automated tasks via the heartbeat daemon |
| `/flow` | Configure plan-flow settings — autopilot, git control, model routing, runtime options (`key=value` syntax) |

## Workflow

The recommended workflow is:

1. `/setup` - Run once to index project patterns
2. `/brainstorm` - (Optional) Explore and crystallize a vague idea
3. `/discovery-plan` - Gather requirements for a new feature
4. `/create-plan` - Create structured implementation plan
5. `/execute-plan` - Execute the plan phase by phase
6. `/review-code` or `/review-pr` - Review changes before merging

## Core Features

### Model Routing

By default, all phases use the **most capable/recent model** from the active provider (e.g., opus for Anthropic, o3 for OpenAI). Enable with `/flow model_routing=true` to route phases to cost-effective models based on complexity:

| Complexity | Tier | Model |
|-----------|------|-------|
| 0-3 | Fast | haiku |
| 4-5 | Standard | sonnet |
| 6-10 | Powerful | opus |

See `.claude/resources/core/model-routing.md` for full rules.

### Design Awareness

Discovery always asks whether a feature involves UI work. If confirmed, it captures structured design tokens (colors, typography, spacing, component patterns) into a `## Design Context` section. During execution, these tokens are auto-injected into UI phase prompts.

Features:
- 6 built-in design personalities (Stark, Aura, Neo, Zen, Flux, Terra)
- Screenshot analysis for token extraction
- Optional `interface-design` plugin integration (works without it)

See `.claude/resources/core/design-awareness.md` for full rules.

### Pattern Capture

During execution, discovery, and code review, the LLM silently buffers coding patterns and anti-patterns. At the end of each skill, captured patterns are presented for user approval and written to `.claude/rules/core/allowed-patterns.md` or `forbidden-patterns.md`.

See `.claude/resources/core/pattern-capture.md` for full rules.

### Phase Isolation

When `phase_isolation: true` in `flow/.flowconfig` (default), each `/execute-plan` phase implementation runs in an isolated Agent sub-agent with a clean context window. The sub-agent receives only the context it needs (phase spec, file list, patterns) and returns a structured JSON summary (1-2K tokens). This eliminates context rot — phase 7 has the same quality as phase 1.

Planning/approval stays in the main session; only the implementation step is isolated. When combined with wave execution (`wave_execution: true`), multiple isolated sub-agents run in parallel within each wave.

Disable with `/flow phase_isolation=false`. See `.claude/resources/core/phase-isolation.md` for full rules.

### Wave-Based Parallel Execution

When `wave_execution: true` in `flow/.flowconfig` (default), `/execute-plan` analyzes phase dependencies, groups independent phases into **waves**, and executes phases within each wave in parallel using Agent sub-agents. Waves are sequenced — Wave N+1 starts only after all Wave N phases complete. This can reduce total execution time by 40-60% for plans with independent phases.

Features:
- Explicit `Dependencies` metadata per phase (optional — omit for backward-compatible sequential)
- Topological sort into waves of independent phases
- Parallel Agent sub-agents per wave, reusing phase-isolation context template
- File conflict detection between parallel phases
- Deterministic git commits (sequential in phase order after each wave)

Disable with `/flow wave_execution=false`. See `.claude/resources/core/wave-execution.md` for full rules.

### Discovery Sub-Agents

During `/discovery-plan`, three parallel haiku sub-agents explore the codebase simultaneously: Similar Features, API/Data Patterns, and Schema/Types. Each returns condensed JSON findings merged into a Codebase Analysis section in the discovery document. Always-on, no configuration needed.

See `.claude/resources/core/discovery-sub-agents.md` for full rules.

### Brainstorm with Interactive Questions

`/brainstorm` uses batched `AskUserQuestion` with 3-4 structured questions per round, each with recommended options. Commentary between rounds connects dots and challenges assumptions. Produces optional markdown files for `/discovery-plan`.

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
│   └── heartbeat-prompts/  # Archived resolved heartbeat prompt files
├── brain/             # Automatic knowledge capture (Obsidian-compatible)
│   ├── index.md       # Brain index (loaded at session start)
│   ├── features/      # Feature history and context
│   └── errors/        # Reusable error patterns
├── brainstorms/       # Brainstorm exploration documents
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
├── .scratchpad.md     # Ephemeral per-session notes (cleared each session)
├── .flowconfig        # Central config file (autopilot, git control, settings)
├── .heartbeat-events.jsonl  # Machine-readable notification event stream
├── .heartbeat-state.json    # Session read position for unread event detection
├── .heartbeat-prompt.md     # Pending user input from blocked task (temporary)
└── .gitcontrol        # Git control settings — backward compat (prefer .flowconfig)
```

## Session Start Behaviors

- **Project Ledger**: If `flow/ledger.md` exists, read it silently and internalize learnings. Update it when you learn project-specific lessons. See `.claude/resources/core/project-ledger.md` for full rules.
- **Project Brain**: If `flow/brain/index.md` exists, read it silently and internalize active features and recent errors. See `.claude/resources/core/brain-capture.md` for full rules.
- **Project Tasklist**: If `flow/tasklist.md` exists, read it silently and present a brief summary of active tasks. See `.claude/resources/core/project-tasklist.md` for full rules.
- **Project Memory**: If `flow/memory.md` exists, read it silently and internalize the last 7 days of completed work. See `.claude/resources/core/project-memory.md` for full rules.
- **Session Scratchpad**: If `flow/.scratchpad.md` exists and has content, read it silently. Promote stale entries to ledger/brain, then clear. During work, write noteworthy observations to the scratchpad. See `.claude/resources/core/session-scratchpad.md` for full rules.
- **Autopilot Mode**: If `flow/.flowconfig` has `autopilot: true` (or `flow/.autopilot` exists for backward compat), read `.claude/resources/core/autopilot-mode.md` and follow its workflow for every user input.
- **Heartbeat Log**: If `flow/.heartbeat-events.jsonl` exists, read it and compare against `lastReadTimestamp` in `flow/.heartbeat-state.json`. Summarize unread events (group by task, show counts and any failures/blocks). Update `lastReadTimestamp` to now. If `.heartbeat-state.json` doesn't exist or is corrupted, treat all events as unread and create the state file.
- **Heartbeat Prompt**: If `flow/.heartbeat-prompt.md` exists, read it and present the pending question to the user immediately. This means a background task is waiting for input. After the user responds, archive the prompt file to `flow/archive/heartbeat-prompts/` and the daemon will resume the task.

## Rules

Always-loaded rules are in `.claude/rules/core/`:
- `allowed-patterns.md` - Coding standards to follow
- `forbidden-patterns.md` - Anti-patterns to avoid

On-demand reference files (loaded by commands when needed) are in `.claude/resources/`:
- `core/` - Complexity scoring, model routing, design awareness, pattern capture, project ledger, autopilot mode
- `patterns/` - Templates and patterns for plans, discovery, contracts, brainstorms
- `skills/` - Skill implementation details (12 skills)
- `languages/` - Language-specific patterns (TypeScript, Python)
- `tools/` - Tool-specific patterns (Jest, Pytest, auth, interactive questions)

## Critical Rules

1. **No Auto-Chaining**: Never auto-invoke the next command. Wait for user. **Exception**: When autopilot mode is ON (`flow/.autopilot` exists), commands auto-chain per `.claude/resources/core/autopilot-mode.md`.
2. **Complete and Stop**: After completing a skill, stop and wait for user input.
3. **Discovery First**: `/discovery-plan` is **required** before `/create-plan`. Plans cannot be created without a discovery document. No exceptions.
4. **Tests Last**: Tests are always the last phase of any implementation plan.
5. **Build at End Only**: Run `npm run build` only after ALL phases complete.
6. **No Direct DB Commands**: Never run database migrations directly - ask user to execute.
7. **Tasklist is a file, not memory**: When adding, moving, or completing tasks, you MUST use the Edit tool to write changes to `flow/tasklist.md`. NEVER keep tasks only in conversation memory. If the user says "add to tasklist", read `flow/tasklist.md`, then Edit it. See `.claude/resources/core/project-tasklist.md` for full rules.

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
| `/brainstorm` | Free-form idea exploration with interactive questions |
| `/note` | Manual brain entry (capture meeting notes, ideas, brainstorms) |
| `/learn` | Extract reusable patterns from current session |
| `/flow` | Configure plan-flow settings — autopilot, git control, model routing (`key=value` syntax) |

## Recommended Workflow

1. `/setup` - Run once to index project patterns
2. `/brainstorm` - (Optional) Explore and crystallize a vague idea
3. `/discovery-plan` - Gather requirements for a new feature
4. `/create-plan` - Create structured implementation plan
5. `/execute-plan` - Execute the plan phase by phase
6. `/review-code` or `/review-pr` - Review changes before merging

## Session Start Behaviors

- **Project Ledger**: If `flow/ledger.md` exists, read it silently and internalize learnings. Update it when you learn project-specific lessons. See `.claude/resources/core/project-ledger.md` for full rules.
- **Project Brain**: If `flow/brain/index.md` exists, read it silently and internalize active features and recent errors. See `.claude/resources/core/brain-capture.md` for full rules.
- **Project Tasklist**: If `flow/tasklist.md` exists, read it silently and present a brief summary of active tasks. See `.claude/resources/core/project-tasklist.md` for full rules.
- **Project Memory**: If `flow/memory.md` exists, read it silently and internalize the last 7 days of completed work. See `.claude/resources/core/project-memory.md` for full rules.
- **Session Scratchpad**: If `flow/.scratchpad.md` exists and has content, read it silently. Promote stale entries to ledger/brain, then clear. During work, write noteworthy observations to the scratchpad. See `.claude/resources/core/session-scratchpad.md` for full rules.
- **Autopilot Mode**: If `flow/.flowconfig` has `autopilot: true` (or `flow/.autopilot` exists for backward compat), read `.claude/resources/core/autopilot-mode.md` and follow its workflow for every user input.
- **Heartbeat Log**: If `flow/.heartbeat-events.jsonl` exists, read it and compare against `lastReadTimestamp` in `flow/.heartbeat-state.json`. Summarize unread events (group by task, show counts and any failures/blocks). Update `lastReadTimestamp` to now. If `.heartbeat-state.json` doesn't exist or is corrupted, treat all events as unread and create the state file.
- **Heartbeat Prompt**: If `flow/.heartbeat-prompt.md` exists, read it and present the pending question to the user immediately. This means a background task is waiting for input. After the user responds, archive the prompt file to `flow/archive/heartbeat-prompts/` and the daemon will resume the task.

## Critical Rules

1. **No Auto-Chaining**: Never auto-invoke the next command. Wait for user. **Exception**: When autopilot mode is ON (`flow/.autopilot` exists), commands auto-chain per `.claude/resources/core/autopilot-mode.md`.
2. **Discovery First**: `/discovery-plan` is **required** before `/create-plan`. Plans cannot be created without a discovery document. No exceptions.
3. **Tests Last**: Tests are always the last phase of any implementation plan.
4. **Build at End Only**: Run `npm run build` only after ALL phases complete.
5. **Tasklist is a file, not memory**: When adding, moving, or completing tasks, you MUST use the Edit tool to write changes to `flow/tasklist.md`. NEVER keep tasks only in conversation memory. If the user says "add to tasklist", read `flow/tasklist.md`, then Edit it. See `.claude/resources/core/project-tasklist.md` for full rules.

## Flow Directory Structure

```
flow/
├── archive/           # Completed/abandoned plans
│   └── heartbeat-prompts/  # Archived resolved heartbeat prompt files
├── brain/             # Automatic knowledge capture (Obsidian-compatible)
│   ├── index.md       # Brain index (loaded at session start)
│   ├── features/      # Feature history and context
│   └── errors/        # Reusable error patterns
├── brainstorms/       # Brainstorm exploration documents
├── contracts/         # Integration contracts
├── discovery/         # Discovery documents
├── plans/             # Active implementation plans
├── references/        # Auto-generated reference materials
├── resources/         # Valuable artifacts captured during skill execution
├── reviewed-code/     # Code review documents
├── reviewed-pr/       # PR review documents
├── tasklist.md        # Project todo list (updated in real-time during execution)
├── memory.md          # Persistent artifact tracker (completed skill executions)
├── heartbeat.md       # Scheduled task definitions for the heartbeat daemon
├── log.md             # Heartbeat log of important events
├── ledger.md          # Persistent project learning journal
├── .scratchpad.md     # Ephemeral per-session notes (cleared each session)
├── .flowconfig        # Central config file (autopilot, git control, settings)
├── .heartbeat-events.jsonl  # Machine-readable notification event stream
├── .heartbeat-state.json    # Session read position for unread event detection
├── .heartbeat-prompt.md     # Pending user input from blocked task (temporary)
└── .gitcontrol        # Git control settings — backward compat (prefer .flowconfig)
```

## Central Vault

All projects are linked into a central Obsidian vault at `~/plan-flow/brain/`. Each `plan-flow init` creates a project directory in the vault with individual symlinks for each flow subdirectory (features, errors, decisions, discovery, plans, archive, contracts). Daily session logs live globally at `~/plan-flow/brain/daily/`. Open `~/plan-flow/brain/` as your Obsidian vault to see all projects in one graph with path-based color-coded groups.

## Model Routing

By default, all phases use the most capable/recent model from the active provider. Enable cost-based routing with `/flow model_routing=true` to auto-select models per phase: 0-3 → haiku, 4-5 → sonnet, 6-10 → opus.

## Design Awareness

Discovery asks whether features involve UI work. If confirmed, captures structured design tokens (colors, typography, spacing) into a `## Design Context` section. During execution, tokens are auto-injected into UI phase prompts. Includes 6 built-in design personalities and screenshot-based token extraction. See `.claude/resources/core/design-awareness.md`.

## Pattern Capture

During skill execution, the LLM silently buffers patterns and anti-patterns, presenting them for approval at the end. Approved patterns are written to `.claude/rules/core/allowed-patterns.md` or `forbidden-patterns.md`. See `.claude/resources/core/pattern-capture.md`.

## Phase Isolation

When `phase_isolation: true` in `flow/.flowconfig` (default), each `/execute-plan` phase runs in an isolated Agent sub-agent with a clean context window. Sub-agent receives focused context (phase spec, file list, patterns) and returns structured JSON summary. Eliminates context rot. When combined with wave execution, multiple isolated sub-agents run in parallel within each wave. Disable with `/flow phase_isolation=false`. See `.claude/resources/core/phase-isolation.md`.

## Wave-Based Parallel Execution

When `wave_execution: true` in `flow/.flowconfig` (default), `/execute-plan` analyzes phase dependencies, groups independent phases into waves, and executes in parallel. Plans with explicit `Dependencies` metadata enable parallelism; plans without it execute sequentially (backward-compatible). Disable with `/flow wave_execution=false`. See `.claude/resources/core/wave-execution.md`.

## Discovery Sub-Agents

During `/discovery-plan`, three parallel haiku sub-agents explore the codebase (similar features, API/data patterns, schema/types). Returns condensed JSON findings merged into a Codebase Analysis section. Always-on. See `.claude/resources/core/discovery-sub-agents.md`.

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
- `core/` - Complexity scoring, model routing, design awareness, pattern capture, project ledger, autopilot mode
- `patterns/` - Templates and patterns for plans, discovery, contracts, brainstorms
- `skills/` - Skill implementation details (12 skills)
- `languages/` - Language-specific patterns (TypeScript, Python)
- `tools/` - Tool-specific patterns (Jest, Pytest, auth, interactive questions)
<!-- plan-flow-end -->
