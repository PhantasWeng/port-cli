import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { killProcess } from '../src/kill.js';

describe('killProcess', () => {
  it('returns success for valid kill', (t) => {
    // Mock process.kill to not actually kill anything
    t.mock.method(process, 'kill', () => {});
    const result = killProcess(12345);
    assert.deepStrictEqual(result, { pid: 12345, success: true, error: null });
  });

  it('returns error for EPERM', (t) => {
    t.mock.method(process, 'kill', () => {
      const err = new Error('Operation not permitted');
      err.code = 'EPERM';
      throw err;
    });
    const result = killProcess(12345);
    assert.equal(result.pid, 12345);
    assert.equal(result.success, false);
    assert.match(result.error, /permission denied.*sudo/i);
  });

  it('returns error for ESRCH (process already gone)', (t) => {
    t.mock.method(process, 'kill', () => {
      const err = new Error('No such process');
      err.code = 'ESRCH';
      throw err;
    });
    const result = killProcess(12345);
    assert.equal(result.pid, 12345);
    assert.equal(result.success, false);
    assert.match(result.error, /no longer running/i);
  });
});
