import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCapture } from './summarize-explore-capture.mjs';

const row = (frame, direction, hex, time = frame) => ({ frame, time, direction, hex });
test('independent streams survive interleaved, fragmented and coalesced frames', () => {
  const result = summarizeCapture([
    row(1, '0x00', '0004'), row(2, '0x01', '0008bffe'),
    row(3, '0x00', '12000000'), row(4, '0x01', 'ffff23e80000'),
    row(5, '0x00', '8002abcd8002abcd'), row(6, '0x01', '80021122'),
  ]);
  assert.equal(result.hostToDevice.frames, 3);
  assert.equal(result.deviceToHost.frames, 2);
  assert.equal(result.hostToDevice.flaggedFrames, 2);
  assert.equal(result.hostToDevice.distinctFrames, 2);
  assert.equal(result.hostToDevice.repeatedFrames, 1);
  assert.deepEqual(result.deviceToHost.payloadLengths, { 2: 1, 8: 1 });
});

test('recognizes only the exact observed startup prefix across every split', () => {
  const prefix = '40'.repeat(64);
  for (let split = 1; split < 64; split++) {
    const result = summarizeCapture([
      row(1, '0x00', prefix.slice(0, split * 2)),
      row(2, '0x00', prefix.slice(split * 2) + '000112'),
    ]);
    assert.equal(result.initialHostPaddingBytes, 64);
    assert.equal(result.hostToDevice.frames, 1);
    assert.equal(result.hostToDevice.bytes, 67);
  }
  assert.throws(() => summarizeCapture([row(1, '0x00', '4041')]), /padding/);
  assert.throws(() => summarizeCapture([row(1, '0x00', '4040')]), /Incomplete/);
});

test('rejects truncated streams and malformed or out-of-order input', () => {
  for (const rows of [
    [], [row(1, '0x00', '0004')], [row(1, '0x01', '800211')],
    [row(1, '0x00', '0000')], [row(1, '0x00', '0')], [row(1, '0x00', 'zz')],
    [row(1, 'unknown', '000112')], [row(1, '0x00', '000112', -1)],
    [row(2, '0x00', '000112'), row(1, '0x01', '000112')],
    [row(1, '0x00', '000112', 2), row(2, '0x01', '000112', 1)],
    [row(1, '0x00', '000112'), row(1, '0x01', '000112')],
  ]) assert.throws(() => summarizeCapture(rows));
});

test('output excludes raw payloads and unrelated private input fields', () => {
  const secret = Buffer.from('PRIVATE-SERIAL-123');
  const header = Buffer.alloc(2);
  header.writeUInt16BE(secret.length);
  const hex = Buffer.concat([header, secret]).toString('hex');
  const output = JSON.stringify(summarizeCapture([
    { ...row(1, '0x01', hex), deviceName: 'PRIVATE-NAME', path: 'PRIVATE-PATH' },
  ]));
  for (const value of [hex, secret.toString('hex'), secret.toString(), 'PRIVATE-NAME', 'PRIVATE-PATH'])
    assert.equal(output.includes(value), false);
  assert.equal(JSON.parse(output).deviceToHost.frames, 1);
});
