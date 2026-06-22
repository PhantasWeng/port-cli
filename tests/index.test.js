// tests/index.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, searchSource } from '../src/index.js';
import { inlineLabel } from '../src/enrich.js';

describe('parseArgs', () => {
  it('returns null port for no args', () => {
    assert.deepStrictEqual(parseArgs([]), { port: null, filter: null });
  });

  it('parses valid port number', () => {
    assert.deepStrictEqual(parseArgs(['3000']), { port: 3000, filter: null });
  });

  it('throws for non-numeric arg', () => {
    assert.throws(() => parseArgs(['abc']), /invalid port/i);
  });

  it('throws for port 0', () => {
    assert.throws(() => parseArgs(['0']), /invalid port/i);
  });

  it('throws for port > 65535', () => {
    assert.throws(() => parseArgs(['70000']), /invalid port/i);
  });

  it('throws for negative port', () => {
    assert.throws(() => parseArgs(['-1']), /invalid port/i);
  });

  it('throws for decimal port', () => {
    assert.throws(() => parseArgs(['3.5']), /invalid port/i);
  });
});

describe('searchSource', () => {
  const entries = [
    { pid: 1234, name: 'node', port: 3000, user: 'ubuntu', cwd: '/home/ubuntu/myproject', command: 'node server.js', project: 'myproject' },
    { pid: 5678, name: 'postgres', port: 5432, user: 'postgres', cwd: null, command: 'postgres', project: null },
  ];

  it('keeps the match when the term is a full label (Tab autocomplete)', () => {
    const term = inlineLabel(entries[0]);
    const result = searchSource(entries, term);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].value, entries[0]);
  });

  it('still fuzzy-matches normal search terms', () => {
    const result = searchSource(entries, 'postgres');
    assert.strictEqual(result[0].value, entries[1]);
  });

  it('returns all entries for an empty term', () => {
    assert.strictEqual(searchSource(entries, '').length, entries.length);
  });
});
