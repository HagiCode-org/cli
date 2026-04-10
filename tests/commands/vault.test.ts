import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import {
  createDependencies,
  createVault,
  createVaultFileEntry,
  createVaultFileListResponse,
  createVaultFilePreview,
} from './testHelpers';

describe('vault commands', () => {
  it('lists vaults in human mode and creates vaults in json mode', async () => {
    const { dependencies, api, stdout } = createDependencies({
      createVault: vi.fn().mockResolvedValue(
        createVault('vault-2', {
          name: 'Main Notes',
          type: 'obsidian',
          physicalPath: '/vaults/main',
          gitUrl: 'https://github.com/acme/notes.git',
          bootstrapDiagnostics: [
            {
              severity: 'info',
              code: 'Vault.Bootstrap.Cloned',
              message: 'Repository cloned.',
              relativePath: 'README.md',
            },
          ],
        }),
      ),
    });

    expect(await runCli(['node', 'hagi', 'vault', 'list'], dependencies)).toBe(0);
    expect(api.listVaults).toHaveBeenCalledOnce();
    expect(stdout.join('')).toContain('Vaults (1)');
    expect(stdout.join('')).toContain('vault-1');

    expect(await runCli(
      [
        'node',
        'hagi',
        'vault',
        'create',
        '--name',
        'Main Notes',
        '--type',
        'obsidian',
        '--physical-path',
        '/vaults/main',
        '--git-url',
        'https://github.com/acme/notes.git',
        '--json',
      ],
      dependencies,
    )).toBe(0);

    expect(api.createVault).toHaveBeenCalledWith({
      name: 'Main Notes',
      type: 'obsidian',
      physicalPath: '/vaults/main',
      gitUrl: 'https://github.com/acme/notes.git',
    });
    expect(stdout.join('')).toContain('"vault"');
    expect(stdout.join('')).toContain('"bootstrapDiagnostics"');
  });

  it('resolves partial vault updates from the current vault snapshot', async () => {
    const { dependencies, api, stdout } = createDependencies({
      listVaults: vi.fn().mockResolvedValue({
        generatedAtUtc: '2026-04-05T00:00:00Z',
        items: [
          createVault('vault-1', {
            name: 'Current Vault',
            type: 'obsidian',
            physicalPath: '/vaults/current',
            gitUrl: 'https://github.com/acme/current.git',
          }),
        ],
      }),
      updateVault: vi.fn().mockResolvedValue(
        createVault('vault-1', {
          name: 'Renamed Vault',
          type: 'obsidian',
          physicalPath: '/vaults/current',
          gitUrl: 'https://github.com/acme/current.git',
        }),
      ),
    });

    const exitCode = await runCli(
      ['node', 'hagi', 'vault', 'update', '--id', 'vault-1', '--name', 'Renamed Vault', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.updateVault).toHaveBeenCalledWith('vault-1', {
      name: 'Renamed Vault',
      type: 'obsidian',
      physicalPath: '/vaults/current',
      gitUrl: 'https://github.com/acme/current.git',
    });
    expect(stdout.join('')).toContain('"name": "Renamed Vault"');
  });

  it('returns a deterministic not-found style error when update cannot resolve the vault', async () => {
    const { dependencies, api, stderr } = createDependencies({
      listVaults: vi.fn().mockResolvedValue({ generatedAtUtc: '2026-04-05T00:00:00Z', items: [] }),
    });

    const exitCode = await runCli(
      ['node', 'hagi', 'vault', 'update', '--id', 'missing', '--type', 'obsidian', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(api.updateVault).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('"status": 404');
  });

  it('forwards delete-local-files and preserves deletion status in json mode', async () => {
    const { dependencies, api, stdout } = createDependencies({
      deleteVault: vi.fn().mockResolvedValue({
        id: 'vault-1',
        deleted: true,
        deleteLocalFilesRequested: true,
        localFilesDeletionStatus: 'deleted',
        localFilesDeleted: true,
      }),
    });

    const exitCode = await runCli(
      ['node', 'hagi', 'vault', 'delete', '--id', 'vault-1', '--delete-local-files', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.deleteVault).toHaveBeenCalledWith('vault-1', true);
    expect(stdout.join('')).toContain('"deleteLocalFilesRequested": true');
    expect(stdout.join('')).toContain('"localFilesDeletionStatus": "deleted"');
  });

  it('lists vault files and previews content through the browse endpoints', async () => {
    const { dependencies, api, stdout } = createDependencies({
      listVaultFiles: vi.fn().mockResolvedValue(
        createVaultFileListResponse({
          items: [
            createVaultFileEntry('docs', { isDirectory: true, extension: '', previewSupported: false, sizeBytes: 0 }),
            createVaultFileEntry('docs/readme.md', { extension: '.md', previewSupported: true, sizeBytes: 256 }),
          ],
        }),
      ),
      previewVaultFile: vi.fn().mockResolvedValue(
        createVaultFilePreview({
          relativePath: 'docs/readme.md',
          fileName: 'readme.md',
          content: '# Preview content',
          status: 'ready',
          contentTruncated: false,
        }),
      ),
    });

    expect(await runCli(
      ['node', 'hagi', 'vault', 'files', 'list', '--id', 'vault-1', '--path', 'docs', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.listVaultFiles).toHaveBeenCalledWith('vault-1', 'docs');
    expect(stdout.join('')).toContain('"status": "ready"');
    expect(stdout.join('')).toContain('"relativePath": "docs/readme.md"');

    expect(await runCli(
      ['node', 'hagi', 'vault', 'files', 'preview', '--id', 'vault-1', '--path', 'docs/readme.md', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.previewVaultFile).toHaveBeenCalledWith('vault-1', 'docs/readme.md');
    expect(stdout.join('')).toContain('"contentTruncated": false');
    expect(stdout.join('')).toContain('"content": "# Preview content"');
  });

  it('preserves backend preview status fields for unsupported files', async () => {
    const { dependencies, stdout } = createDependencies({
      previewVaultFile: vi.fn().mockResolvedValue(
        createVaultFilePreview({
          relativePath: 'binary.dat',
          fileName: 'binary.dat',
          extension: '.dat',
          status: 'unsupported',
          errorCode: 'PCode.Vault.FilePreviewUnsupported',
          message: 'Preview is not supported for this file type.',
          previewSupported: false,
          content: null,
        }),
      ),
    });

    const exitCode = await runCli(
      ['node', 'hagi', 'vault', 'files', 'preview', '--id', 'vault-1', '--path', 'binary.dat', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(stdout.join('')).toContain('"status": "unsupported"');
    expect(stdout.join('')).toContain('"errorCode": "PCode.Vault.FilePreviewUnsupported"');
    expect(stdout.join('')).toContain('"message": "Preview is not supported for this file type."');
  });
});
