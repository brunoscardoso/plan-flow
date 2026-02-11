
## How to Use This File

1. **Add patterns** that represent your team's coding standards
2. **Include examples** showing the correct way to implement each pattern
3. **Explain why** each pattern is beneficial
4. **Reference tools/rules** if applicable (ESLint, SonarQube, etc.)

---

## Example Pattern Structure

### Pattern Name

Brief description of what this pattern accomplishes.

```typescript
// GOOD - Example of the correct approach
const example = doThingCorrectly()

// Optionally show the contrast
// BAD - What to avoid (but keep this minimal)
const badExample = doThingWrong()
```

**Why**: Explain the benefit of following this pattern.

**Guidelines**:

- Specific guideline 1
- Specific guideline 2

---

## Example Patterns

### 1. Descriptive Naming

Use clear, descriptive names for functions, variables, and components.

```typescript
// GOOD - Clear intent
function calculateOrderTotal(items: OrderItem[]): number
function fetchUserProfile(userId: string): Promise<User>
const isAuthenticated = checkAuthStatus()

// GOOD - Component names describe what they render
export const UserProfileCard = () => { ... }
export const OrderSummaryTable = () => { ... }
```

**Why**: Improves code readability and makes the codebase self-documenting.

---

### 2. Single Responsibility

Each function/component should do one thing well.

```typescript
// GOOD - Focused function
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// GOOD - Focused component
const PriceDisplay = ({ amount }: { amount: number }) => (
  <span className="price">{formatCurrency(amount)}</span>
)
```

**Why**: Easier to test, maintain, and reuse.

---

### 3. Error Handling

Handle errors explicitly with meaningful messages.

```typescript
// GOOD - Explicit error handling
async function fetchData(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new ApiError(`Request failed: ${response.status}`)
    }
    return response.json()
  } catch (error) {
    logger.error('Failed to fetch data', { url, error })
    throw error
  }
}
```

**Why**: Makes debugging easier and provides better user feedback.

---

### 4. Type Safety

Leverage TypeScript's type system to catch errors at compile time.

```typescript
// GOOD - Explicit types for function signatures
interface User {
  id: string
  name: string
  email: string
}

function createUser(input: CreateUserInput): User {
  // Implementation
}

// GOOD - Use type inference where appropriate
const users = await fetchUsers() // Type inferred from function return
```

**Why**: Catches errors before runtime and improves IDE autocomplete.

---

### 5. Consistent Code Organization

Follow a consistent structure for files and folders.

```
src/
├── components/       # UI components
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
├── services/         # API and external service integrations
└── stores/           # State management
```

**Why**: Makes the codebase navigable and predictable.

---

## Adding Your Patterns

When adding new patterns to this file:

1. **Start with the pattern name** as a heading
2. **Provide code examples** showing the correct approach
3. **Explain the "Why"** - benefits of the pattern
4. **Add guidelines** for edge cases or nuances
5. **Reference external rules** if applicable (linting, etc.)

---

## Template for New Patterns

```markdown
### Pattern Name

Brief description of what this pattern accomplishes.

\`\`\`typescript
// GOOD - Example code
const example = correctApproach()
\`\`\`

**Why**: Explanation of benefits.

**Guidelines**:

- Guideline 1
- Guideline 2
```
