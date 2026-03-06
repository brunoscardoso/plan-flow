---
description: Extract reusable patterns from the current session, or learn about a topic with step-by-step teaching
---

# Learn: Session Pattern Extraction & Teaching Mode

## Command Description

This command has two modes:

1. **Pattern Extraction** (`/learn` with no arguments): Analyzes the current session for reusable patterns and saves them to `flow/resources/`.
2. **Teaching Mode** (`/learn <topic>` or `/learn about <topic>`): **Teaches** the user about a topic with a structured step-by-step curriculum. The AI becomes a teacher — it researches the topic, designs a curriculum, and walks the user through each step interactively. Curricula are stored **globally** at `~/plan-flow/brain/learns/` so they can be reused across all projects.

**Output**:
- Pattern mode: `flow/resources/learned-{pattern-name}.md`
- Teaching (general knowledge): `~/plan-flow/brain/learns/{topic-kebab}.md` (global, indexed with `LRN-*` codes, reusable across projects)
- Teaching (project implementation): `flow/brain/learning/{topic-kebab}.md` (project-local, specific to this project's stack)
- Teaching (both): General part saved globally + implementation part saved locally

---

## Mode Detection (CRITICAL — read this first)

**IMPORTANT**: The user's input after `/learn` determines which mode to use. Get this right.

| User Input | Mode | What To Do |
|------------|------|------------|
| `/learn` (no arguments) | **Pattern Extraction** | Scan session for reusable patterns (Steps 1-4 below) |
| `/learn about <topic>` | **Teaching Mode** | Create a step-by-step curriculum to TEACH the user about `<topic>` |
| `/learn <topic>` (any text after /learn) | **Teaching Mode** | Same as above — treat any argument as a topic to teach |
| `/learn -help` | Help | Show help and stop |

**Rule**: If the user provides ANY topic after `/learn`, you are in **Teaching Mode**. The ONLY way to trigger Pattern Extraction is `/learn` with no arguments.

**Teaching Mode means**: You are a TEACHER. You create a structured curriculum and teach the user step by step. You do NOT extract patterns from the session. You do NOT create `learned-*.md` files. You CREATE a curriculum and TEACH.

---

## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/learn - Extract Patterns & Teaching Mode

DESCRIPTION:
  Two modes: extract reusable patterns from the current session,
  or learn about a topic with step-by-step teaching.

USAGE:
  /learn                  Analyze session and suggest patterns to extract
  /learn about <topic>    Teach me about <topic> step by step
  /learn <topic>          Same as above — teach me about <topic>
  /learn -help            Show this help

PATTERN EXTRACTION MODE (/learn):
  Extracts:
  - Error resolutions (how you fixed a tricky bug)
  - Debugging techniques (steps to diagnose an issue)
  - Workarounds (non-obvious solutions to platform/tool limitations)
  - Conventions (project-specific coding patterns discovered)
  - Architecture insights (structural decisions made during work)
  - Integration patterns (how services/APIs were connected)

  Does NOT extract:
  - Trivial fixes (typos, missing imports, obvious syntax errors)
  - One-time issues unlikely to recur
  - Generic knowledge available in documentation

  Output: flow/resources/learned-{pattern-name}.md

TEACHING MODE (/learn about <topic>):
  Intelligently teaches you about a topic. For tools/libraries,
  asks if you want general knowledge, project implementation,
  or both. Adapts to your pace — skip what you know, go deeper
  where you need it. Uses web search for up-to-date docs.

  Completed curricula are saved globally and reused across projects.

  Output: ~/plan-flow/brain/learns/{topic-kebab}.md (global)
  Index:  ~/plan-flow/brain/learns/_index.md (LRN-* codes)

RELATED COMMANDS:
  /brain           Capture meeting notes, ideas, brainstorms
  /setup           Generate project pattern files
  /review-code     Review local uncommitted changes
```

---

## Critical Rules

| Rule                     | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| **Ask Before Saving**    | ALWAYS present the drafted pattern to the user before saving     |
| **No Trivial Patterns**  | Skip typos, missing imports, obvious syntax errors               |
| **One Pattern Per File** | Each learned pattern gets its own file                           |
| **Wiki-Links Required**  | All cross-references use `[[kebab-case-name]]` format            |
| **Resources Only**       | ONLY write to `flow/resources/` - no source code, no config      |
| **Complete and Stop**    | After saving pattern(s), STOP and wait for user input            |

---

## Instructions

### Step 1: Review Session for Extractable Patterns

Scan the current conversation looking for:

| Priority | Category | Example |
|----------|----------|---------|
| **High** | Error resolution | Fixed a cryptic build error by changing config X |
| **High** | Debugging technique | Diagnosed memory leak by checking Y |
| **Medium** | Workaround | Bypassed tool limitation with approach Z |
| **Medium** | Convention | Discovered project uses pattern A for B |
| **Low** | Architecture insight | Chose structure X because of constraint Y |
| **Low** | Integration pattern | Connected service A to B using method C |

---

### Step 2: Filter Patterns

Skip anything that matches:

- **Trivial fixes**: typos, missing imports, obvious syntax errors
- **One-time issues**: environment-specific problems unlikely to recur
- **Generic knowledge**: standard language/framework features documented elsewhere
- **Already captured**: patterns that exist in `flow/resources/learned-*.md`

If no extractable patterns found, tell the user:

```markdown
No reusable patterns found in this session.

Patterns worth capturing typically include:
- Non-obvious error resolutions
- Debugging techniques for recurring issues
- Workarounds for tool/platform limitations
- Project-specific conventions discovered during work
```

---

### Step 3: Draft Pattern File

For each pattern found, draft a file using this template:

```markdown
# {Pattern Name}

**Project**: [[{project-name}]]
**Learned**: {YYYY-MM-DD}
**Category**: {error-resolution|debugging|workaround|convention|architecture|integration}

## Problem
{What problem this solves}

## Solution
{The pattern/technique/workaround}

## Example
{Code example if applicable}

## When to Use
{Trigger conditions - when should the LLM apply this pattern}

## Related
- [[{feature-name}]]
- [[{brain-entry}]]
```

Present the draft to the user for confirmation. If they suggest changes, revise the draft.

---

### Step 4: Save Approved Pattern

On user approval:

1. Ensure `flow/resources/` exists (create if needed)
2. Save to `flow/resources/learned-{kebab-case-name}.md`
3. Present result:

```markdown
Pattern saved!

**Written to**: flow/resources/learned-{pattern-name}.md
**Category**: {category}
**Links created**: [[project-name]], [[feature-name]]
```

If multiple patterns were found, repeat Steps 3-4 for each one.

---

## Teaching Mode (`/learn about <topic>`)

When the user provides a topic (e.g., `/learn about langfuse`, `/learn docker`, `/learn graphql subscriptions`), you become a **teacher**. Your job is to intelligently understand what the user wants to learn and deliver it interactively.

**You are NOT extracting patterns. You are TEACHING the user something new.**

### Step 0: Classify the Topic (CRITICAL — do this first)

Before designing any curriculum, classify the topic to determine the right learning approach:

| Topic Type | Examples | How to Detect |
|------------|----------|---------------|
| **Integrable tool/library** | Langfuse, Sentry, Stripe, Prisma, Redis | Has an SDK/package that could be installed in a project |
| **Platform/service** | AWS, Vercel, Docker, Kubernetes | Infrastructure or deployment related |
| **Concept/pattern** | MCP protocol, event sourcing, CQRS, microservices | Abstract idea, no single package to install |
| **Language/framework feature** | TypeScript generics, React Server Components | Part of a language or framework the project may use |

### Step 1: Ask the User What They Want (for integrable topics)

**If the topic is an integrable tool/library/platform**, ask the user before proceeding:

```markdown
I can teach you about **{topic}** in different ways:

1. **General knowledge** — What is {topic}? How does it work? Core concepts and architecture.
   → Saved globally (reusable across all your projects)

2. **Project implementation** — How to integrate {topic} into THIS project ({detected-stack}). Hands-on setup, configuration, and usage.
   → Saved to this project only

3. **Both** — Start with fundamentals, then apply to your project step by step.
   → General part saved globally + implementation part saved to this project

Which approach would you prefer?
```

**If the topic is a concept/pattern** (not directly integrable), skip this question and go straight to curriculum design — concepts are always taught as general knowledge (saved globally) contextualized with project examples.

### Storage Rules Based on Approach

| Approach | Where to Save | Why |
|----------|---------------|-----|
| **General knowledge** | `~/plan-flow/brain/learns/{topic}.md` (global) | Generic knowledge reusable across all projects |
| **Project implementation** | `flow/brain/learning/{topic}.md` (project-local) | Contains project-specific paths, config, and stack details |
| **Both** | Global file for general steps + project-local file for implementation steps | Separates reusable knowledge from project-specific setup |
| **Concept/pattern** | `~/plan-flow/brain/learns/{topic}.md` (global) | Concepts are inherently cross-project |

**For "both" approach**: Create two linked files:
- `~/plan-flow/brain/learns/{topic}.md` — General knowledge steps (auto-indexed with `LRN-*`)
- `flow/brain/learning/{topic}-implementation.md` — Project implementation steps (linked via `[[{topic}]]` wiki-link back to the global file)

### Step 2: Research the Topic

Before designing the curriculum:

1. **Use web search** to get up-to-date information (official docs, latest version, recent changes)
2. **Read the project's stack** from `flow/brain/index.md` and `flow/references/tech-foundation.md`
3. **Check existing learns** at `~/plan-flow/brain/learns/_index.md` — if the topic already exists, offer to resume, expand, or start fresh

### Step 3: Design an Adaptive Curriculum

Design the curriculum based on the user's chosen approach:

**For general knowledge:**
- Focus on concepts, architecture, how it works under the hood
- Use generic examples (not tied to the project)
- Cover: what it is → why it matters → core concepts → how it works → advanced features → ecosystem

**For project implementation:**
- Focus on hands-on integration into the current project
- Use the project's actual stack, file structure, and conventions
- Cover: installation → configuration → basic usage → integration with existing code → testing → production considerations

**For both (hybrid):**
- Start with 2-3 conceptual steps (what + why + core concepts)
- Transition to 3-4 implementation steps (setup + integrate + test + deploy)
- Mark the transition clearly: "Now let's apply this to your project"

**Curriculum rules:**
- 3-7 steps, progressing from simple → complex
- Each step should be self-contained and confirmable
- Include code examples relevant to the chosen approach
- Reference official docs with links when possible

### Step 4: Present Overview and Teach

1. **Present the full curriculum outline** for user approval
2. **For each step:**
   - Present clear explanations with examples
   - For implementation steps: show actual code snippets for the project's stack
   - Wait for user confirmation (`next`, `done`, or questions)
   - **Be adaptive**: if the user asks a question, answer it thoroughly. If they want to go deeper on something, explore it. If they want to skip something they already know, skip it.
   - Mark the step as completed

### Step 5: Dynamic Teaching Behaviors

During teaching, be smart about these situations:

| Situation | What to Do |
|-----------|------------|
| User asks a tangent question | Answer it, then ask if they want to continue or explore further |
| User says "I already know this" | Skip to the next step, offer to adjust remaining curriculum |
| User asks for more depth | Expand the current step with more detail, examples, or edge cases |
| User asks for a code example | Provide a concrete example using the project's actual stack and conventions |
| User seems confused | Rephrase with simpler language, add an analogy, or break into smaller sub-steps |
| User asks "how would this work in my project?" | Switch to project-contextualized explanation using the detected stack |
| User says "done" or "that's enough" | Wrap up early — save what was completed so far with status `partial` |

### Step 6: Save and Index

After all steps are confirmed (or user stops early):

**For general knowledge / concept:**
1. Save to `~/plan-flow/brain/learns/{topic-kebab}.md`
2. Auto-index with `LRN-*` codes in `~/plan-flow/brain/learns/_index.md`
3. Update `flow/brain/index.md` with `## Global Learns` section

**For project implementation:**
1. Ensure `flow/brain/learning/` exists
2. Save to `flow/brain/learning/{topic-kebab}.md`
3. No global indexing (project-local only)
4. Update `flow/brain/index.md` with a reference under `## Project Learns`

**For both:**
1. Save general steps to `~/plan-flow/brain/learns/{topic-kebab}.md` → auto-index with `LRN-*`
2. Save implementation steps to `flow/brain/learning/{topic-kebab}-implementation.md`
3. Add `[[{topic-kebab}]]` wiki-link in the project file pointing to the global file
4. Update `flow/brain/index.md` with both global and project references

### Teaching Restrictions

| Rule | Description |
|------|-------------|
| **Ask First** | For integrable topics, ask general vs implementation vs both BEFORE designing curriculum |
| **Research First** | Use web search for up-to-date docs before teaching |
| **Be Adaptive** | Adjust depth, pace, and focus based on user responses |
| **Smart Storage** | General knowledge → global (`~/plan-flow/brain/learns/`). Project implementation → local (`flow/brain/learning/`). Both → split across both. |
| **Auto-Index** | Global learns are automatically indexed with `LRN-*` codes (no user action needed) |
| **No Code Changes** | Teaching mode does NOT write source code or modify project configs |
| **Complete and Stop** | After teaching completes (or user stops), STOP and wait for user input |

### Curriculum Template

```markdown
# Learning: {Topic}

**Started**: {YYYY-MM-DD}
**Status**: {in-progress|completed|partial}
**Approach**: {general|implementation|hybrid}
**Projects**: [[{project-name}]]

## Overview

{Brief description of what this curriculum covers and at what level}

## Curriculum

### Step 1: {Title}
- **Status**: {pending|completed|skipped}
- **Content**: {explanation with examples}

### Step 2: {Title}
- **Status**: {pending|completed|skipped}
- **Content**: {explanation}

...

## Key Takeaways

{Summary of the most important things learned — filled after completion}

## Notes

{Questions asked during learning, tangents explored, insights gained}

## Projects Using This
- [[{project-name}]]
```

### Learns Index Template (`~/plan-flow/brain/learns/_index.md`)

```markdown
# Global Learns Index

## Overview

Shared learning curricula accumulated across all projects. Use reference codes to load specific sections on-demand.

**Total Files**: X files
**Reference Codes**: LRN-{ABBR}-1 through LRN-{ABBR}-N
**Last Updated**: YYYY-MM-DD

---

## Reference Codes

### MCP (`mcp.md`)

| Code | Description | Lines |
|------|-------------|-------|
| LRN-MCP-1 | What is MCP and why it matters | 10-35 |
| LRN-MCP-2 | MCP server architecture | 36-70 |
| LRN-MCP-3 | Building your first MCP server | 71-120 |

---

## When to Expand

| Code | Expand When |
|------|-------------|
| LRN-MCP-1 | Need to understand MCP fundamentals |
| LRN-MCP-2 | Designing an MCP server |

---

## Projects Using Learns

| Learn | Projects |
|-------|----------|
| mcp | [[project-1]], [[project-2]] |
```

### Reference Code Convention for Learns

| Learn File | Code Prefix | Example Codes |
|---|---|---|
| `mcp.md` | `LRN-MCP` | LRN-MCP-1, LRN-MCP-2, LRN-MCP-3 |
| `docker.md` | `LRN-DK` | LRN-DK-1, LRN-DK-2 |
| `graphql.md` | `LRN-GQ` | LRN-GQ-1, LRN-GQ-2 |
| Other `<name>.md` | `LRN-XX` | Use first 2-3 consonants or unique abbreviation |

### Reference Codes for Teaching

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-LRN-3 | Teaching mode restrictions and workflow | Starting teaching mode |
| SKL-LRN-4 | Curriculum template and global storage | Generating curriculum |
| SKL-LRN-5 | Learns index template and LRN-* code convention | Updating learns index |

---

## Flow Diagrams

### Pattern Extraction Flow (`/learn` with no args)

```
/learn (no args)
    |
    v
Scan session for patterns → Filter trivial → Draft pattern → User confirms → Save to flow/resources/
```

### Teaching Flow (`/learn <topic>`)

```
/learn <topic>
    |
    v
Classify topic type
    |
    ├── Integrable tool/library? ──→ Ask: general / implementation / both?
    |                                       |
    ├── Concept/pattern? ──────────→ Skip question, go to research
    |
    v
Research (web search + project context + existing learns)
    |
    v
Design adaptive curriculum (3-7 steps)
    |
    v
Present overview → User approves
    |
    v
Teach step by step (adaptive: skip / deep dive / tangent / rephrase)
    |
    v
Save to ~/plan-flow/brain/learns/ → Auto-index LRN-* codes → Link to project
```

---

## Context Optimization

### Recommended Loading Order

1. **Always load first**: This command file (`commands/learn.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Reference Codes for Learn

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-LRN-1 | Purpose, restrictions, and extraction criteria | Understanding what to extract |
| SKL-LRN-2 | Workflow, output format, and validation | Processing and saving patterns |

---

## Brain Capture

<!-- brain-capture
skill: learn
captures:
  - pattern name and category saved
  - project name linked
-->

---

## Resource Capture

During pattern extraction, if you encounter valuable reference materials (API specs, architecture notes, domain knowledge) that are NOT reusable patterns but are still worth preserving, follow the standard resource capture process: ask the user before saving to `flow/resources/`.

---

## Related Resources

| Resource                    | Purpose                           |
| --------------------------- | --------------------------------- |
| `resources/skills/_index.md`   | Index of skills with reference codes |
| `resources/skills/learn-skill.md` | Detailed skill implementation |
| `resources/patterns/_index.md` | Index of patterns with reference codes |
| `resources/core/_index.md`     | Index of core rules with reference codes |
