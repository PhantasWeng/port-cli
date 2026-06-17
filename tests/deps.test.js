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
