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

See: `.claude/rules/tools/interactive-questions-tool.md`

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

See: `.claude/rules/tools/interactive-questions-tool.md`

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

See: `.claude/rules/skills/setup-skill.md`

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
| `rules/skills/_index.md` | To understand setup workflow |
| `rules/tools/_index.md` | For interactive questions tool |
| `rules/core/_index.md` | For pattern references |
| `rules/languages/_index.md` | For language-specific patterns |

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

1. **Start with indexes**: Read `rules/skills/_index.md` and `rules/tools/_index.md`
2. **Expand for detection phase**: Load minimal context during code analysis
3. **Expand for questions**: Load TLS-IQ-* before asking confirmation questions
4. **Expand for generation**: Load relevant language patterns when generating files
5. **Don't expand everything**: Only load patterns relevant to detected stack

---

## Related Resources

| Resource                       | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `rules/skills/_index.md`      | Index of skills with reference codes   |
| `rules/tools/_index.md`       | Index of tools with reference codes    |
| `rules/core/_index.md`        | Index of core rules with reference codes |
| `rules/languages/_index.md`   | Index of language patterns with reference codes |
| `setup-skill.md`              | Detailed execution logic               |
| `interactive-questions-tool.md` | Questions UI for confirmations       |
| `allowed-patterns.md`         | Core allowed patterns                  |
| `forbidden-patterns.md`       | Core forbidden patterns                |

---

# Implementation Details


## Critical Approach

**This is NOT a surface-level scan.** The setup skill must:

1. **Sample Real Code** - Read actual files to understand how patterns are implemented
2. **Extract Real Examples** - Use code snippets from the project as pattern examples
3. **Research Best Practices** - Use web search to get current best practices for the stack
4. **Detect Conventions** - Identify naming, file structure, and coding conventions
5. **Create Actionable Patterns** - Generate patterns that can be directly followed

---

## Workflow

### Step 1: Scan Project Structure

Analyze the repository root to identify project type and structure.

**Files to Check**:

| File                    | Indicates                                    |
| ----------------------- | -------------------------------------------- |
| `package.json`          | JavaScript/TypeScript project                |
| `requirements.txt`      | Python project                               |
| `pyproject.toml`        | Python project (modern)                      |
| `Cargo.toml`            | Rust project                                 |
| `go.mod`                | Go project                                   |
| `pom.xml`               | Java/Maven project                           |
| `build.gradle`          | Java/Kotlin Gradle project                   |
| `Gemfile`               | Ruby project                                 |
| `*.csproj`              | C#/.NET project                              |

**Actions**:

1. List root directory files
2. Identify primary language from dependency files
3. Read dependency files completely to extract ALL libraries
4. Map directory structure (up to 3 levels deep)

---

### Step 2: Deep Dependency Analysis

Read and parse dependency files to build complete stack profile.

#### For JavaScript/TypeScript (package.json)

**Core Framework Detection**:

| Dependency             | Framework              | Pattern File to Create           |
| ---------------------- | ---------------------- | -------------------------------- |
| `next`                 | Next.js                | `nextjs-patterns.md`            |
| `react`                | React                  | `react-patterns.md`             |
| `vue`                  | Vue.js                 | `vue-patterns.md`               |
| `@angular/core`        | Angular                | `angular-patterns.md`           |
| `express`              | Express.js             | `express-patterns.md`           |
| `fastify`              | Fastify                | `fastify-patterns.md`           |
| `hono`                 | Hono                   | `hono-patterns.md`              |
| `@nestjs/core`         | NestJS                 | `nestjs-patterns.md`            |

**Library Detection** (create individual pattern files):

| Category               | Libraries              | Pattern File                     |
| ---------------------- | ---------------------- | -------------------------------- |
| Validation             | `zod`, `yup`, `joi`    | `<lib>-patterns.md`             |
| State Management       | `zustand`, `redux`, `jotai`, `recoil` | `<lib>-patterns.md` |
| Data Fetching          | `@tanstack/react-query`, `swr`, `axios` | `<lib>-patterns.md` |
| ORM/Database           | `prisma`, `drizzle-orm`, `typeorm` | `<lib>-patterns.md`  |
| Authentication         | `next-auth`, `clerk`, `lucia` | `<lib>-patterns.md`       |
| Styling                | `tailwindcss`, `styled-components` | `<lib>-patterns.md`  |
| Testing                | `jest`, `vitest`, `playwright` | `<lib>-patterns.md`      |
| Forms                  | `react-hook-form`, `formik` | `<lib>-patterns.md`        |
| UI Components          | `shadcn/ui`, `radix-ui`, `mantine` | `<lib>-patterns.md`  |

#### For Python (requirements.txt / pyproject.toml)

| Category               | Libraries              | Pattern File                     |
| ---------------------- | ---------------------- | -------------------------------- |
| Web Framework          | `fastapi`, `django`, `flask` | `<lib>-patterns.md`       |
| Validation             | `pydantic`             | `pydantic-patterns.md`          |
| ORM                    | `sqlalchemy`, `tortoise-orm` | `<lib>-patterns.md`       |
| Testing                | `pytest`, `unittest`   | `<lib>-patterns.md`             |
| Task Queue             | `celery`, `rq`         | `<lib>-patterns.md`             |
| HTTP Client            | `httpx`, `aiohttp`     | `<lib>-patterns.md`             |

---

### Step 3: Deep Code Analysis

**CRITICAL**: This step samples actual code to understand HOW the project uses each library.

#### 3.1 Sample Files by Type

For each detected library/framework, find and read sample files:

```
For Next.js:
- Read 2-3 files from app/ or pages/
- Read 2-3 API routes
- Read layout files
- Read middleware if exists

For React:
- Read 3-5 component files
- Read custom hooks
- Read context providers

For Zod:
- Search for .schema.ts files
- Search for files importing 'zod'
- Extract schema definition patterns

For Prisma:
- Read prisma/schema.prisma
- Search for files importing @prisma/client
- Extract query patterns

For Zustand:
- Search for store files
- Extract store structure patterns
```

#### 3.2 Extract Real Patterns

For each library, document:

1. **Import Style**
   ```typescript
   // How does the project import this library?
   import { z } from 'zod'  // Named import
   import prisma from '@/lib/prisma'  // Default import from lib
   ```

2. **File Organization**
   ```
   // Where are files for this library located?
   src/schemas/*.ts     - Zod schemas
   src/stores/*.ts      - Zustand stores
   prisma/schema.prisma - Prisma schema
   ```

3. **Naming Conventions**
   ```typescript
   // How are things named?
   userSchema, createUserSchema  // Schemas: camelCase + Schema suffix
   useUserStore, useCartStore    // Stores: use + Name + Store
   ```

4. **Usage Patterns**
   ```typescript
   // How is the library typically used?
   // Extract 2-3 real examples from the codebase
   ```

#### 3.3 Detect Project Conventions

**File Naming**:
- Analyze file names in src/ to detect: kebab-case, camelCase, PascalCase
- Check for patterns like: `*.schema.ts`, `*.store.ts`, `*.hook.ts`

**Directory Structure**:
- Map the src/ directory structure
- Identify organization: feature-based, layer-based, hybrid

**Import Patterns**:
- Check tsconfig.json for path aliases (e.g., `@/`, `~/`)
- Detect barrel exports (index.ts files)

**Component Structure**:
- Check for co-located files (Component.tsx, Component.test.tsx, Component.module.css)
- Check for separated files (components/, tests/, styles/)

**Error Handling**:
- Search for try/catch patterns
- Identify custom error classes
- Check for error boundary usage

**Logging**:
- Search for console.log, logger imports
- Identify logging library if any

---

### Step 4: Research Best Practices

**Use web search to get current best practices for detected stack.**

For each major library/framework detected:

1. Search for: `"[library] best practices 2025"` or `"[library] patterns"`
2. Search for: `"[library] common mistakes to avoid"`
3. Compare project patterns with industry standards

**Example Searches**:
- "Next.js App Router best practices 2025"
- "Zod schema validation patterns"
- "Zustand store organization patterns"
- "Prisma query optimization patterns"

**Document**:
- Best practices the project already follows
- Best practices the project should adopt
- Anti-patterns to avoid

---

### Step 5: Check Existing Cursor Rules

Look for existing cursor configuration:

**Locations to Check**:

1. `.claude/rules/` - Custom rules directory
2. `.cursorrules` - Legacy rules file
3. `.cursor/settings.json` - Cursor settings

**Actions**:

1. If `.claude/rules/` exists:
   - Read all `.md` files
   - Extract patterns and conventions
   - Note which patterns are already defined
   - Identify conflicts with detected patterns

2. If `.cursorrules` exists:
   - Read the file completely
   - Parse all rules and guidelines
   - Plan migration to `.md` format

3. Create inventory of existing rules

---

### Step 6: Ask Confirming Questions

Use Plan Mode to ask targeted questions about detected patterns.

**Switch to Plan mode and present findings first:**

```markdown
## Project Analysis Results

I analyzed your codebase and detected:

**Stack**: [Language] + [Framework]
**Key Libraries**: [List]
**Architecture**: [Pattern]

**Code Patterns Detected**:
1. [Pattern with example]
2. [Pattern with example]
3. [Pattern with example]

**Conventions Detected**:
- File naming: [convention]
- Component structure: [convention]
- Import style: [convention]
```

**Then ask questions:**

#### Question 1: Stack Confirmation

```
Is this stack detection accurate?

A. Yes, this is correct
B. Partially correct - I'll specify what's different
C. No, let me describe the stack
```

#### Question 2: Pattern Confirmation

```
I detected these coding patterns. Which should I enforce?

A. All detected patterns - they represent our standards
B. Let me review and select which to keep
C. These are legacy patterns - I'll describe our preferred patterns
```

#### Question 3: Strictness Level

```
How strictly should I enforce these patterns?

A. Strict - Always follow these patterns exactly
B. Moderate - Follow patterns but allow exceptions with justification
C. Loose - Use as guidelines, not requirements
```

#### Question 4: Best Practices Integration

```
I found some industry best practices your codebase could adopt. Should I:

A. Include them in pattern files as recommendations
B. Only document current patterns, no new recommendations
C. Show me the recommendations first
```

#### Question 5: Existing Rules

(Only if existing rules found)

```
I found existing cursor rules. How should I handle them?

A. Merge with new patterns (combine both)
B. Replace with new patterns
C. Keep existing, add new patterns separately
D. Let me review the conflicts
```

---

### Step 7: Generate Pattern Files

Create comprehensive pattern files based on confirmed patterns.

#### 7.1 Framework Pattern File

**Location**: `.claude/rules/frameworks/<framework>-patterns.md`

**Template**:

```markdown
---
description: "Include when working with [Framework] files"
globs: ["[appropriate globs]"]
alwaysApply: false
---

# [Framework] Patterns

## Project Usage

This project uses [Framework] with [specific configuration].

**Detected Configuration**:
- [Config item 1]
- [Config item 2]

---

## File Organization

| Type | Location | Naming |
|------|----------|--------|
| [Type] | [Path] | [Convention] |

---

## Allowed Patterns

### [Pattern Category 1]

**Description**: [What this pattern does]

**Example from this codebase**:

\`\`\`typescript
// From: [actual file path]
[Real code example from project]
\`\`\`

**Guidelines**:
- [Guideline 1]
- [Guideline 2]

### [Pattern Category 2]

[Same structure...]

---

## Forbidden Patterns

### DON'T: [Anti-pattern name]

**Problem**: [Why this is bad]

\`\`\`typescript
// BAD
[Example of what not to do]

// GOOD
[Example of correct approach]
\`\`\`

---

## Best Practices

### [Best Practice 1]

[Description with example]

### [Best Practice 2]

[Description with example]
```

#### 7.2 Library Pattern Files

**Location**: `.claude/rules/libraries/<library>-patterns.md`

Create for each significant library with:

1. How the project imports it
2. Where related files are located
3. Naming conventions for this library
4. 2-3 real usage examples from the codebase
5. Common mistakes to avoid

**Example for Zod**:

```markdown
---
description: "Include when working with Zod schemas"
globs: ["**/*.schema.ts", "**/schemas/**"]
alwaysApply: false
---

# Zod Patterns

## Project Usage

Schemas are located in `src/schemas/` and follow `[entity]Schema` naming.

## Import Pattern

\`\`\`typescript
import { z } from 'zod'
\`\`\`

## Schema Definition

\`\`\`typescript
// From: src/schemas/user.schema.ts
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

export type User = z.infer<typeof userSchema>
\`\`\`

## Allowed Patterns

### Schema Naming
- Use `[entity]Schema` for main schemas
- Use `create[Entity]Schema` for creation schemas
- Use `update[Entity]Schema` for update schemas

### Type Inference
- Always export inferred types alongside schemas
- Use `z.infer<typeof schema>` pattern

## Forbidden Patterns

### DON'T: Define schemas inline
\`\`\`typescript
// BAD - Schema defined inline
const data = z.object({ name: z.string() }).parse(input)

// GOOD - Schema defined and exported
import { userSchema } from '@/schemas/user.schema'
const data = userSchema.parse(input)
\`\`\`
```

#### 7.3 Project Patterns File

**Location**: `.claude/rules/project/project-patterns.md`

Document project-specific conventions:

```markdown
---
description: "Project-specific patterns and conventions"
alwaysApply: true
---

# Project Patterns

## Directory Structure

\`\`\`
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # UI primitives (buttons, inputs)
│   └── features/    # Feature-specific components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and clients
├── schemas/         # Zod validation schemas
├── stores/          # Zustand state stores
├── types/           # TypeScript type definitions
└── services/        # API service functions
\`\`\`

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with use prefix | `useAuth.ts` |
| Schemas | camelCase with .schema suffix | `user.schema.ts` |
| Stores | camelCase with .store suffix | `cart.store.ts` |
| Utils | camelCase | `formatDate.ts` |

## Import Order

\`\`\`typescript
// 1. React/Framework imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

// 3. Internal imports (absolute)
import { Button } from '@/components/ui/button'
import { userSchema } from '@/schemas/user.schema'

// 4. Relative imports
import { formatDate } from './utils'
import type { UserProps } from './types'
\`\`\`

## Component Structure

\`\`\`typescript
// Standard component structure in this project

// 1. Imports (ordered as above)

// 2. Types/Interfaces
interface ComponentProps {
  // Props definition
}

// 3. Component
export function Component({ prop1, prop2 }: ComponentProps) {
  // 4. Hooks first
  const [state, setState] = useState()
  
  // 5. Derived state
  const computed = useMemo(() => ..., [deps])
  
  // 6. Effects
  useEffect(() => { ... }, [deps])
  
  // 7. Handlers
  const handleClick = () => { ... }
  
  // 8. Render
  return (...)
}
\`\`\`

## Error Handling

[Detected error handling patterns]

## API Patterns

[Detected API call patterns]
```

---

### Step 8: Update Core Pattern Files

Integrate project-specific patterns into core files.

**Update `allowed-patterns.md`**:

Add a section at the end:

```markdown
---

## Project-Specific Patterns

The following patterns are specific to this project's stack:

### [Framework] Patterns
See: `.claude/rules/frameworks/[framework]-patterns.md`

### Library Patterns
See: `.claude/rules/libraries/` for individual library patterns

### Project Conventions
See: `.claude/rules/project/project-patterns.md`
```

**Update `forbidden-patterns.md`**:

Add detected anti-patterns specific to the project's stack.

---

### Step 9: Create Project Analysis Document

**Location**: `flow/references/project_analysis.md`

Create comprehensive analysis:

```markdown
# Project Analysis

Generated: [Date]

## Stack Overview

| Attribute          | Value                                        |
| ------------------ | -------------------------------------------- |
| Primary Language   | [Language]                                   |
| Framework          | [Framework + Version]                        |
| Package Manager    | [npm/yarn/pnpm/pip/poetry]                   |
| Testing Framework  | [Jest/Vitest/Pytest]                         |
| Architecture       | [Feature-based/Layer-based/etc.]             |
| TypeScript         | [Yes/No + strict mode?]                      |

## Dependencies

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| [pkg] | [ver] | [purpose] |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| [pkg] | [ver] | [purpose] |

## Architecture Analysis

### Directory Structure
[Full directory tree with annotations]

### Code Organization
- [Pattern 1]: [Description]
- [Pattern 2]: [Description]

## Detected Patterns

### Framework Patterns
[List with examples]

### Library Patterns
[List with examples]

### Coding Conventions
[List with examples]

## Generated Pattern Files

| File | Purpose |
|------|---------|
| [path] | [description] |

## Recommendations

### Already Following Best Practices
- [Practice 1]
- [Practice 2]

### Suggested Improvements
- [Improvement 1]
- [Improvement 2]
```

---

### Step 10: Index Documentation Files

**Automatically index markdown documentation files in the project.**

This step scans for documentation folders and creates `_index.md` files with USR- reference codes for on-demand access.

#### 10.1 Detect Documentation Folders

Search for common documentation folder names in the project root:

| Folder Name      | Priority |
| ---------------- | -------- |
| `docs/`          | Primary  |
| `documentation/` | Primary  |

**Actions**:

1. Check if `docs/` or `documentation/` folder exists at project root
2. If neither exists, skip this step silently (no error)
3. If found, proceed to scan for markdown files

#### 10.2 Scan Markdown Files

For each detected documentation folder:

1. List all `.md` files in the folder (non-recursive, top-level only)
2. Limit to first 50 files (warn if more exist)
3. For each file, extract a brief description:
   - Read first 10 lines of the file
   - Use the first heading (`# Title`) as description
   - If no heading, use the first non-empty paragraph
   - If neither, use the filename as fallback

#### 10.3 Generate Index File

Create `_index.md` in each documentation folder.

**Location**: `docs/_index.md` or `documentation/_index.md`

**Template**:

```markdown
---
description: "Index of project documentation - load this to see available references"
alwaysApply: false
---

# Documentation Index

## Overview

Project documentation files. Use reference codes to access specific documents.

**Total Files**: X files

---

## Reference Codes

| Code  | File            | Description                          |
| ----- | --------------- | ------------------------------------ |
| USR-1 | README.md       | [Extracted description]              |
| USR-2 | api-guide.md    | [Extracted description]              |
| USR-3 | contributing.md | [Extracted description]              |

---

## When to Expand

| Code  | Expand When                              |
| ----- | ---------------------------------------- |
| USR-1 | Need project overview or getting started |
| USR-2 | Working with API integration             |
```

**Reference Code Convention**:

- Use `USR-` prefix for all user documentation
- Number sequentially: USR-1, USR-2, USR-3, etc.
- Keep codes stable (don't renumber on updates)

#### 10.4 Handle Edge Cases

| Scenario                    | Action                                      |
| --------------------------- | ------------------------------------------- |
| No docs folder exists       | Skip silently, no error                     |
| Empty docs folder           | Skip silently, no error                     |
| More than 50 files          | Index first 50, add warning in index file   |
| File without clear heading  | Use filename as description                 |
| Existing `_index.md`       | Overwrite with fresh index                  |
| Nested folders              | Only index top-level files (not recursive)  |

---

### Step 11: Create Flow Folder Structure

**Create the `flow/` directory structure for plan-flow artifacts.**

If the `flow/` folder doesn't exist, create it with all subdirectories:

```bash
mkdir -p flow/archive
mkdir -p flow/contracts
mkdir -p flow/discovery
mkdir -p flow/plans
mkdir -p flow/references
mkdir -p flow/reviewed-code
mkdir -p flow/reviewed-pr
```

**Add `.gitkeep` files to preserve empty directories**:

```bash
touch flow/archive/.gitkeep
touch flow/contracts/.gitkeep
touch flow/discovery/.gitkeep
touch flow/plans/.gitkeep
touch flow/references/.gitkeep
touch flow/reviewed-code/.gitkeep
touch flow/reviewed-pr/.gitkeep
```

**Directory Purposes**:

| Directory          | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `flow/archive/`    | Completed/abandoned plans and documents              |
| `flow/contracts/`  | Integration contract documents                       |
| `flow/discovery/`  | Discovery and research documents                     |
| `flow/plans/`      | Active implementation plans                          |
| `flow/references/` | Reference materials (including project_analysis.md)  |
| `flow/reviewed-code/` | Local code review documents                       |
| `flow/reviewed-pr/`   | Pull request review documents                     |

**Note**: If the directories already exist, skip creation silently.

---

### Step 12: Present Setup Summary

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

\`\`\`
flow/
├── archive/           # Completed/abandoned plans
├── contracts/         # Integration contracts
├── discovery/         # Discovery documents
├── plans/             # Active implementation plans
├── references/        # Reference materials
├── reviewed-code/     # Local code review documents
└── reviewed-pr/       # PR review documents
\`\`\`

## Pattern Files Created

| File                                           | Patterns Documented |
| ---------------------------------------------- | ------------------- |
| `flow/references/project_analysis.md`          | Project analysis    |
| `.claude/rules/frameworks/[fw]-patterns.md`   | X patterns          |
| `.claude/rules/libraries/[lib]-patterns.md`   | X patterns each     |
| `.claude/rules/project/project-patterns.md`   | X conventions       |

## Code Samples Indexed

- X component patterns extracted
- X schema patterns documented
- X API patterns captured
- X naming conventions identified

## Documentation Indexed

| Folder | Files | Index Created |
| ------ | ----- | ------------- |
| `docs/` | X files | `docs/_index.md` |

*Use USR-1, USR-2, etc. reference codes to access documentation on-demand.*

## Next Steps (user must invoke manually)

1. Review generated pattern files in `.claude/rules/`
2. Adjust any patterns that don't match your preferences
3. Start using plan-flow commands:
   - `/discovery-plan` - Explore a new feature
   - `/create-plan` - Create implementation plans
   - `/review-code` - Review local changes
```

---

## Pattern Quality Checklist

Before completing setup, verify each pattern file:

- [ ] Contains real code examples from the project
- [ ] Includes file paths where patterns are used
- [ ] Documents naming conventions with examples
- [ ] Lists what to do AND what not to do
- [ ] Uses consistent formatting
- [ ] Globs correctly match relevant files
- [ ] Description enables agent to know when to include

---

## Related Files

| File                                           | Purpose                           |
| ---------------------------------------------- | --------------------------------- |
| `.claude/rules/core/allowed-patterns.md`      | Core allowed patterns             |
| `.claude/rules/core/forbidden-patterns.md`    | Core forbidden patterns           |
| `.claude/rules/tools/interactive-questions-tool.md` | Questions UI                |
| `flow/references/project_analysis.md`          | Analysis output                   |
