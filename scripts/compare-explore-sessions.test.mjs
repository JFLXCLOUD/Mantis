import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareSessions } from './compare-explore-sessions.mjs';

const message = (hex, flagged = false) => {
  const payload = Buffer.from(hex, 'hex'), header = Buffer.alloc(2);
  header.writeUInt16BE(payload.length | (flagged ? 0x8000 : 0));
  return Buffer.concat([header, payload]).toString('hex');
};
const rows = (wire, direction = '0x00', fragmented = false) =>
  (fragmented ? wire.match(/../g) : [wire]).map((hex, index) => ({ frame:index + 1, time:index / 100, direction, hex }));

test('compares sessions independently of packet splits and startup padding', () => {
  const wire = '40'.repeat(64) + message('c7' + '01'.repeat(48)) + message('ab'.repeat(16), true);
  const result = compareSessions(rows(wire), rows(wire, '0x00', true));
  assert.equal(result.transitions.right.initialHostPaddingBytes, 64);
  assert.equal(result.transitions.right.precedingUnflaggedLeadingByte, 'c7');
  assert.equal(result.directions.hostToDevice.sharedDistinctFlaggedPayloads, 1);
  assert.equal(result.unflaggedHostComparisonByPosition[0].exactMatch, true);
  assert.deepEqual(result.unflaggedHostComparisonByPosition[0].changedOffsets, []);
  assert.equal(result.replayVerified, false);
});

test('distinguishes repeated frames, changed sessions and shared aligned blocks', () => {
  const one = message('aa'.repeat(16), true), two = message('bb'.repeat(16), true);
  const long = message('aa'.repeat(16) + 'cc'.repeat(16), true);
  const result = compareSessions(rows(one + one + two), rows(one + long));
  assert.equal(result.directions.hostToDevice.left.frames, 3);
  assert.equal(result.directions.hostToDevice.left.distinctPayloads, 2);
  assert.equal(result.directions.hostToDevice.sharedDistinctFlaggedPayloads, 1);
  assert.equal(result.directions.hostToDevice.sharedDistinctAligned16ByteBlocks, 1);
  assert.equal(result.directions.hostToDevice.rightDistinctFlaggedPayloadsAbsentFromLeft, 1);
  const changed = compareSessions(rows(one), rows(two));
  assert.equal(changed.directions.hostToDevice.sharedDistinctFlaggedPayloads, 0);
});

test('reports changed startup offsets without exposing payloads or input metadata', () => {
  const original = Buffer.from('c7' + '01'.repeat(48), 'hex');
  const changed = Buffer.from(original); changed[7] = 9; changed[40] = 2;
  const privatePayload = Buffer.from('PRIVATE-SERIAL-123').toString('hex');
  const left = rows(message(original.toString('hex')) + message(privatePayload, true));
  left[0].deviceName = 'PRIVATE-DEVICE';
  const right = rows(message(changed.toString('hex')) + message('fe'.repeat(16), true));
  const result = compareSessions(left, right);
  assert.deepEqual(result.unflaggedHostComparisonByPosition[0].changedOffsets, [7,40]);
  for (const secret of [original.toString('hex'), privatePayload, 'PRIVATE-SERIAL-123', 'PRIVATE-DEVICE'])
    assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(result.directions.hostToDevice.left.framesWithPayloadMultipleOf16, 0);
});

test('keeps directions separate and refuses incomplete observations', () => {
  const wire = message('11'.repeat(16), true);
  const result = compareSessions(rows(wire), rows(wire, '0x01'));
  assert.equal(result.directions.hostToDevice.sharedDistinctFlaggedPayloads, 0);
  assert.equal(result.transitions.right.firstFlaggedFrameCompletionSeconds, null);
  assert.throws(() => compareSessions(rows(wire), rows(wire.slice(0,-2))), /Incomplete/);
});
