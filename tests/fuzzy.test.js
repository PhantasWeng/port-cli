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
