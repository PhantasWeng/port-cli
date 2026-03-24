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
