
# Learn Skill

## Purpose

Extract reusable patterns from the current session and save them as learned pattern files in `flow/resources/`. This skill analyzes the conversation for error resolutions, debugging techniques, workarounds, and project-specific conventions worth preserving.

This skill **only writes to `flow/resources/`**. It does NOT:

- Write any source code
- Modify any configuration files
- Execute any commands
- Create files outside `flow/resources/`

---

## Restrictions

### Allowed Actions

| Action | Purpose |
|--------|---------|
| Read conversation history | Identify extractable patterns |
| Read `flow/resources/learned-*.md` | Check for duplicates |
| Read `flow/brain/index.md` | Context for wiki-links |
| Write to `flow/resources/learned-*.md` | Save approved patterns |

### Forbidden Actions

| Action | Reason |
|--------|--------|
| Write source code | Learn is for knowledge capture, not code |
| Create files outside `flow/resources/` | Learned patterns only go to resources |
| Save without user approval | User must confirm every pattern |
| Save trivial patterns | Only non-obvious, reusable knowledge |

---

## Extraction Criteria

### What to Extract (Priority Order)

| Priority | Category | Trigger | Example |
|----------|----------|---------|---------|
| **High** | `error-resolution` | Fixed a non-obvious error | "ESM imports require `.js` extension in ts-jest" |
| **High** | `debugging` | Multi-step diagnosis | "Memory leak found by comparing heap snapshots" |
| **Medium** | `workaround` | Bypassed a limitation | "Used `jest.unstable_mockModule` for ESM mocking" |
| **Medium** | `convention` | Discovered project pattern | "All API routes follow `/api/v1/{resource}` pattern" |
| **Low** | `architecture` | Structural decision made | "Chose event-driven over polling for real-time updates" |
| **Low** | `integration` | Service connection pattern | "OAuth2 token refresh uses interceptor pattern" |

### What NOT to Extract

- **Trivial fixes**: typos, missing imports, unused variables, obvious syntax errors
- **One-time issues**: environment-specific problems (wrong Node version, missing env var)
- **Generic knowledge**: standard language/framework features in official docs
- **Already captured**: check `flow/resources/learned-*.md` for existing patterns

---

## Workflow

### Step 1: Session Analysis

Scan the conversation for:

1. **Errors encountered** — Was the resolution non-obvious?
2. **Multiple attempts** — Did you try several approaches before finding the right one?
3. **User corrections** — Did the user redirect your approach?
4. **Configuration discoveries** — Did you learn something about how the project is configured?
5. **Tool-specific tricks** — Did you use a tool in a non-standard way?

### Step 2: Pattern Drafting

For each candidate pattern:

1. Verify it passes extraction criteria (not trivial, not one-time, not generic)
2. Check `flow/resources/learned-*.md` for duplicates
3. Draft using the output template
4. Add `[[wiki-links]]` to related brain entries and features

### Step 3: User Confirmation

Present each drafted pattern to the user. Accept revisions or rejection.

### Step 4: Save

Write approved patterns to `flow/resources/learned-{kebab-case-name}.md`.

---

## Output Format

### Pattern File Template

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

### File Naming

- Format: `learned-{kebab-case-name}.md`
- Location: `flow/resources/`
- Examples: `learned-esm-jest-mocking.md`, `learned-api-rate-limit-retry.md`

---

## Validation Checklist

- [ ] Pattern is non-trivial and reusable across sessions
- [ ] User explicitly approved the pattern before saving
- [ ] File saved to `flow/resources/learned-{name}.md`
- [ ] All `[[wiki-links]]` reference valid kebab-case names
- [ ] No duplicate of existing `learned-*.md` file
- [ ] No source code written
- [ ] No files created outside `flow/resources/`

---

## Related Files

| File | Purpose |
|------|---------|
| `.claude/commands/learn.md` | Command definition |
| `flow/resources/` | Where learned patterns are saved |
| `flow/brain/index.md` | Brain index for wiki-link context |
