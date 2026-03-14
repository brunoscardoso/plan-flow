
# Core Rules Index

## Overview

Core rules define the foundational coding standards that apply across the entire project. These include best practices to follow (allowed patterns), anti-patterns to avoid (forbidden patterns), and complexity scoring for implementation planning.

**Total Files**: 21 files, ~3380 lines
**Reference Codes**: COR-AP-1 through COR-PI-4

---

## Reference Codes

### Allowed Patterns (`allowed-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-AP-1 | Example patterns (Naming, SRP, Errors, Types, Organization) | allowed-patterns.md | 45-152 |
| COR-AP-2 | Template for adding new patterns | allowed-patterns.md | 167-186 |

### Forbidden Patterns (`forbidden-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-FP-1 | Example anti-patterns (Magic Numbers, Silent Errors, Ternaries, Mutation, Async) | forbidden-patterns.md | 41-230 |
| COR-FP-2 | Template for adding new anti-patterns | forbidden-patterns.md | 245-264 |

### Complexity Scoring (`complexity-scoring.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-CS-1 | Complexity scale table (0-10 levels) | complexity-scoring.md | 12-21 |
| COR-CS-2 | Scoring criteria modifiers (+/- points) | complexity-scoring.md | 23-51 |
| COR-CS-3 | Execution strategy and aggregation rules | complexity-scoring.md | 53-70 |
| COR-CS-4 | Common complexity patterns table | complexity-scoring.md | 168-185 |
| COR-CS-5 | Real-world scoring examples | complexity-scoring.md | 187-236 |

### Autopilot Mode (`autopilot-mode.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-AM-1 | Input classification (slash commands, questions, trivial, feature requests) | autopilot-mode.md | 18-50 |
| COR-AM-2 | Flow execution steps (contracts, discovery, plan, execute, review, archive) | autopilot-mode.md | 52-110 |
| COR-AM-3 | Mandatory checkpoints and overriding rules | autopilot-mode.md | 140-178 |

### Project Ledger (`project-ledger.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-LDG-1 | Ledger behavior, entry format, and sections | project-ledger.md | 10-110 |
| COR-LDG-2 | Maintenance rules and plan-flow integration | project-ledger.md | 112-155 |

### Brain Capture (`brain-capture.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-BR-1 | Session start behavior and brain-capture processing rules | brain-capture.md | 10-50 |
| COR-BR-2 | File templates (feature, error, decision, session) and naming conventions | brain-capture.md | 52-170 |
| COR-BR-3 | Index management (caps, rotation) and global brain sync | brain-capture.md | 172-240 |

### Project Memory (`project-memory.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-MEM-1 | Memory session start behavior and entry format | project-memory.md | 10-50 |
| COR-MEM-2 | Field descriptions and maintenance rules | project-memory.md | 52-75 |

### Project Tasklist (`project-tasklist.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-TL-1 | Tasklist session start behavior and task format | project-tasklist.md | 10-45 |
| COR-TL-2 | Brain integration and maintenance rules | project-tasklist.md | 47-65 |

### Heartbeat (`heartbeat.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-HB-1 | Heartbeat file format and schedule syntax | heartbeat.md | 10-55 |
| COR-HB-2 | Daemon architecture, CLI commands, and rules | heartbeat.md | 57-110 |

### Resource Capture (`resource-capture.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-RC-1 | Capture behavior, criteria, and what NOT to capture | resource-capture.md | 10-60 |
| COR-RC-2 | File format, naming conventions, and rules | resource-capture.md | 62-110 |

### Learn Recommendations (`learn-recommendations.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-LR-1 | Trigger conditions and detection logic | learn-recommendations.md | 10-62 |
| COR-LR-2 | Recommendation format, rules, and integration points | learn-recommendations.md | 64-170 |

### Pattern Capture (`pattern-capture.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-PC-1 | Capture behavior, triggers, and buffer format | pattern-capture.md | 10-80 |
| COR-PC-2 | End-of-skill review protocol and user approval flow | pattern-capture.md | 82-140 |
| COR-PC-3 | Auto-captured entry format and conflict detection | pattern-capture.md | 142-210 |

### Model Routing (`model-routing.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-MR-1 | Model tiers, platform mappings, and routing rules | model-routing.md | 10-60 |
| COR-MR-2 | Aggregation behavior and plan mode exception | model-routing.md | 62-85 |
| COR-MR-3 | Cost impact estimates and execution summary format | model-routing.md | 87-115 |

### Design Awareness (`design-awareness.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-DA-1 | Design Context template and personalities | design-awareness.md | 14-180 |
| COR-DA-2 | Token extraction and UI detection rules | design-awareness.md | 182-260 |
| COR-DA-3 | Discovery question flow and execution injection | design-awareness.md | 262-350 |

### Review Verification (`review-verification.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-RV-1 | Verification logic, questions, and classification criteria | review-verification.md | 1-120 |
| COR-RV-2 | Output format and insertion points | review-verification.md | 122-200 |

### Review Multi-Agent (`review-multi-agent.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-MA-1 | Subagent definitions (security, logic, performance, patterns) with prompts and models | review-multi-agent.md | 30-130 |
| COR-MA-2 | Coordinator behavior (spawn, collect, deduplicate, verify, rank, output) | review-multi-agent.md | 132-195 |
| COR-MA-3 | Subagent input rules and diff splitting for very large changesets | review-multi-agent.md | 100-130 |
| COR-MA-4 | Insertion points for review-code and review-pr skills | review-multi-agent.md | 197-220 |

### Review Severity Re-Ranking (`review-severity-ranking.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-SR-1 | Ranking algorithm (severity → confidence → complexity) | review-severity-ranking.md | 14-26 |
| COR-SR-2 | Grouping related findings (patterns, rules, format) | review-severity-ranking.md | 28-88 |
| COR-SR-3 | Executive summary trigger and risk level derivation | review-severity-ranking.md | 90-120 |
| COR-SR-4 | Output structure and insertion points | review-severity-ranking.md | 122-150 |

### Compaction Guide (`compaction-guide.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-CG-1 | Purpose, core principle, and when to compact | compaction-guide.md | 3-20 |
| COR-CG-2 | Preserve rules — what to keep during compaction | compaction-guide.md | 22-38 |
| COR-CG-3 | Discard rules — what to drop during compaction | compaction-guide.md | 40-55 |
| COR-CG-4 | Compact summary template and skill-specific examples | compaction-guide.md | 57-110 |

### Session Scratchpad (`session-scratchpad.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-SS-1 | Purpose, session start behavior, and write triggers | session-scratchpad.md | 3-45 |
| COR-SS-2 | File format and 50-line limit | session-scratchpad.md | 47-68 |
| COR-SS-3 | Promotion rules, targets, and compaction integration | session-scratchpad.md | 70-95 |

### Phase Isolation (`phase-isolation.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-PI-1 | Purpose, architecture overview, and coordinator flow | phase-isolation.md | 3-40 |
| COR-PI-2 | Context template — what to include in sub-agent prompt | phase-isolation.md | 42-85 |
| COR-PI-3 | Return format schema (JSON), field descriptions, failure example | phase-isolation.md | 87-140 |
| COR-PI-4 | Coordinator processing (success/failure/partial), config, and rules | phase-isolation.md | 142-180 |

### Review Adaptive Depth (`review-adaptive-depth.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-AD-1 | Size detection, line counting rules, and tier definitions | review-adaptive-depth.md | 14-47 |
| COR-AD-2 | Lightweight review mode (< 50 lines) — checks, skips, output | review-adaptive-depth.md | 51-101 |
| COR-AD-3 | Deep review mode (500+ lines) — categorization, passes, executive summary | review-adaptive-depth.md | 103-187 |
| COR-AD-4 | Insertion points for review-code and review-pr skills | review-adaptive-depth.md | 189-205 |

---

## When to Expand

| Code | Expand When |
|------|-------------|
| COR-AP-1 | Need to see example good patterns for code generation |
| COR-AP-2 | Adding a new allowed pattern to the project |
| COR-FP-1 | Need to see anti-patterns to avoid |
| COR-FP-2 | Adding a new forbidden pattern to the project |
| COR-CS-1 | Need complexity level definitions |
| COR-CS-2 | Calculating complexity score for a phase |
| COR-CS-3 | Determining execution strategy for plan phases |
| COR-CS-4 | Quick lookup of typical complexity scores |
| COR-CS-5 | Need detailed scoring examples |
| COR-LDG-1 | Need ledger behavior and entry guidelines |
| COR-LDG-2 | Need ledger maintenance and integration rules |
| COR-AM-1 | Need to understand input classification for autopilot |
| COR-AM-2 | Need autopilot flow execution steps |
| COR-AM-3 | Need mandatory checkpoint and override rules |
| COR-BR-1 | Need brain session start behavior and processing rules |
| COR-BR-2 | Need brain file templates and naming conventions |
| COR-BR-3 | Need index management caps and global sync rules |
| COR-MEM-1 | Need memory session start behavior and entry format |
| COR-MEM-2 | Need memory field descriptions and maintenance rules |
| COR-TL-1 | Need tasklist session start behavior and task format |
| COR-TL-2 | Need tasklist brain integration and maintenance rules |
| COR-HB-1 | Need heartbeat file format and schedule syntax |
| COR-HB-2 | Need daemon architecture and CLI commands |
| COR-RC-1 | Need resource capture behavior and criteria |
| COR-RC-2 | Need resource file format and naming conventions |
| COR-LR-1 | Need learn recommendation trigger conditions |
| COR-LR-2 | Need learn recommendation format and integration rules |
| COR-PC-1 | Need pattern capture behavior and buffer format |
| COR-PC-2 | Need end-of-skill review protocol |
| COR-PC-3 | Need auto-captured entry format and conflict detection |
| COR-MR-1 | Need model tier definitions and platform mappings |
| COR-MR-2 | Need aggregation behavior for model routing |
| COR-MR-3 | Need cost impact estimates or execution summary format |
| COR-DA-1 | Need design context template or personality options |
| COR-DA-2 | Need token extraction or UI detection heuristics |
| COR-DA-3 | Need design question flow or execution injection rules |
| COR-RV-1 | Need verification questions or classification criteria |
| COR-RV-2 | Need verification output format or skill insertion points |
| COR-MA-1 | Need subagent definitions or prompt templates for deep review |
| COR-MA-2 | Need coordinator dedup/merge behavior |
| COR-MA-3 | Need subagent input rules or diff splitting strategy |
| COR-MA-4 | Need multi-agent insertion points for review skills |
| COR-SR-1 | Need ranking algorithm for review findings |
| COR-SR-2 | Need grouping rules for related findings |
| COR-SR-3 | Need executive summary trigger conditions |
| COR-SR-4 | Need severity re-ranking output structure or insertion points |
| COR-CG-1 | Need to understand when and why to compact |
| COR-CG-2 | Need preserve rules for crafting compact summaries |
| COR-CG-3 | Need discard rules for dropping low-signal tokens |
| COR-CG-4 | Need compact summary template or skill-specific examples |
| COR-AD-1 | Need size detection thresholds or line counting rules |
| COR-AD-2 | Need lightweight review mode behavior |
| COR-AD-3 | Need deep review mode behavior (categorization, passes, executive summary) |
| COR-AD-4 | Need insertion points for adaptive depth in review skills |
| COR-SS-1 | Need scratchpad purpose, session start behavior, or write triggers |
| COR-SS-2 | Need scratchpad file format or size limit |
| COR-SS-3 | Need scratchpad promotion rules or compaction integration |
| COR-PI-1 | Need phase isolation architecture or coordinator flow |
| COR-PI-2 | Need sub-agent context template (what to include in prompt) |
| COR-PI-3 | Need return format schema or field descriptions |
| COR-PI-4 | Need coordinator processing rules or config settings |

---

## Quick Reference

### Allowed Patterns Summary
- **Descriptive Naming**: Clear, self-documenting names
- **Single Responsibility**: One function = one purpose
- **Error Handling**: Explicit errors with logging
- **Type Safety**: Leverage TypeScript types
- **Code Organization**: Consistent folder structure

### Forbidden Patterns Summary
- **No Magic Numbers**: Use named constants
- **No Silent Errors**: Always log and handle
- **No Nested Ternaries**: Use if/else or switch
- **No Parameter Mutation**: Return new objects/arrays
- **No Mixed Async**: Use async/await consistently

### Complexity Levels
- **0-2 Trivial**: Simple, mechanical changes
- **3-4 Low**: Straightforward implementation
- **5-6 Medium**: Moderate complexity, some decisions
- **7-8 High**: Complex, multiple concerns
- **9-10 Very High**: Requires careful attention

---

## Notes

- `allowed-patterns.md` and `forbidden-patterns.md` have `alwaysApply: true` - they are loaded automatically
- `project-ledger.md` has `alwaysApply: true` - maintains persistent project memory
- `complexity-scoring.md` is loaded on-demand when needed for planning
- `autopilot-mode.md` has `alwaysApply: true` - detects and orchestrates autopilot flow mode
- `brain-capture.md` is loaded on-demand - processes brain-capture blocks and manages brain index
- `resource-capture.md` is loaded on-demand - watches for valuable reference materials during skill execution
- `learn-recommendations.md` is loaded on-demand - detects learning opportunities and recommends `/learn`
- `pattern-capture.md` is loaded on-demand - silently captures patterns during skill execution and presents for approval
- `model-routing.md` is loaded on-demand - automatic model selection per phase based on complexity scores during `/execute-plan`
- `project-tasklist.md` is loaded on-demand - session start tasklist behavior
- `compaction-guide.md` is loaded on-demand - preserve/discard rules and summary template for `/compact`
- `session-scratchpad.md` is loaded on-demand - ephemeral per-session notes with promotion to permanent storage
- `phase-isolation.md` is loaded on-demand - isolated sub-agent execution per phase during `/execute-plan`
- `project-memory.md` is loaded on-demand - artifact tracking and 7-day session loading
- `heartbeat.md` is loaded on-demand - scheduled task daemon configuration
