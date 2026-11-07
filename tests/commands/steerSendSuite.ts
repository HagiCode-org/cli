import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Code, ConnectError } from '@connectrpc/connect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { PCode_Models_AIProviderType } from '../../src/generated/api/models/PCode_Models_AIProviderType';
import { PCode_Models_MessageMode } from '../../src/generated/api/models/PCode_Models_MessageMode';
import { EXIT_CODES } from '../../src/runtime/errors';
import { STEER_QUEUED_NOTE } from '../../src/formatters/session';
import { createDependencies } from './testHelpers';

/**
 * The shared case table for the Steer options of `chat send`, `proposal send`, and `hagitask send`. Each family runs the
 * same cases through its own command path, so the three commands cannot drift apart.
 */
export type SendFamily = {
  /** The command words, for example `['chat', 'send']`. */
  command: string[];
  sessionId: string;
  /** Label of the human output, for example `Chat message sent`. */
  label: string;
};

const EXECUTOR_TYPE = Object.values(PCode_Models_AIProviderType)[0];

export function runSteerSendSuite(family: SendFamily): void {
  describe(`${family.command.join(' ')} steer options`, () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'hagi-steer-send-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    /** Dependencies with the given environment and config file. The config file lives in a temporary XDG directory. */
    function setup(
      env: Record<string, string> = {},
      config?: string,
      apiOverrides: Parameters<typeof createDependencies>[0] = {},
    ) {
      if (config !== undefined) {
        mkdirSync(join(tempDir, 'hagi'), { recursive: true });
        writeFileSync(join(tempDir, 'hagi', 'config.json'), config, 'utf8');
      }

      const built = createDependencies(apiOverrides);
      built.dependencies.env = { ...built.dependencies.env, XDG_CONFIG_HOME: tempDir, ...env };
      return built;
    }

    /** Runs the command with the family's session id and content, plus any extra arguments. */
    function send(dependencies: ReturnType<typeof createDependencies>['dependencies'], extra: string[] = []): Promise<number> {
      return runCli(
        ['node', 'hagi', ...family.command, '--session-id', family.sessionId, '--content', 'hello', ...extra],
        dependencies,
      );
    }

    it('default send keeps the existing JSON fields and adds a default steer object', async () => {
      const { dependencies, api, stdout } = setup();

      expect(await send(dependencies, ['--json'])).toBe(0);

      expect(api.sendMessage).toHaveBeenCalledWith(family.sessionId, { content: 'hello', mode: undefined, executorType: undefined });
      expect(api.steerSession).not.toHaveBeenCalled();
      const output = JSON.parse(stdout.join(''));
      expect(Object.keys(output)).toEqual(['sessionId', 'message', 'requested', 'steer']);
      expect(output).toMatchObject({ sessionId: family.sessionId, message: 'Queued', requested: {} });
      expect(output.steer).toEqual({ requested: false, source: 'default', effective: false });
    });

    it('default human output has no steer rows', async () => {
      const { dependencies, stdout } = setup();

      expect(await send(dependencies)).toBe(0);

      expect(stdout.join('')).not.toContain('steer');
    });

    it('--steer makes one steerSession call and reports steered', async () => {
      const { dependencies, api, stdout } = setup();

      expect(await send(dependencies, ['--steer', '--json'])).toBe(0);

      expect(api.steerSession).toHaveBeenCalledTimes(1);
      expect(api.steerSession).toHaveBeenCalledWith(family.sessionId, { content: 'hello' });
      expect(api.sendMessage).not.toHaveBeenCalled();
      const output = JSON.parse(stdout.join(''));
      expect(output.message).toBe('Steered');
      expect(output.steer).toEqual({ requested: true, source: 'flag', effective: true, outcome: 'steered' });
    });

    it('--no-steer sends a normal message even when HAGI_SEND_STEER asks for Steer', async () => {
      const { dependencies, api, stdout } = setup({ HAGI_SEND_STEER: '1' });

      expect(await send(dependencies, ['--no-steer', '--json'])).toBe(0);

      expect(api.steerSession).not.toHaveBeenCalled();
      expect(api.sendMessage).toHaveBeenCalledTimes(1);
      expect(JSON.parse(stdout.join('')).steer).toEqual({ requested: false, source: 'flag', effective: false });
    });

    it('HAGI_SEND_STEER=1 turns Steer on with source env', async () => {
      const { dependencies, api, stdout } = setup({ HAGI_SEND_STEER: '1' });

      expect(await send(dependencies, ['--json'])).toBe(0);

      expect(api.steerSession).toHaveBeenCalledTimes(1);
      expect(api.sendMessage).not.toHaveBeenCalled();
      expect(JSON.parse(stdout.join('')).steer).toMatchObject({ requested: true, source: 'env', effective: true });
    });

    it('the steer config key turns Steer on with source config', async () => {
      const { dependencies, api, stdout } = setup({}, JSON.stringify({ steer: true }));

      expect(await send(dependencies, ['--json'])).toBe(0);

      expect(api.steerSession).toHaveBeenCalledTimes(1);
      expect(JSON.parse(stdout.join('')).steer).toMatchObject({ requested: true, source: 'config', effective: true });
    });

    it('the env value beats the config file in both directions', async () => {
      const envOff = setup({ HAGI_SEND_STEER: '0' }, JSON.stringify({ steer: true }));
      expect(await send(envOff.dependencies)).toBe(0);
      expect(envOff.api.steerSession).not.toHaveBeenCalled();
      expect(envOff.api.sendMessage).toHaveBeenCalledTimes(1);

      const envOn = setup({ HAGI_SEND_STEER: 'on' }, JSON.stringify({ steer: false }));
      expect(await send(envOn.dependencies)).toBe(0);
      expect(envOn.api.steerSession).toHaveBeenCalledTimes(1);
    });

    it('an invalid HAGI_SEND_STEER exits with code 2 and sends no request', async () => {
      const { dependencies, api, stderr } = setup({ HAGI_SEND_STEER: 'maybe' });

      expect(await send(dependencies)).toBe(EXIT_CODES.USAGE);

      expect(api.sendMessage).not.toHaveBeenCalled();
      expect(api.steerSession).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('HAGI_SEND_STEER');
    });

    it('a wrong-typed steer config value exits with code 2 and names the file', async () => {
      const { dependencies, api, stderr } = setup({}, JSON.stringify({ steer: 'yes' }));

      expect(await send(dependencies)).toBe(EXIT_CODES.USAGE);

      expect(api.sendMessage).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('config.json');
    });

    it('explicit --steer with --mode exits with code 2 and sends no request', async () => {
      const { dependencies, api, stderr } = setup();

      expect(await send(dependencies, ['--steer', '--mode', PCode_Models_MessageMode.EDIT])).toBe(EXIT_CODES.USAGE);

      expect(api.steerSession).not.toHaveBeenCalled();
      expect(api.sendMessage).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('--mode');
    });

    it('explicit --steer with --executor-type exits with code 2 and sends no request', async () => {
      const { dependencies, api, stderr } = setup();

      expect(await send(dependencies, ['--steer', '--executor-type', EXECUTOR_TYPE])).toBe(EXIT_CODES.USAGE);

      expect(api.steerSession).not.toHaveBeenCalled();
      expect(api.sendMessage).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('--executor-type');
    });

    it('implicit Steer with --mode falls back to a normal send that keeps the mode and states the reason', async () => {
      const { dependencies, api, stdout } = setup({ HAGI_SEND_STEER: '1' });

      expect(await send(dependencies, ['--mode', PCode_Models_MessageMode.EDIT, '--json'])).toBe(0);

      expect(api.steerSession).not.toHaveBeenCalled();
      expect(api.sendMessage).toHaveBeenCalledWith(family.sessionId, expect.objectContaining({ mode: PCode_Models_MessageMode.EDIT }));
      expect(JSON.parse(stdout.join('')).steer).toEqual({
        requested: true,
        source: 'env',
        effective: false,
        reason: '--mode cannot be combined with Steer',
      });
    });

    it('implicit Steer with --executor-type falls back to a normal send that keeps the executor', async () => {
      const { dependencies, api, stdout } = setup({}, JSON.stringify({ steer: true }));

      expect(await send(dependencies, ['--executor-type', EXECUTOR_TYPE, '--json'])).toBe(0);

      expect(api.steerSession).not.toHaveBeenCalled();
      expect(api.sendMessage).toHaveBeenCalledWith(family.sessionId, expect.objectContaining({ executorType: EXECUTOR_TYPE }));
      expect(JSON.parse(stdout.join('')).steer).toMatchObject({
        requested: true,
        source: 'config',
        effective: false,
        reason: '--executor-type cannot be combined with Steer',
      });
    });

    it('implicit Steer falls back when the backend does not implement SteerSession', async () => {
      const { dependencies, api, stdout } = setup({ HAGI_SEND_STEER: '1' }, undefined, {
        steerSession: vi.fn().mockRejectedValue(new ConnectError('not implemented', Code.Unimplemented)),
      });

      expect(await send(dependencies, ['--json'])).toBe(0);

      expect(api.steerSession).toHaveBeenCalledTimes(1);
      expect(api.sendMessage).toHaveBeenCalledTimes(1);
      expect(JSON.parse(stdout.join('')).steer).toMatchObject({
        requested: true,
        effective: false,
        reason: 'the backend does not support Steer',
      });
    });

    it('explicit --steer does not fall back when SteerSession is not implemented', async () => {
      const { dependencies, api } = setup({}, undefined, {
        steerSession: vi.fn().mockRejectedValue(new ConnectError('not implemented', Code.Unimplemented)),
      });

      expect(await send(dependencies, ['--steer'])).toBe(EXIT_CODES.HTTP_SERVER_ERROR);

      expect(api.steerSession).toHaveBeenCalledTimes(1);
      expect(api.sendMessage).not.toHaveBeenCalled();
    });

    it('a not-found error is reported with exit code 24 for an explicit Steer and is not turned into a normal send', async () => {
      const { dependencies, api } = setup({}, undefined, {
        steerSession: vi.fn().mockRejectedValue(new ConnectError('Session not found', Code.NotFound)),
      });

      expect(await send(dependencies, ['--steer'])).toBe(EXIT_CODES.HTTP_NOT_FOUND);
      expect(api.sendMessage).not.toHaveBeenCalled();
    });

    it('a not-found error from an implicit Steer is reported too and does not fall back', async () => {
      const { dependencies, api } = setup({ HAGI_SEND_STEER: '1' }, undefined, {
        steerSession: vi.fn().mockRejectedValue(new ConnectError('Session not found', Code.NotFound)),
      });

      expect(await send(dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
      expect(api.sendMessage).not.toHaveBeenCalled();
    });

    it('reports steered in the human output', async () => {
      const { dependencies, stdout } = setup();

      expect(await send(dependencies, ['--steer'])).toBe(0);

      const output = stdout.join('');
      expect(output.startsWith(`${family.label}\n`)).toBe(true);
      expect(output).toContain('outcome    steered');
      expect(output).toContain('effective  yes');
      expect(output).not.toContain(STEER_QUEUED_NOTE);
    });

    it('reports queued with exit code 0 in the human output and in JSON', async () => {
      const { dependencies, stdout } = setup({}, undefined, {
        steerSession: vi.fn().mockResolvedValue({ outcome: 'queued' }),
      });
      expect(await send(dependencies, ['--steer'])).toBe(0);
      expect(stdout.join('')).toContain('outcome    queued');
      expect(stdout.join('')).toContain(STEER_QUEUED_NOTE);

      const json = setup({}, undefined, { steerSession: vi.fn().mockResolvedValue({ outcome: 'queued' }) });
      expect(await send(json.dependencies, ['--steer', '--json'])).toBe(0);
      const output = JSON.parse(json.stdout.join(''));
      expect(output.message).toBe('Queued');
      expect(output.steer).toMatchObject({ outcome: 'queued', effective: true });
    });

    it('reports messageId in JSON when the backend returns one', async () => {
      const { dependencies, stdout } = setup({}, undefined, {
        steerSession: vi.fn().mockResolvedValue({ outcome: 'steered', messageId: 'message-9' }),
      });

      expect(await send(dependencies, ['--steer', '--json'])).toBe(0);

      expect(JSON.parse(stdout.join('')).steer).toMatchObject({ outcome: 'steered', messageId: 'message-9' });
    });
  });
}
