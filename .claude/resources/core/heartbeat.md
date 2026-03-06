
# Heartbeat: Scheduled Task System

## Purpose

A file-based cron-like automation system for plan-flow. Tasks are defined in `flow/heartbeat.md` with human-readable schedules and executed by a background Node.js daemon.

**Config Location**: `flow/heartbeat.md`
**PID File**: `flow/.heartbeat.pid`

---

## File Format

The heartbeat file contains task entries in markdown format:

```markdown
# Heartbeat

**Project**: [[{project-name}]]
**Last Updated**: {YYYY-MM-DD}

## Tasks

### {task-name}
- **Schedule**: {schedule-expression}
- **Command**: {command-to-execute}
- **Enabled**: {true|false}
- **Description**: {what this task does}

### {another-task}
- **Schedule**: {schedule-expression}
- **Command**: {command-to-execute}
- **Enabled**: {true|false}
- **Description**: {what this task does}
```

---

## Schedule Syntax

Human-readable schedule expressions:

| Syntax | Example | Meaning |
|--------|---------|---------|
| `daily at {HH:MM AM/PM}` | `daily at 10:00 PM` | Run once daily at 10:00 PM |
| `every {N} hours` | `every 6 hours` | Run every 6 hours from daemon start |
| `every {N} minutes` | `every 30 minutes` | Run every 30 minutes from daemon start |
| `weekly on {day} at {HH:MM}` | `weekly on Monday at 9:00 AM` | Run weekly on Monday at 9 AM |

### Schedule Rules

- Times use 12-hour format with AM/PM
- Day names are case-insensitive (Monday, monday, MONDAY)
- Interval-based schedules (`every N hours/minutes`) start from daemon startup time
- Daily and weekly schedules use the system's local timezone

---

## Daemon Architecture

### Overview

The heartbeat daemon is a detached Node.js process that:

1. Reads `flow/heartbeat.md` and parses task definitions
2. Schedules tasks using Node.js built-in `setTimeout`/`setInterval`
3. Watches `flow/heartbeat.md` for changes and reloads dynamically
4. Spawns Claude Code CLI to execute scheduled commands
5. Writes PID to `flow/.heartbeat.pid` for lifecycle management

### CLI Commands

| Command | Action |
|---------|--------|
| `npx plan-flow heartbeat start` | Start the daemon (detached) |
| `npx plan-flow heartbeat stop` | Stop the daemon (via PID file) |
| `npx plan-flow heartbeat status` | Show daemon status (running/stopped, PID, uptime) |

### Process Management

- **PID File**: `flow/.heartbeat.pid` stores the daemon PID
- **Start**: Spawns a detached child process, writes PID file
- **Stop**: Reads PID file, sends SIGTERM, removes PID file
- **Status**: Checks if PID in file is actually running
- **Stale PID**: If PID file exists but process is not running, clean up and report stopped

### Signal Handling

The daemon handles:

- **SIGTERM**: Clean shutdown — clear all timers, remove PID file, exit
- **SIGINT**: Same as SIGTERM

### File Watching

- Uses `fs.watch` on `flow/heartbeat.md`
- On change: re-parse the file, cancel existing timers, reschedule all enabled tasks
- Debounce: 1 second delay to handle rapid file saves

### Task Execution

- Each task spawns a new Claude Code CLI process
- Command is passed to Claude Code as the prompt
- Stdout/stderr are logged to `flow/.heartbeat.log`
- Tasks do not run concurrently — a task waits for the previous invocation to complete before starting again

---

## Rules

1. **No external dependencies**: Daemon uses only Node.js built-in modules
2. **Graceful shutdown**: Always clean up timers and PID file on exit
3. **Stale PID detection**: Verify PID is actually running before assuming daemon is alive
4. **File-based config**: All configuration lives in `flow/heartbeat.md` — no CLI flags for task config
5. **Hot reload**: Changes to `flow/heartbeat.md` are picked up automatically without restart
6. **Log rotation**: Keep `flow/.heartbeat.log` under 1000 lines by truncating oldest entries
