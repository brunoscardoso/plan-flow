
# Brain Capture System

## Purpose

Automatic knowledge capture that builds a secondary brain during plan-flow skill execution. The brain captures prompts, errors, decisions, and file changes into Obsidian-compatible markdown files with `[[wiki-links]]`.

**Location**: `flow/brain/`
**Global Brain**: `~/plan-flow/brain/`

---

## Behavior

### On Session Start

1. Check if `flow/brain/index.md` exists
2. If it exists: read it silently and internalize the content
3. Apply awareness of active features, recent errors, and recent decisions naturally during work
4. Do NOT announce that you read the brain index
5. When a user request relates to an indexed entry, read the specific brain file for targeted context (e.g., `flow/brain/features/{feature}.md` or `flow/brain/errors/{error}.md`)

### After Any Plan-Flow Skill Completes

When any plan-flow skill (`/setup`, `/discovery-plan`, `/create-plan`, `/execute-plan`, `/review-code`, `/review-pr`, `/write-tests`, `/create-contract`) completes and outputs a `<!-- brain-capture -->` comment block:

1. **Parse** the brain-capture block
2. **Write** to the appropriate brain files
3. **Update** `flow/brain/index.md` (enforce caps)
4. **Sync** relevant patterns to `~/plan-flow/brain/` (central vault)

---

## Brain-Capture Block Format

Skills output this block at the end of their execution:

```html
<!-- brain-capture
skill: <skill-name>
feature: <feature-name>
phase: <phase-number-or-na>
status: <completed|in-progress|failed|discarded>
errors: ["<error description - resolution>"]
decisions: ["<choice made - reasoning>"]
files_changed: ["<file-path>"]
user_prompts: ["<what the user asked>"]
artifacts: ["<flow/discovery/discovery_x.md>"]
-->
```

---

## Processing Rules

### 1. Feature Files (`flow/brain/features/{feature-name}.md`)

**When**: Every brain-capture block creates or updates a feature file.

**File naming**: kebab-case matching the feature name. Example: `contact-enrichment.md`

**If file exists**: Append to the Timeline section. Update Status if changed.

**Template**:

```markdown
---
status: {active|completed|discarded}
created: {YYYY-MM-DD}
---

# [[{feature-name}]]

**Project**: [[{project-name}]]
**Status**: {active|completed|discarded}
**Created**: {YYYY-MM-DD}
**Last Updated**: {YYYY-MM-DD}

## Links

- Discovery: [[{discovery_doc_name}]]
- Plan: [[{plan_doc_name}]]
- Reviews: [[{review_doc_name}]]

## Timeline

### {YYYY-MM-DD} - {skill-name}
- **Prompt**: {user prompt}
- **Outcome**: {what happened}
- **Errors**: {any errors and resolutions}
- **Decisions**: {any decisions made}
- **Files Changed**: {list of files}

## Errors Encountered

- [[{error-name}]] - {brief description}

## Decisions Made

- [[{decision-name}]] - {brief description}
```

### 2. Error Files (`flow/brain/errors/{error-name}.md`)

**When**: Brain-capture block contains non-empty `errors` array.

**File naming**: kebab-case descriptive name. Example: `prisma-connection-pooling.md`

**If file exists**: Append new occurrence to the Occurrences section.

**Template**:

```markdown
---
category: {build|runtime|test|config}
first_seen: {YYYY-MM-DD}
---

# [[{error-name}]]

**Project**: [[{project-name}]]
**Category**: {build|runtime|test|config}
**First Seen**: {YYYY-MM-DD}
**Last Seen**: {YYYY-MM-DD}
**Resolution**: {how it was fixed}

## Description

{What the error is and why it happens}

## Fix

{Step-by-step resolution}

## Occurrences

- {YYYY-MM-DD} in [[{feature-name}]] during {skill-name} phase {phase}
- {YYYY-MM-DD} in [[{feature-name-2}]] during {skill-name} phase {phase}

## Related

- Features: [[{feature-name}]]
- Decisions: [[{decision-name}]]
```

### 3. Decision Files (`flow/brain/decisions/{decision-name}.md`)

**When**: Brain-capture block contains non-empty `decisions` array.

**File naming**: kebab-case descriptive name. Example: `jwt-over-sessions.md`

**Template**:

```markdown
---
date: {YYYY-MM-DD}
feature: {feature-name}
---

# [[{decision-name}]]

**Project**: [[{project-name}]]
**Date**: {YYYY-MM-DD}
**Feature**: [[{feature-name}]]
**Skill**: {skill-name}

## Context

{Why this decision was needed}

## Options Considered

| Option | Pros | Cons |
|--------|------|------|
| {Option A} | {pros} | {cons} |
| {Option B} | {pros} | {cons} |

## Decision

{What was chosen and why}

## Related

- Feature: [[{feature-name}]]
- Errors: [[{error-name}]]
```

### 4. Session Files (`flow/brain/sessions/{YYYY-MM-DD}.md`)

**When**: Every brain-capture block appends to the daily session file.

**If file exists**: Append new entry to Skills Run section.

**Template**:

```markdown
---
date: {YYYY-MM-DD}
---

# Session: {YYYY-MM-DD}

**Project**: [[{project-name}]]

## Skills Run

### {HH:MM} - {skill-name}
- **Feature**: [[{feature-name}]]
- **Status**: {status}
- **Files Changed**: {count}
- **Errors**: {count}
- **Decisions**: {count}

## Summary

- Features touched: [[{feature-1}]], [[{feature-2}]]
- Total errors: {count}
- Total decisions: {count}
```

---

## Index Management

### Index File (`flow/brain/index.md`)

The index is the L1 cache - always loaded at session start. It MUST stay under 30 lines.

**Template**:

```markdown
# Brain Index

**Project**: {project-name}
**Stack**: {detected stack}
**Last Updated**: {YYYY-MM-DD}

## Active Features
- {feature-name} [{status}] - {one-line summary}

## Recent Errors (max 5)
- [[{error-name}]] - {fix summary}

## Recent Decisions (max 3)
- [[{decision-name}]] - {choice summary}

## Cross-Project Patterns (max 3)
- [[{pattern-name}]] - {also seen in: project-name}
```

### Cap Enforcement

When updating the index:

| Section | Max Entries | Rotation Rule |
|---------|-------------|---------------|
| Active Features | All active features listed; completed features as one-liners | When a feature completes, reduce to one-liner. Remove one-liners older than 10 entries. |
| Recent Errors | 5 | When adding a 6th, remove the oldest. Full detail stays in `errors/`. |
| Recent Decisions | 3 | When adding a 4th, remove the oldest. Full detail stays in `decisions/`. |
| Cross-Project | 3 | Only keep patterns that appeared in 2+ projects. |

### Naming Conventions

All brain files use **kebab-case** names that match their `[[wiki-link]]` reference:

- Feature: `flow/brain/features/contact-enrichment.md` → `[[contact-enrichment]]`
- Error: `flow/brain/errors/prisma-connection-pooling.md` → `[[prisma-connection-pooling]]`
- Decision: `flow/brain/decisions/jwt-over-sessions.md` → `[[jwt-over-sessions]]`
- Session: `flow/brain/sessions/2026-03-03.md` → `[[2026-03-03]]`

---

## Global Brain Sync

After processing a brain-capture block, sync relevant entries to the global brain:

### Location

`~/plan-flow/brain/`

### What Gets Synced

| Content | Synced? | Why |
|---------|---------|-----|
| Framework patterns | Yes | Generic, reusable across projects with same framework |
| Language patterns | Yes | Generic, reusable across projects with same language |
| Library patterns | Yes | Generic, reusable across projects using same library |
| Cross-project patterns | Yes | By definition cross-project |
| Project-specific patterns | No | Contains project-specific paths, conventions |
| Error patterns | No | Project-specific, kept in flow/brain/errors/ |
| Feature history | No | Project-specific |
| Session logs | No | Project-specific |
| Decisions | Only if pattern | When same decision type recurs |

### Sync Process

1. Check if `~/plan-flow/brain/` exists. If not, create it with subdirectories: `patterns/`, `projects/`
2. Update `~/plan-flow/brain/projects/{project-name}.md` with current summary (project name, stack, active feature count, last activity date)
3. **After `/setup` generates pattern files**: Sync generic patterns (framework, language, library) to `~/plan-flow/brain/patterns/`. See the Global Pattern Sync section below.

### Global Pattern Sync (after /setup)

When `/setup` generates pattern files, sync **generic** patterns to `~/plan-flow/brain/patterns/`:

**What qualifies as generic (sync these)**:
- Framework patterns (`.claude/resources/frameworks/<fw>-patterns.md`) — best practices, conventions, and anti-patterns that apply to ANY project using that framework
- Language patterns — TypeScript strict mode, Python PEP 8, etc.
- Library patterns (`.claude/resources/libraries/<lib>-patterns.md`) — import styles, naming conventions, and best practices for the library itself

**What is NOT generic (do NOT sync)**:
- Project patterns (`.claude/resources/project/project-patterns.md`) — contains project-specific directory structure, file paths, import aliases
- Patterns that reference project-specific file paths (e.g., `src/schemas/`, `@/lib/prisma`)

**Sync rules**:
1. Target: `~/plan-flow/brain/patterns/<name>.md` (e.g., `nextjs.md`, `typescript.md`, `zod.md`)
2. Use kebab-case file names matching the framework/library name (not `<fw>-patterns.md`, just `<fw>.md`)
3. **If pattern file already exists in global brain**: Merge by appending new sections that don't already exist. Do NOT overwrite — the global file may contain accumulated knowledge from multiple projects
4. **If pattern file does not exist**: Copy it, removing project-specific file paths and examples. Keep only the generic best practices, conventions, and anti-patterns
5. Add a `## Projects Using This` section at the bottom with `[[project-name]]` wiki-links
6. Strip project-specific code examples (paths like `src/schemas/user.schema.ts`). Keep generic examples that show the pattern without referencing specific project files

**Template for global pattern file**:

```markdown
# [Framework/Library] Patterns

## Best Practices

[Generic best practices from setup analysis]

## Allowed Patterns

[Generic allowed patterns]

## Forbidden Patterns

[Generic anti-patterns]

## Projects Using This

- [[project-name-1]]
- [[project-name-2]]
```

### Global Brain Structure (Central Vault)

The global brain at `~/plan-flow/brain/` is the Obsidian vault root. Each project gets a real directory in `projects/` with individual symlinks for each flow subdirectory. Wiki-links between brain entries, plans, and discoveries resolve correctly across all projects.

```
~/plan-flow/brain/                                    ← Open this as Obsidian vault
├── .obsidian/                                         # Pre-configured graph color groups
│   └── graph.json                                     # Uses path-based queries (path:features, etc.)
├── index.md                                           # Lists all registered projects
├── patterns/                                          # Shared engineering patterns
│   └── retry-with-backoff.md
└── projects/
    ├── my-app/                                        ← real directory (not a symlink)
    │   ├── features/  → /home/user/my-app/flow/brain/features/
    │   ├── errors/    → /home/user/my-app/flow/brain/errors/
    │   ├── decisions/ → /home/user/my-app/flow/brain/decisions/
    │   ├── sessions/  → /home/user/my-app/flow/brain/sessions/
    │   ├── discovery/ → /home/user/my-app/flow/discovery/
    │   ├── plans/     → /home/user/my-app/flow/plans/
    │   ├── archive/   → /home/user/my-app/flow/archive/
    │   └── contracts/ → /home/user/my-app/flow/contracts/
    └── api/                                           ← another project
        ├── features/  → /home/user/api/flow/brain/features/
        └── ...
```

Symlinks are created automatically by `plan-flow init`. Each init registers the project with individual links per subdirectory.

---

## Brain vs Ledger

| Aspect | Ledger (`flow/ledger.md`) | Brain (`flow/brain/`) |
|--------|--------------------------|----------------------|
| Content | Curated lessons (AI judgment) | Raw history (factual record) |
| Size | One file, ~150 lines max | Many files, unlimited |
| Purpose | Quick actionable lessons | Full context recall |
| Update trigger | During work, when learning | After skill completion |
| Loaded at | Session start (always) | Session start (index only) |

Both coexist. The ledger is the AI's opinion. The brain is the record of truth. Never replace one with the other.
