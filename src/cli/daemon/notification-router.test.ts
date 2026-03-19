/**
 * Tests for notification-router — severity routing logic
 */

import { jest } from '@jest/globals';
import type { NotificationEvent } from '../types.js';

// Mock downstream modules before importing the router
const mockAppendLog = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockAppendEvent = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockSendDesktopNotification = jest.fn();

jest.unstable_mockModule('./log-writer.js', () => ({
  appendLog: mockAppendLog,
}));

jest.unstable_mockModule('./event-writer.js', () => ({
  appendEvent: mockAppendEvent,
}));

jest.unstable_mockModule('./desktop-notifier.js', () => ({
  sendDesktopNotification: mockSendDesktopNotification,
}));

// Import after mocks are set up
const { notify } = await import('./notification-router.js');

function makeEvent(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    id: 'test-id',
    timestamp: new Date('2026-03-17T14:30:00'),
    task: 'my-task',
    type: 'task_complete',
    level: 'info',
    message: 'All done',
    ...overrides,
  };
}

describe('notification-router', () => {
  const flowDir = '/tmp/test-flow';

  beforeEach(() => {
    mockAppendLog.mockClear();
    mockAppendEvent.mockClear();
    mockSendDesktopNotification.mockClear();
  });

  it('should always call appendLog and appendEvent for info events', async () => {
    const event = makeEvent({ level: 'info', type: 'task_complete' });

    await notify(event, flowDir);

    expect(mockAppendLog).toHaveBeenCalledTimes(1);
    expect(mockAppendLog).toHaveBeenCalledWith(flowDir, event);
    expect(mockAppendEvent).toHaveBeenCalledTimes(1);
    expect(mockAppendEvent).toHaveBeenCalledWith(flowDir, event);
  });

  it('should send desktop notification for task_complete events', async () => {
    const event = makeEvent({ level: 'info', type: 'task_complete' });

    await notify(event, flowDir);

    expect(mockSendDesktopNotification).toHaveBeenCalledTimes(1);
    expect(mockSendDesktopNotification).toHaveBeenCalledWith(event);
  });

  it('should NOT send desktop notification for warn-level task_started', async () => {
    const event = makeEvent({ level: 'warn', type: 'task_started' });

    await notify(event, flowDir);

    expect(mockSendDesktopNotification).not.toHaveBeenCalled();
  });

  it('should send desktop notification for error-level events', async () => {
    const event = makeEvent({ level: 'error', type: 'task_failed' });

    await notify(event, flowDir);

    expect(mockAppendLog).toHaveBeenCalledTimes(1);
    expect(mockAppendEvent).toHaveBeenCalledTimes(1);
    expect(mockSendDesktopNotification).toHaveBeenCalledTimes(1);
    expect(mockSendDesktopNotification).toHaveBeenCalledWith(event);
  });

  it('should send desktop notification for task_blocked events regardless of level', async () => {
    const event = makeEvent({ level: 'warn', type: 'task_blocked' });

    await notify(event, flowDir);

    expect(mockSendDesktopNotification).toHaveBeenCalledTimes(1);
    expect(mockSendDesktopNotification).toHaveBeenCalledWith(event);
  });

  it('should send desktop notification for error-level task_blocked events', async () => {
    const event = makeEvent({ level: 'error', type: 'task_blocked' });

    await notify(event, flowDir);

    expect(mockSendDesktopNotification).toHaveBeenCalledTimes(1);
  });

  it('should NOT send desktop notification for info-level phase_complete', async () => {
    const event = makeEvent({ level: 'info', type: 'phase_complete' });

    await notify(event, flowDir);

    expect(mockSendDesktopNotification).not.toHaveBeenCalled();
  });
});
