---
description: Extract reusable patterns from the current session, or learn about a topic with step-by-step teaching
---

# Learn: Session Pattern Extraction & Teaching Mode

## Command Description

This command has two modes:

1. **Pattern Extraction** (`/learn`): Analyzes the current session for reusable patterns and saves them to `flow/resources/`.
2. **Teaching Mode** (`/learn about <topic>`): Creates a structured step-by-step curriculum to teach you about a topic, contextualized to your project's tech stack. Curricula are stored **globally** at `~/plan-flow/brain/learns/` so they can be shared across projects.

**Output**:
- Pattern mode: `flow/resources/learned-{pattern-name}.md`
- Teaching mode: `~/plan-flow/brain/learns/{topic-kebab}.md` (global, indexed with `LRN-*` codes)

---

## Mode Detection

Determine the mode based on user input:

- `/learn` → **Pattern Extraction Mode** (existing behavior, see Steps 1-4 below)
- `/learn about <topic>` → **Teaching Mode** (see Teaching Mode section below)
- `/learn -help` → Show help and stop

---

## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/learn - Extract Patterns & Teaching Mode

DESCRIPTION:
  Two modes: extract reusable patterns from the current session,
  or learn about a topic with step-by-step teaching.

USAGE:
  /learn                  Analyze session and suggest patterns
  /learn about <topic>    Start teaching mode for a topic
  /learn -help            Show this help

PATTERN EXTRACTION MODE (/learn):
  Extracts:
  - Error resolutions (how you fixed a tricky bug)
  - Debugging techniques (steps to diagnose an issue)
  - Workarounds (non-obvious solutions to platform/tool limitations)
  - Conventions (project-specific coding patterns discovered)
  - Architecture insights (structural decisions made during work)
  - Integration patterns (how services/APIs were connected)

  Does NOT extract:
  - Trivial fixes (typos, missing imports, obvious syntax errors)
  - One-time issues unlikely to recur
  - Generic knowledge available in documentation

  Output: flow/resources/learned-{pattern-name}.md

TEACHING MODE (/learn about <topic>):
  Creates a structured curriculum (3-7 steps) contextualized
  to your project's tech stack. Each step is confirmed before
  proceeding. Completed curricula are saved globally so they
  can be reused across all projects.

  Output: ~/plan-flow/brain/learns/{topic-kebab}.md (global)
  Index:  ~/plan-flow/brain/learns/_index.md (LRN-* codes)

RELATED COMMANDS:
  /brain           Capture meeting notes, ideas, brainstorms
  /setup           Generate project pattern files
  /review-code     Review local uncommitted changes
```

---

## Critical Rules

| Rule                     | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| **Ask Before Saving**    | ALWAYS present the drafted pattern to the user before saving     |
| **No Trivial Patterns**  | Skip typos, missing imports, obvious syntax errors               |
| **One Pattern Per File** | Each learned pattern gets its own file                           |
| **Wiki-Links Required**  | All cross-references use `[[kebab-case-name]]` format            |
| **Resources Only**       | ONLY write to `flow/resources/` - no source code, no config      |
| **Complete and Stop**    | After saving pattern(s), STOP and wait for user input            |

---

## Instructions

### Step 1: Review Session for Extractable Patterns

Scan the current conversation looking for:

| Priority | Category | Example |
|----------|----------|---------|
| **High** | Error resolution | Fixed a cryptic build error by changing config X |
| **High** | Debugging technique | Diagnosed memory leak by checking Y |
| **Medium** | Workaround | Bypassed tool limitation with approach Z |
| **Medium** | Convention | Discovered project uses pattern A for B |
| **Low** | Architecture insight | Chose structure X because of constraint Y |
| **Low** | Integration pattern | Connected service A to B using method C |

---

### Step 2: Filter Patterns

Skip anything that matches:

- **Trivial fixes**: typos, missing imports, obvious syntax errors
- **One-time issues**: environment-specific problems unlikely to recur
- **Generic knowledge**: standard language/framework features documented elsewhere
- **Already captured**: patterns that exist in `flow/resources/learned-*.md`

If no extractable patterns found, tell the user:

```markdown
No reusable patterns found in this session.

Patterns worth capturing typically include:
- Non-obvious error resolutions
- Debugging techniques for recurring issues
- Workarounds for tool/platform limitations
- Project-specific conventions discovered during work
```

---

### Step 3: Draft Pattern File

For each pattern found, draft a file using this template:

```markdown
# {Pattern Name}

**Project**: [[{project-name}]]
**Learned**: {YYYY-MM-DD}
**Category**: {error-resolution|debugging|workaround|convention|architecture|integration}

## Problem
{What problem this solves}

## Solution
{The pattern/technique/workaround}

## Example
{Code example if applicable}

## When to Use
{Trigger conditions - when should the LLM apply this pattern}

## Related
- [[{feature-name}]]
- [[{brain-entry}]]
```

Present the draft to the user for confirmation. If they suggest changes, revise the draft.

---

### Step 4: Save Approved Pattern

On user approval:

1. Ensure `flow/resources/` exists (create if needed)
2. Save to `flow/resources/learned-{kebab-case-name}.md`
3. Present result:

```markdown
Pattern saved!

**Written to**: flow/resources/learned-{pattern-name}.md
**Category**: {category}
**Links created**: [[project-name]], [[feature-name]]
```

If multiple patterns were found, repeat Steps 3-4 for each one.

---

## Teaching Mode (`/learn about <topic>`)

When the user invokes `/learn about <topic>`, switch to teaching mode:

### Teaching Restrictions

| Rule | Description |
|------|-------------|
| **Project Context** | Contextualize all examples to the project's actual tech stack |
| **Step Confirmation** | Wait for user confirmation before proceeding to the next step |
| **Global Storage** | Save the curriculum to `~/plan-flow/brain/learns/{topic-kebab}.md` (shared across projects) |
| **Auto-Index** | After saving, automatically update `~/plan-flow/brain/learns/_index.md` with `LRN-*` reference codes (no user action needed) |
| **No Code Changes** | Teaching mode does NOT write source code or modify configs |
| **Complete and Stop** | After all steps are confirmed, STOP and wait for user input |

### Teaching Workflow

1. **Check Existing Learns**: Read `~/plan-flow/brain/learns/_index.md` (if exists) to check if a curriculum for the topic already exists. If it does, offer to resume or present the existing curriculum.
2. **Analyze Context**: Read `flow/brain/index.md` and `flow/references/tech-foundation.md` to understand the project's stack
3. **Generate Curriculum**: Create a 3-7 step curriculum for the topic, contextualized to the project
4. **Present Overview**: Show the full curriculum outline to the user for approval
5. **Step-by-Step Teaching**: For each step:
   - Present the step content with explanations and examples
   - Wait for user confirmation (`next`, `done`, or questions)
   - Mark the step as completed in the curriculum file
   - If the user asks questions, answer them before proceeding
6. **Save Curriculum**: Write the completed curriculum to `~/plan-flow/brain/learns/{topic-kebab}.md`
7. **Auto-Index** (under the hood): Immediately read the saved file, extract section boundaries, generate `LRN-*` reference codes, and update `~/plan-flow/brain/learns/_index.md`. The user does NOT need to run `/pattern-validate` — indexing happens automatically.
8. **Link to Project**: If `flow/brain/index.md` exists, add or update a `## Global Learns` section referencing the new curriculum with its `LRN-*` codes

### Curriculum Template

```markdown
# Learning: {Topic}

**Started**: {YYYY-MM-DD}
**Status**: {in-progress|completed}
**Projects**: [[{project-name}]]

## Curriculum

### Step 1: {Title}
- **Status**: {pending|completed}
- **Content**: {explanation with project-contextualized examples}

### Step 2: {Title}
- **Status**: {pending|completed}
- **Content**: {explanation}

...

## Notes

{Any additional notes, questions asked, or insights gained during learning}

## Projects Using This
- [[{project-name}]]
```

### Learns Index Template (`~/plan-flow/brain/learns/_index.md`)

```markdown
# Global Learns Index

## Overview

Shared learning curricula accumulated across all projects. Use reference codes to load specific sections on-demand.

**Total Files**: X files
**Reference Codes**: LRN-{ABBR}-1 through LRN-{ABBR}-N
**Last Updated**: YYYY-MM-DD

---

## Reference Codes

### MCP (`mcp.md`)

| Code | Description | Lines |
|------|-------------|-------|
| LRN-MCP-1 | What is MCP and why it matters | 10-35 |
| LRN-MCP-2 | MCP server architecture | 36-70 |
| LRN-MCP-3 | Building your first MCP server | 71-120 |

---

## When to Expand

| Code | Expand When |
|------|-------------|
| LRN-MCP-1 | Need to understand MCP fundamentals |
| LRN-MCP-2 | Designing an MCP server |

---

## Projects Using Learns

| Learn | Projects |
|-------|----------|
| mcp | [[project-1]], [[project-2]] |
```

### Reference Code Convention for Learns

| Learn File | Code Prefix | Example Codes |
|---|---|---|
| `mcp.md` | `LRN-MCP` | LRN-MCP-1, LRN-MCP-2, LRN-MCP-3 |
| `docker.md` | `LRN-DK` | LRN-DK-1, LRN-DK-2 |
| `graphql.md` | `LRN-GQ` | LRN-GQ-1, LRN-GQ-2 |
| Other `<name>.md` | `LRN-XX` | Use first 2-3 consonants or unique abbreviation |

### Reference Codes for Teaching

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-LRN-3 | Teaching mode restrictions and workflow | Starting teaching mode |
| SKL-LRN-4 | Curriculum template and global storage | Generating curriculum |
| SKL-LRN-5 | Learns index template and LRN-* code convention | Updating learns index |

---

## Flow Diagram

```
+------------------------------------------+
|           /learn COMMAND                 |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 1: Review Session                   |
| - Scan conversation for patterns         |
| - Categorize by priority                 |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 2: Filter Patterns                  |
| - Skip trivial/one-time/generic          |
| - Check existing learned files           |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 3: Draft Pattern File               |
| - Use template with [[wiki-links]]       |
| - Present to user for confirmation       |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 4: Save Approved Pattern            |
| - Write to flow/resources/learned-*.md   |
| - Show confirmation                      |
+------------------------------------------+
```

---

## Context Optimization

### Recommended Loading Order

1. **Always load first**: This command file (`commands/learn.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Reference Codes for Learn

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-LRN-1 | Purpose, restrictions, and extraction criteria | Understanding what to extract |
| SKL-LRN-2 | Workflow, output format, and validation | Processing and saving patterns |

---

## Brain Capture

<!-- brain-capture
skill: learn
captures:
  - pattern name and category saved
  - project name linked
-->

---

## Resource Capture

During pattern extraction, if you encounter valuable reference materials (API specs, architecture notes, domain knowledge) that are NOT reusable patterns but are still worth preserving, follow the standard resource capture process: ask the user before saving to `flow/resources/`.

---

## Related Resources

| Resource                    | Purpose                           |
| --------------------------- | --------------------------------- |
| `resources/skills/_index.md`   | Index of skills with reference codes |
| `resources/skills/learn-skill.md` | Detailed skill implementation |
| `resources/patterns/_index.md` | Index of patterns with reference codes |
| `resources/core/_index.md`     | Index of core rules with reference codes |
