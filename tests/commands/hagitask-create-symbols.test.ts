import { describe, expect, it } from 'vitest';
import { liftScopeFromInput } from '../../src/commands/hagitask/create';
import { CliUsageError } from '../../src/runtime/errors';

describe('liftScopeFromInput (src/commands/hagitask/create.ts)', () => {
  it('returns an undefined input unchanged and without a scope', () => {
    expect(liftScopeFromInput(undefined, [])).toEqual({ presetTaskInput: undefined });
    expect(liftScopeFromInput(undefined, ['--repository'])).toEqual({ presetTaskInput: undefined });
  });

  it('returns the same input object when it has no scope key', () => {
    const input = { inputs: { a: 1 } };
    const result = liftScopeFromInput(input, []);

    expect(result.presetTaskInput).toBe(input);
    expect(result).not.toHaveProperty('scope');
  });

  it('does not reject scope flags when the input has no scope key', () => {
    const input = { inputs: {} };

    expect(liftScopeFromInput(input, ['--repository', '--project'])).toEqual({ presetTaskInput: input });
  });

  it('lifts a top-level scope object out and keeps the rest as the preset input', () => {
    const scope = { allRepositories: ['sel-1'] };
    const result = liftScopeFromInput({ scope, inputs: { goal: 'ship' }, flag: true }, []);

    expect(result.scope).toBe(scope);
    expect(result.presetTaskInput).toEqual({ inputs: { goal: 'ship' }, flag: true });
  });

  it('leaves an empty preset input behind when scope was the only key', () => {
    expect(liftScopeFromInput({ scope: {} }, [])).toEqual({ presetTaskInput: {}, scope: {} });
  });

  it('does not mutate the original input object', () => {
    const input = { scope: { projects: [] }, inputs: {} };
    liftScopeFromInput(input, []);

    expect(Object.keys(input)).toEqual(['scope', 'inputs']);
  });

  it('treats an inherited scope as absent and only honours an own scope key', () => {
    const input = Object.create({ scope: { inherited: true } }) as Record<string, unknown>;
    input.inputs = {};

    expect(liftScopeFromInput(input, ['--repository'])).toEqual({ presetTaskInput: input });
  });

  it('refuses a scope flag together with a scope key, naming the first flag and all of them', () => {
    const error = (() => {
      try {
        liftScopeFromInput({ scope: {} }, ['--repository', '--project']);
      } catch (caught) {
        return caught;
      }
      return undefined;
    })();

    expect(error).toBeInstanceOf(CliUsageError);
    expect((error as Error).message).toBe(
      '--input scope and --repository both give the scope. Use one: remove the "scope" key from --input, or remove --repository, --project.',
    );
  });

  it('checks the flag conflict before the scope shape', () => {
    expect(() => liftScopeFromInput({ scope: 'not-an-object' }, ['--output-vault-id'])).toThrow(
      /--input scope and --output-vault-id both give the scope/,
    );
  });

  it.each([
    ['null', null],
    ['a string', 'repo'],
    ['a number', 3],
    ['an array', [{ a: 1 }]],
    ['false', false],
    ['an empty string', ''],
  ])('rejects a scope that is %s', (_label, scope) => {
    expect(() => liftScopeFromInput({ scope, inputs: {} }, [])).toThrow(
      new CliUsageError('--input scope must be a JSON object.'),
    );
  });
});
