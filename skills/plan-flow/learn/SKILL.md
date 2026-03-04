---
name: learn
description: Extract reusable patterns from the current session - error resolutions, debugging techniques, workarounds, and conventions
metadata: {"openclaw":{"requires":{"bins":["git"]}}}
user-invocable: true
---

# Learn: Session Pattern Extraction

Extract reusable patterns from the current session and save them to `flow/resources/` as learned pattern files with `[[wiki-links]]` for Obsidian compatibility.

## How It Works

1. Analyzes the current conversation for non-obvious patterns
2. Filters out trivial fixes, one-time issues, and generic knowledge
3. Drafts a pattern file and presents it for user confirmation
4. On approval, saves to `flow/resources/learned-{pattern-name}.md`

## File Location

```
flow/resources/learned-{pattern-name}.md
```

## What Gets Captured

| Category | Description | Example |
|----------|-------------|---------|
| `error-resolution` | Non-obvious error fixes | ESM import extensions in ts-jest |
| `debugging` | Multi-step diagnosis techniques | Memory leak via heap snapshots |
| `workaround` | Tool/platform limitation bypasses | `jest.unstable_mockModule` for ESM |
| `convention` | Project-specific patterns discovered | API route naming conventions |
| `architecture` | Structural decisions made during work | Event-driven vs polling choice |
| `integration` | Service connection patterns | OAuth2 token refresh interceptor |

## What Does NOT Get Captured

- Trivial fixes (typos, missing imports, syntax errors)
- One-time environment-specific issues
- Generic knowledge from official documentation
- Patterns already in existing `learned-*.md` files

## Critical Rules

1. **Ask Before Saving**: Always present the pattern to the user before saving
2. **No Trivial Patterns**: Only non-obvious, reusable knowledge
3. **One Pattern Per File**: Each pattern gets its own `learned-*.md` file
4. **Wiki-Links Required**: All cross-references use `[[kebab-case-name]]` format
5. **Resources Only**: Only write to `flow/resources/` — no source code, no config
