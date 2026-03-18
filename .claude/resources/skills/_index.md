
# Skills Index

## Overview

Skills implement the workflow logic for commands. Each skill orchestrates a specific process like discovery, planning, execution, or code review.

**Total Files**: 12 files, ~3,500 lines
**Reference Codes**: SKL-BR-1 through SKL-TEST-5

> **Note**: All skills (except brain and flow) include a Resource Capture section. During execution, the LLM watches for valuable reference materials and asks the user before saving to `flow/resources/`. See `.claude/resources/core/resource-capture.md` for full rules.
>
> **Note**: The execute-plan, discovery, and review-code skills also include Pattern Capture. During execution, the LLM silently buffers coding patterns and anti-patterns, then presents them for user approval at the end. Approved patterns are written to `.claude/rules/core/allowed-patterns.md` or `forbidden-patterns.md`. See `.claude/resources/core/pattern-capture.md` for full rules.
>
> **Note**: The execute-plan skill supports **Model Routing** — automatic model selection per phase based on complexity scores (0-3 → haiku, 4-5 → sonnet, 6-10 → opus). Controlled by `model_routing` in `flow/.flowconfig`. See `.claude/resources/core/model-routing.md` for full rules.
>
> **Note**: The execute-plan skill supports **Wave-Based Parallel Execution** — dependency-aware grouping of independent phases into parallel waves. When `wave_execution: true` in `.flowconfig` (default), phases with explicit `Dependencies` metadata are analyzed, grouped into waves via topological sort, and executed in parallel within each wave. See `.claude/resources/core/wave-execution.md` for full rules.
>
> **Note**: The discovery skill also includes **Design Awareness**. During discovery, the LLM asks whether the feature involves UI work and captures structured design tokens (colors, typography, spacing) into a `## Design Context` section. During execution, these tokens are auto-injected into UI phase prompts. See `.claude/resources/core/design-awareness.md` for full rules.
>
> **Note**: The review-code and review-pr skills include a **Verification Pass**. After initial analysis, each finding is re-examined against surrounding code context and classified as Confirmed, Likely, or Dismissed. False positives are filtered before output. See `.claude/resources/core/review-verification.md` for full rules.
>
> **Note**: The review-code and review-pr skills include **Multi-Agent Parallel Review** for Deep mode (500+ lines). Four specialized subagents (security, logic, performance, patterns) run in parallel, and the coordinator deduplicates, verifies, and ranks the merged results. See `.claude/resources/core/review-multi-agent.md` for full rules.
>
> **Note**: The review-code and review-pr skills include **Severity Re-Ranking**. After verification, findings are re-ranked by severity → confidence → fix complexity, related findings across files are grouped, and an executive summary is added when ≥ 5 findings. See `.claude/resources/core/review-severity-ranking.md` for full rules.
>
> **Note**: The review-code and review-pr skills include **Adaptive Depth**. Review depth scales automatically based on changeset size: < 50 lines → Lightweight (quick-scan), 50–500 → Standard (no change), 500+ → Deep (multi-pass with executive summary). See `.claude/resources/core/review-adaptive-depth.md` for full rules.
>
> **Note**: All long-running skills (execute-plan, review-code, discovery) support **Context Compaction**. When compacting mid-skill, load `.claude/resources/core/compaction-guide.md` for preserve/discard rules and the compact summary template. See `COR-CG-1` through `COR-CG-4`.
>
> **Note**: The discovery skill uses **Discovery Sub-Agents** for parallel codebase exploration. Three haiku sub-agents (similar features, API/data patterns, schema/types) run in parallel after reading referenced docs, returning condensed JSON findings merged into a Codebase Analysis section. See `.claude/resources/core/discovery-sub-agents.md` for full rules.

---

## Reference Codes

### Brainstorm Skill (`brainstorm-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-BS-1 | Purpose, restrictions, and inputs | brainstorm-skill.md | 8-60 |
| SKL-BS-2 | Conversational loop, question types, and silent tracking | brainstorm-skill.md | 62-150 |
| SKL-BS-3 | End detection, summary, output generation, and tasklist offer | brainstorm-skill.md | 152-220 |

### Brain Skill (`brain-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-BR-1 | Purpose and restrictions (brain-only actions) | brain-skill.md | 8-45 |
| SKL-BR-2 | Workflow (free-text mode and guided mode) | brain-skill.md | 55-130 |
| SKL-BR-3 | Output format and validation checklist | brain-skill.md | 132-175 |

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

### Learn Skill (`learn-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-LRN-1 | Purpose, restrictions, and extraction criteria | learn-skill.md | 1-55 |
| SKL-LRN-2 | Workflow, output format, and validation | learn-skill.md | 57-115 |
| SKL-LRN-3 | Teaching mode restrictions and curriculum generation | learn-skill.md | 140-175 |
| SKL-LRN-4 | Step confirmation flow and storage rules | learn-skill.md | 177-210 |

### Flow Cost Skill (`flow-cost.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-COST-1 | Usage and filter flags | flow-cost.md | 7-18 |
| SKL-COST-2 | Implementation steps (read, filter, aggregate, format) | flow-cost.md | 20-85 |
| SKL-COST-3 | Output format examples (default, detail, session) | flow-cost.md | 87-145 |
| SKL-COST-4 | JSONL schema and error handling | flow-cost.md | 147-195 |

### Execute Plan Skill (`execute-plan-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-EXEC-1 | Purpose and inputs | execute-plan-skill.md | 4-100 |
| SKL-EXEC-2 | Critical rules (build only at end, no DB commands) | execute-plan-skill.md | 18-92 |
| SKL-EXEC-3 | Step 1: Parse the plan | execute-plan-skill.md | 103-112 |
| SKL-EXEC-4 | Step 2: Analyze complexity + Step 2b: Wave analysis (dependency graph, wave grouping) | execute-plan-skill.md | 113-151 |
| SKL-EXEC-5 | Step 3: Present execution plan summary (with wave groupings and estimated speedup) | execute-plan-skill.md | 152-180 |
| SKL-EXEC-6 | Step 4: Execute each wave (approve sequentially, spawn parallel sub-agents per wave) | execute-plan-skill.md | 181-236 |
| SKL-EXEC-7 | Step 5: Update progress after each phase | execute-plan-skill.md | 237-249 |
| SKL-EXEC-8 | Step 5b: Phase-boundary context check (compaction) | execute-plan-skill.md | 250-275 |
| SKL-EXEC-9 | Step 6: Handle tests phase | execute-plan-skill.md | 277-302 |
| SKL-EXEC-10 | Step 7: Completion — build and test verification | execute-plan-skill.md | 303-364 |
| SKL-EXEC-11 | Complexity-based behavior (low, medium, high, very high) | execute-plan-skill.md | 365-393 |
| SKL-EXEC-12 | Error handling (build failures, test failures, cancellation) | execute-plan-skill.md | 395-427 |

### Review Code Skill (`review-code-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-REV-1 | Purpose and restrictions (read-only, allowed actions) | review-code-skill.md | 4-58 |
| SKL-REV-2 | Step 1: Identify changed files | review-code-skill.md | 70-77 |
| SKL-REV-3 | Step 1b: Determine review depth (adaptive depth) | review-code-skill.md | 78-97 |
| SKL-REV-4 | Step 2: Load review patterns | review-code-skill.md | 98-107 |
| SKL-REV-5 | Step 3: Find similar implementations in codebase | review-code-skill.md | 108-146 |
| SKL-REV-6 | Step 4: Analyze code changes | review-code-skill.md | 147-158 |
| SKL-REV-7 | Step 5: Pattern conflicts + 5b verify + 5c re-rank | review-code-skill.md | 159-231 |
| SKL-REV-8 | Step 6: Generate review document | review-code-skill.md | 232-260 |
| SKL-REV-9 | Severity levels and conflict resolution | review-code-skill.md | 252-301 |
| SKL-REV-10 | Finding similar implementations (search strategies) | review-code-skill.md | 303-330 |
| SKL-REV-11 | Validation checklist | review-code-skill.md | 379-392 |

### Review PR Skill (`review-pr-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-PR-1 | Purpose and restrictions (read-only, GitHub/Azure DevOps) | review-pr-skill.md | 4-120 |
| SKL-PR-2 | Step 0: Authenticate for PR access | review-pr-skill.md | 132-158 |
| SKL-PR-3 | Step 1: Fetch PR information + 1b determine review depth | review-pr-skill.md | 159-184 |
| SKL-PR-4 | Step 2: Load review patterns | review-pr-skill.md | 185-194 |
| SKL-PR-5 | Step 3: Analyze code changes + 3b verify + 3c re-rank | review-pr-skill.md | 195-240 |
| SKL-PR-6 | Step 4: Generate or update review document | review-pr-skill.md | 241-320 |
| SKL-PR-7 | Output format template (findings, severity, recommendations) | review-pr-skill.md | 322-376 |
| SKL-PR-8 | Fix complexity scoring (scale, modifiers, examples) | review-pr-skill.md | 388-426 |
| SKL-PR-9 | Link format for GitHub and Azure DevOps | review-pr-skill.md | 428-477 |
| SKL-PR-10 | Example finding and quick reference commands | review-pr-skill.md | 479-552 |

### Setup Skill (`setup-skill.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| SKL-SETUP-1 | Purpose and critical approach | setup-skill.md | 4-28 |
| SKL-SETUP-2 | Step 1: Scan project structure | setup-skill.md | 31-57 |
| SKL-SETUP-3 | Step 2: Deep dependency analysis | setup-skill.md | 58-103 |
| SKL-SETUP-4 | Step 3: Deep code analysis | setup-skill.md | 104-199 |
| SKL-SETUP-5 | Step 4: Research best practices | setup-skill.md | 200-222 |
| SKL-SETUP-6 | Step 5: Check existing rules | setup-skill.md | 223-249 |
| SKL-SETUP-7 | Step 6: Ask confirming questions (Plan mode) | setup-skill.md | 250-332 |
| SKL-SETUP-8 | Step 7: Generate pattern files (templates + examples) | setup-skill.md | 333-574 |
| SKL-SETUP-9 | Step 8: Update core pattern files | setup-skill.md | 575-605 |
| SKL-SETUP-10 | Step 9: Sync generic patterns to global brain | setup-skill.md | 606-654 |
| SKL-SETUP-11 | Step 10: Create project analysis document | setup-skill.md | 655-727 |
| SKL-SETUP-12 | Step 11: Index documentation files | setup-skill.md | 728-816 |
| SKL-SETUP-13 | Step 12: Create flow folder structure | setup-skill.md | 817-860 |
| SKL-SETUP-14 | Step 13: Present setup summary | setup-skill.md | 861-955 |

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
| SKL-EXEC-2 | Need critical rules (build timing, DB commands) |
| SKL-EXEC-3 | Parsing plan file structure |
| SKL-EXEC-4 | Analyzing complexity, wave analysis, or determining execution strategy |
| SKL-EXEC-5 | Presenting execution plan summary (with wave groupings) to user |
| SKL-EXEC-6 | Executing a wave (parallel sub-agents) or single phase with Plan mode |
| SKL-EXEC-7 | Updating progress after a phase |
| SKL-EXEC-8 | Compacting at phase boundaries |
| SKL-EXEC-9 | Handling the tests phase |
| SKL-EXEC-10 | Final build and test verification |
| SKL-EXEC-11 | Need complexity-based behavior details |
| SKL-EXEC-12 | Handling build/test failures or cancellation |

### Code Review

| Code | Expand When |
|------|-------------|
| SKL-REV-2 | Identifying changed files for review |
| SKL-REV-3 | Determining review depth (adaptive) |
| SKL-REV-4 | Loading review patterns |
| SKL-REV-5 | Finding similar implementations in codebase |
| SKL-REV-6 | Analyzing code changes |
| SKL-REV-7 | Pattern conflicts, verification, and re-ranking |
| SKL-REV-8 | Generating the review document |
| SKL-REV-9 | Need severity levels and conflict resolution |
| SKL-REV-10 | Need search strategies for similar code |
| SKL-PR-2 | Authenticating for PR access |
| SKL-PR-3 | Fetching PR info and determining depth |
| SKL-PR-5 | Analyzing PR changes, verification, re-ranking |
| SKL-PR-6 | Generating PR review document |
| SKL-PR-7 | Need PR review output template |
| SKL-PR-8 | Need fix complexity scoring |
| SKL-PR-9 | Need link format for GitHub/Azure DevOps |

### Setup and Testing

| Code | Expand When |
|------|-------------|
| SKL-SETUP-2 | Scanning project structure |
| SKL-SETUP-3 | Deep dependency analysis |
| SKL-SETUP-4 | Deep code analysis |
| SKL-SETUP-5 | Researching best practices |
| SKL-SETUP-6 | Checking existing rules |
| SKL-SETUP-7 | Asking confirming questions via Plan mode |
| SKL-SETUP-8 | Generating pattern files |
| SKL-SETUP-9 | Updating core pattern files |
| SKL-SETUP-10 | Syncing to global brain |
| SKL-SETUP-11 | Creating project analysis document |
| SKL-SETUP-12 | Indexing documentation files |
| SKL-SETUP-13 | Creating flow folder structure |
| SKL-SETUP-14 | Presenting setup summary |
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
| `/brainstorm` | brainstorm-skill | SKL-BS-1 through SKL-BS-3 |
| `/note` | brain-skill | SKL-BR-1 through SKL-BR-3 |
| `/flow cost` | flow-cost | SKL-COST-1 through SKL-COST-4 |
| `/learn` | learn-skill | SKL-LRN-1 through SKL-LRN-4 |
| `/discovery-plan` | discovery-skill | SKL-DIS-1 through SKL-DIS-4 |
| `/create-plan` | create-plan-skill | SKL-PLN-1 through SKL-PLN-4 |
| `/execute-plan` | execute-plan-skill | SKL-EXEC-1 through SKL-EXEC-12 |
| `/review-code` | review-code-skill | SKL-REV-1 through SKL-REV-11 |
| `/review-pr` | review-pr-skill | SKL-PR-1 through SKL-PR-10 |
| `/setup` | setup-skill | SKL-SETUP-1 through SKL-SETUP-14 |
| `/write-tests` | write-tests-skill | SKL-TEST-1 through SKL-TEST-5 |
| `/create-contract` | create-contract-skill | SKL-CON-1 through SKL-CON-4 |

---

## Skill Complexity

| Skill | Lines | Sections | Complexity |
|-------|-------|----------|------------|
| setup-skill | 955 | 14 | Highest - deep project analysis |
| review-pr-skill | 552 | 10 | High - multi-platform support |
| execute-plan-skill | 448 | 12 | High - phase execution logic |
| review-code-skill | 392 | 11 | Medium - pattern matching |
| discovery-skill | 295 | 4 | Medium - requirements gathering |
| brainstorm-skill | 280 | 3 | Medium - structured exploration with interactive questions |
| write-tests-skill | 294 | 5 | Medium - iterative testing |
| create-plan-skill | 271 | 4 | Low - plan structuring |
| learn-skill | 185 | 4 | Medium - pattern extraction + teaching mode |
| flow-cost | 195 | 4 | Low - JSONL parsing and reporting |
| create-contract-skill | 239 | 4 | Low - contract generation |
