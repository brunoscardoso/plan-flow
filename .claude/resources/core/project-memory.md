
# Project Memory

## Purpose

A persistent artifact tracker that records every completed skill execution. The memory ensures plan-flow never loses knowledge across sessions by maintaining a structured log of all work done.

**Location**: `flow/memory.md`

---

## Behavior

### On Session Start

1. Check if `flow/memory.md` exists
2. If it exists: read it silently
3. Filter entries to the **last 7 days** based on the Date column
4. Internalize recent activity — know what was worked on recently without announcing it
5. Do NOT read the full memory aloud — only reference it when relevant to the current task

### After Skill Completion

When any plan-flow skill completes successfully, append a new row to the memory table in `flow/memory.md`:

1. Parse the brain-capture block for skill name, feature, artifacts, and status
2. Append a new row to the `## Memory` table
3. Keep the table sorted by date (newest first)

---

## Entry Format

The memory file uses a markdown table for parseability and compact representation:

```markdown
# Project Memory

**Project**: [[{project-name}]]
**Last Updated**: {YYYY-MM-DD}

## Memory

| Date | Skill | Feature | Artifact | Summary |
|------|-------|---------|----------|---------|
| {YYYY-MM-DD} | {skill-name} | [[{feature-name}]] | `{artifact-path}` | {1-line summary of what was done} |
```

### Field Descriptions

| Field | Description | Example |
|-------|-------------|---------|
| Date | Completion date | 2026-03-06 |
| Skill | Skill that completed | execute-plan |
| Feature | Feature wiki-link | [[contact-enrichment]] |
| Artifact | Primary output file path | `flow/plans/plan_contact_enrichment_v1.md` |
| Summary | Max 1 line describing outcome | Implemented phases 1-3 of contact enrichment |

---

## Rules

1. **Append-only**: Never modify or delete existing entries
2. **One row per skill completion**: Each skill invocation gets exactly one row
3. **7-day window at session start**: Only internalize the last 7 days for context
4. **Wiki-links**: Feature names use `[[kebab-case]]` format
5. **Artifact paths**: Use backtick-wrapped relative paths from project root
6. **Summary brevity**: Max 1 line, focus on outcome not process
7. **Auto-create**: If `flow/memory.md` doesn't exist when needed, create it using the template above
