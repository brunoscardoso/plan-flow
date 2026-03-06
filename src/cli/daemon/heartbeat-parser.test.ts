/**
 * Tests for heartbeat file parser
 */

import { parseSchedule, parseHeartbeatFile } from './heartbeat-parser.js';

describe('parseSchedule', () => {
  it('should parse "daily at HH:MM AM"', () => {
    const result = parseSchedule('daily at 9:00 AM');
    expect(result).toEqual({ type: 'daily', hour: 9, minute: 0 });
  });

  it('should parse "daily at HH:MM PM"', () => {
    const result = parseSchedule('daily at 10:00 PM');
    expect(result).toEqual({ type: 'daily', hour: 22, minute: 0 });
  });

  it('should parse 12:00 PM as noon', () => {
    const result = parseSchedule('daily at 12:00 PM');
    expect(result).toEqual({ type: 'daily', hour: 12, minute: 0 });
  });

  it('should parse 12:00 AM as midnight', () => {
    const result = parseSchedule('daily at 12:00 AM');
    expect(result).toEqual({ type: 'daily', hour: 0, minute: 0 });
  });

  it('should parse "daily at H:MM PM" (single digit hour)', () => {
    const result = parseSchedule('daily at 1:30 PM');
    expect(result).toEqual({ type: 'daily', hour: 13, minute: 30 });
  });

  it('should parse "every N hours"', () => {
    const result = parseSchedule('every 6 hours');
    expect(result).toEqual({ type: 'interval', intervalMs: 6 * 60 * 60 * 1000 });
  });

  it('should parse "every 1 hour"', () => {
    const result = parseSchedule('every 1 hour');
    expect(result).toEqual({ type: 'interval', intervalMs: 60 * 60 * 1000 });
  });

  it('should parse "every N minutes"', () => {
    const result = parseSchedule('every 30 minutes');
    expect(result).toEqual({ type: 'interval', intervalMs: 30 * 60 * 1000 });
  });

  it('should parse "every 1 minute"', () => {
    const result = parseSchedule('every 1 minute');
    expect(result).toEqual({ type: 'interval', intervalMs: 60 * 1000 });
  });

  it('should parse "weekly on Day at HH:MM AM/PM"', () => {
    const result = parseSchedule('weekly on Monday at 9:00 AM');
    expect(result).toEqual({ type: 'weekly', hour: 9, minute: 0, dayOfWeek: 1 });
  });

  it('should parse weekly with different days', () => {
    expect(parseSchedule('weekly on sunday at 8:00 AM')).toEqual({ type: 'weekly', hour: 8, minute: 0, dayOfWeek: 0 });
    expect(parseSchedule('weekly on friday at 5:00 PM')).toEqual({ type: 'weekly', hour: 17, minute: 0, dayOfWeek: 5 });
    expect(parseSchedule('weekly on saturday at 10:30 AM')).toEqual({ type: 'weekly', hour: 10, minute: 30, dayOfWeek: 6 });
  });

  it('should be case-insensitive', () => {
    expect(parseSchedule('Daily At 9:00 AM')).toEqual({ type: 'daily', hour: 9, minute: 0 });
    expect(parseSchedule('EVERY 5 HOURS')).toEqual({ type: 'interval', intervalMs: 5 * 60 * 60 * 1000 });
    expect(parseSchedule('Weekly On MONDAY At 9:00 AM')).toEqual({ type: 'weekly', hour: 9, minute: 0, dayOfWeek: 1 });
  });

  it('should return null for invalid formats', () => {
    expect(parseSchedule('at 9:00 AM')).toBeNull();
    expect(parseSchedule('every day')).toBeNull();
    expect(parseSchedule('random text')).toBeNull();
    expect(parseSchedule('')).toBeNull();
  });

  it('should return null for invalid day names', () => {
    expect(parseSchedule('weekly on funday at 9:00 AM')).toBeNull();
  });
});

describe('parseHeartbeatFile', () => {
  it('should parse a valid heartbeat file with one task', () => {
    const content = `# Heartbeat

**Project**: [[my-project]]

## Tasks

### daily-research
- **Schedule**: daily at 10:00 PM
- **Command**: research about topic X and add to brain
- **Enabled**: true
- **Description**: Daily research task
`;

    const tasks = parseHeartbeatFile(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual({
      name: 'daily-research',
      schedule: 'daily at 10:00 PM',
      scheduleConfig: { type: 'daily', hour: 22, minute: 0 },
      command: 'research about topic X and add to brain',
      enabled: true,
      description: 'Daily research task',
    });
  });

  it('should parse multiple tasks', () => {
    const content = `# Heartbeat

## Tasks

### task-one
- **Schedule**: every 6 hours
- **Command**: check issues
- **Enabled**: true
- **Description**: Check for new issues

### task-two
- **Schedule**: weekly on Monday at 9:00 AM
- **Command**: generate report
- **Enabled**: false
- **Description**: Weekly summary
`;

    const tasks = parseHeartbeatFile(content);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].name).toBe('task-one');
    expect(tasks[0].scheduleConfig.type).toBe('interval');
    expect(tasks[0].enabled).toBe(true);
    expect(tasks[1].name).toBe('task-two');
    expect(tasks[1].scheduleConfig.type).toBe('weekly');
    expect(tasks[1].enabled).toBe(false);
  });

  it('should skip tasks with missing required fields', () => {
    const content = `## Tasks

### missing-schedule
- **Command**: do something
- **Enabled**: true

### missing-command
- **Schedule**: daily at 9:00 AM
- **Enabled**: true
`;

    const tasks = parseHeartbeatFile(content);
    expect(tasks).toHaveLength(0);
  });

  it('should skip tasks with invalid schedule syntax', () => {
    const content = `## Tasks

### bad-schedule
- **Schedule**: whenever I feel like it
- **Command**: do something
- **Enabled**: true
`;

    const tasks = parseHeartbeatFile(content);
    expect(tasks).toHaveLength(0);
  });

  it('should default enabled to true if not specified', () => {
    const content = `## Tasks

### no-enabled
- **Schedule**: every 30 minutes
- **Command**: check status
`;

    const tasks = parseHeartbeatFile(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].enabled).toBe(true);
  });

  it('should default description to empty string if not specified', () => {
    const content = `## Tasks

### no-desc
- **Schedule**: every 1 hour
- **Command**: ping server
- **Enabled**: true
`;

    const tasks = parseHeartbeatFile(content);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].description).toBe('');
  });

  it('should handle empty file', () => {
    const tasks = parseHeartbeatFile('');
    expect(tasks).toHaveLength(0);
  });

  it('should handle file with no tasks section', () => {
    const content = `# Heartbeat

**Project**: [[my-project]]
**Last Updated**: 2026-03-06

<!-- No tasks defined yet -->
`;

    const tasks = parseHeartbeatFile(content);
    expect(tasks).toHaveLength(0);
  });
});
