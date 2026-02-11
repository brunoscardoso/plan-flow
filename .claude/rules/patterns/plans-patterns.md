
## Workflow Folder Structure

```
flow/
├── archive/      # IGNORE - Completed/abandoned plans
├── discovery/    # Research, spikes, and exploration
├── plans/        # Active implementation plans
└── references/   # Reference materials (API contracts, specs, designs)
```

| Folder              | Purpose                                    | When to Use                  |
| ------------------- | ------------------------------------------ | ---------------------------- |
| `flow/plans/`       | Active implementation plans                | Creating new feature plans   |
| `flow/discovery/`   | Research, spikes, exploration documents    | Investigating before planning|
| `flow/references/`  | Reference materials (API contracts, specs) | Storing documentation        |
| `flow/archive/`     | Completed or abandoned plans               | After plan completion        |

---

## Critical Rule: Ignore Archived Plans

**NEVER consider or reference files inside the `flow/archive/` folder.** These are outdated, superseded, or abandoned plans that should not influence current development.

---

## Allowed Patterns

### 1. Store Plans with Snake Case Naming

All implementation plans must be created inside `flow/plans/` using snake_case naming with incremental versioning.

**Naming Convention**: `plan_<feature_name>_v<version>.md`

---

### 2. Use Discovery Folder for Research

Before creating a plan for complex features, create discovery documents in `flow/discovery/`. See `.claude/rules/patterns/discovery-patterns.md` for details.

---

### 3. Create Markdown Files with Required Sections

Every plan must include:

- **Overview**: Brief description
- **Goals**: Main objectives
- **Phases**: Implementation steps with complexity scores
- **Key Changes**: Summary of modifications

See `.claude/rules/patterns/plans-templates.md` for the full template.

---

### 4. Include Key Changes Summary

Every plan must end with a "Key Changes" section summarizing the most important modifications.

---

### 5. Follow All Cursor Rules During Execution

On every execution of each phase, ensure compliance with all cursor rules:

- `.claude/rules/core/allowed-patterns.md` - Follow allowed patterns
- `.claude/rules/core/forbidden-patterns.md` - Avoid forbidden patterns

---

### 6. Structure Plans with Scoped Phases

Every plan must be divided into implementation phases with clear scope boundaries:

- **Scope**: What this phase covers
- **Complexity**: Score from 0-10
- **Tasks**: Checkboxes for tracking
- **Build Verification**: Command to verify

---

### 7. Tests Must Be the Last Phase

Always schedule testing as the final phase of implementation. Tests validate complete implementation and avoid rewriting during development.

---

### 8. Verify Build Success After Each Phase

At the end of each phase, run `npm run build` to ensure no build errors.

---

### 9. Minimize Code in Plan Documents

Plans should describe what to implement, not how to code it. Only include code when it serves as an important reference example.

---

### 10. Move Completed Plans to Archive

When a plan is fully implemented or no longer relevant:

```bash
mv flow/plans/plan_feature_name_v1.md flow/archive/
```

---

### 11. Assign Complexity Scores to Each Phase

Every phase must include a **Complexity Score** from 0-10.

See `.claude/rules/core/complexity-scoring.md` for the complete scoring system.

---

### 12. Execute Phases Using Plan Mode

When executing a plan, each phase must trigger **Plan mode** before implementation:

1. Use the [Plan Mode Tool](.claude/rules/tools/plan-mode-tool.md) to switch to Plan mode automatically
2. Present phase details and approach
3. Get user approval
4. Implement
5. Verify build
6. Update progress in plan file

**Reference**: See `.claude/rules/tools/plan-mode-tool.md` for complete instructions on switching to Plan mode.

---

## Forbidden Patterns

### 1. DON'T Read or Reference Archived Plans

Only reference active plans in the `flow/plans/` folder.

---

### 2. DON'T Create Plans Outside the Workflow Folder

Always create plans in the `flow/plans/` folder with proper naming.

---

### 3. DON'T Use Inconsistent Naming

Use the pattern `plan_<feature_name>_v<version>.md`.

---

### 4. DON'T Skip the Key Changes Section

Always include a "Key Changes" section at the end of the plan.

---

### 5. DON'T Ignore Cursor Rules During Implementation

Review and follow all cursor rules during each phase.

---

### 6. DON'T Create Monolithic Plans Without Phases

Break down plans into logical, scoped phases.

---

### 7. DON'T Write Tests Before Implementation

Tests should always be the last phase.

---

### 8. DON'T Skip Build Verification

Add `npm run build` verification at the end of each phase.

---

### 9. DON'T Include Full Implementation Code in Plans

Describe what to implement; let the actual code live in source files.

---

### 10. DON'T Skip Complexity Scores

Always include a complexity score for each phase.

---

### 11. DON'T Assign Arbitrary Complexity Scores

Use the scoring criteria consistently. When in doubt, score higher.

---

### 12. DON'T Execute Phases Without Plan Mode

Always switch to Plan mode before executing each phase group. Use the [Plan Mode Tool](.claude/rules/tools/plan-mode-tool.md) to ensure proper switching.

---

### 13. DON'T Mix Discovery and Plans

Keep discovery documents in `flow/discovery/` and plans in `flow/plans/`.

---

## Summary

Following these planning patterns ensures:

- **Discoverability**: All plans in `flow/plans/`, research in `flow/discovery/`
- **Traceability**: Version history and key changes documentation
- **Quality**: Cursor rules compliance verified at each phase
- **Reliability**: Build verification prevents accumulation of errors
- **Maintainability**: Scoped phases enable incremental, trackable progress
- **Testability**: Tests as the final phase ensure complete coverage
- **Clarity**: Archived plans are ignored, only active plans are referenced
- **Intelligent Pacing**: Complexity scores guide execution strategy
- **Collaborative Execution**: Plan mode ensures user approval before each phase
