// Offline research only. This module cannot connect to or write to a device.
// Inferred from the user's Explore 3 traces, not a complete protocol specification.
// Begin at a framed message boundary; startup padding is not a framed message.
export class ExploreFrameReader {
  #pending = Buffer.alloc(0);
  #failed = false;
  constructor(maxPayload = 512) {
    if (!Number.isInteger(maxPayload) || maxPayload < 1 || maxPayload > 0x7fff)
      throw new Error('Invalid payload limit');
    this.maxPayload = maxPayload;
  }
  push(chunk) {
    if (this.#failed) throw new Error('Reader failed; start a new observation');
    if (!Buffer.isBuffer(chunk)) throw new Error('Expected a byte buffer');
    this.#pending = Buffer.concat([this.#pending, chunk]);
    const frames = [];
    while (this.#pending.length >= 2) {
      const header = this.#pending.readUInt16BE(0);
      const length = header & 0x7fff;
      if (length === 0 || length > this.maxPayload) {
        this.#failed = true;
        this.#pending = Buffer.alloc(0);
        throw new Error('Observed frame length is outside the research limit');
      }
      if (this.#pending.length < length + 2) break;
      frames.push({
        // 0x8000 is observed after the startup exchange. Its meaning is unverified.
        flagged: Boolean(header & 0x8000),
        payload: Buffer.from(this.#pending.subarray(2, length + 2)),
      });
      this.#pending = this.#pending.subarray(length + 2);
    }
    return frames;
  }
  finish() {
    if (this.#failed || this.#pending.length)
      throw new Error('Incomplete or invalid observed stream');
  }
}
