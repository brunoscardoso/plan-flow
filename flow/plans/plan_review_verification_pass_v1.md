# Plan: Review Verification Pass

**Project**: [[cli]]

## Overview

Add a second-pass verification step to both `/review-code` and `/review-pr` that re-examines each finding against surrounding code context to filter false positives. Findings are classified as Confirmed, Likely, or Dismissed. Dismissed findings are removed; Likely findings are tagged. A Verification Summary shows filter stats.

**Based on Discovery**: `flow/discovery/discovery_review_verification_pass_v1.md`

## Goals

- Every finding is re-verified against surrounding code context before output
- False positives are filtered out, reducing noise
- Ambiguous findings are tagged with `[Likely]` for user judgment
- Verification Summary shows transparency (initial count, confirmed, likely, dismissed, FP rate)
- Identical verification logic for both review skills

## Non-Goals

- Not changing severity levels (Critical/Major/Minor/Suggestion remain as-is)
- Not adding auto-learning from dismissed findings (future feature)
- Not modifying the setup, discovery, or execution skills

## Requirements Summary

### Functional Requirements

- [FR-1]: Re-read 10-20 lines surrounding each finding for fresh context
- [FR-2]: Classify as Confirmed / Likely / Dismissed using 3 standard questions + category-specific question
- [FR-3]: Remove Dismissed from output, show only count in Verification Summary
- [FR-4]: Tag Likely findings with `[Likely]` indicator
- [FR-5]: Add Verification Summary to review output
- [FR-6]: Identical logic for review-code and review-pr
- [FR-7]: Category-specific verification questions (security, logic, performance, pattern, test)

### Non-Functional Requirements

- [NFR-1]: Minimal time overhead for small changesets
- [NFR-2]: Transparent filtering — users see the stats

### Constraints

- [C-1]: Markdown-only changes (no TypeScript)
- [C-2]: Preserve existing severity levels
- [C-3]: Additive to output format — don't break existing sections

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-filtering real issues | High | Conservative: when in doubt, classify as Likely not Dismissed |
| Added time for large PRs (20+ findings) | Medium | Batch context reads by file |
| Inconsistent classification | Low | Standardized category-specific questions |

## Phases

### Phase 1: Create Verification Core Resource

**Scope**: Create the central reference document defining verification logic, classification criteria, and output format.
**Complexity**: 4/10

- [x] Create `.claude/resources/core/review-verification.md` with:
  - Verification step definition (re-read context, classify each finding)
  - Three standard verification questions (is it real? is it tested? would a senior agree?)
  - Category-specific verification questions table (security, logic, performance, pattern, test)
  - Classification criteria: Confirmed (clear evidence), Likely (ambiguous), Dismissed (false positive)
  - Conservative classification rule: when in doubt → Likely, not Dismissed
  - Output format: Verification Summary template, `[Likely]` tag format
  - Context read rule: 15 lines above and below the flagged line (midpoint of 10-20 range)

### Phase 2: Update Review Skills

**Scope**: Add verification step to both review-code and review-pr skills.
**Complexity**: 5/10

- [ ] Modify `.claude/resources/skills/review-code-skill.md`:
  - Add Step 5b (Verify Findings) after Step 5 (Pattern Conflicts), before Step 6b (Pattern Review)
  - Reference `.claude/resources/core/review-verification.md` for verification logic
  - Update Step 6 (Generate Document) to use only Confirmed and Likely findings
- [ ] Modify `.claude/resources/skills/review-pr-skill.md`:
  - Add Step 3b (Verify Findings) after Step 3 (Analyze), before Step 4 (Generate)
  - Reference `.claude/resources/core/review-verification.md` for verification logic
  - Update Step 4 (Generate Document) to use only Confirmed and Likely findings
- [ ] Update validation checklists in both skills to include verification step

### Phase 3: Update Output Templates

**Scope**: Add Verification Summary section and `[Likely]` tag to review output templates.
**Complexity**: 3/10

- [ ] Modify `.claude/resources/patterns/review-code-templates.md`:
  - Add `## Verification Summary` section after Review Summary (after the metrics table)
  - Add `[Likely]` tag example to the finding template
  - Update Review Summary metrics to include "After verification" count
- [ ] Ensure review-pr output format (defined in review-pr-skill.md) includes the same Verification Summary

### Phase 4: Update Command Files and Indexes

**Scope**: Add verification references to command files and update indexes.
**Complexity**: 2/10

- [ ] Add verification note to `.claude/commands/review-code.md`
- [ ] Add verification note to `.claude/commands/review-pr.md`
- [ ] Update `.claude/resources/core/_index.md` with review-verification.md reference codes
- [ ] Update `.claude/resources/skills/_index.md` to note verification pass in review skills

### Phase 5: Tests and Verification

**Scope**: Verify all changes are consistent and build passes.
**Complexity**: 2/10

- [ ] Verify review-verification.md has all required sections
- [ ] Verify both review skills have verification step in correct position
- [ ] Verify output template includes Verification Summary
- [ ] Verify command files reference verification
- [ ] Verify indexes are updated
- [ ] Run `npm run build && npm run test` to confirm no regressions

## Complexity Summary

| Phase | Complexity | Description |
|-------|-----------|-------------|
| 1 | 4/10 | Core resource — verification logic |
| 2 | 5/10 | Review skills — add verification step |
| 3 | 3/10 | Output templates — Verification Summary |
| 4 | 2/10 | Command files + indexes |
| 5 | 2/10 | Tests and verification |

**Total Phases**: 5
**Average Complexity**: 3.2/10
**Highest Complexity**: Phase 2 at 5/10

## Execution Strategy

Based on complexity scores:

- **Phase 1**: Execute first (foundation)
- **Phases 2+3**: Can be aggregated (combined 8, both touch review output)
- **Phase 4**: Separate (touches command files)
- **Phase 5**: Tests — always separate

## Key Changes

1. **New Core Resource**: `.claude/resources/core/review-verification.md` — verification logic and classification criteria
2. **Review Code Skill**: New Step 5b (Verify Findings) with context re-read and classification
3. **Review PR Skill**: New Step 3b (Verify Findings) with same logic
4. **Output Templates**: Verification Summary section, `[Likely]` tag on ambiguous findings
5. **Command Files**: Verification references in review-code and review-pr commands
6. **Indexes**: Updated core index with review-verification reference codes
