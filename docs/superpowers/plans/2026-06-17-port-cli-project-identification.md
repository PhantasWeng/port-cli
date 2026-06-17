# Show Project Source in Port List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich each listening-port entry with its working directory and launch command so the user can tell which project a generic process (e.g. `node :8000`) belongs to.

**Architecture:** A new `src/enrich.js` module fetches cwd (via `lsof -d cwd`) and command (via `ps`) in one batched call each, merges them onto the base entries, and derives a `project` name from the cwd basename. Pure parse/merge/display helpers are unit-tested; `index.js` and `fuzzy.js` consume them. Missing data degrades to `null` and never breaks the listing.

**Tech Stack:** Node.js ESM, `node:child_process` (`execFileSync`), `node:test` + `node:assert/strict`, `@inquirer/prompts`.

Spec: `docs/superpowers/specs/2026-06-17-port-cli-project-identification-design.md`

---

### Task 1: Output parsers in `src/enrich.js`

**Files:**
- Create: `src/enrich.js`
- Test: `tests/enrich.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/enrich.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePsOutput, parseCwdOutput } from '../src/enrich.js';

describe('parsePsOutput', () => {
  it('maps pid to full command, tolerating leading pad and spaces in command', () => {
    const raw = ' 1234 node /Users/ben/code/my-app/server.js\n 5678 next-router-worker\n';
    const result = parsePsOutput(raw);
    assert.strictEqual(result.get(1234), 'node /Users/ben/code/my-app/server.js');
    assert.strictEqual(result.get(5678), 'next-router-worker');
  });

  it('returns empty map for empty output', () => {
    assert.strictEqual(parsePsOutput('').size, 0);
  });
});

describe('parseCwdOutput', () => {
  it('maps pid to cwd from lsof -F pn output', () => {
    const raw = 'p1234\nn/Users/ben/code/my-app\np5678\nn/Users/ben/code/blog-api\n';
    const result = parseCwdOutput(raw);
    assert.strictEqual(result.get(1234), '/Users/ben/code/my-app');
    assert.strictEqual(result.get(5678), '/Users/ben/code/blog-api');
  });

  it('returns empty map for empty output', () => {
    assert.strictEqual(parseCwdOutput('').size, 0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/enrich.test.js`
Expected: FAIL — `parsePsOutput`/`parseCwdOutput` not exported (module not found / undefined).

- [ ] **Step 3: Write minimal implementation**

```js
// src/enrich.js
export function parsePsOutput(raw) {
  const map = new Map();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sp = trimmed.indexOf(' ');
    if (sp === -1) continue;
    const pid = Number(trimmed.slice(0, sp));
    const command = trimmed.slice(sp + 1).trim();
    if (Number.isInteger(pid) && command) map.set(pid, command);
  }
  return map;
}

export function parseCwdOutput(raw) {
  const map = new Map();
  let pid = null;
  for (const line of raw.split('\n')) {
    const tag = line[0];
    const value = line.slice(1);
    if (tag === 'p') pid = Number(value);
    else if (tag === 'n' && pid !== null) map.set(pid, value);
  }
  return map;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/enrich.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/enrich.js tests/enrich.test.js
git commit -m "feat(enrich): parse ps and lsof cwd output into pid maps"
```

---

### Task 2: Merge enrichment onto entries

**Files:**
- Modify: `src/enrich.js`
- Test: `tests/enrich.test.js`

- [ ] **Step 1: Write the failing test**

Append to `tests/enrich.test.js`:

```js
import { mergeEnrichment } from '../src/enrich.js';

describe('mergeEnrichment', () => {
  const entries = [
    { pid: 1234, name: 'node', user: 'ben', port: 8000 },
    { pid: 5678, name: 'node', user: 'ben', port: 3000 },
  ];

  it('fills cwd, command, and project (basename of cwd)', () => {
    const cmd = new Map([[1234, 'next dev']]);
    const cwd = new Map([[1234, '/Users/ben/code/my-app']]);
    const [a, b] = mergeEnrichment(entries, cmd, cwd);
    assert.deepStrictEqual(a, {
      pid: 1234, name: 'node', user: 'ben', port: 8000,
      cwd: '/Users/ben/code/my-app', command: 'next dev', project: 'my-app',
    });
    // 5678 had no data: degrade to null, keep listing intact
    assert.deepStrictEqual(b, {
      pid: 5678, name: 'node', user: 'ben', port: 3000,
      cwd: null, command: null, project: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/enrich.test.js`
Expected: FAIL — `mergeEnrichment` not exported.

- [ ] **Step 3: Write minimal implementation**

Add to top of `src/enrich.js`:

```js
import { basename } from 'node:path';
```

Add function:

```js
export function mergeEnrichment(entries, commandMap, cwdMap) {
  return entries.map((e) => {
    const cwd = cwdMap.get(e.pid) ?? null;
    const command = commandMap.get(e.pid) ?? null;
    return { ...e, cwd, command, project: cwd ? basename(cwd) : null };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/enrich.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/enrich.js tests/enrich.test.js
git commit -m "feat(enrich): merge command/cwd maps onto entries with project name"
```

---

### Task 3: Display helpers (inline label + detail line + `~` shortening)

**Files:**
- Modify: `src/enrich.js`
- Test: `tests/enrich.test.js`

- [ ] **Step 1: Write the failing test**

Append to `tests/enrich.test.js`:

```js
import { shortenHome, detailLine, inlineLabel } from '../src/enrich.js';

const HOME = '/Users/ben';

describe('shortenHome', () => {
  it('replaces home prefix with ~', () => {
    assert.strictEqual(shortenHome('/Users/ben/code/my-app', HOME), '~/code/my-app');
  });
  it('returns ~ for exact home', () => {
    assert.strictEqual(shortenHome('/Users/ben', HOME), '~');
  });
  it('leaves non-home paths unchanged', () => {
    assert.strictEqual(shortenHome('/var/www', HOME), '/var/www');
  });
});

describe('detailLine', () => {
  it('joins cwd and command with a dot', () => {
    const e = { cwd: '/Users/ben/code/my-app', command: 'next dev' };
    assert.strictEqual(detailLine(e, HOME), '~/code/my-app · next dev');
  });
  it('shows only cwd when command missing', () => {
    assert.strictEqual(detailLine({ cwd: '/Users/ben/x', command: null }, HOME), '~/x');
  });
  it('shows only command when cwd missing', () => {
    assert.strictEqual(detailLine({ cwd: null, command: 'node a.js' }, HOME), 'node a.js');
  });
  it('returns null when both missing', () => {
    assert.strictEqual(detailLine({ cwd: null, command: null }, HOME), null);
  });
});

describe('inlineLabel', () => {
  it('appends project when present', () => {
    const e = { pid: 1234, name: 'node', port: 8000, user: 'ben', project: 'my-app' };
    assert.strictEqual(inlineLabel(e), '[PID 1234] node :8000 (ben) — my-app');
  });
  it('omits project suffix when null', () => {
    const e = { pid: 1234, name: 'node', port: 8000, user: 'ben', project: null };
    assert.strictEqual(inlineLabel(e), '[PID 1234] node :8000 (ben)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/enrich.test.js`
Expected: FAIL — helpers not exported.

- [ ] **Step 3: Write minimal implementation**

Add to top of `src/enrich.js`:

```js
import { homedir } from 'node:os';
```

Add functions:

```js
export function shortenHome(p, home = homedir()) {
  if (!p) return p;
  if (p === home) return '~';
  if (home && p.startsWith(home + '/')) return '~' + p.slice(home.length);
  return p;
}

export function detailLine(entry, home = homedir()) {
  const parts = [];
  if (entry.cwd) parts.push(shortenHome(entry.cwd, home));
  if (entry.command) parts.push(entry.command);
  return parts.length ? parts.join(' · ') : null;
}

export function inlineLabel(entry) {
  const base = `[PID ${entry.pid}] ${entry.name} :${entry.port} (${entry.user})`;
  return entry.project ? `${base} — ${entry.project}` : base;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/enrich.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/enrich.js tests/enrich.test.js
git commit -m "feat(enrich): add inline label and detail line display helpers"
```

---

### Task 4: Subprocess fetchers + `enrichEntries` orchestrator

**Files:**
- Modify: `src/enrich.js`

No unit test: these wrap live `ps`/`lsof`. Logic is the already-tested parsers + `mergeEnrichment`; the only new behavior is "swallow errors → empty map", verified manually.

- [ ] **Step 1: Add the fetchers and orchestrator**

Add to top of `src/enrich.js`:

```js
import { execFileSync } from 'node:child_process';
```

Add functions:

```js
export function getCommands(pids) {
  if (pids.length === 0) return new Map();
  try {
    const out = execFileSync('ps', ['-p', pids.join(','), '-o', 'pid=,command='], { encoding: 'utf-8' });
    return parsePsOutput(out);
  } catch {
    return new Map();
  }
}

export function getCwds(pids) {
  if (pids.length === 0) return new Map();
  try {
    const out = execFileSync('lsof', ['-a', '-p', pids.join(','), '-d', 'cwd', '-F', 'pn'], { encoding: 'utf-8' });
    return parseCwdOutput(out);
  } catch {
    return new Map();
  }
}

export function enrichEntries(entries) {
  if (entries.length === 0) return entries;
  const pids = [...new Set(entries.map((e) => e.pid))];
  return mergeEnrichment(entries, getCommands(pids), getCwds(pids));
}
```

- [ ] **Step 2: Manual smoke test against real processes**

Run: `node -e "import('./src/lsof.js').then(async (l) => { const { enrichEntries } = await import('./src/enrich.js'); console.log(enrichEntries(l.getLsofEntries())); })"`
Expected: array of entries each with `cwd`, `command`, `project` fields (values populated for your own processes; `null` for processes you can't inspect). No crash.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: PASS (existing + enrich tests).

- [ ] **Step 4: Commit**

```bash
git add src/enrich.js
git commit -m "feat(enrich): batch-fetch ps/lsof cwd and orchestrate enrichEntries"
```

---

### Task 5: Make project/cwd/command searchable in `fuzzy.js`

**Files:**
- Modify: `src/fuzzy.js:3-5`
- Test: `tests/fuzzy.test.js` (create if absent)

- [ ] **Step 1: Write the failing test**

Create/append `tests/fuzzy.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fuzzyFilter } from '../src/fuzzy.js';

describe('fuzzyFilter project matching', () => {
  const entries = [
    { pid: 1, name: 'node', port: 8000, user: 'ben', cwd: '/Users/ben/code/my-app', command: 'next dev', project: 'my-app' },
    { pid: 2, name: 'node', port: 3000, user: 'ben', cwd: '/Users/ben/code/blog-api', command: 'node server.js', project: 'blog-api' },
  ];

  it('matches by project name', () => {
    const result = fuzzyFilter(entries, 'blog-api');
    assert.strictEqual(result[0].pid, 2);
  });

  it('matches by command', () => {
    const result = fuzzyFilter(entries, 'next');
    assert.strictEqual(result[0].pid, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/fuzzy.test.js`
Expected: FAIL — `next`/`blog-api` not present in the current search string (which is only `pid name port user`).

- [ ] **Step 3: Update `entryToString`**

Replace `entryToString` in `src/fuzzy.js` (lines 3-5):

```js
function entryToString(entry) {
  return [entry.pid, entry.name, entry.port, entry.user, entry.cwd, entry.command, entry.project]
    .filter(Boolean)
    .join(' ');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/fuzzy.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/fuzzy.js tests/fuzzy.test.js
git commit -m "feat(fuzzy): include cwd, command, and project in search string"
```

---

### Task 6: Wire enrichment into `index.js` display

**Files:**
- Modify: `src/index.js` (imports; `listAllMode` ~line 99 and search source ~120-126; `singlePortMode` ~line 155 and print loop ~163-165)

No unit test: this is inquirer-driven I/O. Verified by the manual smoke test in Step 5.

- [ ] **Step 1: Add the import**

In `src/index.js`, after the existing `import { getLsofEntries } from './lsof.js';` line, add:

```js
import { enrichEntries, inlineLabel, detailLine } from './enrich.js';
```

- [ ] **Step 2: Enrich entries in `listAllMode`**

In `listAllMode`, change:

```js
  let entries = getLsofEntries();
```

to:

```js
  let entries = enrichEntries(getLsofEntries());
```

- [ ] **Step 3: Use label + description in the search source**

In `listAllMode`, replace the `source` mapping:

```js
      source: (term) => {
        const filtered = fuzzyFilter(entries, term || '');
        return filtered.map((e) => ({
          name: `[PID ${e.pid}] ${e.name} :${e.port} (${e.user})`,
          value: e,
        }));
      },
```

with:

```js
      source: (term) => {
        const filtered = fuzzyFilter(entries, term || '');
        return filtered.map((e) => ({
          name: inlineLabel(e),
          value: e,
          description: detailLine(e) ?? undefined,
        }));
      },
```

- [ ] **Step 4: Enrich + print detail in `singlePortMode`**

In `singlePortMode`, change:

```js
  const entries = getLsofEntries(port);
```

to:

```js
  const entries = enrichEntries(getLsofEntries(port));
```

Then replace the print loop:

```js
  for (const e of entries) {
    console.log(`  [PID ${e.pid}] ${e.name} :${e.port} (${e.user})`);
  }
```

with:

```js
  for (const e of entries) {
    console.log(`  ${inlineLabel(e)}`);
    const detail = detailLine(e);
    if (detail) console.log(`    ↳ ${detail}`);
  }
```

- [ ] **Step 5: Manual end-to-end verification**

Start a throwaway server in a known directory, then list it:

Run:
```bash
(cd /tmp && node -e "require('http').createServer().listen(8000)" &) ; sleep 1 ; node bin/port.js 8000
```
Expected: output shows `[PID …] node :8000 (<you>)` followed by `↳ /tmp · node -e …`. Answer `n` at the kill prompt. Then clean up: `node bin/port.js 8000` again and kill it, or `kill <pid>`.

Also run `node bin/port.js` and confirm the interactive list shows ` — <project>` inline and the cwd · command detail under the highlighted row.

- [ ] **Step 6: Run full suite + commit**

Run: `npm test`
Expected: PASS.

```bash
git add src/index.js
git commit -m "feat(index): show project cwd and command in port listings"
```

---

## Notes for the implementer

- **ESM only** — all imports use `node:` prefix for builtins, matching existing code.
- **`execFileSync`, never `execSync`** — no shell, pids are joined with commas and passed as a single argv element.
- **Never throw from enrichment** — `getCommands`/`getCwds` return empty maps on any failure; `mergeEnrichment` fills `null`. A process you can't inspect must still appear in the list.
- **`description` field** — `@inquirer/prompts` `search` renders `description` below the active choice; pass `undefined` (not `null`) when there's nothing to show.
