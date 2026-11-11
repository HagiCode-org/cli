import { describe, expect, it } from 'vitest';
import { formatSessionMessagesHuman, formatSessionSummaryHuman, formatSessionWaitLine, toSessionView } from '../../src/formatters/session';
import { PCode_Models_SessionStatus } from '../../src/generated/api/models/PCode_Models_SessionStatus';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { createMessage, createMessageList, createSession } from '../commands/testHelpers';

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

describe('userMetadata in session views', () => {
  const session = createSession('session-1', PCode_Models_SessionType.CHAT);

  it('leaves userMetadata out of the view when the session has no entries', () => {
    const view = toSessionView(session);
    expect(view).not.toHaveProperty('userMetadata');
    expect(toSessionView({ ...session, userMetadata: {} })).toEqual(view);
    expect(toSessionView({ ...session, userMetadata: null })).toEqual(view);
  });

  it('keeps the view identical to the snapshot for a session without metadata', () => {
    expect(JSON.stringify(toSessionView(session), null, 2)).toBe(JSON.stringify({
      sessionId: 'session-1',
      title: 'CLI chat session',
      type: PCode_Models_SessionType.CHAT,
      status: PCode_Models_SessionStatus.DRAFTING,
      projectId: 'project-1',
      archived: false,
      lastActiveAt: '2026-03-30T00:00:00Z',
      enableIndependentWorkspace: false,
      baseBranch: 'main',
    }, null, 2));
  });

  it('sets userMetadata when the session has entries', () => {
    expect(toSessionView({ ...session, userMetadata: { role: 'worker' } }).userMetadata).toEqual({ role: 'worker' });
  });

  it('shows userMetadata in the JSON view', () => {
    const json = JSON.parse(JSON.stringify(toSessionView({ ...session, userMetadata: { role: 'worker', batch: '2' } })));
    expect(json.userMetadata).toEqual({ role: 'worker', batch: '2' });
  });

  it('adds one userMetadata line to the human summary, keys sorted, only when present', () => {
    const withMetadata = formatSessionSummaryHuman(toSessionView({ ...session, userMetadata: { role: 'master', batch: '3' } }));
    const lines = withMetadata.split('\n').filter(line => line.startsWith('userMetadata'));
    expect(lines.map(line => line.replace(/\s+/g, ' '))).toEqual(['userMetadata batch=3, role=master']);
    expect(withMetadata.indexOf('userMetadata')).toBeGreaterThan(withMetadata.indexOf('metadata'));

    const without = formatSessionSummaryHuman(toSessionView(session));
    expect(without).not.toContain('userMetadata');
    expect(formatSessionSummaryHuman(toSessionView({ ...session, userMetadata: {} }))).toBe(without);
  });
});

describe('chatHero in session views', () => {
  const session = createSession('session-1', PCode_Models_SessionType.CHAT);
  const withHero = { ...session, chatHero: { heroId: 'hero-1', name: 'Nova' } };

  it('leaves chatHero out of the view when the response has none', () => {
    expect(toSessionView(session)).not.toHaveProperty('chatHero');
    expect(toSessionView({ ...session, chatHero: undefined })).not.toHaveProperty('chatHero');
  });

  it('leaves chatHero out of the view when the response carries an empty heroId', () => {
    expect(toSessionView({ ...session, chatHero: { heroId: '', name: 'Nova' } })).not.toHaveProperty('chatHero');
  });

  it('sets chatHero from the response when it names a Hero', () => {
    expect(toSessionView(withHero).chatHero).toEqual({ heroId: 'hero-1', name: 'Nova' });
  });

  it('shows chatHero in the JSON view', () => {
    const json = JSON.parse(JSON.stringify(toSessionView(withHero)));
    expect(json.chatHero).toEqual({ heroId: 'hero-1', name: 'Nova' });
  });

  it('adds one chatHero line to the human summary only when a Hero is bound', () => {
    const summary = formatSessionSummaryHuman(toSessionView(withHero));
    const lines = summary.split('\n').filter(line => line.startsWith('chatHero'));
    expect(lines.map(line => line.replace(/\s+/g, ' '))).toEqual(['chatHero Nova (hero-1)']);

    const without = formatSessionSummaryHuman(toSessionView(session));
    expect(without).not.toContain('chatHero');
  });
});
