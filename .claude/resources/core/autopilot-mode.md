# Autopilot Flow Mode

## Purpose

When `flow/.autopilot` exists, this rule is active. It automatically orchestrates the full plan-flow workflow for feature requests, loading only the relevant command context at each step.

---

## On Session Start

1. Check if `flow/.autopilot` exists
2. If it exists: autopilot mode is **ON** - follow the rules below for every user input
3. If it does not exist: autopilot mode is **OFF** - ignore this rule entirely, normal behavior applies

---

## Workflow Type Detection

After confirming autopilot is ON, read the **content** of `flow/.autopilot` to determine the active workflow type:

- File contains `bugfix` → **bugfix** workflow
- File contains `refactor` → **refactor** workflow
- File contains `security` → **security** workflow
- File is empty, contains `feature`, or any unrecognized value → **feature** workflow (default)

See `.claude/resources/core/orchestration-workflows.md` [COR-OW-1] for full workflow definitions.

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
**Signals**: Single-file change, obvious fix, user specifies exact change, no architectural decisions needed. Estimated complexity below the active workflow's threshold.
**Examples**: "Fix the typo in README", "Rename this variable to camelCase", "Add a missing import"
**Action**: Execute directly. Do NOT trigger the flow.

### Category 4: Actionable Request
**Signals**: Complexity meets or exceeds the active workflow's threshold. Classify by input signals:

| Priority | Workflow | Input Signals | Threshold |
|----------|----------|---------------|-----------|
| 1 | **security** | "security", "vulnerability", "auth", "XSS", "injection", "encrypt", "permissions" | 2+ |
| 2 | **bugfix** | "fix", "bug", "broken", "error", "regression", "crash", "not working" | 1+ |
| 3 | **refactor** | "refactor", "restructure", "clean up", "tech debt", "migrate", "reorganize" | 3+ |
| 4 | **feature** | "add", "create", "implement", "build", "integrate" (default) | 3+ |

**Action**: Trigger the flow using the **active workflow type** (from `.autopilot` file). If the input signals suggest a different workflow type than what's active, use the active type — the user chose it deliberately.

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

## Flow Execution — Workflow Dispatch

When an actionable request is detected, execute the step sequence for the **active workflow type**. At each step, **Read the relevant command file** to load its context, then follow its instructions.

### Feature Workflow (default)

**Steps**: contracts → discovery → plan → execute → review → archive

#### Step 1: Check Contracts
Check `flow/contracts/` for any relevant integration contracts. If found, note them for discovery.

#### Step 2: Discovery
1. **Read** `.claude/commands/discovery-plan.md`
2. Execute the discovery skill
3. **PAUSE**: Use `AskUserQuestion` for clarifying questions (mandatory checkpoint)
4. Produce discovery document in `flow/discovery/`
5. **Auto-proceed** to Step 3

#### Step 3: Create Plan
**GATE CHECK**: Verify discovery document exists in `flow/discovery/`. If not, go back to Step 2.
1. **Read** `.claude/commands/create-plan.md`
2. Execute with discovery document as input
3. **PAUSE**: Present plan for user approval (mandatory checkpoint)
4. **Auto-proceed** to Step 4

#### Step 4: Execute Plan
1. **Read** `.claude/commands/execute-plan.md`
2. Execute following complexity-based grouping
3. Run build + test verification at the end
4. **Auto-proceed** to Step 5

#### Step 5: Review Code
1. **Read** `.claude/commands/review-code.md`
2. Review all uncommitted changes

#### Step 6: Archive and Complete
1. Move discovery + plan to `flow/archive/`
2. Present completion summary
3. **Prompt for context cleanup** (see below)

---

### Bugfix Workflow

**Steps**: review-code (diagnostic) → plan → execute → review-code (verification) → archive

#### Step 1: Diagnostic Review
1. **Read** `.claude/commands/review-code.md`
2. Review current code state with focus on **diagnosing the bug** — identify root cause, affected files, and broken behavior
3. Summarize findings for the planning step

#### Step 2: Create Plan
1. **Read** `.claude/commands/create-plan.md`
2. Create fix plan based on user's bug description + diagnostic review findings
3. **Note**: No discovery document required for bugfix — the bug report + diagnostic review serve as input
4. **PAUSE**: Present plan for user approval (mandatory checkpoint)
5. **Auto-proceed** to Step 3

#### Step 3: Execute Plan
1. **Read** `.claude/commands/execute-plan.md`
2. Execute the fix plan
3. Run build + test verification at the end
4. **Auto-proceed** to Step 4

#### Step 4: Verification Review
1. **Read** `.claude/commands/review-code.md`
2. Review all uncommitted changes with focus on **verifying the fix** — confirm root cause addressed, no regressions

#### Step 5: Archive and Complete
1. Move plan to `flow/archive/`
2. Present completion summary
3. **Prompt for context cleanup**

---

### Refactor Workflow

**Steps**: review-code (baseline) → discovery → plan → execute → review-code (comparison) → archive

#### Step 1: Baseline Review
1. **Read** `.claude/commands/review-code.md`
2. Review current code with focus on **baselining quality** — document patterns, code smells, metrics
3. Summarize findings for the discovery step

#### Step 2: Discovery
1. **Read** `.claude/commands/discovery-plan.md`
2. Focus discovery on **refactoring scope**: what to change, target patterns, success criteria
3. Include baseline review findings as input context
4. **PAUSE**: Use `AskUserQuestion` for clarifying questions (mandatory checkpoint)
5. Produce discovery document in `flow/discovery/`
6. **Auto-proceed** to Step 3

#### Step 3: Create Plan
**GATE CHECK**: Verify discovery document exists.
1. **Read** `.claude/commands/create-plan.md`
2. Create refactoring plan with before/after pattern descriptions
3. **PAUSE**: Present plan for user approval (mandatory checkpoint)
4. **Auto-proceed** to Step 4

#### Step 4: Execute Plan
1. **Read** `.claude/commands/execute-plan.md`
2. Execute the refactoring plan
3. Run build + test verification at the end
4. **Auto-proceed** to Step 5

#### Step 5: Comparison Review
1. **Read** `.claude/commands/review-code.md`
2. Review all changes with focus on **comparing against baseline** — verify patterns improved, no quality regressions

#### Step 6: Archive and Complete
1. Move discovery + plan to `flow/archive/`
2. Present completion summary with before/after comparison
3. **Prompt for context cleanup**

---

### Security Workflow

**Steps**: review-code (security audit) → discovery → plan → execute → review-code (security verification) → archive

#### Step 1: Security Audit
1. **Read** `.claude/commands/review-code.md`
2. Review current code with **security focus** — vulnerabilities, auth flows, data handling, input validation
3. Summarize findings for the discovery step

#### Step 2: Discovery
1. **Read** `.claude/commands/discovery-plan.md`
2. Focus discovery on **security requirements**: threat model, attack surface, compliance needs
3. Include security audit findings as input context
4. **PAUSE**: Use `AskUserQuestion` for clarifying questions (mandatory checkpoint)
5. Produce discovery document in `flow/discovery/`
6. **Auto-proceed** to Step 3

#### Step 3: Create Plan
**GATE CHECK**: Verify discovery document exists.
1. **Read** `.claude/commands/create-plan.md`
2. Create security hardening plan
3. **PAUSE**: Present plan for user approval (mandatory checkpoint)
4. **Auto-proceed** to Step 4

#### Step 4: Execute Plan
1. **Read** `.claude/commands/execute-plan.md`
2. Execute the security plan
3. Run build + test verification at the end
4. **Auto-proceed** to Step 5

#### Step 5: Security Verification Review
1. **Read** `.claude/commands/review-code.md`
2. Review all changes with **security focus** — verify vulnerabilities addressed, no new attack surface
3. **PAUSE**: Present security review for user approval (extra mandatory checkpoint)
4. Wait for user to approve before archiving

#### Step 6: Archive and Complete
1. Move discovery + plan to `flow/archive/`
2. Present completion summary with security findings resolved
3. **Prompt for context cleanup**

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

| Checkpoint | Workflows | Why |
| --- | --- | --- |
| Discovery Q&A | feature, refactor, security | User must answer requirements questions |
| Discovery Gate | feature, refactor, security | Discovery document must exist before plan creation |
| Plan Approval | all workflows | User must approve plan before execution |
| Security Review Approval | security only | User must approve post-execution security review |

All other transitions happen automatically.

**Hard Rule**: For workflows that include discovery (feature, refactor, security), the plan step CANNOT start unless discovery produced a document in `flow/discovery/`. The bugfix workflow is exempt — it uses the bug report + diagnostic review as plan input instead.

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
