# Plan: Cost Tracker Hook

**Feature**: [[cost-tracker-hook]]
**Project**: [[plan-flow]]
**Created**: 2026-03-09
**Based on Discovery**: `flow/discovery/discovery_cost_tracker_hook_v1.md`

## Goals

- Track token usage and estimated cost per Claude response across all plan-flow projects
- Provide cross-project cost visibility via a global JSONL metrics file
- Auto-install hooks during `plan-flow init` so tracking is default-on
- Enable cost reporting via `/flow cost` for spend analysis

## Non-Goals

- Real-time billing alerts or budget enforcement (future)
- Integration with Anthropic billing API (future)
- Per-tool-call token attribution (would require PostToolUse hooks — future)

## Requirements Summary

### Functional Requirements

- [FR-1]: Stop hook logs tokens per response (input, output, cache) to `~/.claude/metrics/costs.jsonl`
- [FR-2]: SessionEnd hook writes session summary (total tokens, cost, duration)
- [FR-3]: `plan-flow init` auto-installs hooks into `.claude/settings.json`
- [FR-4]: `/flow cost` reads JSONL and displays spend summaries

### Non-Functional Requirements

- [NFR-1]: Hook execution < 500ms, async/non-blocking
- [NFR-2]: No external dependencies — Node.js built-ins only
- [NFR-3]: Graceful fallback — zero tokens logged if parsing fails

### Constraints

- [C-1]: Hook scripts must be CommonJS (`.cjs`)
- [C-2]: Token data comes from transcript JSONL (`type: "assistant"` messages with `message.usage`)
- [C-3]: Transcript JSONL format is undocumented — handle gracefully

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Transcript format changes | Hook logs zeros | Graceful fallback, version check |
| JSONL grows unbounded | Disk usage | Rotation: keep last 30 days |
| Hook fails on `claude -p` mode | No heartbeat tracking | Test explicitly, handle missing transcript |

## Phases

### Phase 1: Cost Tracker Stop Hook

**Scope**: Create the core Stop hook that parses transcript JSONL and logs token usage
**Complexity**: 4/10

- [ ] Create `scripts/hooks/cost-tracker.cjs` — Stop hook that:
  - Reads stdin JSON for `transcript_path` and `session_id`
  - Reads the transcript JSONL file, finds the last `type: "assistant"` entry
  - Extracts `message.usage` (input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens) and `message.model`
  - Calculates estimated cost using pricing table (Haiku/Sonnet/Opus rates)
  - Ensures `~/.claude/metrics/` directory exists
  - Appends JSONL entry to `~/.claude/metrics/costs.jsonl`
  - Includes `project` field derived from `cwd`
- [ ] Define JSONL entry schema:
  ```json
  {
    "timestamp": "ISO-8601",
    "session_id": "uuid",
    "project": "project-name",
    "model": "claude-opus-4-6",
    "input_tokens": 3,
    "output_tokens": 9,
    "cache_creation_tokens": 9821,
    "cache_read_tokens": 0,
    "estimated_cost_usd": 0.00015,
    "hook_version": "1.0.0"
  }
  ```
- [ ] Add pricing table as constant:
  - claude-haiku-4-5: input $0.80/M, output $4.00/M
  - claude-sonnet-4-6: input $3.00/M, output $15.00/M
  - claude-opus-4-6: input $15.00/M, output $75.00/M
  - Cache creation: same as input rate per model
  - Cache read: 10% of input rate per model
- [ ] Handle errors gracefully — wrap everything in try/catch, exit 0 always

**Build Verification**: `node scripts/hooks/cost-tracker.cjs < test-input.json` (manual test)

### Phase 2: Session Summary Hook

**Scope**: Create SessionEnd hook that aggregates per-session totals
**Complexity**: 3/10

- [ ] Create `scripts/hooks/session-summary.cjs` — SessionEnd hook that:
  - Reads `session_id` from stdin JSON
  - Reads `~/.claude/metrics/costs.jsonl`
  - Filters entries matching the current session_id
  - Sums tokens and cost across all entries
  - Appends a summary entry with `type: "session_summary"` to the JSONL
  - Includes: total_input_tokens, total_output_tokens, total_cost, response_count, duration_minutes
- [ ] Calculate duration from first to last entry timestamp for the session
- [ ] Handle empty sessions (no entries found) gracefully

**Build Verification**: Manual test with sample JSONL data

### Phase 3: Init Integration

**Scope**: Auto-install hooks during `plan-flow init` and add distributable assets
**Complexity**: 5/10

- [ ] Add hook scripts to distributable assets (`scripts/hooks/cost-tracker.cjs`, `scripts/hooks/session-summary.cjs`)
- [ ] Update `src/cli/handlers/claude.ts` (or shared handler) to:
  - Copy hook scripts to target project's `.claude/hooks/` directory
  - Register hooks in `.claude/settings.json` under the `hooks` key:
    ```json
    {
      "hooks": {
        "Stop": [{
          "hooks": [{
            "type": "command",
            "command": ".claude/hooks/cost-tracker.cjs",
            "async": true
          }]
        }],
        "SessionEnd": [{
          "hooks": [{
            "type": "command",
            "command": ".claude/hooks/session-summary.cjs"
          }]
        }]
      }
    }
    ```
  - Preserve existing hooks — merge, don't overwrite
- [ ] Handle `--force` flag to overwrite existing hook scripts
- [ ] Handle skip if hooks already registered

**Build Verification**: Run `npm run build` and test `node dist/cli/index.js init --claude` on a test directory

### Phase 4: Cost Reporting (`/flow cost`)

**Scope**: Add cost reporting subcommand to the `/flow` skill
**Complexity**: 4/10

- [ ] Read `~/.claude/metrics/costs.jsonl` and parse entries
- [ ] Support filters: `--today`, `--week`, `--month`, `--project <name>`, `--session <id>`
- [ ] Display summary table:
  ```
  Cost Report (last 7 days)

  | Project    | Sessions | Responses | Input Tokens | Output Tokens | Cost     |
  |------------|----------|-----------|--------------|---------------|----------|
  | parcels    | 12       | 145       | 1.2M         | 320K          | $12.45   |
  | plan-flow  | 8        | 92        | 890K         | 210K          | $8.72    |
  | Total      | 20       | 237       | 2.1M         | 530K          | $21.17   |
  ```
- [ ] Show model breakdown if `--detail` flag provided
- [ ] Update `.claude/commands/flow.md` to document the `cost` subcommand
- [ ] Add the reporting logic as a resource file in `.claude/resources/skills/flow-cost.md`

**Build Verification**: Manual test with sample JSONL data

### Phase 5: JSONL Rotation

**Scope**: Prevent unbounded growth of the metrics file
**Complexity**: 2/10

- [ ] Add rotation logic to `cost-tracker.cjs`:
  - Before appending, check file line count
  - If > 10,000 lines, rotate: move current file to `costs.{date}.jsonl`, start fresh
  - Keep last 3 rotated files, delete older ones
- [ ] Alternative: time-based rotation — entries older than 30 days are pruned on each write

**Build Verification**: Unit test with mock file

### Phase 6: Tests

**Scope**: Write comprehensive tests for hooks and init integration
**Complexity**: 4/10

- [ ] Unit tests for `cost-tracker.cjs`:
  - Parse transcript JSONL and extract usage from last assistant message
  - Calculate cost correctly for each model
  - Handle missing/malformed transcript gracefully
  - Handle missing usage fields gracefully
- [ ] Unit tests for `session-summary.cjs`:
  - Aggregate entries for a session
  - Handle empty session
  - Calculate duration
- [ ] Unit tests for init integration:
  - Hook scripts copied to `.claude/hooks/`
  - Settings.json updated with hook config
  - Existing hooks preserved on merge
- [ ] Unit tests for JSONL rotation:
  - Rotation triggers at threshold
  - Old files pruned correctly

**Build Verification**: Run `npm run build && npm run test`

## Key Changes

1. **New hook scripts**: `scripts/hooks/cost-tracker.cjs` and `scripts/hooks/session-summary.cjs` — core token tracking
2. **Init handler update**: Auto-install hooks during `plan-flow init --claude`
3. **Flow skill extension**: `/flow cost` subcommand for spend reporting
4. **Distributable assets**: Hook scripts included in npm package for installation

## Complexity Summary

| Phase | Name | Complexity |
|-------|------|------------|
| 1 | Cost Tracker Stop Hook | 4/10 |
| 2 | Session Summary Hook | 3/10 |
| 3 | Init Integration | 5/10 |
| 4 | Cost Reporting | 4/10 |
| 5 | JSONL Rotation | 2/10 |
| 6 | Tests | 4/10 |
| **Total** | **6 phases** | **Avg: 3.7/10** |
