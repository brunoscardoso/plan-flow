/**
 * Tests for heartbeat daemon scheduling logic
 *
 * Tests the scheduling calculations without spawning actual processes.
 */

// We test the exported scheduling helpers by importing the parser
// and verifying schedule-to-interval logic.
// The daemon itself is a standalone script — we test its parser and
// scheduling math here.

import { parseSchedule, parseHeartbeatFile } from './heartbeat-parser.js';
import type { ScheduleConfig } from '../types.js';

describe('heartbeat daemon scheduling', () => {
  describe('msUntilNextOccurrence logic', () => {
    // This replicates the daemon's internal logic for testability

    function msUntilNextOccurrence(config: ScheduleConfig, now: Date): number {
      if (config.type === 'daily') {
        const target = new Date(now);
        target.setHours(config.hour!, config.minute!, 0, 0);
        if (target.getTime() <= now.getTime()) {
          target.setDate(target.getDate() + 1);
        }
        return target.getTime() - now.getTime();
      }

      if (config.type === 'weekly') {
        const target = new Date(now);
        const currentDay = now.getDay();
        let daysUntil = config.dayOfWeek! - currentDay;
        if (daysUntil < 0) daysUntil += 7;
        if (daysUntil === 0) {
          target.setHours(config.hour!, config.minute!, 0, 0);
          if (target.getTime() <= now.getTime()) {
            daysUntil = 7;
          }
        }
        target.setDate(now.getDate() + daysUntil);
        target.setHours(config.hour!, config.minute!, 0, 0);
        return target.getTime() - now.getTime();
      }

      return 0; // interval starts immediately
    }

    it('should calculate daily schedule for future time today', () => {
      // 9 AM today, schedule for 10 PM today
      const now = new Date('2026-03-06T09:00:00');
      const config = parseSchedule('daily at 10:00 PM')!;
      const ms = msUntilNextOccurrence(config, now);

      // 13 hours from 9 AM to 10 PM
      expect(ms).toBe(13 * 60 * 60 * 1000);
    });

    it('should calculate daily schedule for past time (next day)', () => {
      // 11 PM today, schedule for 10 PM — should be tomorrow
      const now = new Date('2026-03-06T23:00:00');
      const config = parseSchedule('daily at 10:00 PM')!;
      const ms = msUntilNextOccurrence(config, now);

      // 23 hours until 10 PM tomorrow
      expect(ms).toBe(23 * 60 * 60 * 1000);
    });

    it('should return 0 for interval schedules', () => {
      const config = parseSchedule('every 6 hours')!;
      const now = new Date();
      const ms = msUntilNextOccurrence(config, now);
      expect(ms).toBe(0);
    });

    it('should calculate weekly schedule for future day this week', () => {
      // Wednesday, schedule for Friday
      const now = new Date('2026-03-04T09:00:00'); // Wednesday
      const config = parseSchedule('weekly on friday at 5:00 PM')!;
      const ms = msUntilNextOccurrence(config, now);

      // 2 days + 8 hours
      const expected = (2 * 24 + 8) * 60 * 60 * 1000;
      expect(ms).toBe(expected);
    });

    it('should calculate weekly schedule for past day (next week)', () => {
      // Friday, schedule for Wednesday
      const now = new Date('2026-03-06T09:00:00'); // Friday
      const config = parseSchedule('weekly on wednesday at 9:00 AM')!;
      const ms = msUntilNextOccurrence(config, now);

      // 5 days
      const expected = 5 * 24 * 60 * 60 * 1000;
      expect(ms).toBe(expected);
    });
  });

  describe('task parsing integration', () => {
    it('should parse and schedule a complete heartbeat config', () => {
      const content = `# Heartbeat

## Tasks

### research
- **Schedule**: daily at 10:00 PM
- **Command**: research about AI and add to brain
- **Enabled**: true
- **Description**: Daily AI research

### check-issues
- **Schedule**: every 2 hours
- **Command**: check github issues
- **Enabled**: true
- **Description**: Monitor issues

### disabled-task
- **Schedule**: every 30 minutes
- **Command**: should not run
- **Enabled**: false
- **Description**: This is disabled
`;

      const tasks = parseHeartbeatFile(content);
      expect(tasks).toHaveLength(3);

      const enabledTasks = tasks.filter((t) => t.enabled);
      expect(enabledTasks).toHaveLength(2);

      const disabledTasks = tasks.filter((t) => !t.enabled);
      expect(disabledTasks).toHaveLength(1);
      expect(disabledTasks[0].name).toBe('disabled-task');
    });
  });
});
