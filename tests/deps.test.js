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

  it('returns false when a same-named file exists but is not executable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'deps-'));
    const bin = join(dir, 'notexec');
    writeFileSync(bin, 'data\n');
    chmodSync(bin, 0o644);
    assert.strictEqual(commandExists('notexec', dir), false);
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
