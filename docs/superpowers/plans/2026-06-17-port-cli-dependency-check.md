# External Command Dependency Check — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect whether the external commands `port-cli` depends on (`lsof`, `ps`) are installed; block with a clear message + install hint when a required one is missing, warn-and-continue when an optional one is missing, and provide a `port doctor` subcommand that lists all dependency statuses.

**Architecture:** A new `src/deps.js` module declares the dependency list, detects command presence by scanning `PATH` with `node:fs` (no subprocess), and exposes pure helpers for install hints, a status report, and preflight problem lists. `src/index.js` intercepts `port doctor` before arg parsing and runs a preflight check before listing ports.

**Tech Stack:** Node.js ESM, `node:fs` (`accessSync`), `node:path`, `node:test` + `node:assert/strict`.

Spec: `docs/superpowers/specs/2026-06-17-port-cli-dependency-check-design.md`

---

### Task 1: `commandExists` + `installHint` + `DEPENDENCIES` in `src/deps.js`

**Files:**
- Create: `src/deps.js`
- Test: `tests/deps.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// tests/deps.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commandExists, installHint, DEPENDENCIES } from '../src/deps.js';

describe('commandExists', () => {
  it('finds an executable on the given PATH', () => {
    const dir = mkdtempSync(join(tmpdir(), 'deps-'));
    const bin = join(dir, 'faketool');
    writeFileSync(bin, '#!/bin/sh\n');
    chmodSync(bin, 0o755);
    assert.strictEqual(commandExists('faketool', dir), true);
  });

  it('returns false when the command is absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'deps-'));
    assert.strictEqual(commandExists('definitely-not-here', dir), false);
  });

  it('returns false for empty PATH', () => {
    assert.strictEqual(commandExists('lsof', ''), false);
  });
});

describe('installHint', () => {
  const dep = { cmd: 'ps', hints: { linux: 'apt install procps', darwin: 'macOS 內建' } };

  it('returns the darwin hint on macOS', () => {
    assert.strictEqual(installHint(dep, 'darwin'), 'macOS 內建');
  });
  it('returns the linux hint on Linux', () => {
    assert.strictEqual(installHint(dep, 'linux'), 'apt install procps');
  });
  it('falls back for unknown platforms', () => {
    assert.strictEqual(installHint(dep, 'sunos'), '請用你的套件管理員安裝 ps');
  });
});

describe('DEPENDENCIES', () => {
  it('declares lsof as required and ps as optional', () => {
    const lsof = DEPENDENCIES.find((d) => d.cmd === 'lsof');
    const ps = DEPENDENCIES.find((d) => d.cmd === 'ps');
    assert.strictEqual(lsof.required, true);
    assert.strictEqual(ps.required, false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/deps.test.js`
Expected: FAIL — `src/deps.js` does not exist / exports undefined.

- [ ] **Step 3: Write minimal implementation**

```js
// src/deps.js
import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';

export const DEPENDENCIES = [
  {
    cmd: 'lsof',
    required: true,
    purpose: '列出 listening ports',
    hints: { linux: 'apt install lsof（或你的發行版套件）', darwin: 'brew install lsof' },
  },
  {
    cmd: 'ps',
    required: false,
    purpose: '顯示 process 啟動指令',
    hints: { linux: 'apt install procps', darwin: 'macOS 內建' },
  },
];

export function commandExists(cmd, pathEnv = process.env.PATH) {
  if (!pathEnv) return false;
  for (const dir of pathEnv.split(':')) {
    if (!dir) continue;
    try {
      accessSync(join(dir, cmd), constants.X_OK);
      return true;
    } catch {
      // not executable in this dir; keep scanning
    }
  }
  return false;
}

export function installHint(dep, platform = process.platform) {
  if (platform === 'darwin') return dep.hints.darwin;
  if (platform === 'linux') return dep.hints.linux;
  return `請用你的套件管理員安裝 ${dep.cmd}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/deps.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/deps.js tests/deps.test.js
git commit -m "feat(deps): declare dependencies, detect commands via PATH scan, install hints"
```

---

### Task 2: `checkDependencies` + `formatDoctorReport` + `formatPreflightProblems`

**Files:**
- Modify: `src/deps.js`
- Test: `tests/deps.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `tests/deps.test.js`:

```js
import { checkDependencies, formatDoctorReport, formatPreflightProblems } from '../src/deps.js';

// existsFn that recognises only the named commands
const only = (...names) => (cmd) => names.includes(cmd);

describe('checkDependencies', () => {
  it('marks found/required/hint per dependency', () => {
    const results = checkDependencies(DEPENDENCIES, only('lsof'));
    const lsof = results.find((r) => r.cmd === 'lsof');
    const ps = results.find((r) => r.cmd === 'ps');
    assert.strictEqual(lsof.found, true);
    assert.strictEqual(lsof.required, true);
    assert.strictEqual(ps.found, false);
    assert.strictEqual(ps.required, false);
    assert.ok(typeof ps.hint === 'string' && ps.hint.length > 0);
    assert.strictEqual(ps.purpose, '顯示 process 啟動指令');
  });
});

describe('formatDoctorReport', () => {
  it('shows a check for found and a cross + install line for missing', () => {
    const results = checkDependencies(DEPENDENCIES, only('lsof'));
    const out = formatDoctorReport(results);
    assert.match(out, /✓ lsof/);
    assert.match(out, /✗ ps/);
    assert.match(out, /安裝：apt install procps/);
  });
});

describe('formatPreflightProblems', () => {
  it('puts missing required into errors, missing optional into warnings', () => {
    const results = checkDependencies(DEPENDENCIES, only('ps')); // lsof missing, ps present
    const { errors, warnings } = formatPreflightProblems(results);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(warnings.length, 0);
    assert.match(errors[0], /缺少必要命令 lsof/);
    assert.match(errors[0], /安裝：/);
  });

  it('warns (not errors) when only an optional dep is missing', () => {
    const results = checkDependencies(DEPENDENCIES, only('lsof')); // ps missing
    const { errors, warnings } = formatPreflightProblems(results);
    assert.strictEqual(errors.length, 0);
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0], /ps 未安裝/);
  });

  it('returns empty arrays when everything is present', () => {
    const results = checkDependencies(DEPENDENCIES, only('lsof', 'ps'));
    const { errors, warnings } = formatPreflightProblems(results);
    assert.strictEqual(errors.length, 0);
    assert.strictEqual(warnings.length, 0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/deps.test.js`
Expected: FAIL — `checkDependencies` / `formatDoctorReport` / `formatPreflightProblems` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/deps.js`:

```js
export function checkDependencies(deps = DEPENDENCIES, existsFn = commandExists) {
  return deps.map((dep) => ({
    cmd: dep.cmd,
    required: dep.required,
    purpose: dep.purpose,
    found: existsFn(dep.cmd),
    hint: installHint(dep),
  }));
}

export function formatDoctorReport(results) {
  const lines = ['依賴檢查：'];
  for (const r of results) {
    const mark = r.found ? '✓' : '✗';
    const status = r.found ? '已安裝' : '未安裝';
    lines.push(`  ${mark} ${r.cmd} ${status}  — ${r.purpose}`);
    if (!r.found) lines.push(`      安裝：${r.hint}`);
  }
  return lines.join('\n');
}

export function formatPreflightProblems(results) {
  const errors = [];
  const warnings = [];
  for (const r of results) {
    if (r.found) continue;
    if (r.required) {
      errors.push(`❌ 缺少必要命令 ${r.cmd}：無法${r.purpose}\n   安裝：${r.hint}`);
    } else {
      warnings.push(`⚠  ${r.cmd} 未安裝：將無法${r.purpose}（安裝：${r.hint}）`);
    }
  }
  return { errors, warnings };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/deps.test.js`
Expected: PASS (all Task 1 + Task 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/deps.js tests/deps.test.js
git commit -m "feat(deps): add checkDependencies, doctor report, and preflight problem formatting"
```

---

### Task 3: Wire `doctor` subcommand + startup preflight into `src/index.js`

**Files:**
- Modify: `src/index.js` (import after the enrich import; `HELP_TEXT` ~line 13-28; top of `main` ~line 65; second `try` block ~line 74)

No unit test: this is process-level I/O (console + `process.exit`). Verified by the manual runs in Step 5. The logic it calls is already unit-tested in Tasks 1–2.

- [ ] **Step 1: Add the import**

In `src/index.js`, immediately after the line `import { enrichEntries, inlineLabel, detailLine } from './enrich.js';`, add:

```js
import { checkDependencies, formatDoctorReport, formatPreflightProblems } from './deps.js';
```

- [ ] **Step 2: Document `doctor` in `HELP_TEXT`**

In `src/index.js`, in the `HELP_TEXT` template, replace this line:

```js
  port --filter node  Filter ports by process name.`;
```

with:

```js
  port --filter node  Filter ports by process name.
  port doctor        Check required external commands and report status.`;
```

- [ ] **Step 3: Intercept `doctor` at the top of `main`**

In `src/index.js`, change the start of `main` from:

```js
export async function main(args) {
  let parsed;
```

to:

```js
export async function main(args) {
  if (args[0] === 'doctor') {
    const results = checkDependencies();
    console.log(formatDoctorReport(results));
    process.exit(results.some((r) => r.required && !r.found) ? 1 : 0);
  }

  let parsed;
```

- [ ] **Step 4: Run preflight before routing**

In `src/index.js`, change the second `try` block from:

```js
  try {
    if (parsed.port === null) {
      await listAllMode(parsed.filter);
    } else {
      await singlePortMode(parsed.port);
    }
  } catch (err) {
```

to:

```js
  try {
    const { errors, warnings } = formatPreflightProblems(checkDependencies());
    if (errors.length) {
      for (const e of errors) console.error(e);
      process.exit(1);
    }
    for (const w of warnings) console.error(w);

    if (parsed.port === null) {
      await listAllMode(parsed.filter);
    } else {
      await singlePortMode(parsed.port);
    }
  } catch (err) {
```

- [ ] **Step 5: Manual end-to-end verification**

Run each and confirm the described behavior:

1. Doctor, all present (this box has `lsof` + `ps`):
   ```
   node bin/port.js doctor
   ```
   Expected: `依賴檢查：` header, `✓ lsof 已安裝`, `✓ ps 已安裝`; exit code 0 (`echo $?`).

2. Doctor, nothing on PATH:
   ```
   PATH=/nonexistent node bin/port.js doctor ; echo "exit=$?"
   ```
   Expected: `✗ lsof 未安裝` + install line, `✗ ps 未安裝` + install line; `exit=1`.

3. Preflight blocks when required missing:
   ```
   PATH=/nonexistent node bin/port.js ; echo "exit=$?"
   ```
   Expected: `❌ 缺少必要命令 lsof：無法列出 listening ports` and an install line; `exit=1`. (No interactive prompt appears.)

4. Preflight warns-and-continues when only optional missing. Build a PATH dir that has `lsof` but not `ps`:
   ```
   D=$(mktemp -d); ln -s "$(command -v lsof)" "$D/lsof"; PATH="$D" node bin/port.js 2>&1 | head -3
   ```
   Expected: first line is `⚠  ps 未安裝：將無法顯示 process 啟動指令（安裝：apt install procps）`, then the normal port listing UI begins (or "No listening ports found."). Press Ctrl+C to exit the prompt if it opens.

5. Help mentions doctor:
   ```
   node bin/port.js --help | grep doctor
   ```
   Expected: the `port doctor` line prints.

- [ ] **Step 6: Run full suite + commit**

Run: `npm test`
Expected: PASS (existing + deps tests).

```bash
git add src/index.js
git commit -m "feat(index): add doctor subcommand and startup dependency preflight"
```

---

## Notes for the implementer

- **ESM only**, `node:`-prefixed builtin imports, matching existing files.
- **`doctor` is intercepted before `parseArgs`** so the existing `parseArgs` tests stay untouched and a bare word like `doctor` is never treated as an invalid port.
- **Preflight runs inside the second `try`** so it sits after `parseArgs` (which already `process.exit`s on bad args / handles `--help`/`--version`) and before any port listing.
- **Required vs optional:** only `lsof` blocks (`exit 1`); `ps` missing prints a one-line `⚠` warning to stderr and execution continues — enrichment already degrades `command` to `null` when `ps` is unavailable.
- Warnings and errors go to **stderr** (`console.error`); the doctor report goes to **stdout** (`console.log`).
