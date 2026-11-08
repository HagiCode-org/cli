#!/usr/bin/env node
// saga: the one tool of a saga root (<project>/.hagicode/sagas). Node.js only, no dependencies.
//
//   new <saga>                          create the saga folder
//   instructions <saga> [name]          list the artifacts and the next one, or print a method prompt (prompts/<name>.md)
//   list                                every saga that is not archived, with its state
//   items <saga>                        the plan items as JSON (state, acceptance command)
//   amend <saga> "<title>" "<text>"     append an amendment (open) under <saga>/amendments/
//   freeze <saga>                       first step of a run: revision 1, verify, or revise
//   check <saga> --phase plan|run       consistency checks; exit 1 with reasons
//   tick <saga> <ID>                    tick an item only when its report is PASS and its evidence exists
//   block <saga> <ID> "<reason>"        record a blocked item
//   revision <saga>                     print the frozen revision number (0 = not frozen)
//   status <saga> [--state S] [--note N]   write <saga>/runtime/status.json and print it
//   archive <saga> [--force]            move a finished saga into archive/<date>-<saga>/
//
// The saga root is the folder above tools/ (where this file lives), or --root <dir>, or $SAGA_ROOT.
// Layout: prompts/ (the method), tools/saga.mjs, <saga>/ (the contract: goal.md research.md acceptance.md progress.md
// contract.lock amendments/ revisions/ and runtime/ for the run record), archive/.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');
const OPEN_HEADINGS = new Set(['## 待决问题', '## Open questions']);
const DECIDED = ['[已决定', '[decided'];
const NONE_LINES = new Set(['- 无', '- none']);
const RESERVED = new Set(['prompts', 'tools', 'archive', 'runtime', 'amendments', 'revisions']);
const ID_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
// artifact name -> file, in dependency order: each needs the ones before it
const ARTIFACTS = [['goal', 'goal.md'], ['research', 'research.md'], ['acceptance', 'acceptance.md'], ['plan', 'progress.md']];
const PROMPTS = new Set(['goal', 'research', 'acceptance', 'plan', 'run', 'amend']);
const ITEM = /^- \[( |x)\] (\S+) (.*?)\s*\|\s*(.*)$/;
const SUPER = /^- ~ (\S+) (.*?)\s*\|\s*(.*)$/;

let ROOT = '';

const sdir = (s) => path.join(ROOT, s);
const rdir = (s) => path.join(ROOT, s, 'runtime');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const mkdirs = (p) => fs.mkdirSync(p, { recursive: true });
const writeJson = (p, v) => fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);
const today = () => { const d = new Date(); const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };

/** Text of a file, or "" when it does not exist yet (a draft saga has only some artifacts). */
const rd = (p) => (isFile(p) ? fs.readFileSync(p, 'utf8') : '');
const rdb = (p) => (isFile(p) ? fs.readFileSync(p) : Buffer.alloc(0));
const splitLines = (text) => { if (!text) return []; const l = text.split(/\r?\n/); if (l[l.length - 1] === '') l.pop(); return l; };
const lines = (s) => splitLines(rd(path.join(sdir(s), 'progress.md')));

function findRoot(argv) {
  const i = argv.indexOf('--root');
  if (i >= 0) { const root = path.resolve(argv[i + 1]); argv.splice(i, 2); return root; }
  if (process.env.SAGA_ROOT) return path.resolve(process.env.SAGA_ROOT);
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function items(s) {
  const out = [];
  lines(s).forEach((l, line) => {
    const m = ITEM.exec(l);
    if (m) out.push({ line, done: m[1] === 'x', id: m[2], title: m[3], note: m[4].trim() });
  });
  return out;
}

function superseded(s) {
  return lines(s).map((l) => SUPER.exec(l)).filter(Boolean).map((m) => ({ id: m[1], title: m[2] }));
}

function acceptance(s) {
  const cmds = {};
  let cur = null;
  for (const l of splitLines(rd(path.join(sdir(s), 'acceptance.md')))) {
    const h = /^## (\S+)/.exec(l);
    if (h) cur = h[1];
    const c = /^cmd:\s*(.+)$/.exec(l);
    if (c && cur) cmds[cur] = c[1].trim();
  }
  return cmds;
}

function openQuestions(s) {
  const out = [];
  let on = false;
  for (const l of splitLines(rd(path.join(sdir(s), 'research.md')))) {
    if (l.startsWith('## ')) { on = OPEN_HEADINGS.has(l.trim()); continue; }
    if (on && l.startsWith('- ') && !DECIDED.some((d) => l.includes(d)) && !NONE_LINES.has(l.trim().toLowerCase())) out.push(l.slice(2).trim());
  }
  return out;
}

function amendments(s) {
  const d = path.join(sdir(s), 'amendments');
  if (!isDir(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.md')).sort().map((name) => {
    const m = /^merged-in:[ \t]*(\S*)[ \t]*$/m.exec(fs.readFileSync(path.join(d, name), 'utf8'));
    return { name, mergedIn: m ? m[1] : '' };
  });
}

function hashes(s) {
  const c = sdir(s);
  const plan = [...items(s).map((i) => `${i.id} ${i.title}`), ...superseded(s).map((i) => `~ ${i.id} ${i.title}`)].join('\n');
  return { goal: sha(rdb(path.join(c, 'goal.md'))), acceptance: sha(rdb(path.join(c, 'acceptance.md'))), 'plan-items': sha(plan) };
}

function accHashes(s) {
  return Object.fromEntries(Object.entries(acceptance(s)).map(([k, v]) => [k, sha(v)]));
}

function parseLock(text) {
  const rev = Number(/^revision:\s*(\d+)/m.exec(text)[1]);
  const sec = (name) => {
    const body = new RegExp(`^${name}:\\n((?:  .*\\n?)*)`, 'm').exec(text)[1];
    return Object.fromEntries([...body.matchAll(/^ {2}(\S+):\s*(\S+)$/gm)].map((m) => [m[1], m[2]]));
  };
  const ids = /^items:[ \t]*(.*)$/m.exec(text)[1].split(/\s+/).filter(Boolean);
  return { rev, hashes: sec('hashes'), acc: sec('acceptance-by-item'), ids };
}

function writeLock(s, rev, prev) {
  const h = hashes(s);
  const a = accHashes(s);
  const ids = [...items(s).map((i) => i.id), ...superseded(s).map((i) => i.id)];
  const body = `revision: ${rev}\nfrozen-at: ${now()}\nprev: ${prev}\nhashes:\n${Object.entries(h).map(([k, v]) => `  ${k}: ${v}\n`).join('')}`
    + `acceptance-by-item:\n${Object.entries(a).map(([k, v]) => `  ${k}: ${v}\n`).join('')}items: ${ids.join(' ')}\n`;
  fs.writeFileSync(path.join(sdir(s), 'contract.lock'), body);
  return body;
}

function planErrors(s) {
  const errs = [];
  const its = items(s);
  const acc = acceptance(s);
  for (const [, name] of ARTIFACTS) if (!isFile(path.join(sdir(s), name))) errs.push(`${name} is missing`);
  if (!its.length && isFile(path.join(sdir(s), 'progress.md'))) errs.push('progress.md has no active items');
  const ids = new Set(its.map((i) => i.id));
  for (const i of its) if (!(i.id in acc)) errs.push(`item ${i.id} has no acceptance cmd in acceptance.md`);
  for (const k of Object.keys(acc)) if (!ids.has(k)) errs.push(`acceptance entry ${k} is not an active item in progress.md`);
  return errs;
}

const amendmentErrors = (s) => amendments(s).filter((a) => !a.mergedIn).map((a) => `open amendment ${a.name}: merge it into the artifacts and set merged-in`);

function check(s, phase) {
  const errs = planErrors(s);
  if (phase === 'run') {
    const lock = path.join(sdir(s), 'contract.lock');
    if (!isFile(lock)) errs.push('contract.lock missing: run freeze first');
    else {
      const old = parseLock(fs.readFileSync(lock, 'utf8'));
      for (const [k, v] of Object.entries(hashes(s))) {
        if (old.hashes[k] !== v) errs.push(`hash mismatch for ${k}: frozen contract (r${old.rev}) changed, run freeze after merging an amendment`);
      }
    }
    errs.push(...amendmentErrors(s));
    for (const it of items(s)) {
      if (it.done) {
        const ev = it.note ? path.join(rdir(s), it.note) : null;
        if (!ev || !isFile(ev)) errs.push(`item ${it.id} is ticked but evidence file is missing: ${JSON.stringify(it.note).replace(/"/g, "'")}`);
      }
    }
  }
  return errs;
}

function freeze(s) {
  const errs = [...planErrors(s), ...openQuestions(s).map((q) => `open question not decided by a human: ${q}`), ...amendmentErrors(s)];
  if (errs.length) return [errs, null];
  const lock = path.join(sdir(s), 'contract.lock');
  if (!isFile(lock)) return [[], `FREEZE OK (revision 1)\n${writeLock(s, 1, '-')}`];
  const text = fs.readFileSync(lock, 'utf8');
  const old = parseLock(text);
  const now_ = hashes(s);
  if (Object.keys(now_).every((k) => old.hashes[k] === now_[k]) && Object.keys(old.hashes).length === Object.keys(now_).length) {
    return [[], `FREEZE OK (already frozen at r${old.rev}, contract unchanged)`];
  }
  const target = `r${old.rev + 1}`;
  if (!amendments(s).some((a) => a.mergedIn === target)) return [[`contract changed without an amendment merged into ${target}: tamper or unrecorded change`], null];
  const known = new Set([...items(s).map((i) => i.id), ...superseded(s).map((i) => i.id)]);
  const gone = old.ids.filter((i) => !known.has(i));
  if (gone.length) return [[`item removed without being marked superseded: ${gone.join(', ')}`], null];
  mkdirs(path.join(sdir(s), 'revisions'));
  fs.writeFileSync(path.join(sdir(s), 'revisions', `r${old.rev}.lock`), text);
  const nowAcc = accHashes(s);
  const reopened = [];
  const added = items(s).filter((i) => !old.ids.includes(i.id)).map((i) => i.id);
  const ls = lines(s);
  for (const it of items(s)) {
    if (it.done && old.acc[it.id] !== nowAcc[it.id]) {
      ls[it.line] = `- [ ] ${it.id} ${it.title} | reopened in ${target}: acceptance changed`;
      const hist = path.join(rdir(s), 'history', `r${old.rev}`);
      mkdirs(hist);
      const evDir = path.join(rdir(s), 'evidence');
      const moving = [
        ...(isDir(evDir) ? fs.readdirSync(evDir).filter((f) => f.startsWith(it.id) && f.endsWith('.log')).map((f) => path.join(evDir, f)) : []),
        path.join(rdir(s), 'reports', `${it.id}.md`),
      ];
      for (const p of moving) if (fs.existsSync(p)) fs.renameSync(p, path.join(hist, path.basename(p)));
      reopened.push(it.id);
    }
  }
  fs.writeFileSync(path.join(sdir(s), 'progress.md'), `${ls.join('\n')}\n`);
  const body = writeLock(s, old.rev + 1, sha(text));
  const show = (l) => (l.length ? `[${l.map((x) => `'${x}'`).join(', ')}]` : 'none');
  return [[], `FREEZE OK (revised r${old.rev} -> ${target})\nreopened: ${show(reopened)}  added: ${show(added)}\n${body}`];
}

function blocked(s) {
  const p = path.join(rdir(s), 'blocked.json');
  return isFile(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}

const artifactsPresent = (s) => Object.fromEntries(ARTIFACTS.map(([name, f]) => [name, isFile(path.join(sdir(s), f)) && rd(path.join(sdir(s), f)).trim() !== '']));

function itemRows(s) {
  const bl = blocked(s);
  const cmds = acceptance(s);
  return [
    ...items(s).map((i) => ({ id: i.id, title: i.title, state: i.done ? 'done' : (i.id in bl ? 'blocked' : 'pending'), cmd: cmds[i.id] || '', note: i.note })),
    ...superseded(s).map((i) => ({ id: i.id, title: i.title, state: 'superseded', cmd: '', note: '' })),
  ];
}

function status(s, state = null, note = '', write = true) {
  const lock = path.join(sdir(s), 'contract.lock');
  const rev = isFile(lock) ? parseLock(fs.readFileSync(lock, 'utf8')).rev : 0;
  const rows = itemRows(s);
  const art = artifactsPresent(s);
  const active = rows.filter((r) => r.state !== 'superseded');
  const count = (st) => rows.filter((r) => r.state === st).length;
  const done = count('done');
  const nxt = Object.keys(art).find((n) => !art[n]) ?? null;
  let st = state;
  if (st === null) st = rev === 0 ? (nxt ? 'draft' : 'planned') : (done === active.length ? 'done' : 'running');
  const out = {
    schema: 'saga-status/2', sagaId: s, revision: rev, state: st, updatedAt: now(), note,
    artifacts: art, nextArtifact: nxt,
    counts: { total: active.length, done, blocked: count('blocked'), pending: count('pending'), superseded: count('superseded') },
    openAmendments: amendments(s).filter((a) => !a.mergedIn).length,
    items: rows.map((r) => ({ id: r.id, title: r.title, state: r.state })),
  };
  if (write) { mkdirs(rdir(s)); writeJson(path.join(rdir(s), 'status.json'), out); }
  return out;
}

function sagas() {
  if (!isDir(ROOT)) return [];
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !RESERVED.has(d.name) && ID_RE.test(d.name)).map((d) => d.name).sort();
}

function instructions(s, name) {
  const present = artifactsPresent(s);
  if (name === undefined) {
    const nxt = Object.keys(present).find((n) => !present[n]);
    const out = [`saga ${s}: ${Object.entries(present).map(([n, ok]) => `${n}=${ok ? 'written' : 'missing'}`).join(', ')}`];
    out.push(nxt
      ? `next artifact: ${nxt}  (node tools/saga.mjs instructions ${s} ${nxt})`
      : 'planning artifacts are complete: run check --phase plan, then a human decides to start the run');
    out.push(`method prompts: ${[...PROMPTS].sort().join(', ')}`);
    return [0, out.join('\n')];
  }
  if (!PROMPTS.has(name)) return [1, `unknown prompt '${name}'; choose one of: ${[...PROMPTS].sort().join(', ')}`];
  const order = ARTIFACTS.map(([n]) => n);
  if (order.includes(name)) {
    const before = order.slice(0, order.indexOf(name)).filter((n) => !present[n]);
    if (before.length) return [1, `BLOCKED: write ${before.join(', ')} before ${name}`];
  }
  const p = path.join(ROOT, 'prompts', `${name}.md`);
  if (!isFile(p)) return [1, `prompts/${name}.md is missing in ${ROOT}`];
  return [0, fs.readFileSync(p, 'utf8')];
}

function main(argv) {
  ROOT = findRoot(argv);
  const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const cmd = argv[0];
  if (!cmd) { console.log(USAGE); return 2; }
  if (cmd === 'list') {
    const rows = sagas().map((s) => { const d = status(s, null, '', false); return { sagaId: d.sagaId, state: d.state, revision: d.revision, counts: d.counts, openAmendments: d.openAmendments, updatedAt: d.updatedAt }; });
    console.log(JSON.stringify({ sagas: rows }, null, 2));
    return 0;
  }
  const s = argv[1];
  if (!s) { console.log(USAGE); return 2; }
  if (cmd === 'new') {
    if (!ID_RE.test(s) || RESERVED.has(s)) { console.log(`INVALID ID '${s}': lowercase letters, digits and hyphens, not one of [${[...RESERVED].sort().map((x) => `'${x}'`).join(', ')}]`); return 1; }
    const arch = path.join(ROOT, 'archive');
    if (fs.existsSync(sdir(s)) || (isDir(arch) && fs.readdirSync(arch).some((n) => n.endsWith(`-${s}`)))) { console.log(`SAGA EXISTS: ${s}`); return 1; }
    mkdirs(sdir(s));
    writeJson(path.join(sdir(s), 'saga.json'), { id: s, createdAt: now(), method: 1 });
    console.log(`CREATED ${sdir(s)}\nnext: node tools/saga.mjs instructions ${s}`);
    return 0;
  }
  if (!isDir(sdir(s))) { console.log(`SAGA NOT FOUND: ${sdir(s)}`); return 1; }
  if (cmd === 'instructions') { const [code, text] = instructions(s, argv[2]); console.log(text); return code; }
  if (cmd === 'items') { console.log(JSON.stringify({ sagaId: s, items: itemRows(s) }, null, 2)); return 0; }
  if (cmd === 'amend') {
    const d = path.join(sdir(s), 'amendments');
    mkdirs(d);
    const n = fs.readdirSync(d).filter((f) => f.endsWith('.md')).length + 1;
    const slug = (argv[2] || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'amendment';
    const name = `${String(n).padStart(3, '0')}-${slug}.md`;
    fs.writeFileSync(path.join(d, name), `title: ${argv[2]}\ncreated-at: ${now()}\nmerged-in:\n---\n${argv[3] || ''}\n`);
    console.log(`AMENDMENT ${name} (open)`);
    return 0;
  }
  if (cmd === 'freeze') {
    const [errs, msg] = freeze(s);
    console.log(errs.length ? errs.map((e) => `FREEZE REFUSED: ${e}`).join('\n') : msg);
    return errs.length ? 1 : 0;
  }
  if (cmd === 'check') {
    const phase = flag('--phase') || 'run';
    const errs = check(s, phase);
    console.log(errs.length ? errs.map((e) => `CHECK FAIL: ${e}`).join('\n') : `CHECK OK (${phase})`);
    return errs.length ? 1 : 0;
  }
  if (cmd === 'revision') {
    const lock = path.join(sdir(s), 'contract.lock');
    console.log(isFile(lock) ? parseLock(fs.readFileSync(lock, 'utf8')).rev : 0);
    return 0;
  }
  if (cmd === 'block') {
    const bl = blocked(s);
    bl[argv[2]] = argv[3] || '';
    mkdirs(rdir(s));
    writeJson(path.join(rdir(s), 'blocked.json'), bl);
    console.log(`BLOCKED ${argv[2]}`);
    return 0;
  }
  if (cmd === 'status') {
    console.log(JSON.stringify(status(s, flag('--state') ?? null, flag('--note') ?? ''), null, 2));
    return 0;
  }
  if (cmd === 'tick') {
    const iid = argv[2];
    const rep = path.join(rdir(s), 'reports', `${iid}.md`);
    const ev = path.join(rdir(s), 'evidence', `${iid}.log`);
    if (!isFile(rep) || !/^(状态|Status):\s*PASS\s*$/m.test(fs.readFileSync(rep, 'utf8'))) { console.log(`TICK REFUSED: no PASS report for ${iid}`); return 1; }
    if (!isFile(ev)) { console.log(`TICK REFUSED: no evidence file for ${iid}`); return 1; }
    const ls = lines(s);
    for (const it of items(s)) {
      if (it.id === iid) {
        ls[it.line] = `- [x] ${iid} ${it.title} | evidence/${iid}.log`;
        fs.writeFileSync(path.join(sdir(s), 'progress.md'), `${ls.join('\n')}\n`);
        const bl = blocked(s);
        delete bl[iid];
        mkdirs(rdir(s));
        writeJson(path.join(rdir(s), 'blocked.json'), bl);
        console.log(`TICKED ${iid}`);
        return 0;
      }
    }
    console.log(`TICK REFUSED: unknown item ${iid}`);
    return 1;
  }
  if (cmd === 'archive') {
    const rows = itemRows(s);
    const problems = [];
    if (!rows.some((r) => r.state !== 'superseded')) problems.push('the saga has no active items');
    problems.push(...rows.filter((r) => r.state === 'pending' || r.state === 'blocked').map((r) => `item ${r.id} is ${r.state}`));
    problems.push(...amendmentErrors(s));
    if (problems.length && !argv.includes('--force')) { console.log(`ARCHIVE REFUSED: ${problems.join('; ')} (use --force to archive anyway)`); return 1; }
    const dest = path.join(ROOT, 'archive', `${today()}-${s}`);
    if (fs.existsSync(dest)) { console.log(`ARCHIVE REFUSED: ${dest} exists`); return 1; }
    mkdirs(path.dirname(dest));
    fs.renameSync(sdir(s), dest);
    console.log(`ARCHIVED ${dest}`);
    return 0;
  }
  console.log(USAGE);
  return 2;
}

process.exitCode = main(process.argv.slice(2));
