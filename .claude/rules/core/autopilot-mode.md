# Autopilot Flow Mode

## Purpose

When `flow/.autopilot` exists, this rule is active. It automatically orchestrates the full plan-flow workflow for feature requests, loading only the relevant command context at each step.

---

## On Session Start

1. Check if `flow/.autopilot` exists
2. If it exists: autopilot mode is **ON** - follow the rules below for every user input
3. If it does not exist: autopilot mode is **OFF** - ignore this rule entirely, normal behavior applies

---

## Input Classification

When autopilot is ON, classify every new user input before acting:

### Category 1: Slash Command
**Signals**: Input starts with `/` (e.g., `/review-pr`, `/write-tests`, `/flow -disable`)
**Action**: Run that command normally. Do NOT trigger the flow.

### Category 2: Question or Exploration
**Signals**: User is asking about code, requesting explanations, exploring the codebase, or asking for help.
**Examples**: "What does this function do?", "How does auth work here?", "Show me the API routes"
**Action**: Answer normally. Do NOT trigger the flow.

### Category 3: Trivial Task
**Signals**: Single-file change, obvious fix, user specifies exact change, no architectural decisions needed. Estimated complexity 0-2.
**Examples**: "Fix the typo in README", "Rename this variable to camelCase", "Add a missing import"
**Action**: Execute directly. Do NOT trigger the flow.

### Category 4: Feature Request
**Signals**: Adding new functionality, behavior changes, multi-file scope, mentions creating/building/implementing, references APIs/integrations/components. Estimated complexity 3+.
**Examples**: "Add dark mode support", "Implement user authentication", "Create a new API endpoint for payments"
**Action**: **Trigger the full flow** (see below).

### When Uncertain
If the input doesn't clearly fit a category, use the `AskUserQuestion` tool:

```typescript
AskUserQuestion({
  questions: [{
    question: "I'm in autopilot mode. How should I handle this request?",
    header: "Flow mode",
    options: [
      { label: "Run full flow", description: "Run the full workflow: discovery → plan → execute → review" },
      { label: "Handle directly", description: "Just handle this task directly without the full flow" }
    ],
    multiSelect: false
  }]
})
```

---

## Flow Execution Steps

When a **feature request** is detected, execute these steps in order. At each step, **Read the relevant command file** to load its context, then follow its instructions.

### Step 1: Check Contracts

Check `flow/contracts/` for any relevant integration contracts. If found, note them for the discovery step.

### Step 2: Discovery

1. **Read** the file `.claude/commands/discovery-plan.md` to load discovery context
2. Execute the discovery skill following that command's instructions
3. **PAUSE**: Use the `AskUserQuestion` tool to ask clarifying questions about requirements (mandatory checkpoint). Present structured multiple-choice options — do NOT ask as plain text when the tool is available.
4. Produce the discovery document in `flow/discovery/`
5. Write transition summary (see format below)
6. **Auto-proceed** to Step 3 (override the "ask before proceeding" rule)

### Step 3: Create Plan

**GATE CHECK**: Before proceeding, verify that Step 2 produced a discovery document in `flow/discovery/`. If no discovery document exists, **DO NOT proceed** — go back to Step 2. A plan cannot be created without a discovery document. This is a hard requirement with no exceptions.

1. **Verify** discovery document exists in `flow/discovery/` (created in Step 2)
2. **Read** the file `.claude/commands/create-plan.md` to load planning context
3. Execute the create-plan skill with the discovery document as input
4. **PAUSE**: Present the plan for user approval (mandatory checkpoint)
5. Wait for user to approve the plan before proceeding
6. Produce the plan document in `flow/plans/`
7. Write transition summary
8. **Auto-proceed** to Step 4 (override the "no auto-chaining" rule)

### Step 4: Execute Plan

1. **Read** the file `.claude/commands/execute-plan.md` to load execution context
2. Execute the plan following complexity-based grouping strategy
3. Update the plan file with progress
4. Run build + test verification at the end
5. Write transition summary
6. **Auto-proceed** to Step 5

### Step 5: Review Code

1. **Read** the file `.claude/commands/review-code.md` to load review context
2. Review all uncommitted changes
3. Present the review summary

### Step 6: Archive and Complete

1. Move the discovery document to `flow/archive/`
2. Move the plan document to `flow/archive/`
3. Present completion summary
4. **Prompt for context cleanup** (see below)

---

## Transition Summary Format

At each step boundary, write this brief summary to bridge context:

```
## Flow Progress

**Feature**: [feature name from user input]
**Current Step**: [N] of 6
**Completed**:
- Step 1: Contracts check → [found/none]
- Step 2: Discovery → `flow/discovery/discovery_<feature>_v1.md`
- Step 3: Plan → `flow/plans/plan_<feature>_v1.md`
**Next**: [description of next step]
**Key context**: [1-2 sentences of what matters for the next step]
```

---

## Context Cleanup Prompt

After Step 6 completes, always prompt:

```
Flow complete! All artifacts archived.

**Summary**:
- Discovery: archived
- Plan: archived
- Code: reviewed
- Build: passing
- Tests: passing

For best results on your next feature, consider starting a fresh context with `/clear`.
Ready for the next task?
```

---

## Mandatory Checkpoints

Even in autopilot, these checkpoints **always** pause for user input:

| Checkpoint | When | Why |
| --- | --- | --- |
| Discovery Q&A | Step 2 | User must answer requirements questions |
| Discovery Gate | Step 2→3 | Discovery document must exist before plan creation. No exceptions. |
| Plan Approval | Step 3 | User must review and approve the plan before execution |

All other transitions happen automatically.

**Hard Rule**: Step 3 (Create Plan) CANNOT start unless Step 2 (Discovery) produced a document in `flow/discovery/`. If the discovery document does not exist, the flow must loop back to Step 2. A plan without discovery is incomplete and will lead to poor implementations.

---

## Overriding No Auto-Chaining Rules

When autopilot is ON, the following rules in individual commands are **suspended**:

- `discovery-plan.md`: "Ask Before Proceeding" and "No Auto-Execution" rules
- `create-plan.md`: "No Auto-Chaining" and "Complete and Stop" rules
- `execute-plan.md`: "Complete and Stop" rule
- `review-code.md`: completion stop behavior

These rules remain fully active when autopilot is OFF.

---

## Error Handling

If any step fails:

1. Present the error to the user
2. Ask how to proceed: retry, skip, or abort the flow
3. If aborted: note which steps completed and which artifacts exist
4. The flow can be resumed manually using individual slash commands
