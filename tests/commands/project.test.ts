import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies } from './testHelpers';

describe('project commands', () => {
  it('lists projects from aggregation in human-readable mode', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'project', 'list'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.listProjects).toHaveBeenCalledOnce();
    const output = stdout.join('');
    expect(output).toContain('Projects (1)');
    expect(output).toContain('project-1');
    expect(output).not.toContain('"projects"');
  });

  it('prints the created project id and sends the description when given', async () => {
    const { dependencies, api, stdout } = createDependencies();

    const exitCode = await runCli(
      ['node', 'hagi', 'project', 'create', '--name', 'Demo', '--path', '/tmp/demo', '--description', 'Demo project'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.createProject).toHaveBeenCalledWith({
      name: 'Demo',
      path: '/tmp/demo',
      description: 'Demo project',
    });
    const output = stdout.join('');
    expect(output).toContain('Project created');
    expect(output).toContain('project-2');
  });

  it('keeps omitted update fields at their current values', async () => {
    const { dependencies, api } = createDependencies();

    const exitCode = await runCli(
      ['node', 'hagi', 'project', 'update', '--id', 'project-1', '--name', 'Renamed', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.listProjects).toHaveBeenCalled();
    expect(api.updateProject).toHaveBeenCalledWith('project-1', {
      name: 'Renamed',
      path: '/tmp/project',
      description: 'desc',
    });
  });

  it('prints a human-readable confirmation when a project is deleted', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'project', 'delete', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.deleteProject).toHaveBeenCalledWith('project-1');
    expect(stdout.join('')).toContain('Project deleted');
    expect(stdout.join('')).toContain('project-1');
  });

  it('lists projects from aggregation in json mode', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'project', 'list', '--json'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.listProjects).toHaveBeenCalledOnce();
    expect(stdout.join('')).toContain('"projects"');
    expect(stdout.join('')).toContain('"id": "project-1"');
  });

  it('creates and updates projects with merged current values', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(
      ['node', 'hagi', 'project', 'create', '--name', 'My Project', '--path', '/tmp/project', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.createProject).toHaveBeenCalledWith({
      name: 'My Project',
      path: '/tmp/project',
      description: undefined,
    });

    expect(await runCli(
      ['node', 'hagi', 'project', 'update', '--id', 'project-1', '--description', 'updated', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.updateProject).toHaveBeenCalledWith('project-1', {
      name: 'Project',
      path: '/tmp/project',
      description: 'updated',
    });
    expect(stdout.join('')).toContain('"project"');
  });

  it('returns a deterministic not-found style error when update cannot resolve the project', async () => {
    const { dependencies, api, stderr } = createDependencies({
      listProjects: vi.fn().mockResolvedValue({ projects: [] }),
    });

    const exitCode = await runCli(
      ['node', 'hagi', 'project', 'update', '--id', 'missing', '--name', 'Renamed', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(api.updateProject).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('"status": 404');
  });

  it('deletes a project with deterministic success output', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'project', 'delete', '--id', 'project-1', '--json'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.deleteProject).toHaveBeenCalledWith('project-1');
    expect(stdout.join('')).toContain('"deleted": true');
  });

  it('surfaces create errors from the generated client', async () => {
    const { dependencies, stderr } = createDependencies({
      createProject: vi.fn().mockRejectedValue(createApiError(400, { error: 'Invalid project' })),
    });

    const exitCode = await runCli(
      ['node', 'hagi', 'project', 'create', '--name', 'Bad', '--path', '/tmp/bad', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(stderr.join('')).toContain('"status": 400');
  });
});
