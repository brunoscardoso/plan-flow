# Session Hooks (Manual Fallback)

Your AI platform does not support automatic lifecycle hooks. To get session continuity features (state resume, brain capture), run these scripts manually.

## Start of Session

Run before starting work to see resume context from previous sessions:

```bash
bash scripts/plan-flow/start-session.sh
```

**What it does**: Reads `flow/state/current.json` and shows any in-progress plan execution, phase progress, and autopilot status.

## End of Session

Run when you're done working to capture session activity:

```bash
bash scripts/plan-flow/end-session.sh
```

**What it does**: Creates a session summary in `flow/state/` and a brain session file in `flow/brain/sessions/`.

**Note**: Full session transcript capture is only available with Claude Code's native hooks. The manual fallback creates a minimal session record with timestamps.

## Platforms with Native Hook Support

- **Claude Code**: Full automatic hooks (session-start, session-end, pre-compact). No manual steps needed.
