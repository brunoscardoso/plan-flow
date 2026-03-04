
# Orchestration Workflows

## Overview

Orchestration workflows define predefined command sequences for common development scenarios. Each workflow type specifies which plan-flow commands to run, in what order, with what checkpoints, and at what complexity threshold.

The active workflow type is stored in `flow/.autopilot`. If the file is empty or contains no recognized type, the default is `feature`.

**Reference Codes**: COR-OW-1 (workflow definitions), COR-OW-2 (selection guide)

---

## COR-OW-1: Workflow Type Definitions

### feature (default)

**When**: New functionality, behavior changes, multi-file scope
**Complexity threshold**: 3+ (tasks below this are handled directly)
**Steps**:

| Step | Command | Purpose |
|------|---------|---------|
| 1 | Contracts check | Find relevant integration contracts |
| 2 | `/discovery-plan` | Gather requirements, ask clarifying questions |
| 3 | `/create-plan` | Create phased implementation plan |
| 4 | `/execute-plan` | Implement the plan phase by phase |
| 5 | `/review-code` | Review all uncommitted changes |
| 6 | Archive | Move discovery + plan to `flow/archive/` |

**Checkpoints** (pause for user input):
- Step 2: Discovery Q&A (user answers clarifying questions)
- Step 3: Plan approval (user reviews plan before execution)

**Input signals**: "add", "create", "implement", "build", "new feature", "integrate", multi-file scope

---

### bugfix

**When**: Bug reports, error fixes, regression fixes
**Complexity threshold**: 1+ (most bugs warrant the flow)
**Steps**:

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `/review-code` (diagnostic) | Understand the current broken state |
| 2 | `/create-plan` | Plan the fix based on bug description + review findings |
| 3 | `/execute-plan` | Implement the fix |
| 4 | `/review-code` (verification) | Verify the fix doesn't introduce new issues |
| 5 | Archive | Move plan to `flow/archive/` |

**Checkpoints**:
- Step 2: Plan approval (user reviews fix plan)

**Key differences from feature**:
- Skips discovery — the bug report IS the requirement
- Starts with review-code to diagnose the current state
- Plan is derived from bug description + diagnostic review
- No discovery document created (plan references user's bug description directly)
- Ends with verification review

**Input signals**: "fix", "bug", "broken", "error", "regression", "crash", "not working", "fails when"

---

### refactor

**When**: Code restructuring, pattern migration, tech debt cleanup
**Complexity threshold**: 3+ (simple renames don't need the flow)
**Steps**:

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `/review-code` (baseline) | Assess current code quality and patterns |
| 2 | `/discovery-plan` | Define refactoring scope and target patterns |
| 3 | `/create-plan` | Plan the refactoring phases |
| 4 | `/execute-plan` | Execute the refactoring |
| 5 | `/review-code` (comparison) | Compare before/after quality |
| 6 | Archive | Move discovery + plan to `flow/archive/` |

**Checkpoints**:
- Step 2: Discovery Q&A (user clarifies refactoring goals)
- Step 3: Plan approval (user reviews refactoring plan)

**Key differences from feature**:
- Starts with baseline review to document current state
- Discovery focuses on "what to change" and "target patterns"
- Ends with comparison review (before vs after)

**Input signals**: "refactor", "restructure", "clean up", "tech debt", "migrate", "reorganize", "simplify", "extract"

---

### security

**When**: Security hardening, vulnerability fixes, auth changes
**Complexity threshold**: 2+ (security changes warrant extra scrutiny)
**Steps**:

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `/review-code` (security audit) | Identify current security posture |
| 2 | `/discovery-plan` | Document security requirements and threat model |
| 3 | `/create-plan` | Plan security changes |
| 4 | `/execute-plan` | Implement security changes |
| 5 | `/review-code` (security verification) | Verify no new vulnerabilities introduced |
| 6 | Archive | Move discovery + plan to `flow/archive/` |

**Checkpoints**:
- Step 2: Discovery Q&A (user clarifies security requirements)
- Step 3: Plan approval (user reviews security plan)
- Step 5: Security review approval (user must approve post-execution security review before archiving)

**Key differences from feature**:
- Both review-code passes use security-focused analysis
- Discovery includes threat modeling
- Extra checkpoint after execution — user must approve the security review
- Lower complexity threshold (security changes always warrant scrutiny)

**Input signals**: "security", "vulnerability", "auth", "authentication", "authorization", "XSS", "injection", "CSRF", "encrypt", "permissions", "access control"

---

## COR-OW-2: Workflow Selection Guide

### Automatic Selection (Autopilot Mode)

When autopilot is ON, the active workflow type determines how the flow runs. The LLM classifies user input using the **input signals** listed above.

**Priority order** (when signals overlap):
1. **security** — if input mentions security/vulnerability/auth concepts
2. **bugfix** — if input describes a broken behavior or error
3. **refactor** — if input focuses on restructuring without new features
4. **feature** — default for everything else

### Manual Selection

Users set the workflow type via:
- `/flow -enable feature` (default)
- `/flow -enable bugfix`
- `/flow -enable refactor`
- `/flow -enable security`

### Complexity Thresholds

| Workflow | Threshold | Rationale |
|----------|-----------|-----------|
| feature | 3+ | Small additions don't need full flow |
| bugfix | 1+ | Most bugs benefit from structured fixing |
| refactor | 3+ | Simple renames don't need flow |
| security | 2+ | Security always warrants extra care |

Tasks below the threshold are handled directly (no flow triggered).

---

## Review-Code Variants

Some workflows use `/review-code` with different focus areas:

| Variant | Focus | Used By |
|---------|-------|---------|
| Diagnostic | Understand what's broken, identify root cause | bugfix (step 1) |
| Baseline | Document current patterns and quality metrics | refactor (step 1) |
| Security audit | Focus on vulnerabilities, auth flows, data handling | security (step 1) |
| Verification | Compare against previous review, verify improvements | bugfix (step 4), refactor (step 5) |
| Security verification | Check for new vulnerabilities, verify fixes | security (step 5) |
| Standard | General quality, pattern compliance | feature (step 5) |

The variant is communicated via the review scope/context, not a separate command. The LLM adjusts its review focus based on the active workflow step.
