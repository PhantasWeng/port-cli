// tests/index.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/index.js';

describe('parseArgs', () => {
  it('returns null port for no args', () => {
    assert.deepStrictEqual(parseArgs([]), { port: null });
  });

  it('parses valid port number', () => {
    assert.deepStrictEqual(parseArgs(['3000']), { port: 3000 });
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
