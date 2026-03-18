
## How to Use This File

1. **Add anti-patterns** that cause problems in your codebase
2. **Show examples** of the problematic code
3. **Explain why** each pattern is harmful
4. **Reference the fix** in `.claude/rules/core/allowed-patterns.md` when applicable

---

## Example Pattern Structure

### DON'T: Pattern Name

**Problem**: Brief description of why this is problematic.

```typescript
// BAD - Example of the anti-pattern
const badExample = doThingWrong()
```

**Why This is Wrong**:

- Reason 1
- Reason 2

**Fix**: Description of the correct approach or link to `.claude/rules/core/allowed-patterns.md`.

---

## Example Anti-Patterns

### 1. DON'T Use Magic Numbers

**Problem**: Hardcoded numbers without context make code hard to understand and maintain.

```typescript
// BAD - What does 86400000 mean?
setTimeout(cleanup, 86400000)

// BAD - Why 5? What if it needs to change?
if (retryCount > 5) {
  throw new Error('Too many retries')
}
```

**Why This is Wrong**:

- No context for what the number represents
- Hard to find and update when requirements change
- Easy to introduce bugs with typos

**Fix**: Use named constants with descriptive names.

```typescript
// GOOD
const ONE_DAY_MS = 24 * 60 * 60 * 1000
setTimeout(cleanup, ONE_DAY_MS)

const MAX_RETRY_ATTEMPTS = 5
if (retryCount > MAX_RETRY_ATTEMPTS) {
  throw new Error('Too many retries')
}
```

---

### 2. DON'T Swallow Errors Silently

**Problem**: Catching errors without handling them hides bugs and makes debugging impossible.

```typescript
// BAD - Error is completely ignored
try {
  await saveData(data)
} catch (error) {
  // Silent failure - no one knows something went wrong
}

// BAD - Generic catch that hides the real issue
try {
  await complexOperation()
} catch {
  return null
}
```

**Why This is Wrong**:

- Bugs go unnoticed until they cause bigger problems
- Impossible to debug issues in production
- Users don't know their action failed

**Fix**: Always log errors and provide appropriate user feedback.

```typescript
// GOOD
try {
  await saveData(data)
} catch (error) {
  logger.error('Failed to save data', { error, data })
  throw new UserFacingError('Unable to save. Please try again.')
}
```

---

### 3. DON'T Use Nested Ternaries

**Problem**: Deeply nested ternary operators are hard to read and maintain.

```typescript
// BAD - Unreadable nested ternaries
const status = isLoading ? 'loading' : hasError ? 'error' : isComplete ? 'complete' : 'idle'

// BAD - Even worse with more nesting
const message = !user ? 'Not logged in' : !user.verified ? 'Please verify' : user.isPremium ? 'Welcome back, premium user!' : 'Welcome back!'
```

**Why This is Wrong**:

- Extremely hard to read and understand
- Easy to introduce bugs when modifying
- Difficult to add new conditions

**Fix**: Use if/else statements, switch statements, or lookup objects.

```typescript
// GOOD - Clear and maintainable
function getStatus(isLoading: boolean, hasError: boolean, isComplete: boolean) {
  if (isLoading) return 'loading'
  if (hasError) return 'error'
  if (isComplete) return 'complete'
  return 'idle'
}
```

---

### 4. DON'T Mutate Function Parameters

**Problem**: Mutating parameters causes unexpected side effects and makes code unpredictable.

```typescript
// BAD - Mutating the input array
function addItem(items: string[], newItem: string) {
  items.push(newItem) // Modifies the original array!
  return items
}

// BAD - Mutating object properties
function updateUser(user: User) {
  user.lastUpdated = new Date() // Modifies the original object!
  return user
}
```

**Why This is Wrong**:

- Caller doesn't expect their data to change
- Causes bugs that are hard to track down
- Breaks immutability expectations in React/Redux

**Fix**: Return new objects/arrays instead of mutating.

```typescript
// GOOD - Returns new array
function addItem(items: string[], newItem: string) {
  return [...items, newItem]
}

// GOOD - Returns new object
function updateUser(user: User) {
  return { ...user, lastUpdated: new Date() }
}
```

---

### 5. DON'T Mix Async Patterns

**Problem**: Mixing callbacks, promises, and async/await makes code confusing and error-prone.

```typescript
// BAD - Mixing callbacks and promises
function fetchData(callback) {
  fetch('/api/data')
    .then(res => res.json())
    .then(data => callback(null, data))
    .catch(err => callback(err))
}

// BAD - Mixing .then() with async/await
async function processData() {
  const result = await fetchData()
  return result.then(data => transform(data)) // Mixing patterns!
}
```

**Why This is Wrong**:

- Confusing control flow
- Error handling becomes inconsistent
- Harder to debug and maintain

**Fix**: Use async/await consistently throughout.

```typescript
// GOOD - Consistent async/await
async function fetchData() {
  const response = await fetch('/api/data')
  return response.json()
}

async function processData() {
  const data = await fetchData()
  return transform(data)
}
```

---

## Adding Your Anti-Patterns

When adding new anti-patterns to this file:

1. **Start with "DON'T"** followed by the pattern name
2. **Describe the problem** briefly
3. **Provide BAD examples** showing the anti-pattern
4. **Explain why it's wrong** with a bullet list
5. **Show the fix** or reference `.claude/rules/core/allowed-patterns.md`

---

## Template for New Anti-Patterns

```markdown
### DON'T: Pattern Name

**Problem**: Brief description of why this is problematic.

\`\`\`typescript
// BAD - Example of the anti-pattern
const badExample = problematicCode()
\`\`\`

**Why This is Wrong**:

- Reason 1
- Reason 2

**Fix**: Description or link to `.claude/rules/core/allowed-patterns.md`.
```

---

## Project Anti-Patterns

### 6. DON'T Execute ORM/Database Migration Commands Directly

**Problem**: Running ORM tools (Prisma, Drizzle, TypeORM, Sequelize, Knex, Django ORM, Alembic, etc.) directly can cause irreversible data loss, schema corruption, or unintended migrations in production environments.

```bash
# BAD - Never run these directly
npx prisma migrate dev
npx prisma db push
npx prisma db seed
npx drizzle-kit push
npx drizzle-kit migrate
npx typeorm migration:run
python manage.py migrate
alembic upgrade head
npx knex migrate:latest
```

**Why This is Wrong**:

- Database migrations can be destructive and irreversible (dropping columns, tables, data)
- ORM commands may connect to production databases if environment is misconfigured
- Schema changes need human review before execution
- Seed commands can overwrite existing data
- The AI agent has no way to verify which database environment it's targeting

**Fix**: Always present the command to the user and ask them to execute it manually.

```markdown
<!-- GOOD - Ask the user to run it -->
"Please run the following command to apply the migration:"

`npx prisma migrate dev --name add_users_table`

"Review the generated migration SQL before confirming."
```

**Scope**: This applies to ALL ORM and database tools — Prisma, Drizzle, TypeORM, Sequelize, Knex, Django ORM, Alembic, SQLAlchemy, ActiveRecord, and any other database migration or seeding tool.

<!-- auto-captured anti-patterns below this line -->
