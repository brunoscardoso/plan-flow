---
description: "Rust best practices and idiomatic patterns"
paths:
  - "**/*.rs"
---

## Ownership and Borrowing

### Borrow Checker Patterns

```rust
// Prefer borrowing over taking ownership
fn process(data: &[u8]) -> Result<Output> { ... }

// Take ownership only when you need to store the value
fn register(user: User) -> UserId {
    let id = user.id.clone();
    self.users.insert(id.clone(), user);
    id
}

// Return owned data when the caller needs ownership
fn create_user(input: &CreateUserInput) -> User { ... }
```

### Clone Judiciously

```rust
// BAD — unnecessary clone
let name = user.name.clone();
println!("{}", name);

// GOOD — borrow instead
println!("{}", &user.name);

// OK — clone when you genuinely need an owned copy
let cached_name = user.name.clone();
cache.insert(user.id, cached_name);
```

### Lifetime Annotations

```rust
// When returning a reference, annotate the lifetime
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// Struct holding references needs lifetimes
struct Parser<'a> {
    input: &'a str,
    position: usize,
}
```

---

## Error Handling

### Result and the `?` Operator

```rust
use std::fs;
use std::io;

fn read_config(path: &str) -> Result<Config, io::Error> {
    let content = fs::read_to_string(path)?;
    let config: Config = serde_json::from_str(&content)?;
    Ok(config)
}
```

### Custom Error Types with `thiserror`

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("not found: {resource} {id}")]
    NotFound { resource: String, id: String },

    #[error("validation failed: {0}")]
    Validation(String),

    #[error("database error")]
    Database(#[from] sqlx::Error),

    #[error("IO error")]
    Io(#[from] std::io::Error),
}
```

### `anyhow` for Application Code

```rust
use anyhow::{Context, Result};

fn setup() -> Result<()> {
    let config = read_config("config.toml")
        .context("failed to read config")?;
    let db = connect_db(&config.db_url)
        .context("failed to connect to database")?;
    Ok(())
}
```

### Option Handling

```rust
// Use combinators instead of match
let name = user.nickname
    .as_deref()
    .unwrap_or(&user.username);

// Map and unwrap_or_else
let port = config.port
    .map(|p| p.to_string())
    .unwrap_or_else(|| "8080".to_string());

// Use ? with Option in functions returning Option
fn find_email(users: &[User], id: &str) -> Option<&str> {
    let user = users.iter().find(|u| u.id == id)?;
    Some(&user.email)
}
```

---

## Traits and Generics

### Trait Bounds

```rust
use std::fmt::Display;

fn print_all<T: Display>(items: &[T]) {
    for item in items {
        println!("{item}");
    }
}

// Multiple bounds with where clause
fn process<T, E>(input: T) -> Result<(), E>
where
    T: AsRef<str> + Send,
    E: From<io::Error> + Display,
{
    ...
}
```

### Impl Blocks and Methods

```rust
pub struct UserService {
    repo: Box<dyn UserRepository>,
}

impl UserService {
    pub fn new(repo: Box<dyn UserRepository>) -> Self {
        Self { repo }
    }

    pub async fn get(&self, id: &str) -> Result<User, AppError> {
        self.repo.find_by_id(id).await?
            .ok_or_else(|| AppError::NotFound {
                resource: "User".into(),
                id: id.into(),
            })
    }
}
```

### Derive Macros

```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct UserId(String);

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct User {
    pub id: UserId,
    pub name: String,
    pub email: String,
}
```

### Builder Pattern

```rust
pub struct ServerBuilder {
    host: String,
    port: u16,
    workers: usize,
}

impl ServerBuilder {
    pub fn new() -> Self {
        Self {
            host: "0.0.0.0".into(),
            port: 8080,
            workers: 4,
        }
    }

    pub fn host(mut self, host: impl Into<String>) -> Self {
        self.host = host.into();
        self
    }

    pub fn port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }

    pub fn build(self) -> Server {
        Server { host: self.host, port: self.port, workers: self.workers }
    }
}
```

---

## Testing

### Unit Tests in Module

```rust
// src/user/service.rs

pub fn validate_email(email: &str) -> bool {
    email.contains('@') && email.contains('.')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_email() {
        assert!(validate_email("user@example.com"));
    }

    #[test]
    fn invalid_email_no_at() {
        assert!(!validate_email("userexample.com"));
    }

    #[test]
    fn empty_email() {
        assert!(!validate_email(""));
    }
}
```

### Integration Tests

```rust
// tests/integration_test.rs (separate file in tests/ directory)

use my_crate::UserService;

#[tokio::test]
async fn create_and_fetch_user() {
    let svc = setup_test_service().await;
    let user = svc.create(&CreateUserInput {
        name: "Alice".into(),
        email: "alice@example.com".into(),
    }).await.unwrap();

    let fetched = svc.get(&user.id).await.unwrap();
    assert_eq!(fetched.name, "Alice");
}
```

### Doc Tests

```rust
/// Adds two numbers together.
///
/// # Examples
///
/// ```
/// use my_crate::add;
/// assert_eq!(add(2, 3), 5);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

### Test Helpers

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn make_user(name: &str) -> User {
        User {
            id: UserId(format!("test-{name}")),
            name: name.into(),
            email: format!("{name}@test.com"),
        }
    }

    #[test]
    fn test_with_helper() {
        let user = make_user("alice");
        assert_eq!(user.name, "alice");
    }
}
```

---

## Module Organization

### File-Per-Module (Rust 2018+)

```
src/
├── main.rs           # or lib.rs
├── user.rs           # mod user
├── user/
│   ├── service.rs    # user::service
│   └── repository.rs # user::repository
├── auth.rs           # mod auth
└── config.rs         # mod config
```

### Re-Exports with `pub use`

```rust
// src/user/mod.rs
mod service;
mod repository;

pub use service::UserService;
pub use repository::UserRepository;
```

### Visibility

```rust
pub struct User {         // Public struct
    pub name: String,     // Public field
    pub(crate) id: i64,   // Crate-only field
    password_hash: String, // Private field
}
```

---

## Forbidden Patterns

- **Never use `unwrap()` in library/production code** — use `?`, `expect()` with a message, or handle the error
- **Never use `clone()` to satisfy the borrow checker** — restructure the code to avoid the conflict
- **Never use `unsafe` without a safety comment** — document exactly why the invariants hold
- **Never use `String` when `&str` suffices** — borrow when you don't need ownership
- **Never ignore compiler warnings** — treat `#[allow(unused)]` as temporary during development only
- **Never use `panic!()` for expected error conditions** — return `Result` or `Option` instead
