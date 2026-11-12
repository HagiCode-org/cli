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
import { createDependencies, createMessageList, fakeWaitClock, sessionWithStatus } from './testHelpers';

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
    expect(messages?.options.map(option => option.long)).toEqual(expect.arrayContaining(['--session-id', '--last', '--json']));
  });

  it('is shared by proposal and hagitask, so both read the newest messages first', async () => {
    const proposal = createDependencies();
    const hagitask = createDependencies();

    await runCli(['node', 'hagi', 'proposal', 'messages', '--session-id', 's', '--last', '2'], proposal.dependencies);
    await runCli(['node', 'hagi', 'hagitask', 'messages', '--session-id', 's', '--last', '2'], hagitask.dependencies);

    expect(proposal.api.getSessionMessages).toHaveBeenCalledWith('s', { page: 1, pageSize: 2, order: 'desc' });
    expect(hagitask.api.getSessionMessages).toHaveBeenCalledWith('s', { page: 1, pageSize: 2, order: 'desc' });
  });

  it('prints the backend list unchanged as JSON', async () => {
    const list = createMessageList({ totalCount: 11 });
    const made = createDependencies({ getSessionMessages: vi.fn().mockResolvedValue(list) });

    await runCli(['node', 'hagi', 'proposal', 'messages', '--session-id', 's', '--json'], made.dependencies);

    expect(JSON.parse(made.stdout.join('')).totalCount).toBe(11);
  });
});
