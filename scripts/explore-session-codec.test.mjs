import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCipheriv } from 'node:crypto';
import { createExploreSessionRequest, deriveExploreSessionKey, encodeExploreCommand, decodeExploreEnvelope } from './explore-session-codec.mjs';

// All keys/data below are synthetic test fixtures, unrelated to any machine.
const key = Buffer.alloc(32, 0x19);
function encryptedFixture(clear, fixtureKey = key) {
  const cipher = createCipheriv('aes-256-ecb', fixtureKey, null);
  cipher.setAutoPadding(false);
  const frame = Buffer.alloc(clear.length + 2);
  frame.writeUInt16BE(0x8000 | clear.length);
  Buffer.concat([cipher.update(clear), cipher.final()]).copy(frame, 2);
  return frame;
}
function setChecksum(clear) {
  clear[clear.length - 1] = clear.subarray(0, -1).reduce((sum, byte) => (sum + byte) & 255, 0);
  return clear;
}

test('host envelope matches independently constructed bytes at block boundaries', () => {
  for (const n of [1, 13, 14, 15, 29, 30, 31, 64, 509]) {
    const payload = Buffer.alloc(n, 0x72);
    const clear = Buffer.alloc(Math.ceil((n + 3) / 16) * 16);
    clear.writeUInt16BE(n); payload.copy(clear, 2); setChecksum(clear);
    const frame = encodeExploreCommand(payload, key);
    assert.deepEqual(frame, encryptedFixture(clear));
    assert.deepEqual(decodeExploreEnvelope(frame, key, 'host'), payload);
  }
});

test('device length is little endian and nonzero reply padding is allowed', () => {
  const clear = Buffer.alloc(32, 0xa6);
  clear.writeUInt16LE(3); Buffer.from([0x60, 1, 2]).copy(clear, 2); setChecksum(clear);
  const frame = encryptedFixture(clear);
  assert.deepEqual(decodeExploreEnvelope(frame, key, 'device'), Buffer.from([0x60, 1, 2]));
  assert.throws(() => decodeExploreEnvelope(frame, key, 'host'), /length/);
});

test('rejects broken boundaries, wrong keys, checksum errors and bad inner lengths', () => {
  const frame = encodeExploreCommand(Buffer.from([0x60, 0, 0, 0]), key);
  for (const bad of [frame.subarray(0, -1), Buffer.concat([frame, Buffer.alloc(1)]), Buffer.alloc(18), Buffer.alloc(515)])
    assert.throws(() => decodeExploreEnvelope(bad, key, 'device'));
  assert.throws(() => decodeExploreEnvelope(frame, Buffer.alloc(32, 0xff), 'host'));
  assert.throws(() => decodeExploreEnvelope(frame, key, 'unknown'));
  for (const n of [0, 14, 65535]) {
    const clear = Buffer.alloc(16); clear.writeUInt16BE(n); setChecksum(clear);
    assert.throws(() => decodeExploreEnvelope(encryptedFixture(clear), key, 'host'), /length/);
  }
  const clear = Buffer.alloc(16); clear.writeUInt16BE(1); clear[2] = 0x60;
  assert.throws(() => decodeExploreEnvelope(encryptedFixture(clear), key, 'host'), /checksum/);
  clear[5] = 1; setChecksum(clear);
  assert.throws(() => decodeExploreEnvelope(encryptedFixture(clear), key, 'host'), /padding/);
});

test('session reply extracts a separate candidate key within bounded offsets', () => {
  for (const offset of [2, 9, 13]) {
    const clear = Buffer.alloc(48, 0x55); clear[0] = offset;
    const session = Buffer.alloc(32, 0x83); session.copy(clear, offset);
    const reply = encryptedFixture(clear).subarray(2);
    assert.deepEqual(deriveExploreSessionKey(reply, key), session);
  }
  for (const offset of [0, 1, 14, 200]) {
    const clear = Buffer.alloc(48); clear[0] = offset;
    assert.throws(() => deriveExploreSessionKey(encryptedFixture(clear).subarray(2), key));
  }
  assert.throws(() => deriveExploreSessionKey(Buffer.alloc(47), key));
});

test('session request uses fresh randomness and codec rejects invalid inputs', () => {
  const first = createExploreSessionRequest(); const second = createExploreSessionRequest();
  assert.equal(first.length, 51); assert.equal(first.readUInt16BE(0), 49);
  assert.equal(first[2], 0xc7); assert.ok(first[3] >= 2 && first[3] <= 13);
  assert.notDeepEqual(first, second);
  for (const bad of [null, '60', Buffer.alloc(0), Buffer.alloc(510)])
    assert.throws(() => encodeExploreCommand(bad, key));
  for (const bad of [null, Buffer.alloc(16), Buffer.alloc(31), Buffer.alloc(33)])
    assert.throws(() => encodeExploreCommand(Buffer.from([0x60]), bad));
});
