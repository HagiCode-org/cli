import { describe, expect, it } from 'vitest';
import { formatSessionMessagesHuman, formatSessionWaitLine } from '../../src/formatters/session';
import { createMessage, createMessageList } from '../commands/testHelpers';

describe('formatSessionMessagesHuman', () => {
  it('prints the text blocks of a text-only list', () => {
    const list = createMessageList({
      messages: [createMessage('m1', [{ type: 'Text', text: '## Commits Created\n**Commits:** 2' }])],
    });

    expect(formatSessionMessagesHuman(list)).toBe(
      'Messages (1 of 1)\n[2026-11-02T10:00:00Z] Assistant\n  ## Commits Created\n  **Commits:** 2\n',
    );
  });

  it('counts the blocks it does not print', () => {
    const list = createMessageList({
      messages: [
        createMessage('m1', [
          { type: 'ToolUse', id: 't1' },
          { type: 'Text', text: 'done' },
          { type: 'ToolResult', id: 't1' },
        ]),
      ],
    });

    const output = formatSessionMessagesHuman(list);
    expect(output).toContain('  done\n');
    expect(output).toContain('  (2 other blocks not shown)');
    expect(output).not.toContain('ToolUse');
  });

  it('reports an empty list', () => {
    expect(formatSessionMessagesHuman(createMessageList({ messages: [], totalCount: 0 }))).toBe('No messages found.\n');
  });
});

describe('formatSessionWaitLine', () => {
  const base = { settled: true, timedOut: false, transitionSeen: true, polls: 3, elapsedSeconds: 10 };

  it('says the status settled after a transition', () => {
    expect(formatSessionWaitLine(base, 'Reviewing')).toBe('wait: settled at Reviewing after 3 poll(s) in 10s; a status change was seen\n');
  });

  it('says no change was seen for a stable first status', () => {
    expect(formatSessionWaitLine({ ...base, transitionSeen: false }, 'Reviewing')).toContain('no status change was seen');
  });

  it('tells a person to answer for WaitingForReply', () => {
    expect(formatSessionWaitLine({ ...base, elapsedSeconds: 4 }, 'WaitingForReply')).toBe(
      'wait: settled at WaitingForReply after 4s; a person must answer\n',
    );
  });

  it('reports the status that is still running at the timeout', () => {
    expect(formatSessionWaitLine({ ...base, settled: false, timedOut: true, elapsedSeconds: 900 }, 'Executing')).toBe(
      'wait: timed out after 900s; status is still Executing\n',
    );
  });
});
