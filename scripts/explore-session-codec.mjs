// Experimental, offline Explore 3 research. No device I/O or bundled keys.
// Provenance and validation limits: docs/research/EXPLORE3_SESSION_ENCODING.md.
import { createCipheriv, createDecipheriv, randomBytes, randomInt } from 'node:crypto';

const MAX_ENCRYPTED_BYTES = 512;

function requireKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32)
    throw new Error('Expected a 32-byte externally supplied research key');
}

function crypt(input, key, decrypt) {
  requireKey(key);
  const cipher = decrypt
    ? createDecipheriv('aes-256-ecb', key, null)
    : createCipheriv('aes-256-ecb', key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(input), cipher.final()]);
}

function checksum(bytes) {
  let sum = 0;
  for (const byte of bytes) sum = (sum + byte) & 0xff;
  return sum;
}

export function createExploreSessionRequest() {
  const frame = Buffer.alloc(51);
  frame.writeUInt16BE(49);
  frame[2] = 0xc7;
  randomBytes(48).copy(frame, 3);
  frame[3] = randomInt(2, 14);
  return frame;
}

// Returns a candidate key; a subsequent well-formed encrypted reply is required
// before considering session setup usable. This exchange has no verified MAC.
export function deriveExploreSessionKey(replyPayload, bootstrapKey) {
  if (!Buffer.isBuffer(replyPayload) || replyPayload.length !== 48)
    throw new Error('Expected the 48-byte session reply payload');
  const clear = crypt(replyPayload, bootstrapKey, true);
  try {
    const offset = clear[0];
    if (offset < 2 || offset > 13)
      throw new Error('Session reply is outside the observed research format');
    return Buffer.from(clear.subarray(offset, offset + 32));
  } finally {
    clear.fill(0);
  }
}

export function encodeExploreCommand(payload, sessionKey) {
  if (!Buffer.isBuffer(payload) || payload.length < 1 || payload.length > 509)
    throw new Error('Command payload is outside the research limit');
  requireKey(sessionKey);
  // Include the two-byte inner length and at least one checksum byte.
  const paddedSize = (Math.floor((payload.length + 2) / 16) + 1) * 16;
  const clear = Buffer.alloc(paddedSize);
  clear.writeUInt16BE(payload.length);
  payload.copy(clear, 2);
  clear[clear.length - 1] = checksum(clear.subarray(0, -1));
  try {
    const frame = Buffer.alloc(paddedSize + 2);
    frame.writeUInt16BE(0x8000 | paddedSize);
    crypt(clear, sessionKey, false).copy(frame, 2);
    return frame;
  } finally {
    clear.fill(0);
  }
}

export function decodeExploreEnvelope(frame, sessionKey, direction) {
  if (direction !== 'host' && direction !== 'device')
    throw new Error('Expected host or device direction');
  if (!Buffer.isBuffer(frame) || frame.length < 18 || frame.length > MAX_ENCRYPTED_BYTES + 2)
    throw new Error('Encrypted frame is outside the research limit');
  const header = frame.readUInt16BE(0);
  const size = header & 0x7fff;
  if (!(header & 0x8000) || size % 16 !== 0 || size !== frame.length - 2)
    throw new Error('Invalid encrypted frame boundary');
  const clear = crypt(frame.subarray(2), sessionKey, true);
  try {
    if (checksum(clear.subarray(0, -1)) !== clear[clear.length - 1])
      throw new Error('Encrypted frame checksum mismatch');
    // Device replies use little endian *inside* the encrypted envelope.
    const size = direction === 'host' ? clear.readUInt16BE(0) : clear.readUInt16LE(0);
    if (size < 1 || size > clear.length - 3)
      throw new Error('Invalid decrypted payload length');
    // Host padding is zero; observed device padding is not consistently zero.
    if (direction === 'host' && clear.subarray(size + 2, -1).some((byte) => byte !== 0))
      throw new Error('Invalid host padding');
    return Buffer.from(clear.subarray(2, size + 2));
  } finally {
    clear.fill(0);
  }
}
