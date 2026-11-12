import { describe, expect, it, vi } from 'vitest';
import { PROPOSAL_CONTENT_LANGUAGES, registerProposalGenerateCommand } from '../../src/commands/proposal/generate';
import { formatOptimizeProposalHuman, registerProposalOptimizeDescriptionCommand } from '../../src/commands/proposal/optimize-description';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createProposalOptimizationBundle } from './testHelpers';

const proposal = (...args: string[]) => ['node', 'hagi', 'proposal', ...args];

describe('hagi proposal generate (registerProposalGenerateCommand)', () => {
  const generate = (...args: string[]) => proposal('generate', '--session-id', 's-1', '--proposal-content-language', 'en-US', ...args);

  it('exports the registration function and the accepted languages', () => {
    expect(typeof registerProposalGenerateCommand).toBe('function');
    expect(PROPOSAL_CONTENT_LANGUAGES).toEqual(['zh-CN', 'zh-Hant', 'en-US', 'ja-JP', 'ko-KR', 'de-DE', 'fr-FR', 'es-ES', 'pt-BR', 'ru-RU']);
  });

  it('starts generation with the language and leaves explore mode and hero unset', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(generate(), dependencies)).toBe(0);
    expect(api.generateProposal).toHaveBeenCalledExactlyOnceWith('s-1', {
      enableExploreMode: undefined,
      heroId: undefined,
      proposalContentLanguage: 'en-US',
    });
  });

  it.each(PROPOSAL_CONTENT_LANGUAGES)('accepts the language %s', async language => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(proposal('generate', '--session-id', 's', '--proposal-content-language', language), dependencies)).toBe(0);
    expect(api.generateProposal).toHaveBeenCalledWith('s', expect.objectContaining({ proposalContentLanguage: language }));
  });

  it('trims the language and the session id', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(proposal('generate', '--session-id', '  s-2 ', '--proposal-content-language', '  ja-JP '), dependencies)).toBe(0);
    expect(api.generateProposal).toHaveBeenCalledWith('s-2', expect.objectContaining({ proposalContentLanguage: 'ja-JP' }));
  });

  it.each(['en', 'EN-US', 'en_US', 'zh', ''])('rejects the language %j before any network call', async language => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(proposal('generate', '--session-id', 's', '--proposal-content-language', language), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--proposal-content-language must be one of:');
    expect(api.generateProposal).not.toHaveBeenCalled();
  });

  it('passes explore mode on and off explicitly', async () => {
    const on = createDependencies();
    const off = createDependencies();

    expect(await runCli(generate('--enable-explore-mode'), on.dependencies)).toBe(0);
    expect(await runCli(generate('--disable-explore-mode'), off.dependencies)).toBe(0);

    expect(on.api.generateProposal).toHaveBeenCalledWith('s-1', expect.objectContaining({ enableExploreMode: true }));
    expect(off.api.generateProposal).toHaveBeenCalledWith('s-1', expect.objectContaining({ enableExploreMode: false }));
  });

  it('rejects both explore mode flags together before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(generate('--enable-explore-mode', '--disable-explore-mode'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('Use either --enable-explore-mode or --disable-explore-mode, not both.');
    expect(api.generateProposal).not.toHaveBeenCalled();
  });

  it('passes a trimmed hero and drops a blank one', async () => {
    const trimmed = createDependencies();
    const blank = createDependencies();

    await runCli(generate('--hero-id', '  hero-3 '), trimmed.dependencies);
    await runCli(generate('--hero-id', '   '), blank.dependencies);

    expect(trimmed.api.generateProposal).toHaveBeenCalledWith('s-1', expect.objectContaining({ heroId: 'hero-3' }));
    expect(blank.api.generateProposal).toHaveBeenCalledWith('s-1', expect.objectContaining({ heroId: undefined }));
  });

  it('tells the person what to do next in human mode', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(generate(), dependencies)).toBe(0);
    expect(stdout.join('')).toBe(
      'Proposal generation started\nsessionId  s-1\nmessage    Proposal generation started\nnext       Wait for the session to reach Reviewing, then run hagi proposal execute --session-id s-1\n',
    );
  });

  it('prints what was requested and the next command as JSON', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(generate('--enable-explore-mode', '--hero-id', 'h', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({
      sessionId: 's-1',
      message: 'Proposal generation started',
      requested: { enableExploreMode: true, heroId: 'h', proposalContentLanguage: 'en-US' },
      nextCommand: 'hagi proposal execute --session-id s-1',
    });
  });

  it.each([
    ['--session-id', ['--proposal-content-language', 'en-US']],
    ['--proposal-content-language', ['--session-id', 's']],
  ])('fails without %s', async (_missing, rest) => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(proposal('generate', ...rest), dependencies)).not.toBe(0);
    expect(api.generateProposal).not.toHaveBeenCalled();
  });

  it('maps a rejected start to its exit code and prints no success text', async () => {
    const { dependencies, stdout } = createDependencies({
      generateProposal: vi.fn().mockRejectedValue(createApiError(409, { error: 'Already generating.' })),
    });

    expect(await runCli(generate(), dependencies)).toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(stdout.join('')).toBe('');
  });
});

describe('formatOptimizeProposalHuman', () => {
  it('describes a valid optimization with the applied names and the next step', () => {
    expect(formatOptimizeProposalHuman('s-1', createProposalOptimizationBundle() as never)).toBe(
      [
        'Proposal optimized',
        'sessionId      s-1',
        'title          Login fix',
        'proposalName   cli-proposal-management',
        'valid          yes',
        'next           hagi proposal generate --session-id s-1',
        '',
      ].join('\n'),
    );
  });

  it('describes an invalid optimization with its diagnostics and no next step', () => {
    const bundle = createProposalOptimizationBundle({
      isValid: false,
      diagnostics: [{ code: 'TOO_SHORT', message: 'Description is too short.' }],
    });

    const text = formatOptimizeProposalHuman('s-1', bundle as never);

    expect(text).toContain('Proposal optimization returned diagnostics');
    expect(text).toContain('valid          no');
    expect(text).toContain('diagnostic     TOO_SHORT: Description is too short.');
    expect(text).not.toContain('next ');
  });

  it('falls back to the optimized title and name when nothing was applied', () => {
    const bundle = createProposalOptimizationBundle({ isValid: false });

    const text = formatOptimizeProposalHuman('s-1', bundle as never);

    expect(text).toContain('title          Login fix');
    expect(text).toContain('proposalName   cli-proposal-management');
  });

  it('uses UNKNOWN for a diagnostic without a code and trims a missing message', () => {
    const text = formatOptimizeProposalHuman('s-1', { result: { validation: { isValid: false, diagnostics: [{}] } } } as never);

    expect(text).toContain('diagnostic     UNKNOWN:');
    expect(text.split('\n').find(line => line.startsWith('diagnostic'))).toBe('diagnostic     UNKNOWN:');
  });

  it('handles an empty response', () => {
    const text = formatOptimizeProposalHuman('s-1', {} as never);

    expect(text).toContain('Proposal optimization returned diagnostics');
    expect(text).toContain('title          \n');
    expect(text).toContain('valid          no');
  });

  it('lists every diagnostic in order', () => {
    const bundle = createProposalOptimizationBundle({
      isValid: false,
      diagnostics: [
        { code: 'A', message: 'first' },
        { code: 'B', message: 'second' },
      ],
    });

    const lines = formatOptimizeProposalHuman('s', bundle as never).split('\n').filter(line => line.startsWith('diagnostic'));

    expect(lines).toEqual(['diagnostic     A: first', 'diagnostic     B: second']);
  });
});

describe('hagi proposal optimize-description (registerProposalOptimizeDescriptionCommand)', () => {
  const optimize = (...args: string[]) => proposal('optimize-description', '--session-id', 's-1', '--description', 'Fix the login', ...args);

  it('exports the registration function', () => {
    expect(typeof registerProposalOptimizeDescriptionCommand).toBe('function');
  });

  it('sends only the description when no option is given', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(optimize(), dependencies)).toBe(0);
    expect(api.optimizeProposal).toHaveBeenCalledExactlyOnceWith('s-1', {
      description: 'Fix the login',
      title: undefined,
      isDefaultTitle: undefined,
      optimizationDirection: undefined,
      originalChiefComplaint: undefined,
    });
  });

  it('passes every option, trimmed, with the default-title flag as true', async () => {
    const { dependencies, api } = createDependencies();

    expect(
      await runCli(
        proposal(
          'optimize-description',
          '--session-id', ' s-1 ',
          '--description', '  Fix the login  ',
          '--title', '  Old title ',
          '--default-title',
          '--optimization-direction', ' shorter ',
          '--original-chief-complaint', ' it breaks ',
        ),
        dependencies,
      ),
    ).toBe(0);
    expect(api.optimizeProposal).toHaveBeenCalledWith('s-1', {
      description: 'Fix the login',
      title: 'Old title',
      isDefaultTitle: true,
      optimizationDirection: 'shorter',
      originalChiefComplaint: 'it breaks',
    });
  });

  it('drops blank optional values', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(optimize('--title', '  ', '--optimization-direction', ' '), dependencies)).toBe(0);
    expect(api.optimizeProposal).toHaveBeenCalledWith('s-1', expect.objectContaining({ title: undefined, optimizationDirection: undefined }));
  });

  it.each([
    ['--description', ['--session-id', 's']],
    ['--session-id', ['--description', 'd']],
  ])('fails without %s', async (_missing, rest) => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(proposal('optimize-description', ...rest), dependencies)).not.toBe(0);
    expect(api.optimizeProposal).not.toHaveBeenCalled();
  });

  it.each([
    ['--description', ['--session-id', 's', '--description', '   ']],
    ['--session-id', ['--session-id', '  ', '--description', 'd']],
  ])('rejects a whitespace-only %s before any network call', async (flag, args) => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(proposal('optimize-description', ...args), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain(`${flag} is required.`);
    expect(api.optimizeProposal).not.toHaveBeenCalled();
  });

  it('prints the human summary of the response', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(optimize(), dependencies)).toBe(0);
    expect(stdout.join('')).toMatch(/^Proposal optimized\nsessionId      s-1\n/);
  });

  it('prints the session id merged into the response as JSON', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(optimize('--json'), dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(body.sessionId).toBe('s-1');
    expect(body.summary.appliedTitle).toBe('Login fix');
    expect(body.correlationId).toBe('corr-1');
  });

  it('exits 0 for an invalid optimization, since the backend answered', async () => {
    const { dependencies, stdout } = createDependencies({
      optimizeProposal: vi.fn().mockResolvedValue(createProposalOptimizationBundle({ isValid: false, diagnostics: [{ code: 'X', message: 'bad' }] })),
    });

    expect(await runCli(optimize(), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('Proposal optimization returned diagnostics');
  });

  it('maps a rejected request to its exit code and prints no success text', async () => {
    const { dependencies, stdout } = createDependencies({
      optimizeProposal: vi.fn().mockRejectedValue(createApiError(404, { error: 'Session not found.' })),
    });

    expect(await runCli(optimize(), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stdout.join('')).toBe('');
  });
});
