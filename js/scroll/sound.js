// Scroll-driven sound for the prototype. Every level is worked out from where you are (section + u),
// so sound rewinds with the picture. Real recordings (assets/audio/scroll/, see CREDITS.md):
//   Eagle's onboard recorder at lift-off (Apollo 11) · Earth's "chorus" radio waves (Van Allen Probes) as you leave or
//   come home · Voyager 1's interstellar plasma waves on the flights out to deep space · Mars wind from Perseverance's
//   SuperCam microphone · a Martian dust devil passing over Perseverance.
// Music is the site's per-world loops (assets/audio/music/). A little generated noise is kept underneath:
// a short thump at ignition and some high wind so the storm is still
// audible on small speakers (real Mars wind is almost all below 100 Hz).
import { asset } from './preload.js';

const KEY = 'still-out-there-v2:scroll-sound';
const LOOP_S = { moon: 6779977 / 44100, mars: 9400612 / 44100, deep: 4310265 / 44100 };   // assets/audio/music/, exact loop lengths
const MUSIC = 0.2;                       // music level (about -40 LUFS: a quiet bed under the voices)
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const band = (u, a, b) => clamp((u - a) / (b - a));

const REAL = { ascent: 'apollo11-ascent-onboard', chorus: 'space-chorus-loop', voyager: 'space-voyager-loop', wind: 'mars-wind-sol4-loop', devil: 'mars-dust-devil' };
const REAL_LOOP_N = { chorus: 1183745, voyager: 948150 };       // exact loop lengths in samples (44.1 kHz), past the MP3 start padding
/** Every sound file the journey plays (for the loading screen). */
export const SOUND_FILES = [...['moon', 'mars', 'deep'].map((w) => `assets/audio/music/${w}.mp3`), ...Object.values(REAL).map((n) => `assets/audio/scroll/${n}.mp3`)];
// Captions for the lift-off clip, in NASA's own words (Apollo Lunar Surface Journal, 124:21:54 to 124:22:08 GET).
const CAPTIONS = [
  [0.3, 9.6, 'Aldrin', '9, 8, 7, 6, 5, Abort Stage, Engine Arm, Ascent, Proceed.'],
  [9.6, 13.8, 'Aldrin', 'We’re off. Look at that stuff go all over the place.'],
];

let ctx = null, nodes = null, last = null, lastMile = '', lastCall = false;
let ascentPlay = null, prevLift = 0, prevDust = 0, onCaption = () => {};

// Voices take turns. Narration, stories, the roll call and the machines' own recordings play through <audio>
// elements; while one plays, the lift-off recording stops and everything else steps back to a quiet bed. When the
// lift-off starts, any narration stops. Whichever started last wins.
const voices = new Set();
let voiceOn = false;
const playMedia = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function play() {
  if (!this.dataset?.tracked) {
    const off = () => { voices.delete(this); onVoices(); };
    this.addEventListener('pause', off); this.addEventListener('ended', off); this.addEventListener('error', off);
    if (this.dataset) this.dataset.tracked = '1';
  }
  voices.add(this); onVoices();
  return playMedia.call(this);
};
function onVoices() {
  const on = voices.size > 0;
  if (on === voiceOn) return;
  voiceOn = on;
  if (on) stopAscent();
  if (last) mix(...last);
}
/** The page passes a function that shows a caption ({who, text}) or hides it (null). */
export const captions = (fn) => { onCaption = fn; };

export const soundOn = () => { try { return localStorage.getItem(KEY) === 'on'; } catch { return false; } };

/** Turns sound on or off. Must be called from a click or key press the first time (browser rule). */
export async function setSound(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage blocked */ }
  if (!on) { if (ctx) await ctx.suspend(); return; }
  if (!ctx) await build();
  await ctx.resume();
  if (last) mix(...last);
}

async function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const out = ctx.createDynamicsCompressor();             // keeps the rumble from clipping
  out.connect(ctx.destination);
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noise.buffer = buf; noise.loop = true; noise.start();
  const gainOf = (v = 0) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filter = (type, f, q = 0.7) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };

  // engine rumble: very low noise, doubled filter for a deep body
  const rumble = gainOf();
  noise.connect(filter('lowpass', 140)).connect(filter('lowpass', 90)).connect(rumble).connect(out);
  // wind: a wandering band of noise, with slow gusts
  const windF = filter('bandpass', 420, 0.8), wind = gainOf(), gust = gainOf(0.6);
  const lfo = ctx.createOscillator(), lfoAmt = gainOf(0.35);
  lfo.frequency.value = 0.13; lfo.connect(lfoAmt).connect(gust.gain); lfo.start();
  noise.connect(windF).connect(gust).connect(wind).connect(out);
  // music, through one filter that the dust closes
  const muffle = filter('lowpass', 18000), music = gainOf(1);
  muffle.connect(music).connect(out);
  const loops = {};
  for (const w of Object.keys(LOOP_S)) {
    const g = gainOf();
    g.connect(muffle);
    loops[w] = g;
    fetch(asset(`assets/audio/music/${w}.mp3`)).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((b) => {
      const s = ctx.createBufferSource(), offset = b.duration > LOOP_S[w] + 0.02 ? 1105 / 44100 : 0;
      s.buffer = b; s.loop = true; s.loopStart = offset; s.loopEnd = Math.min(offset + LOOP_S[w], b.duration);
      s.connect(g); s.start(0, offset);
    }).catch((err) => console.warn('music unavailable', err));
  }
  // real recordings: two loops whose levels follow the scroll, two one-shots
  const buffers = {}, real = { chorus: gainOf(), voyager: gainOf(), wind: gainOf() };
  for (const g of Object.values(real)) g.connect(out);
  await Promise.all(Object.entries(REAL).map(([k, name]) => fetch(asset(`assets/audio/scroll/${name}.mp3`))
    .then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((b) => { buffers[k] = b; })
    .catch((err) => console.warn('sound unavailable', name, err))));
  for (const k of Object.keys(real)) {
    const b = buffers[k];
    if (!b) continue;
    const s = ctx.createBufferSource(), n = REAL_LOOP_N[k], off = n && b.duration > n / 44100 + 0.02 ? 1105 / 44100 : 0;
    s.buffer = b; s.loop = true;
    if (n) { s.loopStart = off; s.loopEnd = Math.min(off + n / 44100, b.duration); }
    s.connect(real[k]); s.start(0, off);
  }
  nodes = { rumble, wind, windF, muffle, music, loops, out, real, buffers };
  document.addEventListener('visibilitychange', () => { if (!soundOn()) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
}

const set = (param, v, k = 0.08) => param.setTargetAtTime(v, ctx.currentTime, k);

/** Plays a one-shot recording; returns a handle that can fade it out. */
function oneShot(name, level = 1) {
  const b = nodes?.buffers[name];
  if (!b) return null;
  const s = ctx.createBufferSource(), g = ctx.createGain(), t0 = ctx.currentTime;
  s.buffer = b; g.gain.value = level;
  s.connect(g).connect(nodes.out); s.start();
  return { s, g, t0, stop() { g.gain.setTargetAtTime(0, ctx.currentTime, 0.15); s.stop(ctx.currentTime + 0.8); } };
}

/** Eagle's lift-off recording, with captions that follow it. */
function startAscent() {
  ascentPlay?.stop();
  for (const a of [...voices]) a.pause();          // the crew has the floor
  const p = oneShot('ascent', 1);
  if (!p) return;
  ascentPlay = p;
  let shown = -1;
  const tick = () => {
    if (ascentPlay !== p) return;
    const t = ctx.currentTime - p.t0, i = CAPTIONS.findIndex(([a, b]) => t >= a && t < b);
    if (i !== shown) { shown = i; onCaption(i < 0 ? null : { who: CAPTIONS[i][2], text: CAPTIONS[i][3] }); }
    if (t < p.s.buffer.duration) requestAnimationFrame(tick); else { ascentPlay = null; onCaption(null); if (last) mix(...last); }
  };
  p.s.onended = () => { if (ascentPlay === p) { ascentPlay = null; onCaption(null); if (last) mix(...last); } };
  tick();
}
function stopAscent() { if (!ascentPlay) return; ascentPlay.stop(); ascentPlay = null; onCaption(null); }

/** A short radio blip (a milestone passed, or the last call). */
function blip(freq = 880, level = 0.05, dur = 0.18) {
  if (!ctx || ctx.state !== 'running') return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime;
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(level, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(nodes.out); o.start(t0); o.stop(t0 + dur + 0.05);
}

/** Applies one moment's sound. The page works out every value from the scroll position:
 *  music {moon, mars, deep} 0…1 · hush 0…1 (music falls away) · engine 0…1 · dust 0…1 ·
 *  chorus / voyager 0…1 (between worlds) · lift: where you are in the lift-off (-1 before it, 0…1 in it, 2 still on
 *  the Moon after it, 3 gone) · devil: storm level for the dust-devil trigger · mile: current milestone text ·
 *  call: inside the last call. */
export function mix(m) {
  last = [m];
  if (!nodes || ctx.state !== 'running') return;
  const n = nodes, { music, hush = 0, engine = 0, dust = 0, chorus = 0, voyager = 0, lift = -1, devil = 0, mile = '', call = false } = m;
  // lift-off voices: start when you scroll into the lift-off going forward; stop if you go back before it or leave the Moon
  if (lift >= 0.02 && lift <= 1 && prevLift < 0.02) startAscent();
  if (lift < 0 || lift > 2) stopAscent();
  prevLift = lift;
  const voice = voiceOn ? 0.25 : 1;                                            // a narration is playing: a quiet bed
  const duck = (1 - 0.65 * engine) * (1 - hush) * (ascentPlay ? 0.4 : 1) * voice;     // music steps back while the crew talks
  for (const w of Object.keys(n.loops)) set(n.loops[w].gain, MUSIC * (music[w] || 0) * duck, 0.25);
  set(n.muffle.frequency, 18000 * (1 - dust) ** 3 + 650, 0.2);
  // Aldrin called it "a very quiet ride": only a short, soft thump at ignition, the real voices carry the moment
  set(n.rumble.gain, 0.5 * engine, 0.05);
  // the storm: real Mars wind, plus a little generated high wind for small speakers
  set(n.real.wind.gain, 1.1 * dust ** 1.2 * (voiceOn ? 0.35 : 1), 0.25);
  set(n.wind.gain, 0.16 * dust ** 1.4, 0.2);
  set(n.windF.frequency, 380 + 520 * dust, 0.4);
  // between worlds: the real radio waves of space, played as sound (quietly, under the music)
  set(n.real.chorus.gain, 0.32 * chorus * voice, 0.4);
  set(n.real.voyager.gain, 0.3 * voyager * voice, 0.4);
  // the dust devil roars past once as the storm thickens (forward only)
  if (devil >= 0.6 && prevDust < 0.6) oneShot('devil', 0.9);
  prevDust = devil;
  if (mile && mile !== lastMile) blip(1320, 0.04, 0.12);
  lastMile = mile;
  if (call && !lastCall) { blip(660, 0.05, 0.5); setTimeout(() => blip(660, 0.025, 0.6), 700); }
  lastCall = call;
}

/** Current levels, for checking the mix in a test (no sound needed). */
export function levels() {
  if (!nodes) return null;
  const n = nodes;
  return { state: ctx.state, ascent: !!ascentPlay, chorus: n.real.chorus.gain.value, voyager: n.real.voyager.gain.value, realWind: n.real.wind.gain.value, loaded: Object.keys(n.buffers), moon: n.loops.moon.gain.value, mars: n.loops.mars.gain.value, deep: n.loops.deep.gain.value, muffle: n.muffle.frequency.value, rumble: n.rumble.gain.value, wind: n.wind.gain.value, };
}
