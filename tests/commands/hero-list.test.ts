import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { createDependencies } from './testHelpers';

const HEROES = [
  { id: 'hero-enabled', name: 'Nova', executorType: 'CodexCli', isEnabled: true, isBuiltIn: false, isReadOnly: false },
  { id: 'hero-disabled', name: 'Dormant', executorType: 'ClaudeCodeCli', isEnabled: false, isBuiltIn: false, isReadOnly: false },
  { id: 'hero-built-in', name: 'Builtin', executorType: 'ClaudeCodeCli', isEnabled: true, isBuiltIn: true, isReadOnly: false },
  { id: 'hero-read-only', name: 'Locked', executorType: 'ClaudeCodeCli', isEnabled: true, isBuiltIn: false, isReadOnly: true },
];

describe('hero list command', () => {
  it('prints only the heroes a chat can bind, in json', async () => {
    const created = createDependencies({ listHeroes: vi.fn().mockResolvedValue(HEROES) });
    const { api, stdout } = created;

    expect(await runCli(['node', 'hagi', 'hero', 'list', '--json'], created.dependencies)).toBe(0);
    expect(api.listHeroes).toHaveBeenCalledOnce();
    expect(JSON.parse(stdout.join(''))).toEqual({
      heroes: [{ heroId: 'hero-enabled', name: 'Nova', executorType: 'CodexCli' }],
    });
  });

  it('prints one line per bindable hero in human mode', async () => {
    const created = createDependencies({ listHeroes: vi.fn().mockResolvedValue(HEROES) });
    const { stdout } = created;

    expect(await runCli(['node', 'hagi', 'hero', 'list'], created.dependencies)).toBe(0);
    expect(stdout.join('')).toBe('Nova  hero-enabled  CodexCli\n');
  });

  it('says so when no hero can run a chat', async () => {
    const created = createDependencies({ listHeroes: vi.fn().mockResolvedValue([]) });
    const { stdout } = created;

    expect(await runCli(['node', 'hagi', 'hero', 'list', '--json'], created.dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ heroes: [] });
  });
});
