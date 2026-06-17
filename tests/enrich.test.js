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
