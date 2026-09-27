import * as ops from './audio-ops.js';
import { History } from './history.js';

const $ = (id) => document.getElementById(id);

const els = {
  fileInput: $('file-input'),
  fileName: $('file-name'),
  wrap: $('wave-wrap'),
  canvas: $('wave'),
  hint: $('drop-hint'),
  hscroll: $('hscroll'),
  spacer: $('spacer'),
  loop: $('chk-loop'),
  gainDb: $('gain-db'),
  play: $('btn-play'),
  record: $('btn-record'),
  undo: $('btn-undo'),
  redo: $('btn-redo'),
  stPos: $('st-pos'),
  stSel: $('st-sel'),
  stDur: $('st-dur'),
  stFmt: $('st-fmt'),
  stMsg: $('st-msg'),
};

const RULER_H = 22;
const MAX_SCROLL_PX = 5_000_000;
const MIN_SAMPLES_PER_PX = 1 / 16;

const state = {
  audio: null,
  fileName: '',
  sel: { start: 0, end: 0 },
  clip: null,
  spp: 1, // samples per CSS pixel
  fit: true,
  playhead: null,
};

const history = new History(50);
const ctx2d = els.canvas.getContext('2d');
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// ---------- helpers ----------

const len = () => (state.audio ? ops.length(state.audio) : 0);
const sr = () => (state.audio ? state.audio.sampleRate : 44100);
const hasSel = () => state.sel.end > state.sel.start;
const viewWidth = () => els.wrap.clientWidth;
const viewStart = () => els.hscroll.scrollLeft * state.spp;

function effectRange() {
  return hasSel() ? [state.sel.start, state.sel.end] : [0, len()];
}

let msgTimer = 0;
function message(text) {
  els.stMsg.textContent = text;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => (els.stMsg.textContent = ''), 3000);
}

function audioFromBuffer(buffer) {
  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c).slice());
  return ops.createAudio(buffer.sampleRate, channels);
}

const bufferCache = new WeakMap();
function toAudioBuffer(audio) {
  let buf = bufferCache.get(audio);
  if (!buf) {
    buf = getAudioCtx().createBuffer(audio.channels.length, Math.max(1, ops.length(audio)), audio.sampleRate);
    audio.channels.forEach((ch, i) => buf.copyToChannel(ch, i));
    bufferCache.set(audio, buf);
  }
  return buf;
}

// ---------- loading ----------

async function loadFile(file) {
  if (!file) return;
  message(`Cargando ${file.name}…`);
  try {
    const data = await file.arrayBuffer();
    const buffer = await getAudioCtx().decodeAudioData(data);
    stop();
    history.clear();
    setAudio(audioFromBuffer(buffer), file.name.replace(/\.[^.]+$/, ''));
    message('Archivo cargado');
  } catch (err) {
    console.error(err);
    message('No se pudo decodificar el archivo');
  }
}

function setAudio(audio, name) {
  state.audio = audio;
  state.fileName = name;
  state.sel = { start: 0, end: 0 };
  els.fileName.textContent = name;
  zoomFit();
  update();
}

// ---------- editing ----------

function commit(nextAudio, nextSel, label) {
  stop();
  history.push({ audio: state.audio, sel: state.sel });
  state.audio = nextAudio;
  state.sel = nextSel;
  clampZoom();
  update();
  if (label) message(label);
}

function restore(snapshot, label) {
  if (!snapshot) return;
  stop();
  state.audio = snapshot.audio;
  state.sel = snapshot.sel;
  clampZoom();
  update();
  message(label);
}

const actions = {
  undo() {
    restore(history.undo({ audio: state.audio, sel: state.sel }), 'Deshecho');
  },
  redo() {
    restore(history.redo({ audio: state.audio, sel: state.sel }), 'Rehecho');
  },
  copy() {
    if (!hasSel()) return;
    state.clip = ops.slice(state.audio, state.sel.start, state.sel.end);
    update();
    message('Copiado');
  },
  cut() {
    if (!hasSel()) return;
    const { start, end } = state.sel;
    state.clip = ops.slice(state.audio, start, end);
    commit(ops.remove(state.audio, start, end), { start, end: start }, 'Cortado');
  },
  delete() {
    if (!hasSel()) return;
    const { start, end } = state.sel;
    commit(ops.remove(state.audio, start, end), { start, end: start }, 'Eliminado');
  },
  paste() {
    if (!state.clip || !state.audio) return;
    const { start, end } = state.sel;
    const base = end > start ? ops.remove(state.audio, start, end) : state.audio;
    const clip = ops.createAudio(state.audio.sampleRate, state.clip.channels);
    commit(ops.insert(base, clip, start), { start, end: start + ops.length(clip) }, 'Pegado');
  },
  trim() {
    if (!hasSel()) return;
    const { start, end } = state.sel;
    commit(ops.slice(state.audio, start, end), { start: 0, end: 0 }, 'Recortado');
    zoomFit();
  },
  silence() {
    if (!hasSel()) return;
    commit(ops.silence(state.audio, state.sel.start, state.sel.end), state.sel, 'Silenciado');
  },
  fadeIn() {
    if (!state.audio) return;
    commit(ops.fadeIn(state.audio, ...effectRange()), state.sel, 'Fade in aplicado');
  },
  fadeOut() {
    if (!state.audio) return;
    commit(ops.fadeOut(state.audio, ...effectRange()), state.sel, 'Fade out aplicado');
  },
  normalize() {
    if (!state.audio) return;
    commit(ops.normalize(state.audio, ...effectRange()), state.sel, 'Normalizado');
  },
  reverse() {
    if (!state.audio) return;
    commit(ops.reverse(state.audio, ...effectRange()), state.sel, 'Invertido');
  },
  gain() {
    if (!state.audio) return;
    const db = parseFloat(els.gainDb.value);
    if (!Number.isFinite(db)) return message('Valor de ganancia no válido');
    const factor = Math.pow(10, db / 20);
    commit(ops.gain(state.audio, ...effectRange(), factor), state.sel, `Ganancia ${db > 0 ? '+' : ''}${db} dB`);
  },
  selectAll() {
    if (!state.audio) return;
    state.sel = { start: 0, end: len() };
    update();
  },
  export() {
    if (!state.audio) return;
    const blob = new Blob([ops.encodeWAV(state.audio)], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.fileName || 'audio'}-editado.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('WAV exportado');
  },
};

// ---------- playback ----------

const player = { source: null, t0: 0, from: 0, to: 0, loop: false };

function isPlaying() {
  return player.source !== null;
}

function play() {
  if (!state.audio || !len()) return;
  stop();
  const ac = getAudioCtx();
  if (ac.state === 'suspended') ac.resume();

  let from = state.sel.start;
  let to = hasSel() ? state.sel.end : len();
  if (from >= len()) {
    from = 0;
    to = len();
  }
  const rate = sr();
  const source = ac.createBufferSource();
  source.buffer = toAudioBuffer(state.audio);
  source.connect(ac.destination);

  const loop = els.loop.checked && hasSel();
  if (loop) {
    source.loop = true;
    source.loopStart = from / rate;
    source.loopEnd = to / rate;
    source.start(0, from / rate);
  } else {
    source.start(0, from / rate, (to - from) / rate);
  }
  source.onended = () => {
    if (player.source === source) {
      player.source = null;
      state.playhead = null;
      update();
    }
  };
  Object.assign(player, { source, t0: ac.currentTime, from, to, loop });
  requestAnimationFrame(tick);
  update();
}

function currentPlaySample() {
  const elapsed = (getAudioCtx().currentTime - player.t0) * sr();
  if (player.loop) return player.from + (elapsed % (player.to - player.from));
  return Math.min(player.to, player.from + elapsed);
}

function stop() {
  if (!player.source) return;
  const src = player.source;
  player.source = null;
  state.playhead = null;
  try {
    src.stop();
  } catch {
    // already stopped
  }
  update();
}

function togglePlay() {
  if (isPlaying()) {
    // Pause: without a selection, remember where we stopped so playback resumes there.
    const pos = Math.floor(currentPlaySample());
    stop();
    if (!hasSel()) {
      state.sel = { start: pos, end: pos };
      update();
    }
  } else {
    play();
  }
}

function tick() {
  if (!isPlaying()) return;
  state.playhead = currentPlaySample();
  followPlayhead();
  draw();
  updateStatus();
  requestAnimationFrame(tick);
}

function followPlayhead() {
  const x = (state.playhead - viewStart()) / state.spp;
  if (x < 0 || x > viewWidth()) {
    els.hscroll.scrollLeft = state.playhead / state.spp - viewWidth() * 0.1;
  }
}

// ---------- recording ----------

const recorder = { media: null, chunks: [], stream: null };

async function toggleRecord() {
  if (recorder.media) {
    recorder.media.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    message('Este navegador no permite grabar audio');
    return;
  }
  try {
    getAudioCtx();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const media = new MediaRecorder(stream);
    Object.assign(recorder, { media, stream, chunks: [] });
    media.ondataavailable = (e) => e.data.size && recorder.chunks.push(e.data);
    media.onstop = finishRecording;
    stop();
    media.start();
    els.record.classList.add('recording');
    els.record.textContent = '■ Detener grabación';
    message('Grabando…');
  } catch (err) {
    console.error(err);
    message('No se pudo acceder al micrófono');
  }
}

async function finishRecording() {
  const { chunks, stream, media } = recorder;
  stream.getTracks().forEach((t) => t.stop());
  Object.assign(recorder, { media: null, stream: null, chunks: [] });
  els.record.classList.remove('recording');
  els.record.textContent = '● Grabar';

  try {
    const blob = new Blob(chunks, { type: media.mimeType });
    const buffer = await getAudioCtx().decodeAudioData(await blob.arrayBuffer());
    const rec = audioFromBuffer(buffer);
    if (!state.audio) {
      history.clear();
      setAudio(rec, 'grabacion');
    } else {
      const at = state.sel.start;
      commit(ops.insert(state.audio, rec, at), { start: at, end: at + ops.length(rec) });
    }
    message('Grabación añadida');
  } catch (err) {
    console.error(err);
    message('No se pudo procesar la grabación');
  }
}

// ---------- zoom & scroll ----------

function sppLimits() {
  const fit = Math.max(len() / Math.max(1, viewWidth()), MIN_SAMPLES_PER_PX);
  const min = Math.max(MIN_SAMPLES_PER_PX, len() / MAX_SCROLL_PX);
  return { min: Math.min(min, fit), max: fit };
}

function setZoom(spp, anchorSample, anchorX) {
  const { min, max } = sppLimits();
  state.spp = Math.min(max, Math.max(min, spp));
  state.fit = state.spp >= max;
  els.spacer.style.width = `${Math.ceil(len() / state.spp)}px`;
  els.hscroll.scrollLeft = anchorSample / state.spp - anchorX;
  draw();
}

function zoomBy(factor, anchorX = viewWidth() / 2) {
  const anchorSample = viewStart() + anchorX * state.spp;
  setZoom(state.spp / factor, anchorSample, anchorX);
}

function zoomFit() {
  setZoom(Infinity, 0, 0);
}

function zoomSelection() {
  if (!hasSel()) return;
  const { start, end } = state.sel;
  setZoom((end - start) / viewWidth(), start, 0);
}

// After the audio length changes, keep the current zoom if possible.
function clampZoom() {
  if (state.fit) zoomFit();
  else setZoom(state.spp, viewStart(), 0);
}

// ---------- drawing ----------

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = els.wrap.clientWidth;
  const h = els.wrap.clientHeight;
  els.canvas.width = Math.round(w * dpr);
  els.canvas.height = Math.round(h * dpr);
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  clampZoom();
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const colors = {};
function loadColors() {
  for (const k of ['wave', 'wave-sel', 'sel', 'playhead', 'accent', 'muted', 'border']) colors[k] = cssVar(`--${k}`);
}

function niceStep(secondsPerPx) {
  const target = secondsPerPx * 90;
  const steps = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  return steps.find((s) => s >= target) ?? 600;
}

function drawRuler(w) {
  const rate = sr();
  const t0 = viewStart() / rate;
  const secPerPx = state.spp / rate;
  const step = niceStep(secPerPx);
  ctx2d.fillStyle = '#1a1d24';
  ctx2d.fillRect(0, 0, w, RULER_H);
  ctx2d.strokeStyle = colors.border;
  ctx2d.fillStyle = colors.muted;
  ctx2d.font = '11px system-ui, sans-serif';
  ctx2d.textBaseline = 'middle';
  ctx2d.beginPath();
  for (let t = Math.floor(t0 / step) * step; t <= t0 + w * secPerPx; t += step) {
    const x = Math.round((t - t0) / secPerPx) + 0.5;
    if (x < 0) continue;
    ctx2d.moveTo(x, RULER_H - 8);
    ctx2d.lineTo(x, RULER_H);
    const label = step < 1 ? ops.formatTime(t) : ops.formatTime(t).slice(0, 5);
    ctx2d.fillText(label, x + 3, RULER_H / 2 - 1);
  }
  ctx2d.moveTo(0, RULER_H - 0.5);
  ctx2d.lineTo(w, RULER_H - 0.5);
  ctx2d.stroke();
}

function draw() {
  const w = els.wrap.clientWidth;
  const h = els.wrap.clientHeight;
  ctx2d.clearRect(0, 0, w, h);
  els.hint.hidden = !!state.audio;
  if (!state.audio) return;

  drawRuler(w);

  const start = viewStart();
  const end = start + w * state.spp;
  const toX = (s) => (s - start) / state.spp;
  const selX0 = toX(state.sel.start);
  const selX1 = toX(state.sel.end);

  if (hasSel()) {
    ctx2d.fillStyle = colors.sel;
    ctx2d.fillRect(selX0, RULER_H, selX1 - selX0, h - RULER_H);
  }

  const chans = state.audio.channels;
  const laneH = (h - RULER_H) / chans.length;
  chans.forEach((ch, c) => {
    const mid = RULER_H + laneH * c + laneH / 2;
    const amp = laneH / 2 - 4;
    ctx2d.strokeStyle = colors.border;
    ctx2d.beginPath();
    ctx2d.moveTo(0, Math.round(mid) + 0.5);
    ctx2d.lineTo(w, Math.round(mid) + 0.5);
    if (c > 0) {
      ctx2d.moveTo(0, Math.round(RULER_H + laneH * c) + 0.5);
      ctx2d.lineTo(w, Math.round(RULER_H + laneH * c) + 0.5);
    }
    ctx2d.stroke();

    const { mins, maxs } = ops.waveformPeaks(ch, start, end, Math.ceil(w));
    for (let x = 0; x < mins.length; x++) {
      const inSel = hasSel() && x >= selX0 && x < selX1;
      ctx2d.fillStyle = inSel ? colors['wave-sel'] : colors.wave;
      const y0 = mid - maxs[x] * amp;
      const y1 = mid - mins[x] * amp;
      ctx2d.fillRect(x, y0, 1, Math.max(1, y1 - y0));
    }
  });

  const line = (x, color) => {
    if (x < -1 || x > w + 1) return;
    ctx2d.fillStyle = color;
    ctx2d.fillRect(Math.round(x), RULER_H, 1, h - RULER_H);
  };
  if (!hasSel()) line(selX0, colors.accent);
  if (state.playhead !== null) line(toX(state.playhead), colors.playhead);
}

// ---------- UI state ----------

function updateStatus() {
  const rate = sr();
  const pos = state.playhead ?? state.sel.start;
  els.stPos.textContent = ops.formatTime(pos / rate);
  els.stSel.textContent = hasSel()
    ? `${ops.formatTime(state.sel.start / rate)} – ${ops.formatTime(state.sel.end / rate)} (${ops.formatTime((state.sel.end - state.sel.start) / rate)})`
    : '—';
  els.stDur.textContent = state.audio ? ops.formatTime(len() / rate) : '—';
  els.stFmt.textContent = state.audio
    ? `${rate} Hz · ${state.audio.channels.length === 1 ? 'mono' : state.audio.channels.length === 2 ? 'estéreo' : `${state.audio.channels.length} canales`}`
    : '—';
}

function update() {
  document.querySelectorAll('[data-needs-audio]').forEach((b) => (b.disabled = !state.audio));
  document.querySelectorAll('[data-needs-selection]').forEach((b) => (b.disabled = !hasSel()));
  document.querySelectorAll('[data-needs-clip]').forEach((b) => (b.disabled = !state.clip || !state.audio));
  els.undo.disabled = !history.canUndo;
  els.redo.disabled = !history.canRedo;
  els.play.textContent = isPlaying() ? '❚❚ Pausa' : '▶ Reproducir';
  updateStatus();
  draw();
}

// ---------- mouse ----------

function sampleAtClientX(clientX) {
  const rect = els.canvas.getBoundingClientRect();
  const s = viewStart() + (clientX - rect.left) * state.spp;
  return Math.max(0, Math.min(len(), Math.round(s)));
}

let drag = null;

els.canvas.addEventListener('pointerdown', (e) => {
  if (!state.audio || e.button !== 0) return;
  els.canvas.setPointerCapture(e.pointerId);
  const s = sampleAtClientX(e.clientX);
  let anchor = s;
  if (e.shiftKey) {
    // Extend the selection from whichever edge is farther from the click.
    const { start, end } = state.sel;
    anchor = Math.abs(s - start) > Math.abs(s - end) ? start : end;
  }
  drag = { anchor, wasPlaying: isPlaying() };
  stop();
  state.sel = { start: Math.min(anchor, s), end: Math.max(anchor, s) };
  update();
});

els.canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = els.canvas.getBoundingClientRect();
  // Auto-scroll when dragging past the edges.
  if (e.clientX < rect.left) els.hscroll.scrollLeft -= 20;
  else if (e.clientX > rect.right) els.hscroll.scrollLeft += 20;
  const s = sampleAtClientX(e.clientX);
  state.sel = { start: Math.min(drag.anchor, s), end: Math.max(drag.anchor, s) };
  update();
});

const endDrag = () => {
  if (!drag) return;
  const resume = drag.wasPlaying;
  drag = null;
  if (resume) play();
};
els.canvas.addEventListener('pointerup', endDrag);
els.canvas.addEventListener('pointercancel', endDrag);

els.canvas.addEventListener(
  'wheel',
  (e) => {
    if (!state.audio) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = els.canvas.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - rect.left);
    } else {
      els.hscroll.scrollLeft += e.deltaX || e.deltaY;
    }
  },
  { passive: false },
);

els.hscroll.addEventListener('scroll', () => draw());

// ---------- drag & drop ----------

['dragenter', 'dragover'].forEach((type) =>
  els.wrap.addEventListener(type, (e) => {
    e.preventDefault();
    els.wrap.classList.add('dragover');
  }),
);
['dragleave', 'drop'].forEach((type) =>
  els.wrap.addEventListener(type, () => els.wrap.classList.remove('dragover')),
);
els.wrap.addEventListener('drop', (e) => {
  e.preventDefault();
  loadFile(e.dataTransfer.files[0]);
});

// ---------- buttons ----------

els.fileInput.addEventListener('change', () => {
  loadFile(els.fileInput.files[0]);
  els.fileInput.value = '';
});

const bind = (id, fn) => $(id).addEventListener('click', fn);
bind('btn-record', toggleRecord);
bind('btn-export', actions.export);
bind('btn-play', togglePlay);
bind('btn-stop', stop);
bind('btn-undo', actions.undo);
bind('btn-redo', actions.redo);
bind('btn-cut', actions.cut);
bind('btn-copy', actions.copy);
bind('btn-paste', actions.paste);
bind('btn-delete', actions.delete);
bind('btn-trim', actions.trim);
bind('btn-silence', actions.silence);
bind('btn-fadein', actions.fadeIn);
bind('btn-fadeout', actions.fadeOut);
bind('btn-normalize', actions.normalize);
bind('btn-reverse', actions.reverse);
bind('btn-gain', actions.gain);
bind('btn-zoom-in', () => zoomBy(2));
bind('btn-zoom-out', () => zoomBy(0.5));
bind('btn-zoom-fit', zoomFit);
bind('btn-zoom-sel', zoomSelection);

// ---------- keyboard ----------

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type !== 'checkbox') return;
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  let handled = true;

  if (mod && key === 'z' && e.shiftKey) actions.redo();
  else if (mod && key === 'z') actions.undo();
  else if (mod && key === 'y') actions.redo();
  else if (mod && key === 'x') actions.cut();
  else if (mod && key === 'c') actions.copy();
  else if (mod && key === 'v') actions.paste();
  else if (mod && key === 'a') actions.selectAll();
  else if (mod && key === 's') actions.export();
  else if (mod && key === 'o') els.fileInput.click();
  else if (mod) handled = false;
  else if (key === ' ') togglePlay();
  else if (key === 'delete' || key === 'backspace') actions.delete();
  else if (key === 'escape') {
    state.sel = { start: state.sel.start, end: state.sel.start };
    update();
  } else if (key === 'home') {
    state.sel = { start: 0, end: 0 };
    els.hscroll.scrollLeft = 0;
    update();
  } else if (key === 'end') {
    state.sel = { start: len(), end: len() };
    els.hscroll.scrollLeft = els.hscroll.scrollWidth;
    update();
  } else if (key === '+' || key === '=') zoomBy(2);
  else if (key === '-') zoomBy(0.5);
  else if (key === '0') zoomFit();
  else if (key === 'r') toggleRecord();
  else if (key === 't') actions.trim();
  else handled = false;

  if (handled) e.preventDefault();
});

// ---------- init ----------

loadColors();
new ResizeObserver(resizeCanvas).observe(els.wrap);
update();
