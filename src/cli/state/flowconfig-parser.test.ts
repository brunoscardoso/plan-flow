/**
 * Tests for flowconfig parser
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseFlowConfig } from './flowconfig-parser.js';

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'plan-flow-flowconfig-test-'));
}

describe('parseFlowConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return all defaults when no .flowconfig exists', () => {
    const config = parseFlowConfig(tempDir);
    expect(config).toEqual({
      autopilot: false,
      commit: false,
      push: false,
      pr: false,
      branch: '',
      wave_execution: true,
      phase_isolation: true,
      model_routing: false,
      max_verify_retries: 2,
      webhook_url: '',
      telegram_bot_token: '',
      telegram_chat_id: '',
    });
  });

  it('should parse a complete .flowconfig with all keys', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      [
        'autopilot: true',
        'commit: true',
        'push: true',
        'pr: false',
        'branch: feature/test',
        'wave_execution: false',
        'phase_isolation: false',
        'model_routing: true',
        'max_verify_retries: 4',
      ].join('\n'),
    );

    const config = parseFlowConfig(tempDir);
    expect(config).toEqual({
      autopilot: true,
      commit: true,
      push: true,
      pr: false,
      branch: 'feature/test',
      wave_execution: false,
      phase_isolation: false,
      model_routing: true,
      max_verify_retries: 4,
      webhook_url: '',
      telegram_bot_token: '',
      telegram_chat_id: '',
    });
  });

  it('should apply defaults for missing keys in partial .flowconfig', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'autopilot: true\ncommit: true\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.autopilot).toBe(true);
    expect(config.commit).toBe(true);
    expect(config.push).toBe(false);
    expect(config.branch).toBe('');
    expect(config.wave_execution).toBe(true);
    expect(config.phase_isolation).toBe(true);
    expect(config.model_routing).toBe(false);
    expect(config.max_verify_retries).toBe(2);
  });

  it('should use legacy .autopilot file when .flowconfig is absent', () => {
    writeFileSync(join(tempDir, '.autopilot'), '');

    const config = parseFlowConfig(tempDir);
    expect(config.autopilot).toBe(true);
  });

  it('should use legacy .autopilot file when autopilot key is absent from .flowconfig', () => {
    writeFileSync(join(tempDir, '.flowconfig'), 'commit: true\n');
    writeFileSync(join(tempDir, '.autopilot'), '');

    const config = parseFlowConfig(tempDir);
    expect(config.autopilot).toBe(true);
    expect(config.commit).toBe(true);
  });

  it('should use legacy .gitcontrol for git settings when .flowconfig is absent', () => {
    writeFileSync(
      join(tempDir, '.gitcontrol'),
      'commit: true\npush: true\nbranch: legacy-branch\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.commit).toBe(true);
    expect(config.push).toBe(true);
    expect(config.branch).toBe('legacy-branch');
  });

  it('should use legacy .gitcontrol fallback for missing git keys in .flowconfig', () => {
    writeFileSync(join(tempDir, '.flowconfig'), 'autopilot: false\n');
    writeFileSync(
      join(tempDir, '.gitcontrol'),
      'commit: true\npush: true\nbranch: from-gitcontrol\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.autopilot).toBe(false);
    expect(config.commit).toBe(true);
    expect(config.push).toBe(true);
    expect(config.branch).toBe('from-gitcontrol');
  });

  it('should handle corrupt .flowconfig content gracefully', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      '!!@#$%^&*()_corrupt_content_here\n\x00\x01\x02',
    );

    const config = parseFlowConfig(tempDir);
    // Should fall back to defaults for all unrecognized content
    expect(config.autopilot).toBe(false);
    expect(config.wave_execution).toBe(true);
  });

  it('should clamp max_verify_retries below minimum to 1', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'max_verify_retries: 0\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.max_verify_retries).toBe(1);
  });

  it('should clamp max_verify_retries above maximum to 5', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'max_verify_retries: 10\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.max_verify_retries).toBe(5);
  });

  it('should prefer .flowconfig values over legacy files', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'autopilot: false\ncommit: false\n',
    );
    writeFileSync(join(tempDir, '.autopilot'), '');
    writeFileSync(join(tempDir, '.gitcontrol'), 'commit: true\n');

    const config = parseFlowConfig(tempDir);
    expect(config.autopilot).toBe(false);
    expect(config.commit).toBe(false);
  });

  it('should handle empty .flowconfig file', () => {
    writeFileSync(join(tempDir, '.flowconfig'), '');

    const config = parseFlowConfig(tempDir);
    // All defaults
    expect(config.autopilot).toBe(false);
    expect(config.wave_execution).toBe(true);
    expect(config.phase_isolation).toBe(true);
  });

  it('should return pr: false by default when key is missing', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'autopilot: false\ncommit: false\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.pr).toBe(false);
  });

  it('should read pr: true from .flowconfig', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'commit: true\npush: true\npr: true\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.pr).toBe(true);
  });

  it('should auto-enable push and commit when pr is true', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'pr: true\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.pr).toBe(true);
    expect(config.push).toBe(true);
    expect(config.commit).toBe(true);
  });

  it('should not affect push/commit when pr is false', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'pr: false\ncommit: false\npush: false\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.pr).toBe(false);
    expect(config.push).toBe(false);
    expect(config.commit).toBe(false);
  });

  it('should return empty string for webhook_url by default', () => {
    const config = parseFlowConfig(tempDir);
    expect(config.webhook_url).toBe('');
  });

  it('should parse a single webhook_url from .flowconfig', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'webhook_url: https://hooks.slack.com/services/T00/B00/xxx\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.webhook_url).toBe('https://hooks.slack.com/services/T00/B00/xxx');
  });

  it('should parse comma-separated webhook URLs from .flowconfig', () => {
    const urls = 'https://hooks.slack.com/services/T00/B00/xxx,https://discord.com/api/webhooks/123/abc';
    writeFileSync(
      join(tempDir, '.flowconfig'),
      `webhook_url: ${urls}\n`,
    );

    const config = parseFlowConfig(tempDir);
    expect(config.webhook_url).toBe(urls);
  });

  it('should return empty webhook_url when key is missing from .flowconfig', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'autopilot: true\ncommit: false\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.webhook_url).toBe('');
  });

  // --- Telegram polling fields ---

  it('should parse telegram_bot_token from .flowconfig', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'telegram_bot_token: 123456:ABC-DEF\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.telegram_bot_token).toBe('123456:ABC-DEF');
  });

  it('should parse telegram_chat_id from .flowconfig', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'telegram_chat_id: -100987654\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.telegram_chat_id).toBe('-100987654');
  });

  it('should return empty strings for telegram fields when not in config', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'autopilot: false\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.telegram_bot_token).toBe('');
    expect(config.telegram_chat_id).toBe('');
  });

  it('should return empty telegram fields when no .flowconfig exists', () => {
    const config = parseFlowConfig(tempDir);
    expect(config.telegram_bot_token).toBe('');
    expect(config.telegram_chat_id).toBe('');
  });

  it('should auto-migrate: extract bot token from Telegram webhook_url', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'webhook_url: https://api.telegram.org/bot123456:ABC-DEF/sendMessage?chat_id=-100999\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.telegram_bot_token).toBe('123456:ABC-DEF');
  });

  it('should auto-migrate: extract chat_id from Telegram webhook_url query params', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'webhook_url: https://api.telegram.org/bot123456:ABC-DEF/sendMessage?chat_id=-100999\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.telegram_chat_id).toBe('-100999');
  });

  it('should auto-migrate: NOT overwrite explicitly set telegram_bot_token', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      [
        'webhook_url: https://api.telegram.org/botOLD:TOKEN/sendMessage?chat_id=-111',
        'telegram_bot_token: EXPLICIT:TOKEN',
        'telegram_chat_id: -222',
      ].join('\n'),
    );

    const config = parseFlowConfig(tempDir);
    expect(config.telegram_bot_token).toBe('EXPLICIT:TOKEN');
    expect(config.telegram_chat_id).toBe('-222');
  });

  it('should NOT auto-migrate from non-Telegram webhook_url', () => {
    writeFileSync(
      join(tempDir, '.flowconfig'),
      'webhook_url: https://hooks.slack.com/services/T00/B00/xxx\n',
    );

    const config = parseFlowConfig(tempDir);
    expect(config.telegram_bot_token).toBe('');
    expect(config.telegram_chat_id).toBe('');
  });
});
