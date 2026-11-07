import { describe, expect, it } from 'vitest';
import { formatJson } from '../../src/formatters/json';
import { formatSessionMessageHuman, STEER_QUEUED_NOTE, toSteerJson, type SteerView } from '../../src/formatters/session';

const steered: SteerView = { requested: true, source: 'flag', effective: true, outcome: 'steered', messageId: 'message-1' };
const queued: SteerView = { requested: true, source: 'env', effective: true, outcome: 'queued' };
const fallback: SteerView = {
  requested: true,
  source: 'config',
  effective: false,
  reason: 'the backend does not support Steer',
};
const plain: SteerView = { requested: false, source: 'default', effective: false };

describe('human output for send', () => {
  it('keeps the original output when no Steer setting is in play', () => {
    const output = formatSessionMessageHuman('Chat message sent', 's-1', { message: 'Queued' }, [['mode', 'Edit']], plain);

    expect(output).toBe('Chat message sent\nsessionId  s-1\nmessage    Queued\nmode       Edit\n');
    expect(output).not.toContain('steer');
  });

  it('shows the steer, effective, outcome, and message id rows when Steer was used', () => {
    const output = formatSessionMessageHuman('Chat message sent', 's-1', { message: 'Steered' }, [], steered);

    expect(output).toContain('steer      on (flag)');
    expect(output).toContain('effective  yes');
    expect(output).toContain('outcome    steered');
    expect(output).toContain('messageId  message-1');
    expect(output).not.toContain('reason');
    expect(output).not.toContain(STEER_QUEUED_NOTE);
  });

  it('adds the one-line queued note and does not claim the message is waiting', () => {
    const output = formatSessionMessageHuman('Chat message sent', 's-1', { message: 'Queued' }, [], queued);

    expect(output).toContain('outcome    queued');
    expect(output.endsWith(`${STEER_QUEUED_NOTE}\n`)).toBe(true);
    expect(output).toContain('No running task took the message, so it was sent as the next message.');
    expect(output.toLowerCase()).not.toContain('waiting');
  });

  it('shows the reason and no outcome when Steer was requested but a normal send was used', () => {
    const output = formatSessionMessageHuman('Chat message sent', 's-1', { message: 'Queued' }, [], fallback);

    expect(output).toContain('steer      on (config)');
    expect(output).toContain('effective  no');
    expect(output).toContain('reason     the backend does not support Steer');
    expect(output).not.toContain('outcome');
    expect(output).not.toContain(STEER_QUEUED_NOTE);
  });

  it('shows the off value and the flag source for an explicit --no-steer', () => {
    const output = formatSessionMessageHuman('Chat message sent', 's-1', { message: 'Queued' }, [], {
      requested: false,
      source: 'flag',
      effective: false,
    });

    expect(output).toContain('steer      off (flag)');
    expect(output).not.toContain('reason');
  });
});

describe('JSON steer object', () => {
  it('builds the steered object with outcome and message id and no reason', () => {
    expect(toSteerJson(steered)).toEqual({
      requested: true,
      source: 'flag',
      effective: true,
      outcome: 'steered',
      messageId: 'message-1',
    });
  });

  it('builds the queued object with outcome and no message id', () => {
    const json = toSteerJson(queued);

    expect(json).toEqual({ requested: true, source: 'env', effective: true, outcome: 'queued' });
    expect(Object.keys(json)).not.toContain('messageId');
    expect(Object.keys(json)).not.toContain('reason');
  });

  it('builds the fallback object with a reason and no outcome', () => {
    const json = toSteerJson(fallback);

    expect(json).toEqual({
      requested: true,
      source: 'config',
      effective: false,
      reason: 'the backend does not support Steer',
    });
    expect(Object.keys(json)).not.toContain('outcome');
  });

  it('builds the plain-send object with only the three required fields', () => {
    const json = toSteerJson(plain);

    expect(json).toEqual({ requested: false, source: 'default', effective: false });
    expect(Object.keys(json)).toEqual(['requested', 'source', 'effective']);
  });

  it('serializes the steer object into the --json output', () => {
    const output = JSON.parse(formatJson({ sessionId: 's-1', message: 'Steered', requested: {}, steer: toSteerJson(steered) }));

    expect(output.steer).toEqual({ requested: true, source: 'flag', effective: true, outcome: 'steered', messageId: 'message-1' });
    expect(Object.keys(output)).toEqual(['sessionId', 'message', 'requested', 'steer']);
  });
});
