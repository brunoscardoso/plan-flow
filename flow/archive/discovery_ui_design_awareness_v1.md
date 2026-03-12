# Discovery: UI Design Awareness

**Project**: [[cli]]

## Context

Plan-flow currently has no design awareness — when a feature involves UI work, the discovery and execution phases treat it identically to backend work. This means UI phases get implemented without design tokens, color palettes, typography rules, or component patterns, leading to inconsistent interfaces.

This feature makes plan-flow design-aware by integrating design context capture into the discovery phase and auto-injecting that context into UI phases during execution. It optionally leverages the `interface-design` plugin (github.com/Dammyjay93/interface-design) but works natively as a built-in fallback when the plugin isn't installed.

**Brainstorm**: `flow/brainstorms/brainstorm_ui-design-awareness_v1.md`

## Referenced Documents

| Document | Key Findings |
|----------|--------------|
| `flow/brainstorms/brainstorm_ui-design-awareness_v1.md` | Core idea, 6 key decisions settled, open questions identified |
| `.claude/resources/skills/discovery-skill.md` | Step 2 has UI/UX category (line 112) but no expanded behavior. Integration point for design questions. |
| `.claude/resources/skills/execute-plan-skill.md` | Step 4 (phase execution) is the injection point for design context. Phase presentation template at lines 206-230. |
| `.claude/resources/patterns/discovery-templates.md` | No Design Context section in current template. Needs new section between Code Context Analysis and Requirements. |
| `interface-design` plugin (external) | Three pillars: Craft, Memory, Consistency. Six design personalities. Commands: `/init`, `/status`, `/audit`, `/extract`. |

## Code Context Analysis

### Discovery Skill Integration Points

| File | Usage | Line(s) |
|------|-------|---------|
| `.claude/resources/skills/discovery-skill.md` | UI/UX question category (unexpanded) | 112 |
| `.claude/resources/skills/discovery-skill.md` | Step 2: Ask Clarifying Questions | 101-128 |
| `.claude/resources/skills/discovery-skill.md` | Step 8: Generate Document | 250-268 |

### Execute Plan Skill Integration Points

| File | Usage | Line(s) |
|------|-------|---------|
| `.claude/resources/skills/execute-plan-skill.md` | Step 4: Execute Each Phase (prompt construction) | 181-230 |
| `.claude/resources/skills/execute-plan-skill.md` | Phase Presentation Template (rules checklist) | 222-226 |

### Discovery Template Integration Points

| File | Usage | Line(s) |
|------|-------|---------|
| `.claude/resources/patterns/discovery-templates.md` | Code Context Analysis section | 24-63 |
| `.claude/resources/patterns/discovery-templates.md` | UI/UX question examples | 232-247 |

### Other Related Files

| File | Purpose |
|------|---------|
| `.claude/commands/discovery-plan.md` | Command orchestrator — needs Design Context section reference |
| `.claude/commands/execute-plan.md` | Command orchestrator — needs design injection note |
| `.claude/resources/core/_index.md` | Core resource index — new design resource needs entry |
| `.claude/resources/skills/_index.md` | Skills index — needs design awareness note |

**Total References**: 8 files across 4 categories

### Key Patterns Observed

- Plan-flow uses resource files in `.claude/resources/core/` for cross-cutting concerns (brain-capture, resource-capture, pattern-capture, model-routing). Design awareness follows the same pattern.
- Skills reference core resources via relative paths and "See X for full rules" conventions.
- Command files have dedicated sections for each cross-cutting concern (Brain Capture, Resource Capture, Pattern Capture, Model Routing). Design awareness needs its own section.
- The `AskUserQuestion` tool is the standard for interactive questions during discovery (3-4 per batch, with recommended options).

## Requirements Gathered

### Functional Requirements

- [FR-1]: Discovery skill MUST always ask "Does this feature involve UI work?" as part of its question flow
- [FR-2]: If UI work confirmed, discovery MUST ask: "Do you have a design to follow?" with options for screenshots/Figma, existing design system, or no design
- [FR-3]: If user provides screenshots/images, the LLM MUST visually analyze them and extract structured design tokens (colors, typography, spacing, component patterns)
- [FR-4]: If no design exists and no `system.md` found, discovery MUST offer design personality selection (6 personalities from interface-design: Stark, Aura, Neo, Zen, etc.)
- [FR-5]: Discovery document MUST include a `## Design Context` section with structured tokens when UI work is detected
- [FR-6]: Execute-plan MUST auto-read the Design Context section from the discovery doc and inject it into the prompt for any phase involving UI work
- [FR-7]: If interface-design plugin is installed, its commands (`/init`, `/extract`) MAY be used. If not installed, plan-flow handles design context natively with built-in fallback behavior
- [FR-8]: A new core resource file (`.claude/resources/core/design-awareness.md`) MUST define the design context format, personality options, token extraction rules, and execution injection behavior

### Non-Functional Requirements

- [NFR-1]: No hard dependency on interface-design plugin — plan-flow must work standalone
- [NFR-2]: Design context capture should not add more than 1 extra question batch to discovery (keep it lightweight)
- [NFR-3]: Design token extraction from screenshots should produce concrete values (hex colors, px/rem sizes), not vague descriptions

### Constraints

- [C-1]: Claude Code cannot access Figma API directly — user must provide screenshots or exported images
- [C-2]: Discovery is read-only (no code writes) — design setup via plugin is an accepted "side quest" exception (brainstorm decision #4)
- [C-3]: Execute-plan changes are read-only — only inject design context into phase prompts, no new checkpoints or interruptions
- [C-4]: Design context lives in the discovery doc, NOT in interface-design's `system.md` (brainstorm decision #1)

## Open Questions

| # | Category | Question | Status | Answer |
|---|----------|----------|--------|--------|
| 1 | Functional | How does discovery detect UI features? | Answered | Always ask — standard question in every discovery flow |
| 2 | Technical | What format for Design Context section? | Answered | Structured tokens: Colors, Typography, Spacing, Component Patterns |
| 3 | Technical | How to handle Figma/design input? | Answered | Screenshots + visual extraction by LLM |
| 4 | Technical | What if plugin not installed? | Answered | Built-in fallback — no plugin dependency required |
| 5 | Functional | Should execution inject design context? | Answered | Yes — auto-inject into UI phase prompts, no interruptions |
| 6 | Functional | Include design personalities? | Answered | Yes — offer 6 personalities when no existing design system |
| 7 | Scope | How much touches execute-plan? | Answered | Read-only — just reads Design Context section and injects into prompts |

## Technical Considerations

### Architecture Fit

- Follows the established cross-cutting concern pattern: core resource file + sections in skill files + sections in command files
- Same architecture as brain-capture, resource-capture, pattern-capture, and model-routing
- Design awareness is a discovery-time concern with a read-only execution-time component

### Dependencies

- **Optional**: `interface-design` plugin (github.com/Dammyjay93/interface-design) — used when installed, gracefully skipped when not
- **Required**: `AskUserQuestion` tool — for design-related interactive questions during discovery
- **Required**: Discovery template update — new `## Design Context` section

### Patterns to Follow

- Core resource file pattern: `.claude/resources/core/design-awareness.md` (like `model-routing.md`, `pattern-capture.md`)
- Cross-cutting section pattern: Add `## Design Awareness` section to command files (like Brain Capture, Resource Capture sections)
- Skill modification pattern: Add design-specific steps within existing workflow steps (not new top-level steps)

### Potential Challenges

- Screenshot analysis quality varies — LLM may extract imprecise color values from compressed images
- Design personality descriptions need to be self-contained (can't rely on plugin being installed to describe them)
- Determining which execution phases are "UI phases" requires heuristic detection (phase name keywords, task descriptions)

## Proposed Approach

### High-Level Architecture

1. **New core resource**: `.claude/resources/core/design-awareness.md` — defines everything: design context format, personality options with descriptions, token extraction rules, UI phase detection heuristics, execution injection behavior
2. **Modify discovery skill**: Expand Step 2 (questions) to include design-specific questions when UI work is confirmed. Add design context generation to Step 8 (document generation).
3. **Modify discovery template**: Add `## Design Context` section to the template with structured subsections for tokens.
4. **Modify execute-plan skill**: In Step 4 (phase execution), when constructing the phase prompt, check if the discovery doc has a Design Context section. If yes and the phase involves UI work, inject the design tokens into the implementation prompt.
5. **Update command files**: Add `## Design Awareness` section to discovery-plan and execute-plan command files.
6. **Update indexes**: Add design-awareness.md to core index with reference codes.

### Design Context Section Format

```markdown
## Design Context

### Design Personality
{personality name} — {brief description}

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| Primary | #XXXXXX | Main actions, CTAs |
| Secondary | #XXXXXX | Supporting elements |
| Background | #XXXXXX | Page/card backgrounds |
| Surface | #XXXXXX | Elevated surfaces |
| Text Primary | #XXXXXX | Main body text |
| Text Secondary | #XXXXXX | Secondary/muted text |
| Error | #XXXXXX | Error states |
| Success | #XXXXXX | Success states |

### Typography
| Element | Font | Size | Weight |
|---------|------|------|--------|
| Heading 1 | {font} | {size} | {weight} |
| Heading 2 | {font} | {size} | {weight} |
| Body | {font} | {size} | {weight} |
| Caption | {font} | {size} | {weight} |

### Spacing Scale
| Token | Value |
|-------|-------|
| xs | {value} |
| sm | {value} |
| md | {value} |
| lg | {value} |
| xl | {value} |

### Component Patterns
- {Pattern 1}: {description}
- {Pattern 2}: {description}

### Design Source
- **Source**: {screenshots / Figma export / design personality / existing system.md}
- **Files**: {list of provided design files, if any}
```

### Alternative Approaches Considered

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Plugin-required | Full feature set, consistent with plugin ecosystem | Creates hard dependency, breaks for projects without plugin | No |
| Discovery-only (no execute injection) | Simpler implementation, less risk | Design context available but not actively used during coding | No |
| **Built-in with optional plugin** | **Works everywhere, enhanced when plugin present** | **Must maintain design personality descriptions independently** | **Yes** |

## Risks and Unknowns

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM extracts incorrect colors from compressed screenshots | Medium | Include confidence notes; user can manually correct tokens in discovery doc before execution |
| Design personalities become stale if plugin updates them | Low | Personalities are stable (6 core types); can sync periodically |
| UI phase detection heuristic misses some phases | Low | Conservative approach — inject design context into all phases if any UI detected; overhead is minimal |

### Unknowns

- [x] Design personality descriptions — need to capture the 6 personalities with enough detail to be useful without the plugin (resolvable by reading plugin source)

## Next Steps

- [ ] Create implementation plan: `flow/plans/plan_ui_design_awareness_v1.md`
- [ ] Resolve: capture exact personality descriptions from interface-design plugin source
