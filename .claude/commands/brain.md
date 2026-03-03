---
description: Manual brain entry - capture meeting notes, ideas, brainstorms, and insights into the project brain
---

# Brain: Manual Knowledge Capture

## Command Description

This command allows manual brain entries for capturing meeting notes, brainstorms, ad-hoc ideas, and insights that don't come from automatic skill execution. Supports two modes: free-text (default) and guided prompts.

**Output**: Brain entries in `flow/brain/` with `[[wiki-links]]` for Obsidian compatibility.

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/brain - Manual Brain Entry

DESCRIPTION:
  Capture meeting notes, brainstorms, ideas, and insights into the
  project brain. Creates Obsidian-compatible markdown with [[wiki-links]].

USAGE:
  /brain <free text>        Free-text mode (default)
  /brain -guided            Guided mode with structured questions
  /brain -help              Show this help

ARGUMENTS:
  free text     Unstructured text to parse and categorize
  -guided       Triggers structured question mode

EXAMPLES:
  /brain Had a call with the team about auth flow. Decision: use JWT with refresh tokens.
  /brain Discovered that the API rate limits at 100 req/min. Need to add throttling.
  /brain -guided

OUTPUT:
  - Writes to appropriate flow/brain/ subdirectory
  - Creates [[wiki-links]] to related entries
  - Updates flow/brain/index.md if needed

MODES:
  Free-text:  Parses input, extracts entities, categorizes, writes entry
  Guided:     Asks structured questions about work, insights, meetings, decisions

BRAIN STRUCTURE:
  flow/brain/
  ├── index.md        # Brain index (always loaded at session start)
  ├── features/       # Feature history and context
  ├── errors/         # Reusable error patterns
  ├── decisions/      # Decision records
  └── sessions/       # Daily activity logs

RELATED COMMANDS:
  /setup             Creates brain directory structure
  /discovery-plan    Auto-captures to brain after completion
  /execute-plan      Auto-captures to brain after completion
```

---

## Critical Rules

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **Brain Only**           | ONLY write to `flow/brain/` - no source code, no config  |
| **Wiki-Links**           | All cross-references use `[[kebab-case-name]]` format    |
| **Index Caps**           | Max 5 errors, 3 decisions, 3 cross-project in index      |
| **No Code**              | Brain is for knowledge capture, never write source code   |
| **Complete and Stop**    | After writing entry, STOP and wait for user               |

---

## Instructions

### Step 1: Validate Inputs

| Input       | Required | Description                                    |
| ----------- | -------- | ---------------------------------------------- |
| `content`   | Yes      | Free-text or triggered by `-guided` flag       |
| `-guided`   | Optional | Triggers structured question mode              |

If no content and no `-guided` flag, ask:

```markdown
What would you like to capture? You can:
1. Type free text and I'll categorize it automatically
2. Use `/brain -guided` for structured prompts
```

---

### Step 2: Ensure Brain Directory Exists

Check if `flow/brain/` exists. If not, create:

```bash
mkdir -p flow/brain/features flow/brain/errors flow/brain/decisions flow/brain/sessions
```

Check if `flow/brain/index.md` exists. If not, create initial index:

```markdown
# Project Brain

## Active Features
_No features tracked yet._

## Recent Errors
_No errors captured yet._

## Recent Decisions
_No decisions recorded yet._

## Cross-Project Patterns
_No cross-project patterns yet._
```

---

### Step 3: Invoke Brain Skill

The skill will handle:

**Free-text mode**:
1. Parse input text
2. Extract entities (features, technologies, people, errors, decisions)
3. Categorize into appropriate brain subdirectory
4. Create/update brain files with `[[wiki-links]]`
5. Update `flow/brain/index.md` if needed

**Guided mode** (`-guided`):
1. Ask structured questions via `AskUserQuestion`
2. Gather responses and follow-up text
3. Generate properly formatted brain files
4. Link everything with `[[wiki-links]]`
5. Update `flow/brain/index.md`

See: `.claude/resources/skills/brain-skill.md`

---

### Step 4: Present Results

After the skill completes:

**Free-text result**:

```markdown
Brain entry captured!

**Written to**: flow/brain/[subdirectory]/[file].md
**Links created**: [[feature-1]], [[error-name]]
**Index updated**: Yes/No
```

**Guided result**:

```markdown
Brain entry captured!

**Topics covered**:
- Feature: [[feature-name]] - summary
- Decision: [[decision-name]] - choice
- Meeting notes added to [[YYYY-MM-DD]]

**Index updated**: Yes
```

---

## Flow Diagram

```
+------------------------------------------+
|           /brain COMMAND                 |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 1: Validate Inputs                  |
| - Check for content or -guided flag      |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 2: Ensure Brain Directory           |
| - Create flow/brain/ if needed           |
| - Create index.md if needed              |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 3: Invoke Brain Skill               |
| - Free-text: parse, extract, categorize  |
| - Guided: structured questions           |
| - See brain-skill.md                    |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 4: Present Results                  |
| - Show files written                     |
| - Show links created                     |
| - Show index update status               |
+------------------------------------------+
```

---

## Context Optimization

### Recommended Loading Order

1. **Always load first**: This command file (`commands/brain.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Reference Codes for Brain

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-BR-1 | Brain skill restrictions | Understanding allowed actions |
| SKL-BR-2 | Brain skill workflow | Processing entries |
| SKL-BR-3 | Output format and validation | Formatting output |
| PTN-BR-1 | Directory structure and naming | Creating brain files |
| PTN-BR-2 | Wiki-link patterns | Creating cross-references |
| PTN-BR-3 | Feature status lifecycle | Updating feature entries |
| COR-BR-1 | Session start behavior | Understanding brain loading |
| COR-BR-2 | File templates | Creating new brain files |
| COR-BR-3 | Index management caps | Enforcing index limits |

---

## Related Resources

| Resource                    | Purpose                           |
| --------------------------- | --------------------------------- |
| `resources/skills/_index.md`   | Index of skills with reference codes |
| `resources/patterns/_index.md` | Index of patterns with reference codes |
| `resources/core/_index.md`     | Index of core rules with reference codes |
| `brain-skill.md`           | Skill that processes brain entries |
| `brain-patterns.md`        | File naming and link conventions  |
| `brain-capture.md`         | Processing rules and templates    |
