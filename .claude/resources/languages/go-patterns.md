---
description: "Go best practices and idiomatic patterns"
paths:
  - "**/*.go"
---

## Naming Conventions

### Exported vs Unexported

```go
// Exported (public) — PascalCase
type UserService struct { ... }
func NewUserService() *UserService { ... }

// Unexported (private) — camelCase
type userRepository struct { ... }
func validateEmail(email string) bool { ... }
```

### Package Naming

```go
// GOOD — short, lowercase, single-word
package user
package auth
package config

// BAD — avoid underscores, multi-word, or generic names
package user_service  // use userservice or separate packages
package utils         // too generic — name by purpose
package common        // same problem
```

### Interface Naming

```go
// Single-method interfaces: method name + "er"
type Reader interface { Read(p []byte) (n int, err error) }
type Closer interface { Close() error }
type Handler interface { Handle(ctx context.Context, req Request) error }

// Multi-method interfaces: descriptive noun
type UserStore interface {
    Get(ctx context.Context, id string) (*User, error)
    Create(ctx context.Context, u *User) error
    Delete(ctx context.Context, id string) error
}
```

### Accept Interfaces, Return Structs

```go
// GOOD — function accepts interface, returns concrete type
func NewService(store UserStore, logger Logger) *Service {
    return &Service{store: store, logger: logger}
}
```

---

## Error Handling

### Error Wrapping

```go
import "fmt"

func fetchUser(id string) (*User, error) {
    user, err := db.FindByID(id)
    if err != nil {
        return nil, fmt.Errorf("fetchUser(%s): %w", id, err)
    }
    return user, nil
}
```

### Sentinel Errors

```go
import "errors"

var (
    ErrNotFound    = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
    ErrConflict    = errors.New("conflict")
)

// Check with errors.Is
if errors.Is(err, ErrNotFound) {
    http.Error(w, "Not found", 404)
}
```

### Custom Error Types

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s — %s", e.Field, e.Message)
}

// Check with errors.As
var valErr *ValidationError
if errors.As(err, &valErr) {
    log.Printf("Field %s: %s", valErr.Field, valErr.Message)
}
```

### Never Ignore Errors

```go
// BAD
json.Unmarshal(data, &config)

// GOOD
if err := json.Unmarshal(data, &config); err != nil {
    return fmt.Errorf("parse config: %w", err)
}
```

---

## Concurrency

### Goroutines with WaitGroup

```go
import "sync"

func processAll(items []Item) error {
    var wg sync.WaitGroup
    errs := make(chan error, len(items))

    for _, item := range items {
        wg.Add(1)
        go func(it Item) {
            defer wg.Done()
            if err := process(it); err != nil {
                errs <- err
            }
        }(item)
    }

    wg.Wait()
    close(errs)

    for err := range errs {
        return err // Return first error
    }
    return nil
}
```

### Channels for Communication

```go
func producer(ctx context.Context) <-chan int {
    ch := make(chan int)
    go func() {
        defer close(ch)
        for i := 0; ; i++ {
            select {
            case <-ctx.Done():
                return
            case ch <- i:
            }
        }
    }()
    return ch
}
```

### Context Propagation

```go
func handleRequest(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

    user, err := userService.Get(ctx, userID)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            http.Error(w, "timeout", http.StatusGatewayTimeout)
            return
        }
        http.Error(w, "error", http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(user)
}
```

### Mutex for Shared State

```go
type SafeCounter struct {
    mu sync.RWMutex
    v  map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.v[key]++
}

func (c *SafeCounter) Get(key string) int {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.v[key]
}
```

---

## Testing

### Table-Driven Tests

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name  string
        email string
        want  bool
    }{
        {"valid email", "user@example.com", true},
        {"missing @", "userexample.com", false},
        {"empty string", "", false},
        {"missing domain", "user@", false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := ValidateEmail(tt.email)
            if got != tt.want {
                t.Errorf("ValidateEmail(%q) = %v, want %v", tt.email, got, tt.want)
            }
        })
    }
}
```

### Testify Assertions

```go
import "github.com/stretchr/testify/assert"

func TestCreateUser(t *testing.T) {
    user, err := svc.CreateUser(input)

    assert.NoError(t, err)
    assert.Equal(t, "alice", user.Name)
    assert.NotEmpty(t, user.ID)
}
```

### HTTP Handler Testing

```go
import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestGetUser(t *testing.T) {
    req := httptest.NewRequest("GET", "/users/123", nil)
    w := httptest.NewRecorder()

    handler.ServeHTTP(w, req)

    assert.Equal(t, http.StatusOK, w.Code)
    assert.Contains(t, w.Body.String(), "alice")
}
```

### Benchmarks

```go
func BenchmarkProcess(b *testing.B) {
    data := generateTestData()
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        Process(data)
    }
}
```

---

## Package Organization

### Standard Project Layout

```
project/
├── cmd/                # Entry points (main packages)
│   └── server/
│       └── main.go
├── internal/           # Private application code
│   ├── user/
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── repository.go
│   └── auth/
├── pkg/                # Public library code (optional)
├── go.mod
└── go.sum
```

### Internal Packages

Use `internal/` to prevent external imports:

```go
// internal/user/service.go — only importable within this module
package user

type Service struct { ... }
```

---

## Forbidden Patterns

- **Never ignore errors** — always check `err != nil`
- **Never use `panic()` for normal error flow** — reserve for truly unrecoverable situations
- **Never use `init()` for complex logic** — keep init functions minimal or avoid them
- **Never use naked goroutines without lifecycle management** — always use context, WaitGroup, or errgroup
- **Never use `interface{}` / `any` when a specific type works** — prefer concrete types or constrained generics
- **Never shadow built-in names** — avoid naming variables `error`, `string`, `len`, `close`, etc.
