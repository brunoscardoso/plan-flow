
# Skills Index

## Overview

Skills implement the workflow logic for commands. Each skill orchestrates a specific process like discovery, planning, execution, or code review.

**Total Files**: 8 files, ~2,506 lines
**Reference Codes**: SKL-CON-1 through SKL-TEST-5

---

## Reference Codes

### Create Contract Skill (`create-contract-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-CON-1 | Purpose and restrictions (allowed/forbidden actions) | create-contract-skill.md | 8-53 |
| SKL-CON-2 | Workflow (detect source, fetch, ask questions, generate) | create-contract-skill.md | 65-140 |
| SKL-CON-3 | Contract output template | create-contract-skill.md | 142-215 |
| SKL-CON-4 | Validation checklist | create-contract-skill.md | 217-240 |

### Create Plan Skill (`create-plan-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-PLN-1 | Purpose and restrictions | create-plan-skill.md | 8-53 |
| SKL-PLN-2 | Workflow (extract, analyze, structure phases) | create-plan-skill.md | 67-165 |
| SKL-PLN-3 | Plan output template | create-plan-skill.md | 179-244 |
| SKL-PLN-4 | Validation checklist | create-plan-skill.md | 246-272 |

### Discovery Skill (`discovery-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-DIS-1 | Purpose and restrictions | discovery-skill.md | 8-57 |
| SKL-DIS-2 | Workflow steps 1-4 (read docs, questions, tracking, requirements) | discovery-skill.md | 71-173 |
| SKL-DIS-3 | Workflow steps 5-8 (tech considerations, approach, risks, generate) | discovery-skill.md | 175-256 |
| SKL-DIS-4 | Validation checklist | discovery-skill.md | 270-296 |

### Execute Plan Skill (`execute-plan-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-EXEC-1 | Critical rules (build only at end, no DB commands) | execute-plan-skill.md | 22-95 |
| SKL-EXEC-2 | Workflow steps 1-3 (parse, analyze complexity, present summary) | execute-plan-skill.md | 105-182 |
| SKL-EXEC-3 | Workflow steps 4-5 (execute phases with Plan mode, update progress) | execute-plan-skill.md | 184-238 |
| SKL-EXEC-4 | Workflow steps 6-7 (tests phase, completion/verification) | execute-plan-skill.md | 240-281 |
| SKL-EXEC-5 | Complexity-based behavior (low, medium, high, very high) | execute-plan-skill.md | 303-332 |
| SKL-EXEC-6 | Error handling (build failures, test failures, cancellation) | execute-plan-skill.md | 334-366 |

### Review Code Skill (`review-code-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-REV-1 | Purpose and restrictions (read-only analysis) | review-code-skill.md | 8-58 |
| SKL-REV-2 | Workflow steps 1-3 (identify files, load patterns, find similar) | review-code-skill.md | 72-130 |
| SKL-REV-3 | Workflow steps 4-6 (analyze, pattern conflicts, generate doc) | review-code-skill.md | 131-180 |
| SKL-REV-4 | Severity levels and conflict resolution | review-code-skill.md | 182-231 |
| SKL-REV-5 | Finding similar implementations (search strategies) | review-code-skill.md | 233-259 |

### Review PR Skill (`review-pr-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-PR-1 | Purpose and restrictions (GitHub/Azure DevOps commands) | review-pr-skill.md | 8-122 |
| SKL-PR-2 | Workflow (authenticate, fetch, analyze, generate) | review-pr-skill.md | 132-217 |
| SKL-PR-3 | Output format template with review history | review-pr-skill.md | 219-318 |
| SKL-PR-4 | Severity levels and fix complexity scoring | review-pr-skill.md | 320-370 |
| SKL-PR-5 | Link format for GitHub and Azure DevOps | review-pr-skill.md | 372-420 |

### Setup Skill (`setup-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-SETUP-1 | Purpose and critical approach | setup-skill.md | 8-30 |
| SKL-SETUP-2 | Steps 1-2 (scan project structure, dependency analysis) | setup-skill.md | 34-106 |
| SKL-SETUP-3 | Step 3 (deep code analysis, sample files, extract patterns) | setup-skill.md | 108-200 |
| SKL-SETUP-4 | Steps 4-5 (research best practices, check existing rules) | setup-skill.md | 202-252 |
| SKL-SETUP-5 | Step 6 (confirming questions via Plan mode) | setup-skill.md | 254-334 |
| SKL-SETUP-6 | Step 7 (generate framework and library pattern files) | setup-skill.md | 336-493 |
| SKL-SETUP-7 | Steps 8-11 (update core, create analysis doc, create flow folder, summary) | setup-skill.md | 595-797 |

### Write Tests Skill (`write-tests-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-TEST-1 | Purpose and inputs | write-tests-skill.md | 8-24 |
| SKL-TEST-2 | Workflow steps 1-3 (detect framework, coverage analysis, work queue) | write-tests-skill.md | 26-78 |
| SKL-TEST-3 | Step 4 (analyze source, write/improve tests, verify coverage) | write-tests-skill.md | 80-150 |
| SKL-TEST-4 | Step 5 and test writing guidelines | write-tests-skill.md | 152-202 |
| SKL-TEST-5 | Output format and final report | write-tests-skill.md | 232-283 |

---

## When to Expand

### Discovery and Planning

| Code | Expand When |
|------|-------------|
| SKL-DIS-1 | Need discovery restrictions/allowed actions |
| SKL-DIS-2 | Need question tracking and requirements gathering workflow |
| SKL-PLN-2 | Need phase structuring and complexity scoring workflow |
| SKL-PLN-3 | Need plan output template |

### Execution

| Code | Expand When |
|------|-------------|
| SKL-EXEC-1 | Need critical rules (build timing, DB commands) |
| SKL-EXEC-2 | Need complexity analysis and grouping logic |
| SKL-EXEC-3 | Need phase execution workflow with Plan mode |
| SKL-EXEC-5 | Need complexity-based behavior details |

### Code Review

| Code | Expand When |
|------|-------------|
| SKL-REV-2 | Need pattern loading and similar implementation search |
| SKL-REV-4 | Need severity levels and conflict resolution |
| SKL-PR-3 | Need PR review output template |
| SKL-PR-5 | Need link format for GitHub/Azure DevOps |

### Setup and Testing

| Code | Expand When |
|------|-------------|
| SKL-SETUP-2 | Need dependency detection tables |
| SKL-SETUP-6 | Need pattern file generation templates |
| SKL-TEST-2 | Need coverage analysis workflow |
| SKL-TEST-4 | Need test writing guidelines |

### Contracts

| Code | Expand When |
|------|-------------|
| SKL-CON-2 | Need contract creation workflow |
| SKL-CON-3 | Need contract output template |

---

## Quick Reference by Command

| Command | Skill | Key Codes |
|---------|-------|-----------|
| `/discovery-plan` | discovery-skill | SKL-DIS-1 through SKL-DIS-4 |
| `/create-plan` | create-plan-skill | SKL-PLN-1 through SKL-PLN-4 |
| `/execute-plan` | execute-plan-skill | SKL-EXEC-1 through SKL-EXEC-6 |
| `/review-code` | review-code-skill | SKL-REV-1 through SKL-REV-5 |
| `/review-pr` | review-pr-skill | SKL-PR-1 through SKL-PR-5 |
| `/setup` | setup-skill | SKL-SETUP-1 through SKL-SETUP-7 |
| `/write-tests` | write-tests-skill | SKL-TEST-1 through SKL-TEST-5 |
| `/create-contract` | create-contract-skill | SKL-CON-1 through SKL-CON-4 |

---

## Skill Complexity

| Skill | Lines | Sections | Complexity |
|-------|-------|----------|------------|
| setup-skill | 821 | 7 | Highest - deep project analysis |
| review-pr-skill | 496 | 5 | High - multi-platform support |
| execute-plan-skill | 388 | 6 | High - phase execution logic |
| review-code-skill | 308 | 5 | Medium - pattern matching |
| discovery-skill | 295 | 4 | Medium - requirements gathering |
| write-tests-skill | 294 | 5 | Medium - iterative testing |
| create-plan-skill | 271 | 4 | Low - plan structuring |
| create-contract-skill | 239 | 4 | Low - contract generation |
