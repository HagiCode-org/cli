import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command, Option } from 'commander';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliUsageError } from '../../src/runtime/errors';
import { resolveSteerSetting } from '../../src/runtime/sendSteer';

describe('resolveSteerSetting', () => {
  let configHome: string;

  beforeEach(() => {
    configHome = mkdtempSync(join(tmpdir(), 'hagi-steer-config-'));
  });

  afterEach(() => {
    rmSync(configHome, { recursive: true, force: true });
  });

  function writeConfig(content: string): void {
    mkdirSync(join(configHome, 'hagi'), { recursive: true });
    writeFileSync(join(configHome, 'hagi', 'config.json'), content, 'utf8');
  }

  /** An environment that points config lookups at the temporary directory, plus any extra variables. */
  function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
    return { XDG_CONFIG_HOME: configHome, ...extra };
  }

  describe('single sources', () => {
    it('uses the default false when no source is set', () => {
      expect(resolveSteerSetting({ env: env() })).toEqual({ requested: false, source: 'default' });
    });

    it('uses the flag when it is true or false', () => {
      expect(resolveSteerSetting({ flag: true, env: env() })).toEqual({ requested: true, source: 'flag' });
      expect(resolveSteerSetting({ flag: false, env: env() })).toEqual({ requested: false, source: 'flag' });
    });

    it('uses HAGI_SEND_STEER when no flag is given', () => {
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: '1' }) })).toEqual({ requested: true, source: 'env' });
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: '0' }) })).toEqual({ requested: false, source: 'env' });
    });

    it('uses the steer key of the config file when neither flag nor env is set', () => {
      writeConfig(JSON.stringify({ steer: true }));
      expect(resolveSteerSetting({ env: env() })).toEqual({ requested: true, source: 'config' });

      writeConfig(JSON.stringify({ steer: false }));
      expect(resolveSteerSetting({ env: env() })).toEqual({ requested: false, source: 'config' });
    });
  });

  describe('precedence', () => {
    it('lets the flag beat env and config, in either direction', () => {
      writeConfig(JSON.stringify({ steer: true }));
      expect(resolveSteerSetting({ flag: false, env: env({ HAGI_SEND_STEER: '1' }) })).toEqual({ requested: false, source: 'flag' });
      expect(resolveSteerSetting({ flag: true, env: env({ HAGI_SEND_STEER: '0' }) })).toEqual({ requested: true, source: 'flag' });
    });

    it('lets env beat config, in either direction', () => {
      writeConfig(JSON.stringify({ steer: false }));
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: 'on' }) })).toEqual({ requested: true, source: 'env' });

      writeConfig(JSON.stringify({ steer: true }));
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: 'off' }) })).toEqual({ requested: false, source: 'env' });
    });

    it('lets the flag beat env even when config also disagrees', () => {
      writeConfig(JSON.stringify({ steer: false }));
      expect(resolveSteerSetting({ flag: true, env: env({ HAGI_SEND_STEER: '0' }) })).toEqual({ requested: true, source: 'flag' });
    });

    it('treats a blank env value as not set', () => {
      writeConfig(JSON.stringify({ steer: true }));
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: '   ' }) })).toEqual({ requested: true, source: 'config' });
    });
  });

  describe('HAGI_SEND_STEER spellings', () => {
    it.each(['1', 'true', 'yes', 'on'])('reads %j as true', value => {
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: value }) })).toEqual({ requested: true, source: 'env' });
    });

    it.each(['0', 'false', 'no', 'off'])('reads %j as false', value => {
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: value }) })).toEqual({ requested: false, source: 'env' });
    });

    it('ignores case and surrounding spaces', () => {
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: '  TRUE  ' }) })).toEqual({ requested: true, source: 'env' });
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: 'On' }) })).toEqual({ requested: true, source: 'env' });
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: ' Off ' }) })).toEqual({ requested: false, source: 'env' });
    });

    it('rejects an unrecognized value with a usage error that names the variable and the accepted values', () => {
      let thrown: unknown;
      try {
        resolveSteerSetting({ env: env({ HAGI_SEND_STEER: 'maybe' }) });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(CliUsageError);
      expect((thrown as Error).message).toContain('HAGI_SEND_STEER');
      expect((thrown as Error).message).toContain('maybe');
      expect((thrown as Error).message).toContain('true');
      expect((thrown as Error).message).toContain('off');
    });
  });

  describe('config file steer key', () => {
    it('reports a missing config file as not set, so the default applies', () => {
      expect(resolveSteerSetting({ env: env() })).toEqual({ requested: false, source: 'default' });
    });

    it('reports a config file without a steer key as not set', () => {
      writeConfig(JSON.stringify({ baseUrl: 'https://backend.example' }));
      expect(resolveSteerSetting({ env: env() })).toEqual({ requested: false, source: 'default' });
    });

    it.each([['"yes"', '"yes"'], ['1', '1'], ['null', 'null']])('rejects a non-boolean steer value %s with a usage error naming the file', (_label, literal) => {
      writeConfig(`{"steer": ${literal}}`);

      expect(() => resolveSteerSetting({ env: env() })).toThrow(CliUsageError);
      expect(() => resolveSteerSetting({ env: env() })).toThrow(/config\.json/);
    });
  });

  describe('laziness', () => {
    it('does not read a malformed config file when the flag decides', () => {
      writeConfig('{not json');
      expect(resolveSteerSetting({ flag: true, env: env() })).toEqual({ requested: true, source: 'flag' });
      expect(resolveSteerSetting({ flag: false, env: env() })).toEqual({ requested: false, source: 'flag' });
    });

    it('does not read a malformed config file when env decides', () => {
      writeConfig('{not json');
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: '1' }) })).toEqual({ requested: true, source: 'env' });
    });

    it('does not validate an invalid env value when the flag decides', () => {
      expect(resolveSteerSetting({ flag: false, env: env({ HAGI_SEND_STEER: 'maybe' }) })).toEqual({ requested: false, source: 'flag' });
      expect(resolveSteerSetting({ flag: true, env: env({ HAGI_SEND_STEER: 'maybe' }) })).toEqual({ requested: true, source: 'flag' });
    });

    it('does not validate a wrong-typed config value when env or the flag decides', () => {
      writeConfig(JSON.stringify({ steer: 'yes' }));
      expect(resolveSteerSetting({ flag: false, env: env() })).toEqual({ requested: false, source: 'flag' });
      expect(resolveSteerSetting({ env: env({ HAGI_SEND_STEER: 'on' }) })).toEqual({ requested: true, source: 'env' });
    });

    it('does read the malformed config file when neither flag nor env decides', () => {
      writeConfig('{not json');
      expect(() => resolveSteerSetting({ env: env() })).toThrow(CliUsageError);
    });
  });
});

describe('--steer / --no-steer option pair', () => {
  /** Builds the same option pair the send commands register, in the same order, and returns the parsed `steer` value. */
  function parseSteer(args: string[]): boolean | undefined {
    const command = new Command()
      .exitOverride()
      .addOption(new Option('--steer', 'Deliver as Steer.'))
      .addOption(new Option('--no-steer', 'Send as a normal message.'));
    command.parse(args, { from: 'user' });
    return command.opts<{ steer?: boolean }>().steer;
  }

  it('yields undefined when neither option is passed', () => {
    expect(parseSteer([])).toBeUndefined();
  });

  it('yields true for --steer', () => {
    expect(parseSteer(['--steer'])).toBe(true);
  });

  it('yields false for --no-steer', () => {
    expect(parseSteer(['--no-steer'])).toBe(false);
  });
});
