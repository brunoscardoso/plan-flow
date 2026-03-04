
# Tech Detection — Language-Adaptive Commands

## Purpose

Skills that run build, test, or lint commands must adapt to the project's detected language instead of assuming `npm`. This file provides the standard command mapping.

---

## How to Detect

At the start of skill execution, read `flow/references/tech-foundation.md` and identify:

1. **Language** — from the "Stack Overview" table (Language row)
2. **Package Manager** — from the same table (Package Manager row)
3. **Test Framework** — from the same table (Test Framework row)

If `flow/references/tech-foundation.md` does not exist, warn the user:

> Tech foundation not found. Run `planflow init` to generate project metadata, or specify your build/test commands manually.

Then fall back to the "Generic/Unknown" row below.

---

## Command Mapping

| Language | Build | Test | Lint |
|----------|-------|------|------|
| **JavaScript/TypeScript** | `npm run build` | `npm run test` | `npm run lint` |
| **Python** | _(skip — or `python -m build`)_ | `pytest` | `ruff check .` or `flake8` |
| **Go** | `go build ./...` | `go test ./...` | `golangci-lint run` |
| **Rust** | `cargo build` | `cargo test` | `cargo clippy` |
| **Generic/Unknown** | _(ask user)_ | _(ask user)_ | _(ask user)_ |

---

## Package Manager Variants (JavaScript/TypeScript)

If the tech-foundation reports a non-npm package manager, substitute:

| Package Manager | Build | Test |
|----------------|-------|------|
| npm | `npm run build` | `npm run test` |
| yarn | `yarn build` | `yarn test` |
| pnpm | `pnpm run build` | `pnpm run test` |
| bun | `bun run build` | `bun test` |

---

## Special Rules

### Python: Skip Build

Most Python projects have no build step. If the tech-foundation shows Language = Python:
- **Skip build verification** unless the project explicitly has a build command (e.g., `python -m build` for package distribution)
- **Only run tests**: `pytest` (or the detected test framework)

### Generic/Unknown: Ask User

If the language is not in the mapping above:
1. Ask the user: "What is your project's build command? (or 'none' to skip)"
2. Ask the user: "What is your project's test command?"
3. Use those commands for the remainder of the skill execution

---

## Usage in Skills

When a skill file references build or test commands, use this pattern:

```
Run the project's **build command** (see tech-detection.md for the language-specific command).
```

Instead of hardcoding:

```
Run `npm run build`
```

This ensures the skill works for any supported language.
