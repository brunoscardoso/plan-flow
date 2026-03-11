---
description: Free-form conversational exploration of an idea. The LLM collaborates one-question-at-a-time to crystallize vague ideas before discovery. Optionally generates an MD file for /discovery-plan.
---

# Brainstorm

## Command Description

This command starts a free-form brainstorm session where the LLM collaborates conversationally to explore an idea. Unlike `/discovery-plan` (structured, project-aware), brainstorm is pure ideation — exploring the what and why through rapid back-and-forth dialogue.

**Output**: Conversational exploration, plus an optional markdown file at `flow/brainstorms/brainstorm_{topic}_v{version}.md`

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/brainstorm - Collaborative Idea Exploration

DESCRIPTION:
  Free-form brainstorm session where the LLM acts as a collaborative
  thinking partner. Explores ideas through one-question-at-a-time dialogue
  before formalizing into discovery.

USAGE:
  /brainstorm <idea>
  /brainstorm -help

ARGUMENTS:
  idea   Free-text description of the idea to explore

EXAMPLES:
  /brainstorm I want to add a plugin system to plan-flow
  /brainstorm "Real-time notifications triggered by user actions"
  /brainstorm We need a better way to handle error recovery in the API

OUTPUT:
  - Conversational exploration of the idea
  - Optional: flow/brainstorms/brainstorm_{topic}_v{version}.md
  - Optional: tasklist entry (only if requested)

WORKFLOW:
  1. You share your idea
  2. LLM asks one question at a time (not batched)
  3. Back-and-forth conversation to explore, challenge, expand
  4. You say "done" / "wrap up" / "summarize" when ready
  5. LLM presents structured summary
  6. Optionally generates MD file for /discovery-plan
  7. Optionally adds to tasklist

WHAT IT IS:
  - A thinking partner — challenges, suggests, connects
  - Pure ideation — explores the what and why
  - Lightweight — no brain, no memory, no auto-tasklist

WHAT IT IS NOT:
  - Not /discovery-plan — no codebase scanning, no requirements docs
  - Not /brain — no knowledge capture, no wiki-links
  - Not a plan — no phases, no complexity scores

RECOMMENDED MODEL:
  Claude Opus 4.6 or Sonnet 4.5 for best results

RELATED COMMANDS:
  /discovery-plan   Ground the brainstorm idea into the project
  /create-plan      Create plan from discovery document
  /brain            Capture knowledge (different purpose)
```

---

## Critical Rules

| Rule | Description |
|------|-------------|
| **Conversational** | One question per turn. Never batch 3-4 questions. |
| **No Code** | NEVER write, edit, or generate source code |
| **No Brain** | Do NOT write to `flow/brain/` or update brain index |
| **No Memory** | Do NOT write to `flow/memory.md` |
| **No Auto-Tasklist** | Only update tasklist if user explicitly requests |
| **Codebase on Request** | Only read codebase files when user explicitly asks |
| **User Ends It** | Never auto-end the brainstorm. User controls when it's done. |
| **Complete and Stop** | After completion, STOP and wait for user |

---

## Instructions

### Step 1: Validate Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `idea` | Yes | Free-text description of the idea to explore |

If no idea is provided, ask:

```markdown
What idea would you like to explore? Just describe it in your own words —
it can be as vague or specific as you want.
```

---

### Step 2: Check for Existing Brainstorms

Check `flow/brainstorms/` for existing brainstorm documents on a similar topic:

1. If found, mention it: "There's an existing brainstorm on {topic} (v{N}). Want to build on that or start fresh?"
2. If starting fresh, increment version number
3. If building on existing, read it first for context

---

### Step 3: Invoke Brainstorm Skill

The skill will:

1. Parse the idea and open the conversation
2. Run the conversational loop (one question per turn)
3. Detect when the user wants to end
4. Present a structured summary
5. Offer to generate an MD file
6. Offer to add a tasklist entry

See: `.claude/resources/skills/brainstorm-skill.md`

---

### Step 4: Handle Completion

After the skill completes:

- If MD file was generated: report the file path
- If no MD file: just acknowledge completion
- Do NOT auto-chain to `/discovery-plan`

---

## Flow Diagram

```
+------------------------------------------+
|        /brainstorm COMMAND               |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 1: Validate Inputs                  |
| - Check for idea text                    |
| - Ask if not provided                    |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 2: Check Existing Brainstorms       |
| - Look in flow/brainstorms/              |
| - Offer to build on or start fresh       |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 3: Invoke Brainstorm Skill          |
| - Conversational loop                    |
| - One question per turn                  |
| - Silent thread tracking                 |
| - See brainstorm-skill.md              |
+------------------------------------------+
                    |
                    v
+------------------------------------------+
| Step 4: Handle Completion                |
| - Summary presented                      |
| - Optional MD file generated             |
| - Optional tasklist entry                |
| - STOP (no auto-chain)                   |
+------------------------------------------+
```

---

## Context Optimization

### Recommended Loading Order

1. **Always load first**: This command file (`commands/brainstorm.md`)
2. **Expand on-demand**: Load skill file when entering conversational loop

### Reference Codes for Brainstorm

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-BS-1 | Brainstorm skill restrictions and inputs | Understanding allowed actions |
| SKL-BS-2 | Conversational loop and tracking | During the brainstorm |
| SKL-BS-3 | End detection, summary, and output | When wrapping up |

---

## Related Resources

| Resource | Purpose |
|----------|---------|
| `resources/skills/_index.md` | Index of skills with reference codes |
| `brainstorm-skill.md` | Skill that runs the brainstorm |
| `brainstorm-templates.md` | Output file template |
| `/discovery-plan` command | Next step after brainstorm |

---

## Resource Capture

During this skill's execution, watch for valuable reference materials worth preserving. See `.claude/resources/core/resource-capture.md` for capture rules, file format, and naming conventions.

At natural break points, if you encounter information that could be useful for future development (API specs, architecture notes, config references, domain knowledge, etc.), ask the user: "I found something that could be useful for future reference: _{brief description}_. Should I save it to `flow/resources/`?"

Only save if the user approves. Do not re-ask if declined.

---

## Pattern Capture

During the brainstorm, silently watch for conventions, anti-patterns, and patterns that emerge from the discussion. Append captured patterns to `flow/resources/pending-patterns.md` without interrupting the conversation.

After the brainstorm completes, present any buffered patterns for user approval. Approved patterns are written to `.claude/rules/core/allowed-patterns.md` or `.claude/rules/core/forbidden-patterns.md`.

See `.claude/resources/core/pattern-capture.md` for buffer format, capture triggers, conflict detection, and the full review protocol.
