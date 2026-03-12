# Plan: UI Design Awareness

**Project**: [[cli]]

## Overview

Make plan-flow design-aware by capturing design context (colors, typography, spacing, component patterns) during discovery and auto-injecting it into UI phases during execution. Works natively with a built-in fallback, optionally enhanced when the `interface-design` plugin is installed.

**Based on Discovery**: `flow/discovery/discovery_ui_design_awareness_v1.md`

## Goals

- Discovery always asks if a feature involves UI work and captures structured design tokens
- Design personality selection available when no existing design system is detected
- Execute-plan auto-injects Design Context into UI phase prompts
- No hard dependency on interface-design plugin

## Non-Goals

- Not implementing the interface-design plugin itself
- Not adding design review checkpoints to execute-plan (read-only injection only)
- Not modifying the setup skill or write-tests skill
- Not building Figma API integration (screenshots only)

## Requirements Summary

### Functional Requirements

- [FR-1]: Discovery always asks "Does this feature involve UI work?"
- [FR-2]: If UI confirmed, ask for design source (screenshots, existing system, or no design)
- [FR-3]: Extract structured tokens from screenshots via LLM visual analysis
- [FR-4]: Offer 6 design personality choices when no existing design system
- [FR-5]: Discovery doc includes `## Design Context` section with structured tokens
- [FR-6]: Execute-plan auto-reads Design Context and injects into UI phase prompts
- [FR-7]: Optional interface-design plugin enhancement, built-in fallback when absent
- [FR-8]: New core resource file defines all design awareness rules

### Non-Functional Requirements

- [NFR-1]: No hard dependency on interface-design plugin
- [NFR-2]: Max 1 extra question batch added to discovery
- [NFR-3]: Token extraction produces concrete values (hex, px/rem)

### Constraints

- [C-1]: Claude Code can't access Figma API — screenshots only
- [C-2]: Discovery side quest exception for plugin init
- [C-3]: Execute-plan changes are read-only (inject context, no checkpoints)
- [C-4]: Design context lives in discovery doc, not system.md

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Imprecise color extraction from compressed screenshots | Medium | Include confidence notes; user can correct tokens before execution |
| Design personalities become stale vs plugin updates | Low | Personalities are stable; periodic sync |
| UI phase detection misses some phases | Low | Inject into all phases when any UI detected |

## Phases

### Phase 1: Create Design Awareness Core Resource

**Scope**: Create the central reference document that defines all design awareness behavior — design context format, personality options, token extraction rules, UI detection, and execution injection.
**Complexity**: 5/10

- [x] Create `.claude/resources/core/design-awareness.md` with:
  - Design Context section template (colors, typography, spacing, component patterns)
  - 6 design personality definitions with descriptions (Stark, Aura, Neo, Zen, Flux, Terra)
  - Token extraction rules for screenshot analysis
  - UI phase detection heuristics (keywords: component, page, UI, layout, form, modal, etc.)
  - Execution injection rules (how to read and inject Design Context into phase prompts)
  - Plugin detection and fallback behavior
  - Design source question flow (screenshots → extract, existing system → reference, no design → personality picker)

### Phase 2: Update Discovery Skill

**Scope**: Modify the discovery skill to include design-specific questions and generate the Design Context section.
**Complexity**: 5/10

- [x] Expand Step 2 (Ask Clarifying Questions) in `.claude/resources/skills/discovery-skill.md`:
  - Add design awareness question after standard questions: "Does this feature involve UI work?"
  - If yes, add design source question batch via `AskUserQuestion`
  - Reference `.claude/resources/core/design-awareness.md` for question flow
- [x] Expand Step 8 (Generate Document) to include `## Design Context` section when UI work is confirmed
- [x] Add design awareness to the allowed-write list if needed
- [x] Update validation checklist to verify Design Context section when UI detected

### Phase 3: Update Discovery Template

**Scope**: Add the Design Context section to the discovery document template.
**Complexity**: 2/10

- [x] Add `## Design Context` section to `.claude/resources/patterns/discovery-templates.md` between Technical Considerations and Proposed Approach
- [x] Include subsections: Design Personality, Color Palette, Typography, Spacing Scale, Component Patterns, Design Source
- [x] Add conditional note: "Include this section only when UI work is confirmed during discovery"

### Phase 4: Update Execute-Plan Skill

**Scope**: Add read-only design context injection to phase execution.
**Complexity**: 4/10

- [ ] Modify Step 4 (Execute Each Phase) in `.claude/resources/skills/execute-plan-skill.md`:
  - Before constructing phase prompt, check if discovery doc has `## Design Context` section
  - If present and phase involves UI work (detect via keywords in phase name/tasks), inject Design Context into the Agent subagent prompt
  - Add to Phase Presentation Template: "Design Context: Available / Not applicable"
- [ ] Add design context to the Rules Checklist for UI phases: "Following design tokens from discovery"

### Phase 5: Update Command Files and Indexes

**Scope**: Add Design Awareness sections to command files and update resource indexes.
**Complexity**: 3/10

- [ ] Add `## Design Awareness` section to `.claude/commands/discovery-plan.md` (same pattern as Brain Capture, Resource Capture sections)
- [ ] Add `## Design Awareness` section to `.claude/commands/execute-plan.md`
- [ ] Update `.claude/resources/core/_index.md` with design-awareness.md reference codes (COR-DA-1 through COR-DA-3)
- [ ] Update `.claude/resources/skills/_index.md` overview note to mention Design Awareness alongside other cross-cutting concerns
- [ ] Update `CLAUDE.md` if needed

### Phase 6: Tests

**Scope**: Verify the feature works end-to-end by validating file structure and content.
**Complexity**: 3/10

- [ ] Verify design-awareness.md has all required sections (personalities, token format, detection rules, injection rules)
- [ ] Verify discovery-skill.md has design question flow integrated
- [ ] Verify discovery-templates.md has Design Context section
- [ ] Verify execute-plan-skill.md has design injection logic
- [ ] Verify command files have Design Awareness sections
- [ ] Verify indexes are updated with new reference codes
- [ ] Run `npm run build && npm run test` to confirm no regressions

## Complexity Summary

| Phase | Complexity | Description |
|-------|-----------|-------------|
| 1 | 5/10 | Core resource — design awareness rules |
| 2 | 5/10 | Discovery skill — design questions + context generation |
| 3 | 2/10 | Discovery template — add Design Context section |
| 4 | 4/10 | Execute-plan skill — read-only design injection |
| 5 | 3/10 | Command files + indexes |
| 6 | 3/10 | Tests and verification |

**Total Phases**: 6
**Average Complexity**: 3.7/10
**Highest Complexity**: Phases 1 & 2 at 5/10

## Execution Strategy

Based on complexity scores:

- **Phases 1**: Execute first (foundation for all other phases)
- **Phases 2-3**: Can be aggregated (combined complexity 7, both touch discovery)
- **Phase 4**: Execute separately (touches execute-plan skill)
- **Phase 5**: Execute separately (touches multiple files)
- **Phase 6**: Tests — always execute separately

## Key Changes

1. **New Core Resource**: `.claude/resources/core/design-awareness.md` — central design awareness rules
2. **Discovery Skill**: Design questions in Step 2, Design Context generation in Step 8
3. **Discovery Template**: New `## Design Context` section with structured token subsections
4. **Execute-Plan Skill**: Read-only Design Context injection into UI phase prompts
5. **Command Files**: New `## Design Awareness` sections in discovery-plan and execute-plan commands
6. **Indexes**: Updated core and skills indexes with design awareness reference codes
