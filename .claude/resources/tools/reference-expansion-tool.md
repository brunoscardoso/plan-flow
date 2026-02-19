
## Reference Code System

### Code Prefixes

| Prefix | Folder | Description |
|--------|--------|-------------|
| COR- | `rules/core/` | Core rules (allowed/forbidden patterns, complexity) |
| LNG- | `resources/languages/` | Language-specific patterns |
| PTN- | `resources/patterns/` | Pattern files (discovery, plans, tests, etc.) |
| SKL- | `resources/skills/` | Skill files for commands |
| TLS- | `resources/tools/` | Tool documentation |

### Code Format

```
[PREFIX]-[SUBCATEGORY]-[NUMBER]
```

**Examples**:
- `COR-1` - Core rule section 1
- `LNG-TS-1` - TypeScript pattern section 1
- `PTN-DIS-1` - Discovery pattern section 1
- `SKL-EXEC-1` - Execute plan skill section 1
- `TLS-AUTH-1` - Auth tool section 1

---

## Expansion Workflow

### Step 1: Load the Index

When a command or skill is invoked, load the relevant `_index.md` file:

```
docs/[folder]/_index.md
```

The index contains a table of all reference codes with descriptions.

### Step 2: Identify Needed References

Based on the current task, identify which reference codes are needed:

- Read the "When to Expand" section in the index
- Match the task to specific codes
- Only expand what's needed for the current task

### Step 3: Expand Reference Codes

Use the Read tool to load the specific line range:

```
Read file: docs/[folder]/[filename].md
Lines: [start]-[end]
```

### Step 4: Use the Content

The expanded content is now in context. Use it for the current task.

---

## When to Expand vs. When to Skip

### Expand When

| Situation | Action |
|-----------|--------|
| Creating a discovery document | Expand PTN-DIS-* (discovery templates/patterns) |
| Writing tests | Expand PTN-JEST-* or PTN-PYTEST-* |
| Reviewing a PR | Expand PTN-PR-* and SKL-PR-* |
| Need specific example code | Expand the example section code |
| Following a specific pattern | Expand that pattern's section |

### Skip When

| Situation | Action |
|-----------|--------|
| Task is simple and familiar | Use index summary only |
| Pattern is well-known | Don't expand, just reference |
| Multiple sections might apply | Start with index, narrow down |
| Already have similar context | Don't duplicate |

---

## Example: Discovery Command

**Task**: Create a discovery document

**Step 1**: Load index
```
Read: resources/patterns/_index.md
```

**Step 2**: Identify needed codes from index
- PTN-DIS-1: Discovery document template
- PTN-DIS-2: Requirements gathering example

**Step 3**: Expand specific sections
```
Read: resources/patterns/discovery-templates.md
Lines: 15-80  (for PTN-DIS-1)
Lines: 244-279 (for PTN-DIS-2)
```

**Step 4**: Use templates to create the document

---

## Example: Execute Plan Command

**Task**: Execute an implementation plan

**Step 1**: Load indexes
```
Read: resources/skills/_index.md
Read: resources/core/_index.md
```

**Step 2**: Identify needed codes
- SKL-EXEC-1: Execution workflow
- SKL-EXEC-2: Complexity-based grouping
- COR-3: Complexity scoring table

**Step 3**: Expand as needed during execution

---

## Maintenance Guidelines

### When to Update Indexes

Update the relevant `_index.md` when:

1. **Adding a new section** to a source file
2. **Removing a section** from a source file
3. **Renaming a section** in a source file
4. **Line numbers change** significantly (after major edits)

### How to Update

1. Open the source file and identify the new/changed section
2. Note the line range (start line to end line)
3. Update the `_index.md` reference table:
   - Add new code for new sections
   - Update line ranges for moved sections
   - Remove codes for deleted sections

### Best Practices

| Practice | Reason |
|----------|--------|
| Update index immediately after editing source | Prevents stale references |
| Use descriptive section descriptions | Helps identify correct code |
| Keep line ranges accurate | Ensures correct content is loaded |
| Review indexes periodically | Catch any drift |

---

## Index File Locations

| Folder | Index Path |
|--------|------------|
| Core | `resources/core/_index.md` |
| Languages | `resources/languages/_index.md` |
| Patterns | `resources/patterns/_index.md` |
| Skills | `resources/skills/_index.md` |
| Tools | `resources/tools/_index.md` |

---

## Troubleshooting

### Reference Code Not Found

If a reference code isn't in the index:
1. Check the prefix matches the correct folder
2. Verify the index file exists
3. The section may have been added recently - check source file

### Line Range Invalid

If the line range doesn't match expected content:
1. The source file was edited after index creation
2. Re-analyze the source file
3. Update the line range in the index

### Content Seems Incomplete

If expanded content is missing context:
1. Expand a larger line range
2. Include surrounding sections
3. Check if section references other sections

---

## Adding New Reference Codes

When adding content to the project that should be indexed:

### Step 1: Create or Edit the Source File

Add your new section to the appropriate file:
- Core rules → `rules/core/`
- Language patterns → `resources/languages/`
- Patterns → `resources/patterns/`
- Skills → `resources/skills/`
- Tools → `resources/tools/`

### Step 2: Determine the Reference Code

Use the naming convention:
```
[PREFIX]-[SUBCATEGORY]-[NUMBER]
```

| Prefix | For Files In |
|--------|--------------|
| COR- | rules/core/ |
| LNG- | resources/languages/ |
| PTN- | resources/patterns/ |
| SKL- | resources/skills/ |
| TLS- | resources/tools/ |

### Step 3: Update the Index

Open the relevant `_index.md` file and add a new row to the reference table:

```markdown
| NEW-CODE-1 | 150-180 | Description of the new section |
```

### Step 4: Verify

1. Check the line numbers match the actual content
2. Ensure the description is clear and actionable
3. Update "When to Expand" section if needed

---

## Context Savings Estimate

The hierarchical loading system reduces context consumption significantly:

### Before (Full Loading)

| Folder | Total Lines | Always Loaded |
|--------|-------------|---------------|
| rules/core/ | ~1,200 | Yes (partial) |
| resources/languages/ | ~800 | No |
| resources/patterns/ | ~2,500 | No |
| resources/skills/ | ~2,800 | No |
| resources/tools/ | ~1,400 | No |
| **Total** | **~8,700** | |

### After (Index + On-Demand)

| Component | Lines | When Loaded |
|-----------|-------|-------------|
| Index files (6 total) | ~600 | Per command |
| Average expansion | ~100-200 | Per task |
| **Typical session** | **~800-1,000** | |

### Estimated Savings

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Discovery command | ~3,500 lines | ~800 lines | ~77% |
| Execute plan | ~4,000 lines | ~1,000 lines | ~75% |
| Write tests | ~2,500 lines | ~600 lines | ~76% |
| **Average** | **~3,300 lines** | **~800 lines** | **~76%** |

---

## System Overview

The context optimization system consists of:

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Index Template | `resources/templates/index-template.md` | Template for creating new indexes |
| Core Index | `resources/core/_index.md` | Core rules reference codes |
| Languages Index | `resources/languages/_index.md` | Language patterns reference codes |
| Patterns Index | `resources/patterns/_index.md` | Pattern files reference codes |
| Skills Index | `resources/skills/_index.md` | Skill files reference codes |
| Tools Index | `resources/tools/_index.md` | Tool files reference codes |
| Expansion Tool | `resources/tools/reference-expansion-tool.md` | This documentation |

### Workflow Summary

```
Command Invoked
      |
      v
Load Command File
      |
      v
Load Relevant Indexes (_index.md)
      |
      v
Identify Needed Reference Codes
      |
      v
Expand Specific Sections (Read tool)
      |
      v
Execute Task with Loaded Context
      |
      v
(Optional) Update Indexes if Files Changed
```

---

## Summary

| Step | Action |
|------|--------|
| 1 | Load `_index.md` for relevant folder |
| 2 | Identify reference codes needed for task |
| 3 | Use Read tool with specific line ranges |
| 4 | Use content for current task |
| 5 | Update index if source files change |
