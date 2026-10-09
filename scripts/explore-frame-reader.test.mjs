import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExploreFrameReader } from './explore-frame-reader.mjs';

test('reassembles the observed response across every possible split', () => {
  const wire = Buffer.from('0008bffeffff23e80000', 'hex');
  for (let split = 0; split <= wire.length; split++) {
    const reader = new ExploreFrameReader();
    const frames = [...reader.push(wire.subarray(0, split)), ...reader.push(wire.subarray(split))];
    assert.equal(frames.length, 1);
    assert.equal(frames[0].flagged, false);
    assert.deepEqual(frames[0].payload, wire.subarray(2));
    reader.finish();
  }
});

test('handles multiple frames and byte-at-a-time delivery without assuming packet boundaries', () => {
  const wire = Buffer.concat([Buffer.from('0001128010', 'hex'), Buffer.alloc(16, 0x5a)]);
  for (const chunks of [[wire], [...wire].map(b => Buffer.from([b]))]) {
    const reader = new ExploreFrameReader();
    const frames = chunks.flatMap(chunk => reader.push(chunk));
    assert.equal(frames.length, 2);
    assert.equal(frames[0].flagged, false);
    assert.equal(frames[1].flagged, true);
    assert.equal(frames[1].payload.length, 16);
    reader.finish();
  }
});

test('does not interpret a flag, truncated response, padding or invalid length as a complete reply', () => {
  for (const hex of ['00', '000812', '80105a']) {
    const reader = new ExploreFrameReader();
    assert.equal(reader.push(Buffer.from(hex, 'hex')).length, 0);
    assert.throws(() => reader.finish(), /Incomplete/);
  }
  for (const hex of ['0000', '8000', '0201', '40404040']) {
    const reader = new ExploreFrameReader();
    assert.throws(() => reader.push(Buffer.from(hex, 'hex')), /length/);
    assert.throws(() => reader.push(Buffer.from('000112', 'hex')), /Reader failed/);
  }
});
