
## Output Format

The generated review document should follow this structure:

```markdown
# Local Code Review: {Description}

## Review Information

| Field          | Value                 |
| -------------- | --------------------- |
| Date           | {date}                |
| Files Reviewed | {number_of_files}     |
| Scope          | {all/staged/unstaged} |
| Language(s)    | {detected_languages}  |

---

## Changed Files

| File          | Status     | Lines Changed |
| ------------- | ---------- | ------------- |
| `{file_path}` | {modified} | +{add}/-{del} |
| ...           | ...        | ...           |

---

## Reference Implementations Found

For each changed file, similar implementations in the codebase:

### {changed_file_path}

**Similar implementations found:**

| Reference File        | Pattern Observed      | Consistency    |
| --------------------- | --------------------- | -------------- |
| `{similar_file_path}` | {pattern_description} | Match/Conflict |
| ...                   | ...                   | ...            |

**Pattern Notes:**

- {observation about how similar code handles the same concern}

---

## Review Summary

| Metric                | Value              |
| --------------------- | ------------------ |
| **Total Findings**    | {count}            |
| Critical              | {critical_count}   |
| Major                 | {major_count}      |
| Minor                 | {minor_count}      |
| Suggestion            | {suggestion_count} |
| **Pattern Conflicts** | {conflict_count}   |
| **Total Fix Effort**  | {sum_of_scores}/X  |

---

## Findings

### Finding 1: {Finding Name}

| Field          | Value                                            |
| -------------- | ------------------------------------------------ |
| File           | `{file_path}`                                    |
| Line           | {line_number}                                    |
| Severity       | {Critical/Major/Minor/Suggestion}                |
| Fix Complexity | {X/10} - {Level}                                 |
| Pattern        | {Reference to pattern from rules, if applicable} |

**Description**:
{Detailed explanation of the issue found}

**Reference Implementation**:
See `{reference_file_path}` for how this is handled elsewhere in the codebase.

**Suggested Fix**:
\`\`\`{language}
// Suggested code improvement
\`\`\`

---

## Pattern Conflicts

This section documents conflicts between the new code and existing codebase patterns.

### Conflict 1: {Conflict Name}

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| New Code File  | `{changed_file_path}`                  |
| Reference File | `{existing_file_path}`                 |
| Pattern Type   | {naming/structure/error-handling/etc}  |
| Resolution     | {Update new code/Update rules/Discuss} |

**New Code Pattern**:
\`\`\`{language}
// Pattern used in new code
\`\`\`

**Existing Pattern**:
\`\`\`{language}
// Pattern used in existing codebase
\`\`\`

**Recommendation**:
{Which pattern to use and why}

---

## Rule Update Recommendations

When pattern conflicts are found, recommend updates to prevent future inconsistencies.

### Recommended Addition to `allowed-patterns.md`

If a good pattern is discovered that isn't documented:

\`\`\`markdown

### {Pattern Name}

{Description of the pattern}

\`\`\`typescript
// Example of the pattern
\`\`\`

**Why**: {Explanation of benefit}
\`\`\`

### Recommended Addition to `forbidden-patterns.md`

If an anti-pattern is found that should be avoided:

\`\`\`markdown

### DON'T: {Pattern Name}

**Problem**: {Description of why this is problematic}

\`\`\`typescript
// BAD - Example of the anti-pattern
\`\`\`

**Why This is Wrong**:

- {Reason 1}
- {Reason 2}

**Fix**: {Description of the correct approach}
\`\`\`

---

## Positive Highlights

List any particularly well-written code or good practices observed:

- {Highlight 1}
- {Highlight 2}

---

## Commit Readiness

| Status | {Ready to Commit/Needs Changes/Needs Discussion} |
| ------ | ------------------------------------------------ |
| Reason | {Brief explanation}                              |

### Before Committing

- [ ] Address all Critical findings
- [ ] Address all Major findings
- [ ] Review Pattern Conflicts and decide on resolution
- [ ] Update rules files if new patterns should be documented
```

---

## Example Output

### Pattern Conflict Example

```markdown
### Conflict 1: Error Handling Pattern

| Field          | Value                          |
| -------------- | ------------------------------ |
| New Code File  | `src/services/userService.ts`  |
| Reference File | `src/services/orderService.ts` |
| Pattern Type   | error-handling                 |
| Resolution     | Update new code                |

**New Code Pattern**:
\`\`\`typescript
try {
await saveUser(data);
} catch (e) {
console.log(e); // Silent console log
return null;
}
\`\`\`

**Existing Pattern**:
\`\`\`typescript
try {
await saveOrder(data);
} catch (error) {
logger.error('Failed to save order', { error, orderId: data.id });
throw new ServiceError('Unable to save order');
}
\`\`\`

**Recommendation**:
Update new code to follow the established error handling pattern from `orderService.ts`. The existing pattern properly logs errors with context and throws a meaningful error for the caller to handle.
```

### Rule Update Recommendation Example

```markdown
## Rule Update Recommendations

### Recommended Addition to `allowed-patterns.md`

\`\`\`markdown

### Service Layer Error Handling

All service layer functions should handle errors with proper logging and re-throw with meaningful error types.

\`\`\`typescript
// GOOD - Service layer error handling
try {
await performOperation(data);
} catch (error) {
logger.error('Operation failed', { error, context: data.id });
throw new ServiceError('Operation failed', { cause: error });
}
\`\`\`

**Why**: Ensures errors are traceable in logs while providing meaningful errors to callers.
\`\`\`

### Recommended Addition to `forbidden-patterns.md`

\`\`\`markdown

### DON'T: Silent Console Logging in Services

**Problem**: Using console.log for errors in service layer loses context and makes debugging difficult.

\`\`\`typescript
// BAD - Silent console log
catch (e) {
console.log(e);
return null;
}
\`\`\`

**Why This is Wrong**:

- console.log doesn't persist in production logging systems
- Returning null hides the error from callers
- No context about what operation failed

**Fix**: Use structured logger and throw meaningful errors.
\`\`\`
```

---

## Finding Example

```markdown
### Finding 1: Silent Error Swallowing

| Field          | Value                         |
| -------------- | ----------------------------- |
| File           | `src/services/userService.ts` |
| Line           | 45                            |
| Severity       | Major                         |
| Fix Complexity | 3/10 - Low                    |
| Pattern        | forbidden-patterns.md        |

**Description**:
The catch block catches an error but only logs it to console and returns null. This hides errors from callers and makes debugging difficult.

**Reference Implementation**:
See `src/services/orderService.ts` for proper error handling pattern.

**Suggested Fix**:
\`\`\`typescript
try {
  await saveUser(data);
} catch (error) {
  logger.error('Failed to save user', { error, userId: data.id });
  throw new ServiceError('Unable to save user', { cause: error });
}
\`\`\`
```
