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
    assert.deepStrictEqual(b, {
      pid: 5678, name: 'node', user: 'ben', port: 3000,
      cwd: null, command: null, project: null,
    });
  });
});

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
