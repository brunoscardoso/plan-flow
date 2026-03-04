---
description: "Python best practices and patterns"
paths:
  - "**/*.py"
---

## Style and Typing

### PEP 8 Naming Conventions

```python
# Variables and functions: snake_case
user_count = 0
def get_active_users() -> list[User]: ...

# Classes: PascalCase
class UserService: ...

# Constants: UPPER_SNAKE_CASE
MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30

# Private: leading underscore
def _validate_email(email: str) -> bool: ...
```

### Type Hints

Always add type annotations for function signatures:

```python
from typing import Optional

def fetch_user(user_id: str) -> Optional[User]:
    """Fetch a user by their ID."""
    ...

def process_items(items: list[str], *, limit: int = 10) -> dict[str, int]:
    ...
```

### Dataclasses for Structured Data

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class User:
    id: str
    name: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)
    roles: list[str] = field(default_factory=list)

@dataclass(frozen=True)
class Config:
    host: str
    port: int = 8080
```

---

## Code Organization

### Modular Functions (Single Responsibility)

```python
# GOOD — focused, testable functions
def validate_email(email: str) -> bool:
    return "@" in email and "." in email.split("@")[1]

def format_currency(amount: float, currency: str = "USD") -> str:
    return f"{amount:,.2f} {currency}"
```

### Enums for Fixed Values

```python
from enum import Enum, auto

class Status(Enum):
    PENDING = auto()
    ACTIVE = auto()
    SUSPENDED = auto()

def update_status(user: User, status: Status) -> None:
    ...
```

### Context Managers for Resources

```python
from contextlib import contextmanager

@contextmanager
def database_connection(url: str):
    conn = create_connection(url)
    try:
        yield conn
    finally:
        conn.close()

# Usage
with database_connection(DB_URL) as conn:
    users = conn.execute("SELECT * FROM users")
```

---

## Error Handling

### Custom Exceptions

```python
class AppError(Exception):
    def __init__(self, message: str, code: str = "UNKNOWN"):
        super().__init__(message)
        self.code = code

class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        super().__init__(f"{resource} not found: {id}", code="NOT_FOUND")

class ValidationError(AppError):
    def __init__(self, field: str, reason: str):
        super().__init__(f"Validation failed for {field}: {reason}", code="VALIDATION")
```

### Specific Exception Handling

```python
# BAD — bare except
try:
    result = process(data)
except:
    pass

# GOOD — specific exceptions with context
try:
    result = process(data)
except ValidationError as e:
    logger.warning("Validation failed", extra={"field": e.code})
    raise
except ConnectionError as e:
    logger.error("Connection lost", exc_info=True)
    raise AppError("Service unavailable") from e
```

---

## Async and I/O Patterns

### Async/Await

```python
import asyncio
import aiohttp

async def fetch_user(session: aiohttp.ClientSession, user_id: str) -> dict:
    async with session.get(f"/api/users/{user_id}") as resp:
        resp.raise_for_status()
        return await resp.json()

async def fetch_all_users(user_ids: list[str]) -> list[dict]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_user(session, uid) for uid in user_ids]
        return await asyncio.gather(*tasks)
```

### File I/O with Pathlib

```python
from pathlib import Path

config_path = Path("config") / "settings.json"

# Read
data = config_path.read_text(encoding="utf-8")

# Write
output = Path("output")
output.mkdir(parents=True, exist_ok=True)
(output / "result.json").write_text(json.dumps(result), encoding="utf-8")
```

---

## Best Practices

### Dependency Injection

```python
class UserService:
    def __init__(self, repo: UserRepository, mailer: MailService):
        self._repo = repo
        self._mailer = mailer

    def create_user(self, input: CreateUserInput) -> User:
        user = self._repo.create(input)
        self._mailer.send_welcome(user.email)
        return user
```

### Logging (not print)

```python
import logging

logger = logging.getLogger(__name__)

def process_order(order_id: str) -> None:
    logger.info("Processing order", extra={"order_id": order_id})
    try:
        result = charge_payment(order_id)
        logger.info("Payment charged", extra={"amount": result.amount})
    except PaymentError:
        logger.error("Payment failed", exc_info=True)
        raise
```

### Pydantic for Validation

```python
from pydantic import BaseModel, EmailStr, field_validator

class CreateUserInput(BaseModel):
    name: str
    email: EmailStr
    age: int

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        if v < 0 or v > 150:
            raise ValueError("Age must be between 0 and 150")
        return v
```

---

## Forbidden Patterns

- **Never use bare `except:`** — always catch specific exceptions
- **Never use `print()` for logging** — use the `logging` module
- **Never mutate default arguments** — use `None` default with `if arg is None: arg = []`
- **Never use `import *`** — always import specific names
- **Never ignore type hints on public functions** — always annotate parameters and return types
- **Never use `os.path`** — prefer `pathlib.Path` for file operations
