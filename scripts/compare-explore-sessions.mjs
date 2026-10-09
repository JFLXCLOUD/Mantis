// Offline comparison only. No device I/O, command encoder, keys or replay support.
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ExploreFrameReader } from './explore-frame-reader.mjs';
import { summarizeCapture } from './summarize-explore-capture.mjs';

function observe(rows) {
  // Validate both input and complete framing before returning any comparison.
  const summary = summarizeCapture(rows);
  const readers = { '0x00': new ExploreFrameReader(), '0x01': new ExploreFrameReader() };
  const frames = { '0x00': [], '0x01': [] };
  let padding = summary.initialHostPaddingBytes;
  for (const row of rows) {
    let bytes = Buffer.from(row.hex, 'hex');
    if (row.direction === '0x00' && padding) {
      const skip = Math.min(padding, bytes.length);
      bytes = bytes.subarray(skip);
      padding -= skip;
    }
    for (const frame of readers[row.direction].push(bytes))
      frames[row.direction].push({ ...frame, time: row.time });
  }
  for (const reader of Object.values(readers)) reader.finish();
  return { summary, frames };
}

const intersectionSize = (a, b) => [...a].filter(value => b.has(value)).length;
function describeFlagged(frames) {
  const selected = frames.filter(frame => frame.flagged);
  const payloads = new Set(selected.map(frame => frame.payload.toString('hex')));
  const blocks = new Set();
  for (const frame of selected) {
    // Compare complete aligned 16-byte blocks as an observation, not a cipher claim.
    for (let at = 0; at + 16 <= frame.payload.length; at += 16)
      blocks.add(frame.payload.subarray(at, at + 16).toString('hex'));
  }
  return {
    payloads, blocks,
    counts: {
      frames: selected.length, distinctPayloads: payloads.size, distinctAligned16ByteBlocks: blocks.size,
      framesWithPayloadMultipleOf16: selected.filter(frame => frame.payload.length % 16 === 0).length,
    },
  };
}

function transition(observation) {
  const host = observation.frames['0x00'];
  const first = host.findIndex(frame => frame.flagged);
  const preceding = first > 0 ? host[first - 1] : null;
  return {
    initialHostPaddingBytes: observation.summary.initialHostPaddingBytes,
    firstFlaggedFrameCompletionSeconds: first < 0 ? null : host[first].time,
    unflaggedHostFramesBeforeFirstFlagged: first < 0 ? host.length : first,
    precedingUnflaggedPayloadBytes: preceding?.payload.length ?? null,
    // Leading byte is a discriminator only; its operation meaning is not inferred.
    precedingUnflaggedLeadingByte: preceding ? preceding.payload[0].toString(16).padStart(2, '0') : null,
    laterUnflaggedHostFrames: first < 0 ? 0 : host.slice(first + 1).filter(frame => !frame.flagged).length,
  };
}

export function compareSessions(leftRows, rightRows) {
  const left = observe(leftRows), right = observe(rightRows);
  const directions = {};
  for (const [direction, label] of [['0x00', 'hostToDevice'], ['0x01', 'deviceToHost']]) {
    const a = describeFlagged(left.frames[direction]), b = describeFlagged(right.frames[direction]);
    directions[label] = {
      left: a.counts, right: b.counts,
      sharedDistinctFlaggedPayloads: intersectionSize(a.payloads, b.payloads),
      sharedDistinctAligned16ByteBlocks: intersectionSize(a.blocks, b.blocks),
      rightDistinctFlaggedPayloadsAbsentFromLeft: b.payloads.size - intersectionSize(a.payloads, b.payloads),
    };
  }
  // Position-only startup comparison. A mismatch is reported, never realigned or guessed.
  const a = left.frames['0x00'].filter(frame => !frame.flagged);
  const b = right.frames['0x00'].filter(frame => !frame.flagged);
  const startup = Array.from({ length: Math.max(a.length, b.length) }, (_, index) => {
    const x = a[index]?.payload, y = b[index]?.payload;
    const sameShape = Boolean(x && y && x.length === y.length && x[0] === y[0]);
    return {
      index, leftPayloadBytes: x?.length ?? null, rightPayloadBytes: y?.length ?? null,
      sameLengthAndLeadingByte: sameShape,
      exactMatch: x && y ? x.equals(y) : false,
      changedOffsets: sameShape ? [...x.keys()].filter(at => x[at] !== y[at]) : null,
    };
  });
  return {
    schemaVersion: 1,
    scope: 'Two prefiltered observations; equality and framing only, command/session semantics unverified',
    replayVerified: false,
    transitions: { left: transition(left), right: transition(right) },
    directions, unflaggedHostComparisonByPosition: startup,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Expected two input files');
    const inputs = [];
    for (const file of process.argv.slice(2)) {
      if ((await stat(file)).size > 4 * 1024 * 1024) throw new Error('Input too large');
      inputs.push(JSON.parse(await readFile(file, 'utf8')));
    }
    process.stdout.write(`${JSON.stringify(compareSessions(...inputs), null, 2)}\n`);
  } catch {
    process.stderr.write('Cannot compare captures. Supply two JSON files (at most 4 MiB each) containing complete ordered fragments, each from one device/session.\n');
    process.exitCode = 1;
  }
}
