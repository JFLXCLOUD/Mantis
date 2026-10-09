// Offline only. Accepts serial fragments already filtered to ONE device/session.
// Reports structure, never payloads, identifiers, paths, hashes or inferred opcodes.
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ExploreFrameReader } from './explore-frame-reader.mjs';

export function summarizeCapture(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 10000)
    throw new Error('Expected 1-10000 ordered serial fragments');
  const makeStream = () => ({
    reader: new ExploreFrameReader(), fragments: 0, bytes: 0,
    frames: 0, flaggedFrames: 0, sizes: {}, seen: new Set(), completedAt: [],
  });
  const host = makeStream(), device = makeStream();
  let previousFrame = -1, previousTime = -1, firstHost = true;
  let prefix = Buffer.alloc(0), paddingBytes = 0;
  for (const row of rows) {
    if (!row || !Number.isSafeInteger(row.frame) || row.frame < 0 || row.frame <= previousFrame ||
        !Number.isFinite(row.time) || row.time < 0 || row.time < previousTime ||
        !['0x00', '0x01'].includes(row.direction) || typeof row.hex !== 'string' ||
        !/^(?:[a-f\d]{2})+$/i.test(row.hex) || row.hex.length > 65536)
      throw new Error('Invalid fragment metadata, ordering or hexadecimal bytes');
    previousFrame = row.frame;
    previousTime = row.time;
    const stream = row.direction === '0x00' ? host : device;
    let bytes = Buffer.from(row.hex, 'hex');
    stream.fragments++;
    stream.bytes += bytes.length;
    if (stream === host && firstHost) {
      prefix = Buffer.concat([prefix, bytes]);
      if (prefix[0] === 0x40) {
        if (!prefix.subarray(0, 64).every(byte => byte === 0x40))
          throw new Error('Initial padding differs from the observed 64-byte prefix');
        if (prefix.length < 64) continue;
        paddingBytes = 64;
      }
      bytes = prefix.subarray(paddingBytes);
      firstHost = false;
      prefix = Buffer.alloc(0);
    }
    for (const frame of stream.reader.push(bytes)) {
      stream.frames++;
      stream.flaggedFrames += Number(frame.flagged);
      const size = frame.payload.length;
      stream.sizes[size] = (stream.sizes[size] ?? 0) + 1;
      // Equality is useful across a session, but raw bytes never leave this function.
      stream.seen.add(`${Number(frame.flagged)}:${frame.payload.toString('hex')}`);
      stream.completedAt.push(row.time);
    }
  }
  if (prefix.length) throw new Error('Incomplete initial padding');
  host.reader.finish();
  device.reader.finish();
  const describe = stream => {
    const gaps = stream.completedAt.slice(1).map((time, i) => time - stream.completedAt[i]).sort((a,b) => a-b);
    const middle = Math.floor(gaps.length / 2);
    const median = gaps.length ? (gaps.length % 2 ? gaps[middle] : (gaps[middle - 1] + gaps[middle]) / 2) : null;
    return {
      fragments: stream.fragments, bytes: stream.bytes, frames: stream.frames,
      flaggedFrames: stream.flaggedFrames, unflaggedFrames: stream.frames - stream.flaggedFrames,
      payloadLengths: stream.sizes, distinctFrames: stream.seen.size,
      repeatedFrames: stream.frames - stream.seen.size,
      medianFrameCompletionGapSeconds: median === null ? null : Number(median.toFixed(6)),
    };
  };
  return {
    schemaVersion: 1, scope: 'One prefiltered serial session; structure only, semantics unverified',
    durationSeconds: Number((rows.at(-1).time - rows[0].time).toFixed(6)),
    initialHostPaddingBytes: paddingBytes,
    hostToDevice: describe(host), deviceToHost: describe(device),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Expected one input file');
    const input = process.argv[2];
    if ((await stat(input)).size > 4 * 1024 * 1024) throw new Error('Input too large');
    const summary = summarizeCapture(JSON.parse(await readFile(input, 'utf8')));
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } catch {
    // Parse/IO exceptions may embed payloads or private paths. Do not echo them.
    process.stderr.write('Cannot summarize capture. Supply one JSON file (at most 4 MiB) of complete, ordered serial fragments for one device/session.\n');
    process.exitCode = 1;
  }
}
