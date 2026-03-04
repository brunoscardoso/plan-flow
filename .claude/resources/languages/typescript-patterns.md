---
description: "TypeScript best practices and strict typing patterns"
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

## Type Definitions

### Interfaces for Object Shapes

Use `interface` for object shapes and public API contracts:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface CreateUserInput {
  name: string;
  email: string;
}
```

### Discriminated Unions for State

Model exclusive states with discriminated unions:

```typescript
type RequestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: Error };

function renderState(state: RequestState) {
  switch (state.status) {
    case 'idle': return 'Ready';
    case 'loading': return 'Loading...';
    case 'success': return state.data.name;
    case 'error': return state.error.message;
  }
}
```

### Generics for Reusable Components

```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(input: Omit<T, 'id' | 'createdAt'>): Promise<T>;
}
```

---

## Error Handling

### Custom Error Types

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
  }
}
```

### Result Pattern (for operations that can fail)

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parseConfig(raw: string): Result<Config> {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: e as Error };
  }
}
```

---

## Type Safety

### Avoid the `any` Type

Use `unknown` with type guards instead of `any`:

```typescript
// BAD
function process(input: any) { return input.name; }

// GOOD
function process(input: unknown): string {
  if (typeof input === 'object' && input !== null && 'name' in input) {
    return (input as { name: string }).name;
  }
  throw new Error('Invalid input');
}
```

### Utility Types

```typescript
// Pick specific fields
type UserSummary = Pick<User, 'id' | 'name'>;

// Make all fields optional
type PartialUser = Partial<User>;

// Make all fields required
type RequiredUser = Required<User>;

// Exclude specific fields
type UserWithoutId = Omit<User, 'id'>;

// Record for maps
type UserCache = Record<string, User>;
```

### Null Safety

```typescript
// Optional chaining
const city = user?.address?.city;

// Nullish coalescing
const name = user.displayName ?? user.email ?? 'Anonymous';

// Non-null assertion (only when you're certain)
const element = document.getElementById('app')!;
```

---

## Advanced Patterns

### Const Assertions

```typescript
const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number]; // 'admin' | 'editor' | 'viewer'

const CONFIG = {
  maxRetries: 3,
  timeout: 5000,
} as const;
```

### Type Guards

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

if (isUser(data)) {
  console.log(data.email); // TypeScript knows data is User
}
```

### The `satisfies` Operator

```typescript
const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies Record<string, string | number[]>;
// Type is preserved: palette.red is number[], palette.green is string
```

### Immutability

```typescript
// Readonly properties
interface Config {
  readonly host: string;
  readonly port: number;
}

// Readonly arrays
function process(items: readonly string[]) {
  // items.push('x'); // Error: Property 'push' does not exist
  return items.map((i) => i.toUpperCase());
}
```

---

## Forbidden Patterns

- **Never use `any`** — use `unknown` with type guards
- **Never use `@ts-ignore`** — fix the type error or use `@ts-expect-error` with explanation
- **Never use `!` assertion carelessly** — only when you have proof the value exists
- **Never mutate function parameters** — return new objects/arrays
- **Never use `enum`** — prefer `as const` objects or union types (enums have runtime overhead and edge cases)
