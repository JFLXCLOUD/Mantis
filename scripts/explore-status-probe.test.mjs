import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCipheriv } from 'node:crypto';
import { createStatusProbePlan, buildStatusProbeRequest, verifyStatusProbeResponse } from './explore-status-probe.mjs';
import { decodeExploreEnvelope } from './explore-session-codec.mjs';

const bootstrap = Buffer.alloc(32, 0x22), session = Buffer.alloc(32, 0x77);
function fixture(clear, key, flag) {
  const cipher = createCipheriv('aes-256-ecb', key, null); cipher.setAutoPadding(false);
  const frame = Buffer.alloc(clear.length + 2); frame.writeUInt16BE(clear.length | flag);
  Buffer.concat([cipher.update(clear), cipher.final()]).copy(frame, 2);
  return frame.toString('hex');
}
function sessionReply() {
  const clear = Buffer.alloc(48); clear[0] = 5; session.copy(clear, 5);
  return fixture(clear, bootstrap, 0);
}
function statusReply(opcode = 0x60) {
  const clear = Buffer.alloc(16, 0xaa); clear.writeUInt16LE(9); clear[2] = opcode;
  clear[15] = clear.subarray(0, 15).reduce((s, b) => (s + b) & 255, 0);
  return fixture(clear, session, 0x8000);
}

test('fixed probe plan contains only observed padding, Bluetooth alert and session setup', () => {
  const plan = createStatusProbePlan();
  assert.deepEqual(Object.keys(plan), ['padding', 'alert', 'reset', 'session']);
  assert.equal(plan.padding, '40'.repeat(64));
  assert.equal(plan.alert, '003ee5' + '00'.repeat(61));
  assert.equal(plan.reset.length, 12); assert.ok(plan.reset.startsWith('0004cf'));
  assert.equal(plan.session.length, 102); assert.ok(plan.session.startsWith('0031c7'));
});
test('probe generates only the fixed status query and validates its encrypted reply', () => {
  const reply = sessionReply();
  const command = Buffer.from(buildStatusProbeRequest(reply, bootstrap), 'hex');
  assert.deepEqual(decodeExploreEnvelope(command, session, 'host'), Buffer.from([0x60, 0, 0, 0]));
  assert.deepEqual(verifyStatusProbeResponse(reply, statusReply(), bootstrap), {
    sessionRoundTripVerified: true, statusReplyBytes: 9, machineReady: false, canSendJob: false,
  });
  assert.throws(() => verifyStatusProbeResponse(reply, statusReply(0x73), bootstrap));
  assert.throws(() => verifyStatusProbeResponse(reply, statusReply(), Buffer.alloc(32)));
});
test('fixed probe refuses truncated, oversized, malformed and incorrectly flagged replies', () => {
  const reply = sessionReply();
  for (const bad of ['', 'zz'.repeat(50), reply.slice(2), reply + '00', '8030' + reply.slice(4)])
    assert.throws(() => buildStatusProbeRequest(bad, bootstrap));
  assert.throws(() => verifyStatusProbeResponse(reply, '0010' + statusReply().slice(4), bootstrap));
});
