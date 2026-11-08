import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliHttpError, CliOperationFailedError, CliSagaRefusalError } from '../../../src/runtime/errors';
import {
  matchProjectByPath,
  resolveSagaProjectIdentity,
  type RegisteredProject,
} from '../../../src/runtime/saga/project';

let workspace: string;
let projectA: string;
let projectB: string;

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-project-')));
  projectA = path.join(workspace, 'alpha');
  projectB = path.join(workspace, 'beta');
  mkdirSync(projectA);
  mkdirSync(projectB);
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('matchProjectByPath', () => {
  it('returns the single project whose real path equals the root', () => {
    const projects: RegisteredProject[] = [
      { id: 'p-alpha', path: projectA },
      { id: 'p-beta', path: projectB },
    ];

    expect(matchProjectByPath(projects, projectA)).toEqual({ projectId: 'p-alpha', projectDirectory: projectA });
  });

  it('matches a project registered through a symbolic link to the same real directory', () => {
    const link = path.join(workspace, 'alpha-link');
    symlinkSync(projectA, link, 'dir');

    expect(matchProjectByPath([{ id: 'linked', path: link }], projectA).projectId).toBe('linked');
  });

  it('refuses with no match and names the path, creating nothing', () => {
    expect(() => matchProjectByPath([{ id: 'p-beta', path: projectB }], projectA)).toThrow(CliSagaRefusalError);
    expect(() => matchProjectByPath([{ id: 'p-beta', path: projectB }], projectA))
      .toThrow(/no registered project has the path/);
  });

  it('refuses several matches and lists every matching ID', () => {
    const projects: RegisteredProject[] = [
      { id: 'dup-1', path: projectA },
      { id: 'dup-2', path: projectA },
    ];

    let caught: unknown;
    try {
      matchProjectByPath(projects, projectA);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CliSagaRefusalError);
    expect((caught as CliSagaRefusalError).reasons.join(' ')).toContain('dup-1, dup-2');
  });

  it('skips a registered project whose path is missing on this host', () => {
    const projects: RegisteredProject[] = [
      { id: 'gone', path: path.join(workspace, 'does-not-exist') },
      { id: 'p-alpha', path: projectA },
    ];

    expect(matchProjectByPath(projects, projectA).projectId).toBe('p-alpha');
  });

  it('treats a project with a missing path as no match when it is the only candidate', () => {
    expect(() => matchProjectByPath([{ id: 'gone', path: path.join(workspace, 'nope') }], projectA))
      .toThrow(CliSagaRefusalError);
  });
});

describe('resolveSagaProjectIdentity', () => {
  it('resolves --path through one listing call to the matching project ID and real directory', async () => {
    const listProjects = async () => ({ projects: [{ id: 'p-alpha', path: projectA }] });

    await expect(resolveSagaProjectIdentity({ kind: 'path', value: projectA }, listProjects))
      .resolves.toEqual({ projectId: 'p-alpha', projectDirectory: projectA });
  });

  it('resolves --project-id to that project and its real directory', async () => {
    const listProjects = async () => ({ projects: [{ id: 'p-beta', path: projectB }] });

    await expect(resolveSagaProjectIdentity({ kind: 'project-id', value: 'p-beta' }, listProjects))
      .resolves.toEqual({ projectId: 'p-beta', projectDirectory: projectB });
  });

  it('refuses an unknown --project-id with exit code 404', async () => {
    const listProjects = async () => ({ projects: [{ id: 'p-beta', path: projectB }] });

    await expect(resolveSagaProjectIdentity({ kind: 'project-id', value: 'missing' }, listProjects))
      .rejects.toBeInstanceOf(CliHttpError);
  });

  it('refuses a --path root that does not exist before the backend listing matters', async () => {
    const listProjects = async () => ({ projects: [] });

    await expect(resolveSagaProjectIdentity({ kind: 'path', value: path.join(workspace, 'missing-root') }, listProjects))
      .rejects.toBeInstanceOf(CliOperationFailedError);
  });

  it('refuses a backend listing without a projects collection', async () => {
    await expect(resolveSagaProjectIdentity({ kind: 'path', value: projectA }, async () => ({ projects: null })))
      .rejects.toBeInstanceOf(CliOperationFailedError);
  });
});
