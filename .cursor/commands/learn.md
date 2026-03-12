---
description: Extract reusable patterns from the current session and save them to the project
---

# Learn: Session Pattern Extraction

## Command Description

This command analyzes the current session for reusable patterns — error resolutions, debugging techniques, workarounds, project-specific conventions — and saves them to `flow/resources/` as learned pattern files with `[[wiki-links]]` for Obsidian compatibility.

**Output**: Pattern files in `flow/resources/learned-{pattern-name}.md`.

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/learn - Extract Reusable Patterns

DESCRIPTION:
  Analyzes the current session for reusable patterns and saves them
  to flow/resources/ as learned pattern files with [[wiki-links]].

USAGE:
  /learn                  Analyze session and suggest patterns
  /learn -help            Show this help

WHAT GETS EXTRACTED:
  - Error resolutions (how you fixed a tricky bug)
  - Debugging techniques (steps to diagnose an issue)
  - Workarounds (non-obvious solutions to platform/tool limitations)
  - Conventions (project-specific coding patterns discovered)
  - Architecture insights (structural decisions made during work)
  - Integration patterns (how services/APIs were connected)

WHAT DOES NOT GET EXTRACTED:
  - Trivial fixes (typos, missing imports, obvious syntax errors)
  - One-time issues unlikely to recur
  - Generic knowledge available in documentation
  - Patterns already captured in existing learned files

OUTPUT:
  - Saves to flow/resources/learned-{pattern-name}.md
  - Creates [[wiki-links]] to related brain entries
  - One pattern per file

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
