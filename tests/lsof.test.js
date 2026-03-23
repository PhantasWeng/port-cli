import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseLsofOutput } from '../src/lsof.js';

describe('parseLsofOutput', () => {
  it('parses single process', () => {
    const raw = 'p1234\ncnode\nLubuntu\nf12\nPTCP\nn*:3000\n';
    const result = parseLsofOutput(raw);
    assert.deepStrictEqual(result, [
      { pid: 1234, name: 'node', user: 'ubuntu', port: 3000 },
    ]);
  });

  it('parses multiple processes', () => {
    const raw = 'p1234\ncnode\nLubuntu\nf12\nPTCP\nn*:3000\np5678\ncnginx\nLroot\nf6\nPTCP\nn*:80\n';
    const result = parseLsofOutput(raw);
    assert.deepStrictEqual(result, [
      { pid: 1234, name: 'node', user: 'ubuntu', port: 3000 },
      { pid: 5678, name: 'nginx', user: 'root', port: 80 },
    ]);
  });

  it('returns empty array for empty output', () => {
    assert.deepStrictEqual(parseLsofOutput(''), []);
  });

  it('handles IPv6 address format', () => {
    const raw = 'p1234\ncnode\nLubuntu\nf12\nPTCP\nn[::1]:3000\n';
    const result = parseLsofOutput(raw);
    assert.deepStrictEqual(result, [
      { pid: 1234, name: 'node', user: 'ubuntu', port: 3000 },
    ]);
  });

  it('deduplicates by pid+port', () => {
    const raw = 'p1234\ncnode\nLubuntu\nf12\nPTCP\nn*:3000\np1234\ncnode\nLubuntu\nf13\nPTCP\nn127.0.0.1:3000\n';
    const result = parseLsofOutput(raw);
    assert.deepStrictEqual(result, [
      { pid: 1234, name: 'node', user: 'ubuntu', port: 3000 },
    ]);
  });
});
