import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatHeader, formatError, formatTable, formatSummary, formatKillResult, formatEmpty } from '../src/format.js';

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

describe('formatTable', () => {
  it('formats single entry with aligned columns', () => {
    const entries = [{ pid: 1234, name: 'node', port: 3000, user: 'ubuntu' }];
    const result = strip(formatTable(entries));
    assert.ok(result.includes('PID'));
    assert.ok(result.includes('PROCESS'));
    assert.ok(result.includes('PORT'));
    assert.ok(result.includes('USER'));
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
    assert.equal(lines.length, 3);
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
