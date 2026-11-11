import { describe, expect, it } from 'vitest';
import { CliUsageError } from '../../src/runtime/errors';
import { parseHeroReference } from '../../src/runtime/heroReference';

describe('parseHeroReference', () => {
  it('reads a lowercase GUID as a Hero ID', () => {
    expect(parseHeroReference('3f2a9c1e-8b7d-4e5f-9a1b-0c2d3e4f5a6b')).toEqual({
      heroId: '3f2a9c1e-8b7d-4e5f-9a1b-0c2d3e4f5a6b',
    });
  });

  it('reads an uppercase GUID as a Hero ID', () => {
    expect(parseHeroReference('3F2A9C1E-8B7D-4E5F-9A1B-0C2D3E4F5A6B')).toEqual({
      heroId: '3F2A9C1E-8B7D-4E5F-9A1B-0C2D3E4F5A6B',
    });
  });

  it('reads a plain name as a Hero name', () => {
    expect(parseHeroReference('Nova')).toEqual({ heroName: 'Nova' });
  });

  it('keeps the inner spaces of a name', () => {
    expect(parseHeroReference('Ui Master Captain')).toEqual({ heroName: 'Ui Master Captain' });
  });

  it('ignores surrounding whitespace around a name', () => {
    expect(parseHeroReference('  Nova \t')).toEqual({ heroName: 'Nova' });
  });

  it('ignores surrounding whitespace around a GUID', () => {
    expect(parseHeroReference('  3f2a9c1e-8b7d-4e5f-9a1b-0c2d3e4f5a6b ')).toEqual({
      heroId: '3f2a9c1e-8b7d-4e5f-9a1b-0c2d3e4f5a6b',
    });
  });

  it('treats a value that is almost a GUID as a name', () => {
    expect(parseHeroReference('3f2a9c1e-8b7d-4e5f-9a1b-0c2d3e4f5a6')).toEqual({
      heroName: '3f2a9c1e-8b7d-4e5f-9a1b-0c2d3e4f5a6',
    });
  });

  it('rejects an empty value as a usage error', () => {
    expect(() => parseHeroReference('')).toThrow(CliUsageError);
  });

  it('rejects a whitespace-only value as a usage error', () => {
    expect(() => parseHeroReference('   ')).toThrow(CliUsageError);
  });

  it('names the flag in the usage error', () => {
    expect(() => parseHeroReference(' ', '--hero')).toThrow('--hero needs a nonblank Hero name or ID.');
  });
});
