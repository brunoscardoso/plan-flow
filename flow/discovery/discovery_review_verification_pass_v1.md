# Discovery: Review Verification Pass

**Project**: [[cli]]

## Context

Current `/review-code` and `/review-pr` reviews produce findings in a single pass — every issue detected goes straight to the output. This can include false positives, duplicate findings from the same root cause, and low-confidence findings that add noise. Adding a second-pass verification step filters false positives before presenting to the user, improving trust in review output.

**Reference**: `flow/resources/review-verification-pass.md`

## Referenced Documents

| Document | Key Findings |
|----------|--------------|
| `flow/resources/review-verification-pass.md` | Full spec: verification step after Step 4/5, three classification levels (Confirmed/Likely/Dismissed), verification questions by category, output summary format |
| `.claude/resources/skills/review-code-skill.md` | Step 4 (Analyze) → Step 5 (Pattern Conflicts) → Step 6b (Pattern Review) → Step 6 (Generate). Injection point: after Step 5, before Step 6b. |
| `.claude/resources/skills/review-pr-skill.md` | Step 3 (Analyze) → Step 4 (Generate). Injection point: after Step 3, before Step 4. No pattern conflict step. |
| `.claude/resources/patterns/review-code-templates.md` | Output template has: Review Info, Changed Files, Reference Implementations, Review Summary, Findings, Pattern Conflicts, Rule Updates, Positive Highlights, Commit Readiness. |

## Code Context Analysis

### Review Code Skill Integration Points

| File | Usage | Line(s) |
|------|-------|---------|
| `.claude/resources/skills/review-code-skill.md` | Step 4: Analyze Code Changes (7 checks) | 127-137 |
| `.claude/resources/skills/review-code-skill.md` | Step 5: Pattern Conflicts | 139-162 |
| `.claude/resources/skills/review-code-skill.md` | Step 6b: Pattern Review (approval flow) | 163-172 |
| `.claude/resources/skills/review-code-skill.md` | Step 6: Generate Review Document | 176-191 |
| `.claude/resources/skills/review-code-skill.md` | Severity levels (Critical/Major/Minor/Suggestion) | 194-202 |

### Review PR Skill Integration Points

| File | Usage | Line(s) |
|------|-------|---------|
| `.claude/resources/skills/review-pr-skill.md` | Step 3: Analyze Code Changes (5 checks) | 175-184 |
| `.claude/resources/skills/review-pr-skill.md` | Step 4: Generate Review Document | 185-212 |
| `.claude/resources/skills/review-pr-skill.md` | Severity levels (same 4 levels) | 319-327 |
| `.claude/resources/skills/review-pr-skill.md` | Fix Complexity Scoring (0-10) | 330-367 |

### Output Templates

| File | Usage | Line(s) |
|------|-------|---------|
| `.claude/resources/patterns/review-code-templates.md` | Review Summary metrics table | 50-60 |
| `.claude/resources/patterns/review-code-templates.md` | Findings section structure | 64-86 |
| `.claude/resources/patterns/review-code-templates.md` | Positive Highlights | 162-167 |

### Command Files

| File | Purpose |
|------|---------|
| `.claude/commands/review-code.md` | Command orchestrator — needs verification reference |
| `.claude/commands/review-pr.md` | Command orchestrator — needs verification reference |

**Total References**: 8 files across 4 categories

### Key Patterns Observed

- Both review skills use the same 4 severity levels: Critical, Major, Minor, Suggestion
- review-code has a pattern conflict step (Step 5) that review-pr lacks
- review-pr tracks finding Status (Open/Resolved) for re-reviews
- Output templates include a "Review Summary" with metrics — natural place for verification stats
- The verification step follows the same cross-cutting pattern as Pattern Capture and Brain Capture

## Requirements Gathered

### Functional Requirements

- [FR-1]: After initial analysis, EVERY finding MUST be re-examined against surrounding code context (10-20 lines around flagged line)
- [FR-2]: Each finding MUST be classified as Confirmed (clear issue with evidence), Likely (probable but ambiguous), or Dismissed (false positive)
- [FR-3]: Dismissed findings MUST be removed from the output — only a count shown in the Verification Summary
- [FR-4]: Likely findings MUST be marked with a confidence indicator in the output (e.g., `[Likely]` tag)
- [FR-5]: A Verification Summary section MUST be added to the review output showing: initial count, confirmed count, likely count, dismissed count, false positive rate
- [FR-6]: The verification logic MUST be identical for both `/review-code` and `/review-pr`
- [FR-7]: Verification questions MUST be category-specific (security → exploit path check, logic → reachability check, performance → hot path check, pattern → intentional deviation check, missing test → existing coverage check)

### Non-Functional Requirements

- [NFR-1]: Verification should not significantly increase review time for small changesets (< 50 lines, < 5 findings)
- [NFR-2]: The verification step should be transparent — users understand findings were filtered
- [NFR-3]: False positive rate should decrease over time as the system learns from pattern capture

### Constraints

- [C-1]: Verification is a markdown-only change — no TypeScript code needed (same as all plan-flow skill changes)
- [C-2]: Must preserve existing severity levels (Critical/Major/Minor/Suggestion) — verification classifies orthogonally
- [C-3]: Must not break existing review output format — verification adds sections, doesn't change existing ones

## Open Questions

| # | Category | Question | Status | Answer |
|---|----------|----------|--------|--------|
| 1 | Technical | Should verification re-read context or use existing? | Answered | Re-read 10-20 lines for each finding |
| 2 | Output | Should dismissed findings be hidden or shown? | Answered | Hidden with summary count only |
| 3 | Scope | Same logic for both skills? | Answered | Identical for both |

## Technical Considerations

### Architecture Fit

- Follows the cross-cutting concern pattern: define verification logic in one place, reference from both skills
- Could be a core resource file (`.claude/resources/core/review-verification.md`) or inline in skills
- Recommendation: Create a core resource file since both skills need the same logic — single source of truth

### Dependencies

- Depends on existing severity levels being stable (they are)
- Depends on existing analysis step producing structured findings (it does)
- No new tools needed — re-reading context uses the existing Read tool

### Patterns to Follow

- Same pattern as pattern-capture.md, design-awareness.md: core resource + sections in skill files + sections in command files
- Verification summary follows the same metrics table pattern as the existing Review Summary

### Potential Challenges

- Verification of findings in large PRs (20+ findings) could add significant context reads
- Borderline findings between "Confirmed" and "Likely" require judgment — the three questions help but aren't deterministic
- Re-reading context for each finding means the same file may be read multiple times (different line ranges)

## Proposed Approach

### High-Level Architecture

1. **New core resource**: `.claude/resources/core/review-verification.md` — defines verification logic, classification criteria, category-specific questions, output format
2. **Modify review-code skill**: Add Step 5b (Verify Findings) after Step 5 (Pattern Conflicts), before Step 6b (Pattern Review)
3. **Modify review-pr skill**: Add Step 3b (Verify Findings) after Step 3 (Analyze), before Step 4 (Generate)
4. **Update review-code template**: Add Verification Summary section to output template, add `[Likely]` tag format for findings
5. **Update command files**: Add Verification reference to both review commands

### Verification Flow

```
Initial Analysis → N findings
    ↓
For each finding:
    1. Re-read 10-20 lines surrounding context
    2. Ask 3 verification questions (is it real? is it tested? would a senior agree?)
    3. Ask category-specific question
    4. Classify: Confirmed / Likely / Dismissed
    ↓
Filter: Remove Dismissed
Tag: Mark Likely with [Likely]
Keep: Confirmed as-is
    ↓
Generate output with Verification Summary
```

### Alternative Approaches Considered

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Inline in each skill (no core resource) | Simpler, fewer files | Duplicated logic, harder to maintain | No |
| **Core resource + skill modifications** | **Single source of truth, consistent** | **One more file** | **Yes** |
| Verification as a separate post-processing command | Most flexible, can re-verify | Breaks the single-review flow, extra step for user | No |

## Risks and Unknowns

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-filtering (real issues dismissed) | High | Conservative classification — when in doubt, classify as Likely not Dismissed |
| Added review time for large PRs | Medium | Verification scales linearly; for 20+ findings, batch context reads by file |
| Inconsistent classification between runs | Low | Category-specific questions standardize the evaluation |

### Unknowns

- [ ] Exact line range for "surrounding context" — 10 or 20 lines? (Reference doc says 10-20, need to decide)

## Next Steps

- [ ] Create implementation plan: `flow/plans/plan_review_verification_pass_v1.md`
