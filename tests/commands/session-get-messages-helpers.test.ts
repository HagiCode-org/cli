import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';
import {
  parseSessionWaitOptions,
  registerSessionGetCommand,
  type SessionGetOptions,
} from '../../src/commands/session/sessionGet';
import { parseLastOption, registerSessionMessagesCommand } from '../../src/commands/session/sessionMessages';
import { EXIT_CODES } from '../../src/runtime/errors';
import { DEFAULT_WAIT_GRACE_SECONDS, DEFAULT_WAIT_INTERVAL_SECONDS, DEFAULT_WAIT_TIMEOUT_SECONDS } from '../../src/runtime/sessionWait';
import { runCli } from '../../src/main';
import { CliUsageError } from '../../src/runtime/errors';
import { createDependencies, createMessage, createMessageList, fakeWaitClock, sessionWithStatus } from './testHelpers';

const base: SessionGetOptions = { sessionId: 's-1' };

describe('parseSessionWaitOptions', () => {
  it('returns undefined without --wait and no wait-only option', () => {
    expect(parseSessionWaitOptions({ ...base })).toBeUndefined();
    expect(parseSessionWaitOptions({ ...base, wait: false })).toBeUndefined();
  });

  it('fills the defaults when only --wait is given', () => {
    expect(parseSessionWaitOptions({ ...base, wait: true })).toEqual({
      timeoutSeconds: DEFAULT_WAIT_TIMEOUT_SECONDS,
      intervalSeconds: DEFAULT_WAIT_INTERVAL_SECONDS,
      graceSeconds: DEFAULT_WAIT_GRACE_SECONDS,
    });
  });

  it('parses explicit numbers, with surrounding whitespace', () => {
    expect(parseSessionWaitOptions({ ...base, wait: true, timeout: ' 90 ', interval: '3', grace: ' 7' })).toEqual({
      timeoutSeconds: 90,
      intervalSeconds: 3,
      graceSeconds: 7,
    });
  });

  it('allows a grace of zero, which turns the grace off', () => {
    expect(parseSessionWaitOptions({ ...base, wait: true, grace: '0' })?.graceSeconds).toBe(0);
  });

  it.each([
    [{ timeout: '5' }, '--timeout needs --wait.'],
    [{ interval: '5' }, '--interval needs --wait.'],
    [{ grace: '5' }, '--grace needs --wait.'],
    [{ timeout: '5', grace: '1' }, '--timeout, --grace needs --wait.'],
    [{ timeout: '5', interval: '1', grace: '1' }, '--timeout, --interval, --grace needs --wait.'],
  ])('rejects wait-only options %j without --wait', (extra, message) => {
    expect(() => parseSessionWaitOptions({ ...base, ...extra })).toThrow(new CliUsageError(message));
  });

  it.each([
    [{ timeout: 'abc' }, '--timeout must be a whole number of seconds.'],
    [{ timeout: '1.5' }, '--timeout must be a whole number of seconds.'],
    [{ timeout: '-1' }, '--timeout must be a whole number of seconds.'],
    [{ timeout: '' }, '--timeout must be a whole number of seconds.'],
    [{ timeout: '0' }, '--timeout must be 1 second or more.'],
    [{ interval: '0', timeout: '30' }, '--interval must be 1 second or more.'],
    [{ interval: 'x', timeout: '30' }, '--interval must be a whole number of seconds.'],
    [{ grace: '-1' }, '--grace must be a whole number of seconds.'],
    [{ grace: '1e3' }, '--grace must be a whole number of seconds.'],
  ])('rejects the bad value %j with --wait', (extra, message) => {
    expect(() => parseSessionWaitOptions({ ...base, wait: true, ...extra })).toThrow(message);
  });

  it('needs the interval to be less than the timeout', () => {
    expect(() => parseSessionWaitOptions({ ...base, wait: true, timeout: '10', interval: '10' })).toThrow('--interval must be less than --timeout.');
    expect(() => parseSessionWaitOptions({ ...base, wait: true, timeout: '10', interval: '11' })).toThrow('--interval must be less than --timeout.');
    expect(parseSessionWaitOptions({ ...base, wait: true, timeout: '10', interval: '9' })?.intervalSeconds).toBe(9);
  });

  it('checks the default interval against an explicit short timeout', () => {
    expect(() => parseSessionWaitOptions({ ...base, wait: true, timeout: String(DEFAULT_WAIT_INTERVAL_SECONDS) })).toThrow(
      '--interval must be less than --timeout.',
    );
  });
});

describe('parseLastOption', () => {
  it('is undefined when --last was not given', () => {
    expect(parseLastOption(undefined)).toBeUndefined();
  });

  it('parses a positive whole number, trimmed', () => {
    expect(parseLastOption('1')).toBe(1);
    expect(parseLastOption(' 25 ')).toBe(25);
  });

  it.each(['0', '-1', '1.5', 'abc', '', '  ', '1e2', '+3'])('rejects %j', raw => {
    expect(() => parseLastOption(raw)).toThrow(new CliUsageError('--last must be a positive whole number.'));
  });
});

describe('registerSessionGetCommand with a custom label', () => {
  function makeProgram(label: string) {
    const made = createDependencies();
    Object.assign(made.dependencies, fakeWaitClock());
    const program = new Command('hagi').exitOverride();
    const group = program.command('thing');
    registerSessionGetCommand(group, made.dependencies, { description: 'Read one thing.', label });
    return { ...made, program, group };
  }

  it('registers a get command with the given description and wait options', () => {
    const { group } = makeProgram('Thing');
    const get = group.commands.find(command => command.name() === 'get');

    expect(get?.description()).toBe('Read one thing.');
    expect(get?.options.map(option => option.long)).toEqual(expect.arrayContaining(['--session-id', '--wait', '--timeout', '--interval', '--grace', '--json']));
  });

  it('names the label in the timeout message', async () => {
    const made = createDependencies();
    Object.assign(made.dependencies, fakeWaitClock());
    vi.mocked(made.api.getSession).mockResolvedValue(sessionWithStatus('s-1', 'Executing') as never);
    // Use the real CLI tree, whose hagitask group registers this helper with the label "HagiTask session".
    const exitCode = await runCli(['node', 'hagi', 'hagitask', 'get', '--session-id', 's-1', '--wait', '--timeout', '4', '--interval', '2'], made.dependencies);

    expect(exitCode).toBe(EXIT_CODES.WAIT_TIMEOUT);
    expect(made.stderr.join('')).toContain('HagiTask session s-1');
  });
});

describe('registerSessionMessagesCommand', () => {
  it('registers a messages command with the given description and options', () => {
    const made = createDependencies();
    const group = new Command('thing');
    registerSessionMessagesCommand(group, made.dependencies, { description: 'Read messages.' });
    const messages = group.commands.find(command => command.name() === 'messages');

    expect(messages?.description()).toBe('Read messages.');
    expect(messages?.options.map(option => option.long)).toEqual(expect.arrayContaining(['--session-id', '--last', '--page', '--page-size', '--order', '--json']));
  });
});

describe.each(['proposal', 'hagitask', 'chat'])('%s shared message paging', family => {
  const messages = (...args: string[]) => ['node', 'hagi', family, 'messages', '--session-id', 's', ...args];

  it.each([
    [[], { page: 1, order: 'desc' }],
    [['--last', '2'], { page: 1, pageSize: 2, order: 'desc' }],
    [['--page', ' 3 ', '--page-size', '50', '--order', 'desc'], { page: 3, pageSize: 50, order: 'desc' }],
    [['--page', '1', '--page-size', '100', '--order', 'asc'], { page: 1, pageSize: 100, order: 'asc' }],
    [['--page', '2'], { page: 2, order: 'desc' }],
    [['--page-size', '25'], { page: 1, pageSize: 25, order: 'desc' }],
    [['--order', 'asc'], { page: 1, order: 'asc' }],
    [['--page', String(Number.MAX_SAFE_INTEGER), '--page-size', String(Number.MAX_SAFE_INTEGER)], {
      page: Number.MAX_SAFE_INTEGER, pageSize: Number.MAX_SAFE_INTEGER, order: 'desc',
    }],
  ])('forwards %j without changing defaults or fetching extra pages', async (flags, request) => {
    const made = createDependencies();

    expect(await runCli(messages(...flags), made.dependencies)).toBe(0);
    expect(made.api.getSessionMessages).toHaveBeenCalledExactlyOnceWith('s', request);
  });

  it.each([
    [[], { page: 1, pageSize: 50, totalPages: 19 }],
    [['--last', '500'], { page: 1, pageSize: 200, totalPages: 5 }],
    [['--page', '2', '--page-size', '500'], { page: 2, pageSize: 200, totalPages: 5 }],
    [['--page', '1', '--page-size', '100', '--order', 'asc'], { page: 1, pageSize: 100, totalPages: 10 }],
  ])('prints returned message order, JSON and clamping metadata unchanged for %j', async (flags, metadata) => {
    const list = {
      ...createMessageList({
        totalCount: 950,
        messages: [
          createMessage('m-1', [{ type: 'Text', text: 'First returned message' }]),
          createMessage('m-2', [{ type: 'Text', text: 'Second returned message' }]),
        ],
      }),
      ...metadata,
    };
    const made = createDependencies({ getSessionMessages: vi.fn().mockResolvedValue(list) });

    expect(await runCli(messages(...flags, '--json'), made.dependencies)).toBe(0);
    expect(JSON.parse(made.stdout.join(''))).toEqual(list);
    expect(made.api.getSessionMessages).toHaveBeenCalledTimes(1);
  });

  describe.each(['--page', '--page-size'])('%s validation', flag => {
    it.each(['0', '-1', '1.5', 'abc', '', '  ', '1e2', '+3', 'Infinity', '9007199254740992', '999999999999999999999999999999'])('rejects %j before I/O', async raw => {
      const made = createDependencies();

      expect(await runCli(messages(flag, raw), made.dependencies)).toBe(EXIT_CODES.USAGE);
      expect(made.stderr.join('')).toContain(`${flag} must be a positive safe integer.`);
      for (const method of Object.values(made.api)) expect(method).not.toHaveBeenCalled();
    });
  });

  it.each(['ASC', 'Desc', 'newest', '', ' asc '])('rejects --order %j before I/O', async raw => {
    const made = createDependencies();

    expect(await runCli(messages('--order', raw), made.dependencies)).toBe(EXIT_CODES.USAGE);
    expect(made.stderr.join('')).toContain('--order must be asc or desc.');
    for (const method of Object.values(made.api)) expect(method).not.toHaveBeenCalled();
  });

  it.each([['--page', '1'], ['--page-size', '50'], ['--order', 'desc']])('rejects --last with explicit default %s %s before I/O', async (flag, value) => {
    const made = createDependencies();

    expect(await runCli(messages('--last', '1', flag, value), made.dependencies)).toBe(EXIT_CODES.USAGE);
    expect(made.stderr.join('')).toContain('mutually exclusive');
    expect(made.stderr.join('')).toContain(flag);
    for (const method of Object.values(made.api)) expect(method).not.toHaveBeenCalled();
  });
});
