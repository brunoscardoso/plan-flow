
# Parallel Review Patterns

## Overview

When a review encounters a large number of changed files, the review can be split across multiple parallel agents for faster execution. Each agent reviews a subset of files grouped by directory, then findings are aggregated into a single review document.

---

## Activation Threshold

**Trigger**: Parallel review mode activates when the changeset contains **8 or more changed files**.

Below the threshold, the standard single-pass review workflow is used (backward compatible).

```
Changed files < 8  →  Single-pass review (standard)
Changed files >= 8 →  Parallel review mode (this pattern)
```

---

## File Grouping Strategy

### PTN-PRV-1: Directory-Based Grouping

Group changed files by their **top-level directory under `src/`** (or project root for non-src files). Keep related files together for context coherence.

**Rules**:
1. Group by the first directory segment after `src/` (e.g., `src/components/`, `src/api/`, `src/utils/`)
2. Test files are grouped with their source files (e.g., `src/utils/foo.test.ts` goes with the `src/utils/` group)
3. Root-level files (config, package.json, etc.) form their own group: `root`
4. If a group has only 1 file, merge it into the nearest related group or the `root` group
5. Maximum 4 groups — if more would be created, merge smallest groups together
6. Minimum 2 files per group (except when merging creates uneven splits)

**Example**:

```
Changed files:
  src/auth/login.ts
  src/auth/session.ts
  src/auth/middleware.ts
  src/api/users.ts
  src/api/posts.ts
  src/api/comments.ts
  src/utils/crypto.ts
  src/utils/validation.ts
  tests/auth.test.ts
  package.json

Groups:
  Group 1 (auth):  src/auth/login.ts, src/auth/session.ts, src/auth/middleware.ts, tests/auth.test.ts
  Group 2 (api):   src/api/users.ts, src/api/posts.ts, src/api/comments.ts
  Group 3 (utils): src/utils/crypto.ts, src/utils/validation.ts, package.json
```

---

## PTN-PRV-2: Agent Spawn and Aggregation

### Agent Spawning

For each file group, spawn a **read-only** agent with:

1. **File list**: The specific files in this group
2. **Pattern context**: Forbidden patterns, allowed patterns, language-specific patterns
3. **Instructions**: Review each file against patterns, produce structured findings
4. **Profile**: read-only (no Edit/Write/Bash write commands)

```
Coordinator
├── Spawn Agent 1 (auth group) — read-only, parallel
├── Spawn Agent 2 (api group)  — read-only, parallel
└── Spawn Agent 3 (utils group) — read-only, parallel
    │
    ├── Each agent returns structured findings
    │
    v
Coordinator aggregates → Single review document
```

### Structured Findings Format

Each parallel agent returns findings in this format:

```markdown
## Group: {group-name}

### Files Reviewed
- `{file-path-1}`
- `{file-path-2}`

### Findings

#### Finding: {finding-name}
- **File**: `{file-path}`
- **Line**: {line-number}
- **Severity**: {Critical|Major|Minor|Suggestion}
- **Fix Complexity**: {X/10}
- **Pattern**: {pattern reference}
- **Description**: {detailed explanation}
- **Suggested Fix**: {code suggestion}

### Positive Highlights
- {highlight-1}
- {highlight-2}
```

### Aggregation Rules

The coordinator merges parallel findings into the final review document:

1. **Collect** all findings from all agents
2. **Sort** by severity (Critical → Major → Minor → Suggestion)
3. **Deduplicate** cross-cutting concerns — if multiple agents flag the same pattern violation type, consolidate into a single finding with multiple file references
4. **Merge** positive highlights into a single section
5. **Calculate** aggregate metrics (total findings, severity counts, total fix effort)
6. **Generate** the final review document using the standard review template

### Cross-Group Analysis

After aggregation, the coordinator performs a brief cross-group analysis:

- **Cross-cutting patterns**: Same violation type appearing in multiple groups
- **Consistency issues**: Different groups using different patterns for the same concern
- **Missing patterns**: Code in one group that should follow patterns established in another

Add a "Cross-Group Analysis" section to the review document if any issues are found.

---

## Coordinator Responsibilities

The coordinator (the main review process) handles:

1. **Threshold check**: Count changed files, decide single-pass vs parallel
2. **File grouping**: Apply PTN-PRV-1 rules to create groups
3. **Agent spawning**: Spawn read-only agents with file lists and pattern context
4. **Results collection**: Wait for all agents to complete
5. **Aggregation**: Merge findings per PTN-PRV-2 rules
6. **Cross-group analysis**: Check for cross-cutting concerns
7. **Document generation**: Create the final review document
8. **Brain capture**: Perform a single brain-capture write (agents do NOT write to brain)
9. **Fallback**: If any agent fails or times out, include its files in the coordinator's own review pass

---

## Brain Capture Coordination

**Critical**: Only the coordinator writes to brain files. Parallel agents must NOT write to `flow/brain/` or `flow/log.md`.

- Parallel agents return structured findings as text output
- The coordinator processes all findings and performs a single brain-capture
- This prevents concurrent write conflicts on brain files

---

## Backward Compatibility

- Below the threshold (< 8 files), the standard review workflow is unchanged
- The parallel review mode is an optimization, not a replacement
- All existing review patterns (severity levels, fix complexity, pattern conflicts) apply equally to parallel reviews
- The final review document has the same format regardless of single-pass or parallel execution
