// Pure audio operations. An "audio" value is { sampleRate, channels: Float32Array[] }.
// Every function returns a new value and never mutates its input, which keeps undo simple.

export function createAudio(sampleRate, channels) {
  return { sampleRate, channels };
}

export function length(audio) {
  return audio.channels.length ? audio.channels[0].length : 0;
}

export function duration(audio) {
  return length(audio) / audio.sampleRate;
}

function clampRange(audio, start, end) {
  const n = length(audio);
  const s = Math.max(0, Math.min(n, Math.floor(start)));
  const e = Math.max(s, Math.min(n, Math.floor(end)));
  return [s, e];
}

function mapChannels(audio, fn) {
  return createAudio(audio.sampleRate, audio.channels.map(fn));
}

export function slice(audio, start, end) {
  const [s, e] = clampRange(audio, start, end);
  return mapChannels(audio, (ch) => ch.slice(s, e));
}

export function remove(audio, start, end) {
  const [s, e] = clampRange(audio, start, end);
  return mapChannels(audio, (ch) => {
    const out = new Float32Array(ch.length - (e - s));
    out.set(ch.subarray(0, s), 0);
    out.set(ch.subarray(e), s);
    return out;
  });
}

// Inserts `clip` at sample `at`. Channel counts are matched: a mono clip is copied into
// every channel, and extra clip channels are dropped.
export function insert(audio, clip, at) {
  const [pos] = clampRange(audio, at, at);
  const clipLen = length(clip);
  return mapChannels(audio, (ch, i) => {
    const src = clip.channels[Math.min(i, clip.channels.length - 1)];
    const out = new Float32Array(ch.length + clipLen);
    out.set(ch.subarray(0, pos), 0);
    out.set(src, pos);
    out.set(ch.subarray(pos), pos + clipLen);
    return out;
  });
}

function transformRange(audio, start, end, fn) {
  const [s, e] = clampRange(audio, start, end);
  return mapChannels(audio, (ch) => {
    const out = ch.slice();
    for (let i = s; i < e; i++) out[i] = fn(ch[i], i - s, e - s);
    return out;
  });
}

export function silence(audio, start, end) {
  return transformRange(audio, start, end, () => 0);
}

export function gain(audio, start, end, factor) {
  return transformRange(audio, start, end, (v) => v * factor);
}

export function fadeIn(audio, start, end) {
  return transformRange(audio, start, end, (v, i, n) => v * (n > 1 ? i / (n - 1) : 1));
}

export function fadeOut(audio, start, end) {
  return transformRange(audio, start, end, (v, i, n) => v * (n > 1 ? 1 - i / (n - 1) : 0));
}

export function peak(audio, start = 0, end = length(audio)) {
  const [s, e] = clampRange(audio, start, end);
  let max = 0;
  for (const ch of audio.channels) {
    for (let i = s; i < e; i++) max = Math.max(max, Math.abs(ch[i]));
  }
  return max;
}

export function normalize(audio, start, end, target = 1) {
  const p = peak(audio, start, end);
  if (p === 0) return audio;
  return gain(audio, start, end, target / p);
}

export function reverse(audio, start, end) {
  const [s, e] = clampRange(audio, start, end);
  return mapChannels(audio, (ch) => {
    const out = ch.slice();
    for (let i = s; i < e; i++) out[i] = ch[e - 1 - (i - s)];
    return out;
  });
}

// 16-bit PCM WAV encoder. Returns an ArrayBuffer.
export function encodeWAV(audio) {
  const numCh = audio.channels.length;
  const n = length(audio);
  const bytesPerSample = 2;
  const dataSize = n * numCh * bytesPerSample;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const writeStr = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * numCh * bytesPerSample, true);
  view.setUint16(32, numCh * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let off = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < numCh; c++) {
      const v = Math.max(-1, Math.min(1, audio.channels[c][i]));
      view.setInt16(off, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      off += 2;
    }
  }
  return buf;
}

// Min/max pairs per pixel column for drawing a waveform of samples [start, end).
export function waveformPeaks(channel, start, end, columns) {
  const mins = new Float32Array(columns);
  const maxs = new Float32Array(columns);
  const span = (end - start) / columns;
  for (let x = 0; x < columns; x++) {
    const a = Math.floor(start + x * span);
    const b = Math.max(a + 1, Math.floor(start + (x + 1) * span));
    let lo = 0;
    let hi = 0;
    for (let i = a; i < b && i < channel.length; i++) {
      const v = channel[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    mins[x] = lo;
    maxs[x] = hi;
  }
  return { mins, maxs };
}

export function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${String(m).padStart(2, '0')}:${rest.toFixed(3).padStart(6, '0')}`;
}
