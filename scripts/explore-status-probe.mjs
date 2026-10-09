// Fixed session/status diagnostic helpers. No job or motion operations.
import { randomBytes } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createExploreSessionRequest, deriveExploreSessionKey, encodeExploreCommand, decodeExploreEnvelope } from './explore-session-codec.mjs';

export function createStatusProbePlan() {
  const alert = Buffer.alloc(64);
  alert.writeUInt16BE(62); alert[2] = 0xe5;
  const reset = Buffer.alloc(6);
  reset.writeUInt16BE(4); reset[2] = 0xcf; randomBytes(3).copy(reset, 3);
  return {
    padding: Buffer.alloc(64, 0x40).toString('hex'),
    alert: alert.toString('hex'),
    reset: reset.toString('hex'),
    session: createExploreSessionRequest().toString('hex'),
  };
}

function replyFrame(hex, size, flagged) {
  if (typeof hex !== 'string' || !/^[0-9a-f]+$/i.test(hex) || hex.length !== (size + 2) * 2)
    throw new Error('Unexpected probe reply size');
  const frame = Buffer.from(hex, 'hex');
  if (frame.readUInt16BE(0) !== ((flagged ? 0x8000 : 0) | size))
    throw new Error('Unexpected probe reply header');
  return frame;
}

export function buildStatusProbeRequest(sessionReplyHex, bootstrapKey) {
  const reply = replyFrame(sessionReplyHex, 48, false);
  const key = deriveExploreSessionKey(reply.subarray(2), bootstrapKey);
  try { return encodeExploreCommand(Buffer.from([0x60, 0, 0, 0]), key).toString('hex'); }
  finally { key.fill(0); }
}

export function verifyStatusProbeResponse(sessionReplyHex, statusReplyHex, bootstrapKey) {
  const reply = replyFrame(sessionReplyHex, 48, false);
  const status = replyFrame(statusReplyHex, 16, true);
  const key = deriveExploreSessionKey(reply.subarray(2), bootstrapKey);
  try {
    const payload = decodeExploreEnvelope(status, key, 'device');
    if (payload.length !== 9 || payload[0] !== 0x60)
      throw new Error('Unexpected machine-status reply');
    return { sessionRoundTripVerified: true, statusReplyBytes: payload.length, machineReady: false, canSendJob: false };
  } finally { key.fill(0); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let bootstrap;
  try {
    const action = process.argv[2];
    if (action === 'plan') {
      process.stdout.write(JSON.stringify(createStatusProbePlan()));
    } else {
      if (!['request', 'verify'].includes(action)) throw new Error('Unsupported fixed probe operation');
      const file = process.argv[3];
      if (typeof file !== 'string' || !file.endsWith('.private.json') || statSync(file).size > 4096)
        throw new Error('Expected a small local .private.json key file');
      const config = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
      if (typeof config.key !== 'string' || !/^[0-9a-f]{64}$/i.test(config.key))
        throw new Error('Invalid local research key');
      bootstrap = Buffer.from(config.key, 'hex');
      const chunks = []; let count = 0;
      for await (const chunk of process.stdin) {
        count += chunk.length;
        if (count > 2048) throw new Error('Probe input too large');
        chunks.push(chunk);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, ''));
      const result = action === 'request'
        ? { requestHex: buildStatusProbeRequest(input.sessionReplyHex, bootstrap) }
        : verifyStatusProbeResponse(input.sessionReplyHex, input.statusReplyHex, bootstrap);
      process.stdout.write(JSON.stringify(result));
    }
  } catch {
    // Do not echo private file contents, keys, payloads or exception context.
    process.stderr.write('Fixed session/status probe validation failed.\n');
    process.exitCode = 1;
  } finally { bootstrap?.fill(0); }
}
