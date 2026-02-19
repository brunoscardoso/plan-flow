---
description: This command performs deep analysis of the current repository to index languages, frameworks, archit
---

# Setup Project

## Command Description

This command performs deep analysis of the current repository to index languages, frameworks, architecture patterns, and coding conventions. It samples real code, extracts actual patterns, and generates comprehensive pattern files that enable the agent to work effectively with the project's specific stack and conventions.

**Output**: 
- Project analysis document at `flow/references/project_analysis.md`
- Framework pattern files in `.claude/rules/frameworks/`
- Library pattern files in `.claude/rules/libraries/`
- Project conventions in `.claude/rules/project/`
- Updated core pattern files

---


## Help

**If the user invokes this command with `-help`, display only this section and stop:**

```
/setup - Deep Project Analysis and Pattern Indexing

DESCRIPTION:
  Performs deep analysis of the repository to understand the project's
  stack, patterns, and conventions. Samples real code to extract actual
  patterns and generates comprehensive pattern files with real examples.

USAGE:
  /setup
  /setup -help

EXAMPLES:
  /setup                    # Analyze project and generate pattern files

OUTPUT:
  - Creates: flow/ folder structure (if not exists)
  - Creates: flow/references/project_analysis.md
  - Creates: .claude/rules/frameworks/<framework>-patterns.md
  - Creates: .claude/rules/libraries/<library>-patterns.md
  - Creates: .claude/rules/project/project-patterns.md
  - Updates: .claude/rules/core/allowed-patterns.md
  - Updates: .claude/rules/core/forbidden-patterns.md

WORKFLOW:
  1. Scans project structure and dependency files
  2. Deep dependency analysis (all libraries, versions, purposes)
  3. Deep code analysis (samples files, extracts real patterns)
  4. Researches best practices for detected stack
  5. Checks for existing cursor rules
  6. Presents analysis summary
  7. Asks confirming questions via Plan mode Questions UI
  8. Generates pattern files based on confirmed patterns
  9. Creates flow/ folder structure for plan-flow artifacts
  10. Presents setup summary

WHAT IT INDEXES:
  - Import patterns and styles
  - File organization and naming conventions
  - Component/function structure patterns
  - Error handling approaches
  - API call patterns
  - State management patterns
  - Validation patterns
  - Testing patterns

DETECTS:
  Languages:    JavaScript, TypeScript, Python, Go, Rust, Java, Ruby, C#
  Frameworks:   Next.js, React, Vue, Angular, FastAPI, Django, Express, NestJS
  Libraries:    Zod, Prisma, Zustand, Redux, TailwindCSS, React Query, and 50+

RECOMMENDED MODEL:
  Claude Opus 4.6 or Sonnet 4.5 for best results

RELATED COMMANDS:
  /discovery-plan    Start discovery after setup
  /create-plan       Create implementation plans
  /review-code       Review local changes
```

---

## Critical Rules

| Rule                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| **Deep Analysis**        | Sample real code - don't just detect dependencies        |
| **Real Examples**        | Pattern files must include actual code from the project  |
| **Research Best Practices** | Use web search to get current best practices         |
| **Interactive Questions** | Use Plan mode Questions UI to confirm patterns          |
| **User Confirmation**    | Always confirm detected patterns before generating files |
| **Complete and Stop**    | After presenting results, STOP and wait for user         |

---

## Required Tools

This command uses the Interactive Questions Tool for user confirmation.

See: `.claude/resources/tools/interactive-questions-tool.md`

---

## Instructions

### Step 1: Validate Context

Verify we're in a valid project directory:

1. Check for presence of dependency files (package.json, requirements.txt, etc.)
2. Check for source code directories (src/, app/, lib/, etc.)
3. If no project detected, inform user and ask for guidance

**If valid project found**, report initial findings:

```markdown
Found: [package.json/requirements.txt/etc.]
Source directories: [src/, app/, etc.]
Proceeding with deep analysis...
```

---

### Step 2: Initial Dependency Scan

Read dependency files completely:

1. Parse all dependencies with versions
2. Categorize: frameworks, libraries, dev tools
3. Identify the complete stack

**Report findings**:

```markdown
## Detected Stack

**Language**: [TypeScript/JavaScript/Python/etc.]
**Framework**: [Next.js/FastAPI/etc.]
**Key Libraries**:
- Validation: [Zod/Pydantic/etc.]
- State: [Zustand/Redux/etc.]
- ORM: [Prisma/SQLAlchemy/etc.]
- Testing: [Jest/Vitest/Pytest/etc.]
```

---

### Step 3: Deep Code Analysis

**CRITICAL**: This is where the real indexing happens.

For each detected library/framework:

1. **Find relevant files** using glob patterns
2. **Read 2-5 sample files** to understand usage
3. **Extract patterns**:
   - Import style
   - File organization
   - Naming conventions
   - Code structure
   - Usage patterns

**Document findings as you go**:

```markdown
## Analyzing [Library]...

**Files found**: X files matching pattern
**Sample files read**: [file1.ts], [file2.ts]

**Patterns detected**:
- Import: `import { x } from 'lib'`
- Location: `src/schemas/`
- Naming: `entitySchema`
```

---

### Step 4: Detect Project Conventions

Analyze the codebase for conventions:

1. **File Naming**: kebab-case, camelCase, PascalCase
2. **Directory Structure**: feature-based, layer-based, hybrid
3. **Import Patterns**: path aliases, barrel exports
4. **Component Structure**: co-located vs separated
5. **Error Handling**: patterns used
6. **Logging**: library or console

---

### Step 5: Research Best Practices

Use web search to get current best practices:

1. Search for `"[framework] best practices 2025"`
2. Search for `"[library] patterns"`
3. Compare with project patterns
4. Note recommendations

---

### Step 6: Check Existing Cursor Rules

Check for existing rules:

1. `.claude/rules/` directory
2. `.cursorrules` file
3. Note conflicts and overlaps

---

### Step 7: Ask Confirming Questions (Interactive)

**Use the Interactive Questions Tool to confirm detected patterns with the user.**

See: `.claude/resources/tools/interactive-questions-tool.md`

#### 7.1: Present Analysis Summary First

Before asking questions, present what was detected:

```markdown
## Project Analysis Complete

I analyzed your codebase and detected:

**Stack**: [Language] + [Framework]
**Key Libraries**: [Lib1], [Lib2], [Lib3]
**Architecture**: [Feature-based/Layer-based/etc.]

**Patterns Detected**:
1. [Pattern 1 with brief example]
2. [Pattern 2 with brief example]
3. [Pattern 3 with brief example]

**Conventions Detected**:
- File naming: [convention]
- Import style: [convention]
- Component structure: [convention]

Now I'll ask a few questions to confirm these patterns.
```

#### 7.2: Switch to Plan Mode

**MANDATORY**: Use `SwitchMode` tool to switch to Plan mode:

```
Use Claude Code native conversation flow for questions
```

#### 7.3: Ask Setup Questions

Use `Ask the user directly in conversation` tool for each question:

**Question 1: Stack Confirmation**

```
Ask the user directly in conversation({
  question: "I detected the following stack. Is this accurate?

[Framework]: [Detected framework]
[Language]: [Detected language]
[Key Libraries]: [List]",
  options: [
    "A. Yes, this is correct",
    "B. Partially correct - I'll clarify what's different",
    "C. No, let me describe the correct stack"
  ],
  explanation: "Confirming the detected technology stack"
})
```

**Question 2: Architecture Confirmation**

```
Ask the user directly in conversation({
  question: "I detected this architecture pattern:

[Detected pattern description]

Is this how your project is organized?",
  options: [
    "A. Yes, this is our architecture",
    "B. No, we use a different approach",
    "C. We're transitioning to a new architecture"
  ],
  explanation: "Understanding the project's architectural approach"
})
```

**Question 3: Pattern Enforcement**

```
Ask the user directly in conversation({
  question: "I found these coding patterns in your codebase. Which should I enforce?

1. [Pattern 1]
2. [Pattern 2]
3. [Pattern 3]",
  options: [
    "A. All detected patterns - they represent our standards",
    "B. Let me review and select which to keep",
    "C. These are legacy patterns - I'll describe preferred patterns"
  ],
  explanation: "Determining which patterns to document and enforce"
})
```

**Question 4: Strictness Level**

```
Ask the user directly in conversation({
  question: "How strictly should I enforce these patterns when generating code?",
  options: [
    "A. Strict - Always follow these patterns exactly",
    "B. Moderate - Follow patterns but allow exceptions with justification",
    "C. Loose - Use as guidelines, not requirements"
  ],
  explanation: "Setting the enforcement level for detected patterns"
})
```

**Question 5: Best Practices** (if recommendations found)

```
Ask the user directly in conversation({
  question: "I found some industry best practices your codebase could adopt:

1. [Recommendation 1]
2. [Recommendation 2]

Should I include these in the pattern files?",
  options: [
    "A. Yes, include them as recommendations",
    "B. No, only document current patterns",
    "C. Show me the full list first"
  ],
  explanation: "Deciding whether to include best practice recommendations"
})
```

**Question 6: Existing Rules** (only if existing cursor rules found)

```
Ask the user directly in conversation({
  question: "I found existing cursor rules in your project. How should I handle them?",
  options: [
    "A. Merge with new patterns (combine both)",
    "B. Replace with new patterns",
    "C. Keep existing rules, add new patterns separately",
    "D. Let me review the conflicts first"
  ],
  explanation: "Handling existing cursor rule files"
})
```

#### 7.4: Process Responses

After all questions are answered:

1. Extract selected options from each question
2. Map to corresponding answers
3. Document the confirmed patterns
4. Adjust pattern generation based on responses

#### 7.5: Switch Back to Agent Mode

**MANDATORY**: Use `SwitchMode` tool to return to Agent mode:

```
Use Claude Code native conversation flow for questions
```

---

### Step 8: Invoke Setup Skill

With confirmed patterns, the skill will:

1. Compile analysis into structured patterns based on user responses
2. Generate comprehensive pattern files with real examples
3. Create project analysis document
4. Update core pattern files

See: `.claude/resources/skills/setup-skill.md`

---

### Step 9: Create Flow Folder Structure

**Create the `flow/` directory structure for plan-flow artifacts.**

If the `flow/` folder doesn't exist, create it:

```bash
mkdir -p flow/archive flow/contracts flow/discovery flow/plans flow/references flow/reviewed-code flow/reviewed-pr
```

**Add `.gitkeep` files**:

```bash
touch flow/archive/.gitkeep flow/contracts/.gitkeep flow/discovery/.gitkeep flow/plans/.gitkeep flow/references/.gitkeep flow/reviewed-code/.gitkeep flow/reviewed-pr/.gitkeep
```

**Directory Structure Created**:

```
flow/
├── archive/           # Completed/abandoned plans
├── contracts/         # Integration contracts
├── discovery/         # Discovery documents
├── plans/             # Active implementation plans
├── references/        # Reference materials + project_analysis.md
├── reviewed-code/     # Local code review documents
└── reviewed-pr/       # PR review documents
```

**Note**: Skip if directories already exist.

---

### Step 10: Present Results

After the skill completes:

```markdown
Setup Complete!

## Project Profile

| Attribute          | Value                                        |
| ------------------ | -------------------------------------------- |
| Primary Language   | [Language]                                   |
| Framework          | [Framework]                                  |
| Key Libraries      | [Lib1], [Lib2], [Lib3]                       |
| Architecture       | [Architecture pattern]                       |
| Strictness         | [Strict/Moderate/Loose]                      |

## Folder Structure Created

flow/
├── archive/           # Completed/abandoned plans
├── contracts/         # Integration contracts
├── discovery/         # Discovery documents
├── plans/             # Active implementation plans
├── references/        # Reference materials
├── reviewed-code/     # Local code review documents
└── reviewed-pr/       # PR review documents

## Pattern Files Created

| File                                           | Purpose               |
| ---------------------------------------------- | --------------------- |
| `flow/references/project_analysis.md`          | Project analysis      |
| `.claude/rules/frameworks/[fw]-patterns.md`   | Framework patterns    |
| `.claude/rules/libraries/[lib1]-patterns.md`  | [Lib1] patterns       |
| `.claude/rules/libraries/[lib2]-patterns.md`  | [Lib2] patterns       |
| `.claude/rules/project/project-patterns.md`   | Project conventions   |

## Patterns Indexed

- X component patterns extracted
- X schema patterns documented  
- X API patterns captured
- X naming conventions identified
- X best practices documented

## Next Steps (user must invoke manually)

1. Review generated pattern files in `.claude/rules/`
2. Adjust any patterns that don't match your preferences
3. Start using plan-flow commands:
   - `/discovery-plan` - Explore a new feature
   - `/create-plan` - Create implementation plans
   - `/review-code` - Review local changes
```

**CRITICAL**: This command is now complete. STOP and wait for the user to invoke the next command.

---

## Flow Diagram

```
+----------------------------------------------------+
|                  /setup COMMAND                     |
+----------------------------------------------------+
                        |
                        v
+----------------------------------------------------+
| Step 1: Validate Context                           |
| - Check for dependency files                       |
| - Check for source directories                     |
+----------------------------------------------------+
                        |
                        v
+----------------------------------------------------+
| Step 2: Initial Dependency Scan                    |
| - Parse package.json / requirements.txt            |
| - Categorize all dependencies                      |
| - Identify complete stack                          |
+----------------------------------------------------+
                        |
                        v
+----------------------------------------------------+
| Step 3: Deep Code Analysis                         |
| - Sample files for each library                    |
| - Extract import patterns                          |
| - Extract usage patterns                           |
| - Document naming conventions                      |
+----------------------------------------------------+
                        |
                        v
+----------------------------------------------------+
| Step 4: Detect Project Conventions                 |
| - File naming conventions                          |
| - Directory structure                              |
| - Import order and aliases                         |
| - Component structure                              |
+----------------------------------------------------+
                        |
                        v
+----------------------------------------------------+
| Step 5: Research Best Practices                    |
| - Web search for stack best practices              |
| - Compare with project patterns                    |
| - Note recommendations                             |
+----------------------------------------------------+
                        |
                        v
+----------------------------------------------------+
| Step 6: Check Existing Cursor Rules                |
| - .claude/rules/                                   |
| - .cursorrules                                     |
| - Document conflicts                               |
+----------------------------------------------------+
                        |
                        v
+----------------------------------------------------+
| Step 7: Ask Confirming Questions (Interactive)     |
| - Switch to Plan mode                              |
| - Present analysis summary                         |
| - Ask 4-6 confirming questions via Questions UI   |
| - Process user responses                           |
| - Switch back to Agent mode                        |
+----------------------------------------------------+
                        |
                        v
+----------------------------------------------------+
| Step 8: Invoke Setup Skill                         |
| - Generate pattern files based on confirmations    |
| - Create analysis document                         |
| - Update core pattern files                        |
+----------------------------------------------------+
                        |
                        v
+----------------------------------------------------+
| Step 9: Create Flow Folder Structure               |
| - Create flow/ and subdirectories                  |
| - Add .gitkeep files                               |
+----------------------------------------------------+
                        |
                        v
+----------------------------------------------------+
| Step 10: Present Results                           |
| - Show project profile                             |
| - List files created                               |
| - Show patterns indexed                            |
+----------------------------------------------------+
```

---

## What Gets Indexed

### Per Library/Framework

| Information           | How It's Captured                            |
| --------------------- | -------------------------------------------- |
| Import style          | Read sample files, extract import statements |
| File organization     | Glob search, directory analysis              |
| Naming conventions    | Analyze file names and variable names        |
| Usage patterns        | Read and document 2-3 real examples          |
| Best practices        | Web search + codebase comparison             |
| Anti-patterns         | Web search for common mistakes               |

### Project-Wide

| Information           | How It's Captured                            |
| --------------------- | -------------------------------------------- |
| Directory structure   | Full directory tree analysis                 |
| File naming           | Pattern analysis across all files            |
| Import order          | Sample files, detect consistent ordering     |
| Error handling        | Search for try/catch, error classes          |
| Logging               | Search for logger usage                      |
| Testing patterns      | Read test files, extract patterns            |

---

## Example: Next.js + Zod + Zustand Project

**Detected Stack**:
- Framework: Next.js 14 (App Router)
- Language: TypeScript (strict)
- Validation: Zod
- State: Zustand
- Styling: Tailwind CSS
- Testing: Vitest

**Files Created**:

1. `.claude/rules/frameworks/nextjs-patterns.md`
   - App Router conventions
   - Server vs Client components
   - API route patterns
   - Metadata handling

2. `.claude/rules/libraries/zod-patterns.md`
   - Schema file location (`src/schemas/`)
   - Naming convention (`entitySchema`)
   - Real examples from codebase
   - Type inference patterns

3. `.claude/rules/libraries/zustand-patterns.md`
   - Store file location (`src/stores/`)
   - Store structure pattern
   - Selector patterns
   - Real examples from codebase

4. `.claude/rules/project/project-patterns.md`
   - Directory structure map
   - File naming conventions
   - Import order
   - Component structure
   - Error handling approach

---

## Context Optimization

This command uses hierarchical context loading to reduce context consumption. Instead of loading full files, load indexes first and expand specific sections on-demand.

### Recommended Loading Order

1. **Always load first**: This command file (`commands/setup.md`)
2. **Load indexes**: Load `_index.md` files for relevant folders
3. **Expand on-demand**: Use reference codes to load specific sections when needed

### Index Files for Setup

| Index | When to Load |
|-------|--------------|
| `resources/skills/_index.md` | To understand setup workflow |
| `resources/tools/_index.md` | For interactive questions tool |
| `resources/core/_index.md` | For pattern references |
| `resources/languages/_index.md` | For language-specific patterns |

### Reference Codes for Setup

| Code | Description | When to Expand |
|------|-------------|----------------|
| SKL-SETUP-1 | Setup skill workflow | Understanding full process |
| TLS-IQ-1 | Interactive questions overview | Before asking questions |
| TLS-IQ-2 | Switch to Plan mode | Starting question session |
| TLS-IQ-3 | Ask questions format | Asking confirmation questions |
| COR-AP-1 | Allowed patterns structure | Updating allowed patterns |
| COR-FP-1 | Forbidden patterns structure | Updating forbidden patterns |
| LNG-TS-1 | TypeScript patterns | If TS project detected |
| LNG-PY-1 | Python patterns | If Python project detected |

### Expansion Instructions

When executing this command:

1. **Start with indexes**: Read `resources/skills/_index.md` and `resources/tools/_index.md`
2. **Expand for detection phase**: Load minimal context during code analysis
3. **Expand for questions**: Load TLS-IQ-* before asking confirmation questions
4. **Expand for generation**: Load relevant language patterns when generating files
5. **Don't expand everything**: Only load patterns relevant to detected stack

---

## Related Resources

| Resource                       | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `resources/skills/_index.md`      | Index of skills with reference codes   |
| `resources/tools/_index.md`       | Index of tools with reference codes    |
| `resources/core/_index.md`        | Index of core rules with reference codes |
| `resources/languages/_index.md`   | Index of language patterns with reference codes |
| `setup-skill.md`              | Detailed execution logic               |
| `interactive-questions-tool.md` | Questions UI for confirmations       |
| `allowed-patterns.md`         | Core allowed patterns                  |
| `forbidden-patterns.md`       | Core forbidden patterns                |

