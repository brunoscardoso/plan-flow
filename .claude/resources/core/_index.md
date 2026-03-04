
# Core Rules Index

## Overview

Core rules define the foundational coding standards that apply across the entire project. These include best practices to follow (allowed patterns), anti-patterns to avoid (forbidden patterns), and complexity scoring for implementation planning.

**Total Files**: 7 files, ~1300 lines
**Reference Codes**: COR-AP-1 through COR-RC-2

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

### Resource Capture (`resource-capture.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-RC-1 | Capture behavior, criteria, and what NOT to capture | resource-capture.md | 10-60 |
| COR-RC-2 | File format, naming conventions, and rules | resource-capture.md | 62-110 |

### Tech Detection (`tech-detection.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-TD-1 | Language detection and command mapping table | tech-detection.md | 10-50 |
| COR-TD-2 | Package manager variants and special rules | tech-detection.md | 52-85 |

### Agent Profiles (`agent-profiles.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| COR-AG-1 | Profile definitions (read-only, write-restricted, full-access) | agent-profiles.md | 18-80 |
| COR-AG-2 | Command → profile mapping table | agent-profiles.md | 82-100 |

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
| COR-RC-1 | Need resource capture behavior and criteria |
| COR-RC-2 | Need resource file format and naming conventions |
| COR-AG-1 | Need agent profile definitions and tool access rules |
| COR-AG-2 | Need command-to-profile mapping |

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
- `agent-profiles.md` is loaded on-demand - defines tool access boundaries per skill profile
