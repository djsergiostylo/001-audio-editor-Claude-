import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ops from '../js/audio-ops.js';
import { History } from '../js/history.js';

const mono = (...v) => ops.createAudio(8000, [Float32Array.from(v)]);
const arr = (audio, c = 0) => Array.from(audio.channels[c]);

test('slice / remove / insert', () => {
  const a = mono(1, 2, 3, 4, 5);
  assert.deepEqual(arr(ops.slice(a, 1, 3)), [2, 3]);
  assert.deepEqual(arr(ops.remove(a, 1, 3)), [1, 4, 5]);
  assert.deepEqual(arr(ops.insert(a, mono(9, 9), 2)), [1, 2, 9, 9, 3, 4, 5]);
  assert.deepEqual(arr(ops.insert(a, mono(9), 99)), [1, 2, 3, 4, 5, 9]);
  assert.deepEqual(arr(a), [1, 2, 3, 4, 5], 'input is not mutated');
});

test('insert copies a mono clip into every channel', () => {
  const st = ops.createAudio(8000, [Float32Array.from([1, 1]), Float32Array.from([2, 2])]);
  const out = ops.insert(st, mono(7), 1);
  assert.deepEqual(arr(out, 0), [1, 7, 1]);
  assert.deepEqual(arr(out, 1), [2, 7, 2]);
});

test('ranges are clamped', () => {
  const a = mono(1, 2, 3);
  assert.deepEqual(arr(ops.slice(a, -5, 99)), [1, 2, 3]);
  assert.deepEqual(arr(ops.remove(a, 2, 1)), [1, 2, 3]);
});

test('silence / gain / reverse only touch the range', () => {
  const a = mono(1, 2, 3, 4);
  assert.deepEqual(arr(ops.silence(a, 1, 3)), [1, 0, 0, 4]);
  assert.deepEqual(arr(ops.gain(a, 0, 2, 2)), [2, 4, 3, 4]);
  assert.deepEqual(arr(ops.reverse(a, 1, 4)), [1, 4, 3, 2]);
});

test('fades ramp between 0 and 1', () => {
  const a = mono(1, 1, 1, 1, 1);
  assert.deepEqual(arr(ops.fadeIn(a, 0, 5)), [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual(arr(ops.fadeOut(a, 0, 5)), [1, 0.75, 0.5, 0.25, 0]);
});

test('normalize scales peak to target and leaves silence alone', () => {
  const a = mono(0.25, -0.5, 0.1);
  assert.equal(ops.peak(ops.normalize(a, 0, 3)), 1);
  const z = mono(0, 0);
  assert.equal(ops.normalize(z, 0, 2), z);
});

test('encodeWAV writes a valid 16-bit PCM header and data', () => {
  const st = ops.createAudio(44100, [Float32Array.from([1, -1]), Float32Array.from([0, 0.5])]);
  const view = new DataView(ops.encodeWAV(st));
  const str = (o, n) => String.fromCharCode(...new Uint8Array(view.buffer, o, n));
  assert.equal(str(0, 4), 'RIFF');
  assert.equal(str(8, 4), 'WAVE');
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 44100);
  assert.equal(view.getUint32(40, true), 8);
  assert.equal(view.byteLength, 52);
  assert.deepEqual(
    [0, 1, 2, 3].map((i) => view.getInt16(44 + i * 2, true)),
    [32767, 0, -32768, 16383],
  );
});

test('waveformPeaks returns min/max per column', () => {
  const { mins, maxs } = ops.waveformPeaks(Float32Array.from([0.5, -0.2, 0.1, -0.9]), 0, 4, 2);
  assert.deepEqual(Array.from(maxs), [0.5, 0.10000000149011612]);
  assert.deepEqual(Array.from(mins), [-0.20000000298023224, -0.8999999761581421]);
});

test('formatTime', () => {
  assert.equal(ops.formatTime(0), '00:00.000');
  assert.equal(ops.formatTime(75.5), '01:15.500');
});

test('History undo/redo', () => {
  const h = new History(2);
  h.push('a');
  h.push('b');
  h.push('c'); // 'a' drops off
  assert.equal(h.undo('d'), 'c');
  assert.equal(h.undo('c'), 'b');
  assert.equal(h.undo('b'), null);
  assert.equal(h.redo('b'), 'c');
  h.push('x');
  assert.equal(h.canRedo, false);
});
