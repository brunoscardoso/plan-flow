
# Brain Skill

## Purpose

Allow manual brain entries for capturing meeting notes, brainstorms, ad-hoc ideas, and insights that don't come from skill execution. Supports two modes: free-text (default) and guided prompts.

This skill **only writes to `flow/brain/`**. It does NOT:

- Write any source code
- Modify any configuration files
- Execute any commands
- Create files outside `flow/brain/`

---

## Tool Access

This skill uses the **write-restricted** agent profile. See `agent-profiles.md` [COR-AG-1] for full details.

**Quick reference**: Read/Write allowed within `flow/brain/` only. No source code, no config files, no `flow/ledger.md`.

---

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `content` | Yes | Free-text or triggered by `-guided` flag |
| `-guided` flag | Optional | Triggers structured question mode |

---

## Workflow

### Free-Text Mode (Default)

When user runs `/brain {free text}`:

1. **Parse input** - Read the user's unstructured text
2. **Extract entities** - Identify:
   - Feature references → link to existing features with `[[wiki-links]]`
   - Technologies mentioned → create `[[tech-name]]` links
   - People mentioned → note in entry
   - Error patterns → create/link error files
   - Decisions → create decision files
3. **Categorize** - Determine primary category:
   - Feature-related → write to `flow/brain/features/{feature}.md`
   - Decision → write to `flow/brain/decisions/{decision}.md`
   - General insight → append to today's session file
4. **Write** - Create/update the appropriate brain file with `[[wiki-links]]`
5. **Update index** - Update `flow/brain/index.md` if needed (new feature, error, or decision)

### Guided Mode (`/brain -guided`)

When user runs `/brain -guided`:

1. **Ask structured questions** using `AskUserQuestion`:

```
Question 1: "What did you work on today?"
Options:
- Existing feature (list active features from index)
- New topic
- General notes

Question 2: "Any insights or learnings?"
Options:
- Technical insight
- Business/domain insight
- Process improvement
- None

Question 3: "Any calls or meetings to capture?"
Options:
- Yes, with notes
- No

Question 4: "Any decisions made?"
Options:
- Yes, with context
- No
```

2. **Gather responses** - Collect answers and any follow-up text
3. **Generate structured entry** - Create properly formatted brain files
4. **Link everything** - Add `[[wiki-links]]` to related entries
5. **Update index** - Update `flow/brain/index.md`

---

### Log Entry

After writing the brain entry, append to the project log:

1. **Log** (`flow/log.md`): Under today's date heading (create if absent), append: `- brain: {category} — {summary}`

---

## Output Format

### Free-Text Entry Result

```markdown
Brain entry captured!

**Written to**: flow/brain/features/{feature}.md (or sessions/{date}.md)
**Links created**: [[feature-1]], [[error-name]]
**Index updated**: Yes/No
```

### Guided Entry Result

```markdown
Brain entry captured!

**Topics covered**:
- Feature: [[{feature-name}]] - {summary}
- Decision: [[{decision-name}]] - {choice}
- Meeting notes added to [[{date}]]

**Index updated**: Yes
```

---

## Validation Checklist

- [ ] Entry written to appropriate `flow/brain/` subdirectory
- [ ] All `[[wiki-links]]` reference valid file names (kebab-case)
- [ ] `flow/brain/index.md` updated if new feature, error, or decision added
- [ ] Index caps enforced (5 errors, 3 decisions, 3 cross-project)
- [ ] No files created outside `flow/brain/`
- [ ] No source code written

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/resources/core/brain-capture.md` | Processing rules and templates |
| `.claude/resources/patterns/brain-patterns.md` | File naming and link conventions |
| `flow/brain/index.md` | Brain index (always loaded) |
