# CLI Visual Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rich visual formatting (colors, aligned table, icons, summary) to port-cli output.

**Architecture:** A new `src/format.js` module owns all formatting logic — pure functions that take data and return styled strings. `src/index.js` replaces its `console.log` calls with these format functions. Tests verify formatting output using chalk's strip-color capability.

**Tech Stack:** `chalk` for terminal colors (auto-detects color support), `node:test` + `node:assert` for testing.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/format.js` | All formatting functions: header, table, summary, kill result, empty, error |
| `tests/format.test.js` | Unit tests for all format functions (strip ANSI codes for assertions) |
| `src/index.js` | Replace raw console.log with format function calls |

---

## Task 1: Install chalk & Create Format Module with Header

**Files:**
- Create: `src/format.js`
- Create: `tests/format.test.js`

- [ ] **Step 1: Install chalk**

Run: `npm install chalk`

- [ ] **Step 2: Write failing tests for formatHeader and formatError**

```js
// tests/format.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatHeader, formatError } from '../src/format.js';

// Strip ANSI escape codes for test assertions
function strip(str) {
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

describe('formatHeader', () => {
  it('shows port-cli header without port', () => {
    const result = strip(formatHeader());
    assert.equal(result, '⚡ port-cli');
  });

  it('shows port-specific header', () => {
    const result = strip(formatHeader(3000));
    assert.equal(result, '⚡ port :3000');
  });
});

describe('formatError', () => {
  it('returns red error message', () => {
    const result = strip(formatError('something broke'));
    assert.equal(result, 'something broke');
  });

  it('contains ANSI codes when not stripped', () => {
    const result = formatError('fail');
    assert.notEqual(result, 'fail');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `formatHeader` not found

- [ ] **Step 4: Implement formatHeader and formatError**

```js
// src/format.js
import chalk from 'chalk';

export function formatHeader(port) {
  if (port !== undefined) {
    return `${chalk.bold.cyan('⚡')}${chalk.bold(' port')} ${chalk.cyan(`:${port}`)}`;
  }
  return `${chalk.bold.cyan('⚡')}${chalk.bold(' port-cli')}`;
}

export function formatError(message) {
  return chalk.red(message);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/format.js tests/format.test.js package.json package-lock.json
git commit -m "feat: add format module with header and error formatting"
```

---

## Task 2: formatTable and formatSummary

**Files:**
- Modify: `src/format.js`
- Modify: `tests/format.test.js`

- [ ] **Step 1: Write failing tests for formatTable and formatSummary**

Add to `tests/format.test.js`:

```js
import { formatHeader, formatError, formatTable, formatSummary } from '../src/format.js';

// ... existing tests ...

describe('formatTable', () => {
  it('formats single entry with aligned columns', () => {
    const entries = [{ pid: 1234, name: 'node', port: 3000, user: 'ubuntu' }];
    const result = strip(formatTable(entries));
    // Check header row
    assert.ok(result.includes('PID'));
    assert.ok(result.includes('PROCESS'));
    assert.ok(result.includes('PORT'));
    assert.ok(result.includes('USER'));
    // Check data row
    assert.ok(result.includes('1234'));
    assert.ok(result.includes('node'));
    assert.ok(result.includes(':3000'));
    assert.ok(result.includes('ubuntu'));
  });

  it('aligns columns across multiple rows', () => {
    const entries = [
      { pid: 1234, name: 'node', port: 3000, user: 'ubuntu' },
      { pid: 56789, name: 'nginx', port: 80, user: 'root' },
    ];
    const lines = strip(formatTable(entries)).split('\n');
    // Header + 2 data rows
    assert.equal(lines.length, 3);
    // Verify PROCESS column starts at same position in all rows
    const processCol = lines[0].indexOf('PROCESS');
    assert.ok(processCol > 0);
    assert.equal(lines[1].indexOf('node'), processCol);
    assert.equal(lines[2].indexOf('nginx'), processCol);
  });

  it('truncates long process names with ellipsis', () => {
    const entries = [{ pid: 1, name: 'chromium-browser', port: 80, user: 'u' }];
    const result = strip(formatTable(entries));
    assert.ok(result.includes('chromium-b…'));
    assert.ok(!result.includes('chromium-browser'));
  });
});

describe('formatSummary', () => {
  it('uses singular for 1 process', () => {
    const result = strip(formatSummary(1));
    assert.equal(result, '  1 process listening');
  });

  it('uses plural for multiple processes', () => {
    const result = strip(formatSummary(3));
    assert.equal(result, '  3 processes listening');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `formatTable` not found

- [ ] **Step 3: Implement formatTable and formatSummary**

Add to `src/format.js`:

```js
const COL_PID = 8;
const COL_NAME = 10;
const COL_PORT = 8;

function stripAnsi(str) {
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

function pad(str, width) {
  const visible = stripAnsi(str).length;
  if (visible >= width) return str;
  return str + ' '.repeat(width - visible);
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function formatTable(entries) {
  const header = `  ${pad(chalk.dim('PID'), COL_PID)}${pad(chalk.dim('PROCESS'), COL_NAME)}${pad(chalk.dim('PORT'), COL_PORT)}${chalk.dim('USER')}`;
  const rows = entries.map((e) => {
    const name = truncate(e.name, COL_NAME);
    return `  ${pad(chalk.gray(String(e.pid)), COL_PID)}${pad(chalk.bold.white(name), COL_NAME)}${pad(chalk.cyan(':' + e.port), COL_PORT)}${chalk.gray(e.user)}`;
  });
  return [header, ...rows].join('\n');
}

export function formatSummary(count) {
  return chalk.dim(`  ${count} process${count === 1 ? '' : 'es'} listening`);
}
```

**ANSI-aware padding:** The `pad()` function strips ANSI codes to measure visible width, then pads with spaces accordingly. `truncate()` is applied to plain text **before** colorizing, so ANSI escape sequences are never sliced.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/format.js tests/format.test.js
git commit -m "feat: add table and summary formatting with column alignment"
```

---

## Task 3: formatKillResult and formatEmpty

**Files:**
- Modify: `src/format.js`
- Modify: `tests/format.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/format.test.js`:

```js
import { formatHeader, formatError, formatTable, formatSummary, formatKillResult, formatEmpty } from '../src/format.js';

// ... existing tests ...

describe('formatKillResult', () => {
  it('shows green checkmark on success', () => {
    const result = strip(formatKillResult(
      { success: true, error: null },
      { pid: 1234, name: 'node', port: 3000 },
    ));
    assert.equal(result, '  ✔ Killed PID 1234 (node :3000)');
  });

  it('shows red cross on failure', () => {
    const result = strip(formatKillResult(
      { success: false, error: 'PID 1234: Permission denied. Try running with sudo.' },
      { pid: 1234, name: 'node', port: 3000 },
    ));
    assert.equal(result, '  ✖ PID 1234: Permission denied. Try running with sudo.');
  });
});

describe('formatEmpty', () => {
  it('shows no listening ports message without port', () => {
    const result = strip(formatEmpty());
    assert.equal(result, '  No listening ports found.');
  });

  it('shows port-specific empty message', () => {
    const result = strip(formatEmpty(3000));
    assert.equal(result, '  No process listening on port 3000.');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `formatKillResult` not found

- [ ] **Step 3: Implement formatKillResult and formatEmpty**

Add to `src/format.js`:

```js
export function formatKillResult(result, entry) {
  if (result.success) {
    return `  ${chalk.green('✔')} Killed PID ${entry.pid} (${entry.name} :${entry.port})`;
  }
  return `  ${chalk.red('✖')} ${result.error}`;
}

export function formatEmpty(port) {
  if (port !== undefined) {
    return chalk.yellow(`  No process listening on port ${port}.`);
  }
  return chalk.yellow('  No listening ports found.');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/format.js tests/format.test.js
git commit -m "feat: add kill result and empty state formatting"
```

---

## Task 4: Integrate Format Functions into index.js

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Replace all console output in index.js with format functions**

Replace the entire `src/index.js` with:

```js
// src/index.js
import { checkbox, confirm } from '@inquirer/prompts';
import { getLsofEntries } from './lsof.js';
import { killProcess } from './kill.js';
import {
  formatHeader,
  formatTable,
  formatSummary,
  formatKillResult,
  formatEmpty,
  formatError,
} from './format.js';

export function parseArgs(args) {
  if (args.length === 0) return { port: null };

  const raw = args[0];
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: "${raw}". Must be an integer between 1 and 65535.`);
  }
  return { port };
}

export async function main(args) {
  let parsed;
  try {
    parsed = parseArgs(args);
  } catch (err) {
    console.error(formatError(err.message));
    process.exit(1);
  }

  try {
    if (parsed.port === null) {
      await listAllMode();
    } else {
      await singlePortMode(parsed.port);
    }
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      process.exit(0);
    }
    throw err;
  }
}

async function listAllMode() {
  const entries = getLsofEntries();

  console.log(formatHeader());
  console.log();

  if (entries.length === 0) {
    console.log(formatEmpty());
    return;
  }

  console.log(formatTable(entries));
  console.log();
  console.log(formatSummary(entries.length));
  console.log();

  const choices = entries.map((e) => ({
    name: `[PID ${e.pid}] ${e.name} :${e.port} (${e.user})`,
    value: e,
  }));

  const selected = await checkbox({
    message: 'Select processes to kill:',
    choices,
  });

  if (selected.length === 0) return;

  const yes = await confirm({
    message: `Kill ${selected.length} selected process${selected.length > 1 ? 'es' : ''}?`,
    default: false,
  });

  if (!yes) return;

  for (const entry of selected) {
    const result = killProcess(entry.pid);
    console.log(formatKillResult(result, entry));
  }
}

async function singlePortMode(port) {
  const entries = getLsofEntries(port);

  console.log(formatHeader(port));
  console.log();

  if (entries.length === 0) {
    console.log(formatEmpty(port));
    return;
  }

  console.log(formatTable(entries));
  console.log();
  console.log(formatSummary(entries.length));
  console.log();

  const yes = await confirm({
    message: `Kill ${entries.length > 1 ? 'these processes' : 'this process'}?`,
    default: false,
  });

  if (!yes) return;

  for (const entry of entries) {
    const result = killProcess(entry.pid);
    console.log(formatKillResult(result, entry));
  }
}
```

- [ ] **Step 2: Run all existing tests**

Run: `npm test`
Expected: All 15 existing tests PASS (parseArgs, killProcess, parseLsofOutput)

- [ ] **Step 3: Manual test — list-all mode**

Run: `node bin/port.js`
Expected: Colored header `⚡ port-cli`, aligned table with colored columns, summary line

- [ ] **Step 4: Manual test — single-port mode**

Run: `node bin/port.js 3000`
Expected: Header `⚡ port :3000`, colored table or yellow empty message

- [ ] **Step 5: Manual test — error**

Run: `node bin/port.js abc`
Expected: Red error message

- [ ] **Step 6: Manual test — pipe (no color)**

Run: `node bin/port.js | cat`
Expected: Same output but without ANSI color codes

- [ ] **Step 7: Commit**

```bash
git add src/index.js
git commit -m "feat: integrate visual formatting into CLI output"
```
