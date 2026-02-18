
# Patterns Index

## Overview

Pattern files provide templates, examples, and guidelines for specific workflows. This is the largest category covering discovery, planning, testing, code review, and contracts.

**Total Files**: 9 files, ~3,145 lines
**Reference Codes**: PTN-CON-1 through PTN-PR-6

---

## Reference Codes

### Contract Patterns (`contract-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| PTN-CON-1 | Contract document structure and required sections | contract-patterns.md | 24-44 |
| PTN-CON-2 | Allowed patterns (TypeScript interfaces, status codes, auth examples) | contract-patterns.md | 47-171 |
| PTN-CON-3 | Forbidden patterns (no hardcoded secrets, generic types) | contract-patterns.md | 173-250 |
| PTN-CON-4 | FE integration guidelines (state management, caching) | contract-patterns.md | 252-283 |

### Discovery Patterns (`discovery-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| PTN-DIS-1 | What is discovery + folder structure | discovery-patterns.md | 14-47 |
| PTN-DIS-2 | Naming conventions + question status tracking | discovery-patterns.md | 49-88 |
| PTN-DIS-3 | Requirements categories (FR, NFR, Constraints) | discovery-patterns.md | 90-109 |
| PTN-DIS-4 | Allowed discovery patterns | discovery-patterns.md | 112-213 |
| PTN-DIS-5 | Forbidden discovery patterns | discovery-patterns.md | 215-298 |

### Discovery Templates (`discovery-templates.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| PTN-DIST-1 | Discovery document template | discovery-templates.md | 12-94 |
| PTN-DIST-2 | Spike template | discovery-templates.md | 96-162 |
| PTN-DIST-3 | Question format examples (functional, technical, UI/UX) | discovery-templates.md | 164-215 |
| PTN-DIST-4 | Referenced documents analysis example | discovery-templates.md | 217-242 |
| PTN-DIST-5 | Requirements gathering example | discovery-templates.md | 244-279 |
| PTN-DIST-6 | Risks and proposed approach examples | discovery-templates.md | 281-330 |

### Jest Patterns (`jest-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| PTN-JEST-1 | File naming conventions and test location | jest-patterns.md | 12-56 |
| PTN-JEST-2 | Test structure (AAA pattern, describe/it blocks) | jest-patterns.md | 58-91 |
| PTN-JEST-3 | Server and client test setup | jest-patterns.md | 93-160 |
| PTN-JEST-4 | Mock factories and mocking dependencies | jest-patterns.md | 162-301 |
| PTN-JEST-5 | Testing async code, errors, hooks, browser APIs | jest-patterns.md | 303-412 |
| PTN-JEST-6 | Forbidden testing patterns | jest-patterns.md | 414-481 |

### Plans Patterns (`plans-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| PTN-PLN-1 | Workflow folder structure | plans-patterns.md | 14-31 |
| PTN-PLN-2 | Allowed planning patterns (12 patterns) | plans-patterns.md | 39-142 |
| PTN-PLN-3 | Forbidden planning patterns (13 patterns) | plans-patterns.md | 144-223 |

### Plans Templates (`plans-templates.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| PTN-PLNT-1 | Plan document template | plans-templates.md | 12-95 |
| PTN-PLNT-2 | Phase templates (types, backend, store, UI, integration, tests) | plans-templates.md | 98-188 |
| PTN-PLNT-3 | Key changes and complexity summary examples | plans-templates.md | 190-238 |

### Pytest Patterns (`pytest-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| PTN-PYTEST-1 | File naming and test structure | pytest-patterns.md | 12-77 |
| PTN-PYTEST-2 | Fixtures and factory fixtures | pytest-patterns.md | 79-173 |
| PTN-PYTEST-3 | Mocking (basic, class instances, async) | pytest-patterns.md | 175-241 |
| PTN-PYTEST-4 | Parametrized tests | pytest-patterns.md | 243-276 |
| PTN-PYTEST-5 | Testing exceptions and context managers | pytest-patterns.md | 278-347 |
| PTN-PYTEST-6 | Async testing and forbidden patterns | pytest-patterns.md | 349-457 |

### Review Code Templates (`review-code-templates.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| PTN-REV-1 | Code review output format template | review-code-templates.md | 12-192 |
| PTN-REV-2 | Pattern conflict example | review-code-templates.md | 196-232 |
| PTN-REV-3 | Rule update recommendation example | review-code-templates.md | 234-284 |
| PTN-REV-4 | Finding example | review-code-templates.md | 286-316 |

### PR Review Patterns (`review-pr-patterns.md`)

| Code | Description | Source | Lines |
|------|-------------|--------|-------|
| PTN-PR-1 | General PR review checklist | review-pr-patterns.md | 32-74 |
| PTN-PR-2 | TypeScript PR review patterns | review-pr-patterns.md | 76-116 |
| PTN-PR-3 | Python PR review patterns | review-pr-patterns.md | 118-163 |
| PTN-PR-4 | Forbidden patterns to catch in reviews | review-pr-patterns.md | 165-253 |
| PTN-PR-5 | Allowed patterns to encourage | review-pr-patterns.md | 255-310 |
| PTN-PR-6 | Review comment templates and approval criteria | review-pr-patterns.md | 312-371 |

---

## When to Expand

### Discovery Workflow

| Code | Expand When |
|------|-------------|
| PTN-DIS-1 | Starting discovery, need folder structure |
| PTN-DIS-3 | Categorizing requirements (FR, NFR, C) |
| PTN-DIST-1 | Creating a discovery document |
| PTN-DIST-5 | Need requirements gathering example |

### Planning Workflow

| Code | Expand When |
|------|-------------|
| PTN-PLN-1 | Need folder structure reference |
| PTN-PLN-2 | Need allowed planning patterns |
| PTN-PLNT-1 | Creating a new plan document |
| PTN-PLNT-2 | Need phase templates |

### Testing (Jest)

| Code | Expand When |
|------|-------------|
| PTN-JEST-1 | Setting up test file naming |
| PTN-JEST-2 | Need test structure example |
| PTN-JEST-3 | Setting up server/client tests |
| PTN-JEST-4 | Need mock factory examples |

### Testing (Pytest)

| Code | Expand When |
|------|-------------|
| PTN-PYTEST-1 | Setting up pytest file structure |
| PTN-PYTEST-2 | Need fixture examples |
| PTN-PYTEST-3 | Need mocking examples |
| PTN-PYTEST-4 | Need parametrized test examples |

### Code Review

| Code | Expand When |
|------|-------------|
| PTN-REV-1 | Creating code review output |
| PTN-PR-1 | Need general PR checklist |
| PTN-PR-2 | Reviewing TypeScript code |
| PTN-PR-3 | Reviewing Python code |

### Contracts

| Code | Expand When |
|------|-------------|
| PTN-CON-1 | Creating a new contract document |
| PTN-CON-2 | Need contract pattern examples |
| PTN-CON-4 | Need FE integration guidance |

---

## Quick Reference by Category

### Discovery
- **PTN-DIS-***: Discovery patterns and rules
- **PTN-DIST-***: Discovery templates and examples

### Planning
- **PTN-PLN-***: Planning patterns and rules
- **PTN-PLNT-***: Plan templates

### Testing
- **PTN-JEST-***: Jest testing patterns (JS/TS)
- **PTN-PYTEST-***: Pytest testing patterns (Python)

### Reviews
- **PTN-REV-***: Code review templates
- **PTN-PR-***: PR review patterns

### Contracts
- **PTN-CON-***: Integration contract patterns
