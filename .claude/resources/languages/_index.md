
# Languages Index

## Overview

Language-specific patterns and best practices. These rules apply when working with files of the respective language, loaded automatically via `paths:` frontmatter globs.

**Total Files**: 4 files, ~1169 lines
**Reference Codes**: LNG-TS-1 through LNG-RS-5

---

## Reference Codes

### TypeScript Patterns (`typescript-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| LNG-TS-1 | Type definitions (interfaces, unions, generics) | typescript-patterns.md | 9-60 |
| LNG-TS-2 | Error handling and custom error types | typescript-patterns.md | 64-100 |
| LNG-TS-3 | Type safety (utility types, avoid any, null safety) | typescript-patterns.md | 104-145 |
| LNG-TS-4 | Advanced patterns (const assertions, type guards, satisfies, immutability) | typescript-patterns.md | 149-210 |

### Python Patterns (`python-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| LNG-PY-1 | Style and typing (PEP 8, type hints, dataclasses) | python-patterns.md | 9-60 |
| LNG-PY-2 | Code organization (modular functions, enums, context managers) | python-patterns.md | 64-115 |
| LNG-PY-3 | Error handling and custom exceptions | python-patterns.md | 119-155 |
| LNG-PY-4 | Async and I/O patterns | python-patterns.md | 159-195 |
| LNG-PY-5 | Best practices (DI, logging, Pydantic, Pathlib) | python-patterns.md | 199-245 |

### Go Patterns (`go-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| LNG-GO-1 | Naming conventions (exported/unexported, packages, interfaces) | go-patterns.md | 9-65 |
| LNG-GO-2 | Error handling (wrapping, sentinels, custom types) | go-patterns.md | 69-130 |
| LNG-GO-3 | Concurrency (goroutines, channels, context, mutex) | go-patterns.md | 134-225 |
| LNG-GO-4 | Testing (table-driven, testify, httptest, benchmarks) | go-patterns.md | 229-300 |
| LNG-GO-5 | Package organization (project layout, internal packages, forbidden patterns) | go-patterns.md | 304-337 |

### Rust Patterns (`rust-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| LNG-RS-1 | Ownership and borrowing (borrow checker, clone, lifetimes) | rust-patterns.md | 9-65 |
| LNG-RS-2 | Error handling (Result, ?, thiserror, anyhow, Option) | rust-patterns.md | 69-145 |
| LNG-RS-3 | Traits and generics (bounds, impl blocks, derive, builder) | rust-patterns.md | 149-245 |
| LNG-RS-4 | Testing (unit in module, integration, doc tests, helpers) | rust-patterns.md | 249-325 |
| LNG-RS-5 | Module organization (file layout, re-exports, visibility, forbidden patterns) | rust-patterns.md | 329-363 |

---

## When to Expand

| Code | Expand When |
|------|-------------|
| LNG-TS-1 | Defining TypeScript interfaces or unions |
| LNG-TS-2 | Implementing custom error classes in TS |
| LNG-TS-3 | Need examples of utility types or null safety |
| LNG-TS-4 | Using advanced TS features like satisfies or type guards |
| LNG-PY-1 | Setting up Python project structure or typing |
| LNG-PY-2 | Organizing Python modules and using enums |
| LNG-PY-3 | Creating custom Python exceptions |
| LNG-PY-4 | Implementing async/await in Python |
| LNG-PY-5 | Using Pydantic, logging, or dependency injection |
| LNG-GO-1 | Setting up Go package structure or naming |
| LNG-GO-2 | Implementing error handling in Go |
| LNG-GO-3 | Writing concurrent Go code with goroutines |
| LNG-GO-4 | Writing Go tests or benchmarks |
| LNG-GO-5 | Organizing Go project layout |
| LNG-RS-1 | Working with Rust ownership or lifetimes |
| LNG-RS-2 | Implementing Rust error handling with Result/Option |
| LNG-RS-3 | Defining Rust traits or using generics |
| LNG-RS-4 | Writing Rust tests (unit, integration, doc) |
| LNG-RS-5 | Organizing Rust modules and visibility |

---

## Quick Reference

### TypeScript Key Points
- **Strict mode**: Always enable `strict: true`
- **Interfaces**: Prefer for object shapes
- **Discriminated unions**: Model exclusive states
- **Generics**: Reusable, type-safe components
- **Avoid any**: Use `unknown` with type guards
- **Immutability**: Use `readonly` and `ReadonlyArray`

### Python Key Points
- **PEP 8**: Follow naming conventions
- **Type hints**: Add annotations for clarity
- **Dataclasses**: Use for structured data
- **Enums**: Replace magic strings/numbers
- **Context managers**: Resource management
- **Logging**: Use logger, not print

### Go Key Points
- **Exported = PascalCase**: Unexported = camelCase
- **Error wrapping**: Use `fmt.Errorf("context: %w", err)`
- **Table-driven tests**: Standard Go testing pattern
- **Accept interfaces, return structs**: Dependency injection
- **Context propagation**: Pass `context.Context` as first parameter
- **No init() abuse**: Keep initialization explicit

### Rust Key Points
- **Ownership**: Borrow when possible, clone when necessary
- **Result/Option**: Use `?` operator for propagation
- **thiserror**: For library error types
- **anyhow**: For application error handling
- **#[cfg(test)]**: Unit tests live in the same file
- **No unwrap() in production**: Use `?` or `expect()` with message

---

## Notes

- All files have `alwaysApply: false` — loaded based on file glob patterns
- TypeScript patterns apply to `**/*.ts` and `**/*.tsx` files
- Python patterns apply to `**/*.py` files
- Go patterns apply to `**/*.go` files
- Rust patterns apply to `**/*.rs` files
