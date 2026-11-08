import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/main';
import { createDependencies } from '../commands/testHelpers';

const root = path.resolve(__dirname, '../..');
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

const reference = read('skills/hagi/references/resource-lock.md');
const skill = read('skills/hagi/SKILL.md');

function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`\n${heading}\n`);
  expect(start, `heading ${heading}`).toBeGreaterThanOrEqual(0);
  const next = markdown.indexOf('\n## ', start + heading.length + 2);
  return markdown.slice(start, next < 0 ? undefined : next);
}

/** Every text that documents the lock commands: the whole reference plus the lock section of each other doc. */
const lockDocs: Array<[string, string]> = [
  ['skills/hagi/references/resource-lock.md', reference],
  ['skills/hagi/SKILL.md', section(skill, '## Resource lock')],
  ['skills/hagi/references/cli-usage.md', section(read('skills/hagi/references/cli-usage.md'), '## Agent lock commands')],
  ['README.md', section(read('README.md'), '## Agent Lock Commands')],
];

async function help(...args: string[]): Promise<string> {
  const { dependencies, stdout } = createDependencies();
  expect(await runCli(['node', 'hagi', 'agent', 'lock', ...args, '--help'], dependencies)).toBe(0);
  return stdout.join('');
}

const verbs = ['acquire', 'status', 'renew', 'heartbeat', 'release', 'requisition', 'list'];

describe('resource lock docs match the CLI help', () => {
  it('names only verbs and options that exist in `hagi agent lock --help` and each verb help', async () => {
    const groupHelp = await help();
    const verbHelp = new Map<string, string>();
    for (const verb of verbs) {
      expect(groupHelp).toMatch(new RegExp(`^\\s+${verb}\\b`, 'm'));
      verbHelp.set(verb, await help(verb));
    }

    const allHelp = [...verbHelp.values()].join('\n');
    const optionsIn = (text: string) => [...text.matchAll(/(?<![\w-])--[a-z][a-z-]*/g)].map(match => match[0]);

    for (const [file, text] of lockDocs) {
      expect(text, file).not.toMatch(/^\s*hagi lock\b/m);
      expect(text, file).toMatch(/hagi agent lock/);

      // Every `hagi agent lock <verb>` mention names a real verb.
      for (const match of text.matchAll(/hagi agent lock(?: ([a-z]+))?/g)) {
        if (match[1] && match[1] !== 'is') {
          expect(verbs, `${file}: verb ${match[1]}`).toContain(match[1]);
        }
      }

      // Every option mentioned anywhere in a lock section is an option of some lock verb.
      for (const option of new Set(optionsIn(text))) {
        expect(allHelp, `${file}: ${option}`).toContain(option);
      }

      // Every command line (code line or table row) uses options of its own verb only.
      for (const line of text.split('\n')) {
        const command = line.match(/hagi agent lock ([a-z]+)/);
        if (!command || !verbs.includes(command[1])) {
          continue;
        }

        const own = verbHelp.get(command[1])!;
        const codeOrRow = line.trimStart().startsWith('hagi agent lock') || line.startsWith('|');
        if (!codeOrRow) {
          continue;
        }

        // A table row lists the options of its verb after the first cell separator; examples may spell more verbs.
        const cells = line.startsWith('|') ? line.split('|')[2] ?? '' : line;
        for (const option of new Set(optionsIn(cells))) {
          expect(own, `${file}: \`${command[1]}\` ${option}`).toContain(option);
        }
      }
    }
  });
});

describe('resource lock reference content', () => {
  const rules = section(reference, '## The seven rules for the agent');
  const items = rules.split('\n').filter(line => /^\d+\. /.test(line));

  it('lists exactly seven numbered rules', () => {
    expect(items).toHaveLength(7);
    expect(items.map(line => line.split('.')[0])).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('carries each rule of design D18', () => {
    const expectations: Array<[RegExp, RegExp]> = [
      [/^1\./, /read the windows.*`Holding`.*heartbeat watcher.*before doing any work.*background process or in a background sub-agent/i],
      [/^2\./, /`Queued`.*continuous wait watcher.*`hagi agent lock acquire --wait.*Do not sleep.*60 s.*30 s/i],
      [/^3\./, /stop the heartbeat watcher and then release.*10 minutes/i],
      [/^4\./, /lost.*stop using the resource immediately.*24-hour cap.*10-minute timeout/i],
      [/^5\./, /lose track.*compacted.*`acquire` again with the same owner.*safe.*heartbeat watcher is running/i],
      [/^6\./, /Never requisition unless the user has explicitly told you.*nothing is a requisition without an explicit user order.*`acquire` and wait in the queue/i],
      [/^7\./, /`requisition`.*quotes the request.*heartbeat watcher.*which owner was displaced.*displaced.*stop using the resource immediately.*tell the user.*queue again only if.*never requisition back/i],
    ];
    for (const [start, pattern] of expectations) {
      const item = items.find(line => start.test(line));
      expect(item, String(start)).toMatch(pattern);
    }
  });

  it('states the numbers, the owner example, the exit codes and the displaced-agent limit', () => {
    for (const text of ['10 minutes', '24 hours', '2 minutes', '30 seconds', '60 seconds', '900 seconds', '--owner sess-7f2c', 'session ID']) {
      expect(reference).toContain(text);
    }
    for (const row of ['| `0` |', '| `31` |', '| `32` |', '| `2` |', '| `60` |', '| `70` |']) {
      expect(reference).toContain(row);
    }
    expect(reference).toMatch(/until its next heartbeat, up to 2 minutes/);
    expect(reference).toMatch(/cannot stop work that is already running/);
    expect(reference).toMatch(/Monitor/);
  });

  it('is linked from SKILL.md, and the other docs state the numbers and the no-requisition rule', () => {
    expect(skill).toContain('references/resource-lock.md');
    expect(existsSync(path.join(root, 'skills/hagi/references/resource-lock.md'))).toBe(true);
    for (const [file, text] of lockDocs) {
      expect(text, file).toMatch(/10-minute|10 minutes/);
      expect(text, file).toMatch(/24-hour|24 hours/);
      expect(text, file).toMatch(/2-minute|2 minutes/);
      expect(text, file).toMatch(/explicitly ordered|explicitly told|explicit user order/);
    }
  });

  it('documents the exit codes the CLI really defines', () => {
    const errors = read('src/runtime/errors.ts');
    expect(errors).toMatch(/WAIT_TIMEOUT: 31/);
    expect(errors).toMatch(/LOCK_LOST: 32/);
    expect(errors).toMatch(/USAGE: 2/);
    expect(errors).toMatch(/TRANSPORT: 60/);
  });
});
