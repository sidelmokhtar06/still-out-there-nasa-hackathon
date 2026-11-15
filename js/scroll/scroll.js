// Still Out There: the whole journey as one scroll. Earth → the Moon (four machines and the echo) → Mars (four
// machines and the dust storm) → deep space (Kepler, Pioneer 10) → home to the roll call.
// The page is one tall track. Scroll position → which section you are in and how far through it (u, 0…1),
// and u drives the camera, the cards, the readouts and the sound directly, so scrolling back rewinds everything.
// Addresses: #/<stop> (e.g. #/opportunity), #/<machine>/story/<n>, #/story/<machine>, #/sources.
import { h } from '../v1/dom.js';
import { t, loadLanguage, preferredLanguage, chooseLanguage, LANGUAGES, lang, fmtNumber, fmtDate } from '../i18n.js';
import { loadData, artifact } from '../data.js';
import { createUniverse, MAPS, mapSrc, MODELS } from './universe.js';
import { MACHINES, buildStop, tickStop, stopName } from '../stops.js';
import { imageOf } from '../story.js';
import { rollCall } from '../rollcall.js';
import { lightTimes, clock, kmOf } from '../reach.js';
import { daysSince } from '../live.js';
import { soundOn, setSound, mix, captions, SOUND_FILES } from './sound.js';
import { preload, asset } from './preload.js';
import { NOW_FILES, nowOf, spotOf } from './now.js';
import { layerOpen, closeLayer, showStory, showPhoto, showSources } from './layers.js';

const $ = (id) => document.getElementById(id);
const gsap = globalThis.gsap;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const band = (u, a, b) => clamp((u - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;

// ---- the track ------------------------------------------------------------------------------
// vh: length in screen heights. kind: hold (a resting place the scroll gently snaps to), move (camera travels on
// one world or between nearby places), flight (between worlds, with the light-time clock).
// card: which card shows (shared by a move and the hold it arrives at, so the card builds as you arrive).
// world: whose music plays ([from, to] crossfades). site: the machine you are at or arriving at.
// flight: [from, to] for the light-time clock. cardIn: [a, b], where in the section the card builds.
const SEG = [
  { id: 'start', vh: 1.3, kind: 'hold', card: 'start', world: 'earth', frame: 'none' },
  { id: 'toMoon', vh: 2.6, kind: 'flight', world: ['earth', 'moon'], flight: ['start', 'moon'] },
  { id: 'moon', vh: 1.2, kind: 'hold', card: 'moon', world: 'moon' },
  { id: 'toSurveyor3', vh: 1.8, kind: 'move', card: 'surveyor3', world: 'moon', site: 'surveyor3' },
  { id: 'surveyor3', vh: 1.2, kind: 'hold', card: 'surveyor3', world: 'moon', site: 'surveyor3' },
  { id: 'toEagle', hop: true, vh: 2.0, kind: 'move', card: 'eagleArrive', world: 'moon', site: 'eagle', cardIn: [0.35, 0.85] },
  { id: 'liftoff', vh: 2.6, kind: 'move', card: 'liftoff', world: 'moon', site: 'eagle', cardIn: [0, 0.1] },
  { id: 'eagle', vh: 1.3, kind: 'hold', card: 'eagle', world: 'moon', site: 'eagle' },
  { id: 'toLrv', hop: true, vh: 1.6, kind: 'move', card: 'lrv', world: 'moon', site: 'lrv' },
  { id: 'lrv', vh: 1.2, kind: 'hold', card: 'lrv', world: 'moon', site: 'lrv' },
  { id: 'toRetro', hop: true, vh: 1.6, kind: 'move', card: 'retro', world: 'moon', site: 'retro' },
  { id: 'retro', vh: 1.2, kind: 'hold', card: 'retro', world: 'moon', site: 'retro' },
  { id: 'toEcho', vh: 1.6, kind: 'move', card: 'echo', world: 'moon' },
  { id: 'echo', vh: 1.6, kind: 'hold', card: 'echo', world: 'moon' },
  { id: 'toMars', vh: 5.5, kind: 'flight', world: ['moon', 'mars'], flight: ['moon', 'mars'] },     // long on purpose: you feel the distance
  { id: 'mars', vh: 1.2, kind: 'hold', card: 'mars', world: 'mars' },
  { id: 'toSojourner', vh: 1.8, kind: 'move', card: 'sojourner', world: 'mars', site: 'sojourner' },
  { id: 'sojourner', vh: 1.2, kind: 'hold', card: 'sojourner', world: 'mars', site: 'sojourner' },
  { id: 'toOpportunity', hop: true, vh: 1.6, kind: 'move', card: 'opportunity', world: 'mars', site: 'opportunity' },
  { id: 'opportunity', vh: 1.1, kind: 'hold', card: 'opportunity', world: 'mars', site: 'opportunity' },
  { id: 'dust', vh: 3.2, kind: 'hold', card: 'dust', world: 'mars', site: 'opportunity', snapAt: 0.85, cardIn: [0, 0.12] },
  { id: 'lastCall', vh: 1.8, kind: 'hold', card: 'lastCall', world: 'mars', site: 'opportunity', cardIn: [0.05, 0.4], rail: false },
  { id: 'toInsight', hop: true, vh: 1.8, kind: 'move', card: 'insight', world: 'mars', site: 'insight' },
  { id: 'insight', vh: 1.2, kind: 'hold', card: 'insight', world: 'mars', site: 'insight' },
  { id: 'toIngenuity', hop: true, vh: 1.6, kind: 'move', card: 'ingenuity', world: 'mars', site: 'ingenuity' },
  { id: 'ingenuity', vh: 1.2, kind: 'hold', card: 'ingenuity', world: 'mars', site: 'ingenuity' },
  { id: 'toDeep', vh: 3.0, kind: 'flight', world: ['mars', 'deep'], flight: ['mars', 'kepler'] },
  { id: 'deep', vh: 1.2, kind: 'hold', card: 'deep', world: 'deep' },
  { id: 'toKepler', vh: 2.0, kind: 'move', card: 'kepler', world: 'deep', site: 'kepler' },
  { id: 'kepler', vh: 1.2, kind: 'hold', card: 'kepler', world: 'deep', site: 'kepler' },
  { id: 'toPioneer10', vh: 4.0, kind: 'flight', world: 'deep', flight: ['kepler', 'pioneer10'] },
  { id: 'pioneer10', vh: 1.2, kind: 'hold', card: 'pioneer10', world: 'deep', site: 'pioneer10' },
  { id: 'goHome', vh: 3.0, kind: 'flight', world: 'deep', flight: ['pioneer10', 'start'] },
  { id: 'finale', vh: 2.0, kind: 'hold', card: 'finale', world: 'deep', frame: 'right' },
];
const HOLDS = SEG.filter((s) => s.kind === 'hold').map((s) => s.id);
const RAIL = SEG.filter((s) => s.kind === 'hold' && s.rail !== false).map((s) => s.id);
const IDX = Object.fromEntries(SEG.map((s, i) => [s.id, i]));

let U, poses = {}, ctx, roll = null;

// ---- camera ---------------------------------------------------------------------------------
const V = (p) => p.clone();
const vec = (x, y, z) => U.bodyPos('earth').set(x, y, z);
function pushIn(s, k) { return { pos: V(s.pos).lerp(s.target, k), target: V(s.target), up: V(s.up) }; }
function widen(s, k, lift) {
  const d = V(s.pos).sub(s.target), up = V(s.up).normalize(), r = d.length();
  return { pos: V(s.target).add(d.multiplyScalar(k)).add(V(up).multiplyScalar(r * lift)), target: V(s.target).add(V(up).multiplyScalar(r * 0.7)), up };
}
/** "Up" for a camera looking straight down at a point whose surface normal is n. */
function flatUp(n, fallback) { const u = vec(0, 1, 0).addScaledVector(n, -n.y); return u.lengthSq() > 0.1 ? u.normalize() : V(fallback).normalize(); }
/** Straight up from where the camera stands on a world, still looking at the place it is leaving. */
function rise(from, bodyC, k = 0.5) {
  const n = V(from.target).sub(bodyC).normalize(), R = from.target.distanceTo(bodyC);
  const side = V(from.pos).sub(from.target);
  return { pos: V(from.target).add(V(n).multiplyScalar(R * k)).add(side.multiplyScalar(0.5)), target: V(from.target), up: flatUp(n, side) };
}
/** Coming down to a site: high over it, then low across the ground from the sunward side, then in. */
function descend(site, bodyC) {
  const n = V(site.up).normalize(), R = site.target.distanceTo(bodyC), r0 = site.pos.distanceTo(site.target);
  const dir = V(site.pos).sub(site.target); dir.sub(V(n).multiplyScalar(dir.dot(n))).normalize();
  return [
    { pos: V(bodyC).add(V(n).multiplyScalar(R * 1.9)).add(V(dir).multiplyScalar(R * 0.5)), target: V(bodyC).add(V(n).multiplyScalar(R)), up: flatUp(n, V(dir).negate()) },
    { pos: V(site.target).add(V(dir).multiplyScalar(r0 * 6)).add(V(n).multiplyScalar(r0 * 0.9)), target: V(site.target), up: n },
    site,
  ];
}
/** A point between two shots, lifted, looking ahead at the destination. */
function between(a, b, lift, k = 0.5) {
  return { pos: V(a.pos).lerp(b.pos, k).add(vec(0, lift, 0)), target: V(b.target), up: vec(0, 1, 0) };
}

/** Between worlds: turn toward where you are going early (the world you leave slides out of view), then fly
 *  straight at it, so it grows ahead of you and you arrive moving forward into the final view. No roll. */
function cruise(a, b, turn = 0.35) {
  const back = V(b.pos).sub(b.target).normalize(), D = a.pos.distanceTo(b.pos);
  const c = V(b.pos).add(back.multiplyScalar(D * 0.45));          // a control point behind the final view
  const f = (u) => {
    const s = ease(u), o = 1 - s;
    const pos = V(a.pos).multiplyScalar(o * o).add(V(c).multiplyScalar(2 * o * s)).add(V(b.pos).multiplyScalar(s * s));
    const target = V(a.target).lerp(b.target, ease(band(u, 0, turn)));
    U.pose(pos, target, V(a.up).lerp(b.up, ease(band(u, 0, turn))).normalize());
  };
  f.raw = true; f.ahead = () => null;
  return f;
}
/** Across a world from one site to the next, the way a drone would: straight up, along the curve of the ground at a
 *  height that suits the distance, looking ahead at where it is going, then down to the next machine. The horizon stays
 *  level the whole way (no roll), so you always know which way is forward. */
function hop(a, b, C) {
  const n0 = V(a.target).sub(C).normalize(), n1 = V(b.target).sub(C).normalize();
  const R = a.target.distanceTo(C), th = Math.max(1e-4, n0.angleTo(n1)), axis = V(n0).cross(n1).normalize();
  const top = R * clamp(th * 0.75, 0.1, 0.6);                            // farther apart, higher up
  const along = (s) => V(n0).applyAxisAngle(axis, th * s);
  const f = (u) => {
    const s = ease(band(u, 0.1, 0.9));                                     // travel along the ground
    const alt = top * (ease(band(u, 0, 0.38)) - ease(band(u, 0.62, 1)));   // climb, cruise, come down
    const ahead = clamp(s + (alt * 1.1) / R / th);                         // look as far ahead as you are high
    let pos = V(C).add(along(s).multiplyScalar(R + alt)), target = V(C).add(along(ahead).multiplyScalar(R)), up = along(s);
    const w0 = 1 - ease(band(u, 0, 0.2)), w1 = ease(band(u, 0.8, 1));      // leave and arrive on the stops' own views
    pos = pos.lerp(a.pos, w0).lerp(b.pos, w1); target = target.lerp(a.target, w0).lerp(b.target, w1);
    up = up.lerp(a.up, w0).lerp(b.up, w1).normalize();
    U.pose(pos, target, up);
  };
  f.raw = true;
  return f;
}

function buildPoses() {
  const shot = (spec) => U.shot(spec), M = (id) => shot({ kind: 'machine', id });
  const mC = U.bodyPos('moon'), maC = U.bodyPos('mars');
  const home = shot({ kind: 'home' }), moon = shot({ kind: 'body', body: 'moon' }), mars = shot({ kind: 'body', body: 'mars' });
  const echo = shot({ kind: 'echo' }), overview = shot({ kind: 'overview' }), earthrise = shot({ kind: 'earthrise' });
  const sv = M('surveyor3'), eagle = M('eagle'), lrv = M('lrv'), retro = M('retro');
  const soj = M('sojourner'), opp = M('opportunity'), ins = M('insight'), ing = M('ingenuity'), kep = M('kepler'), pio = M('pioneer10');
  const end = (s, k = 0.05) => pushIn(s, k);
  const eagleWide = innerWidth < 760 ? widen(eagle, 1.45, 0.5) : widen(eagle, 2.6, 1.1);   // phones already stand further back
  if (innerWidth < 760) eagleWide.target.lerp(eagle.target, 0.85);     // phones: aim at the lander, so it sits above the card
  const drift = (a, b) => { const f = U.path(a, b); f.raw = true; return f; };     // resting places: slow, constant speed
  const fly = (keys, o) => U.flight(keys, o);

  // lift-off: the camera tilts up after the top half, lets it go, then settles back on the half that stayed
  const n = V(eagle.up).normalize(), sz = U.size('eagle');
  const liftoff = (u) => {
    const a = band(u, 0.12, 0.85), r = a * a * sz * 9;
    const follow = ease(band(u, 0.12, 0.3)) * (1 - ease(band(u, 0.55, 0.85)));
    const k = ease(band(u, 0.05, 0.95));
    U.pose(V(eagle.pos).lerp(eagleWide.pos, k), V(eagle.target).lerp(eagleWide.target, k).add(V(n).multiplyScalar(r * 0.9 * follow)), n);
  };
  liftoff.raw = true;

  const oppMid = end(opp, 0.08), oppEnd = end(opp, 0.22), lastEnd = end(oppEnd, 0.1);
  poses = {
    start: drift(home, end(home)),
    toMoon: cruise(end(home), moon),
    moon: drift(moon, end(moon, 0.06)),
    toSurveyor3: fly([end(moon, 0.06), ...descend(sv, mC)], { bank: 0 }),
    surveyor3: drift(sv, end(sv)),
    toEagle: hop(end(sv), eagle, mC),
    liftoff,
    eagle: drift(eagleWide, end(eagleWide)),
    toLrv: hop(end(eagleWide), lrv, mC),
    lrv: drift(lrv, end(lrv)),
    toRetro: hop(end(lrv), retro, mC),
    retro: drift(retro, end(retro)),
    toEcho: fly([end(retro), rise(end(retro), mC, 1.2), echo], { look: 0.2 }),
    echo: drift(echo, end(echo, 0.04)),
    toMars: cruise(end(echo, 0.04), mars, 0.3),
    mars: drift(mars, end(mars, 0.06)),
    toSojourner: fly([end(mars, 0.06), ...descend(soj, maC)], { bank: 0 }),
    sojourner: drift(soj, end(soj)),
    toOpportunity: hop(end(soj), opp, maC),
    opportunity: drift(opp, oppMid),
    dust: drift(oppMid, oppEnd),
    lastCall: drift(oppEnd, lastEnd),
    toInsight: hop(lastEnd, ins, maC),
    insight: drift(ins, end(ins)),
    toIngenuity: hop(end(ins), ing, maC),
    ingenuity: drift(ing, end(ing)),
    toDeep: fly([end(ing), rise(end(ing), maC, 1.6), between(end(ing), overview, 40), overview], { look: 0.3, bank: 0.4 }),
    deep: drift(overview, end(overview, 0.04)),
    toKepler: fly([end(overview, 0.04), between(end(overview, 0.04), kep, 12), kep], { look: 0.2, bank: 0.3 }),
    kepler: drift(kep, end(kep)),
    toPioneer10: fly([end(kep), between(end(kep), pio, 30), pio], { look: 0.3, bank: 0.3 }),
    pioneer10: drift(pio, end(pio)),
    goHome: fly([end(pio), between(end(pio), earthrise, 40), earthrise], { look: 0.3, bank: 0.3 }),
    finale: drift(earthrise, end(earthrise, 0.03)),
  };
}

// ---- cards ----------------------------------------------------------------------------------
function startCard() {
  return h('section', { class: 'card card-start' },
    h('p', { class: 'eyebrow', id: 'now-line' }, nowLine()),
    h('h1', {}, t('app.title')),
    h('p', { class: 'tagline' }, t('start.line')),
    h('div', { class: 'start-row' },
      h('p', { class: 'cue' }, h('i', { 'aria-hidden': 'true' }), t('scroll.cue')),
      h('button', { type: 'button', class: 'btn btn-tour', onclick: startTour }, '▶ ', t('scroll.tour'))));
}
const nowLine = (now = new Date()) => t('v2.now', { date: fmtDate(now), time: now.toISOString().slice(11, 19) });

/** Arriving at Eagle: the real landing time, coordinates counting in to the real spot. */
function eagleArriveCard() {
  const a = artifact('eagle'), coords = h('p', { class: 'coords num' });
  const el = h('section', { class: 'card' },
    h('p', { class: 'eyebrow' }, t('scroll.descentKicker')),
    h('h1', {}, a.name),
    coords,
    h('p', { class: 'when' }, t('scroll.landed')));
  el._tick = (u) => {
    const k = ease(band(u, 0.2, 1));
    coords.textContent = `${(a.location.lat * k).toFixed(5)}° N · ${(a.location.lon_east * k).toFixed(5)}° E`;
  };
  return el;
}

/** Why only half of Eagle is there: landed → lift-off → today, with the year huge behind the lander. */
function liftoffCard() {
  const a = artifact('eagle'), when = h('p', { class: 'when' }), line = h('p', { class: 'lead' });
  const ph = ['landed', 'liftoff', 'today'].map((x) => h('span', {}, t(`scroll.phase.${x}`)));
  const el = h('section', { class: 'card' }, when, h('h1', {}, t('scroll.liftTitle')), line, h('div', { class: 'phases' }, ph));
  let last = -1;
  el._tick = (u) => {
    const stage = u < 0.12 ? 0 : u < 0.72 ? 1 : 2;
    const ks = [band(u, 0, 0.12), band(u, 0.12, 0.72), band(u, 0.72, 0.9)];
    ph.forEach((p, i) => { p.style.setProperty('--k', ks[i]); p.classList.toggle('on', i <= stage); });
    if (stage === 2) line.textContent = t('scroll.todayLine', { days: fmtNumber(Math.round(daysSince(a.since.date) * ease(band(u, 0.72, 0.92)))) });
    const big = $('bigtype'), y0 = 1969, y1 = new Date().getUTCFullYear();
    big.hidden = false;
    big.textContent = stage < 2 ? y0 : Math.round(y0 + (y1 - y0) * ease(band(u, 0.72, 0.9)));
    big.style.transform = `translateY(${-band(u, 0.12, 0.7) * 7}vh)`;
    big.style.opacity = band(u, 0, 0.08) * (1 - band(u, 0.92, 1));
    if (stage === last) return;
    last = stage;
    when.textContent = t(['scroll.landed', 'scroll.liftoff', 'scroll.today'][stage]);
    if (stage < 2) line.textContent = t(['scroll.landedLine', 'scroll.liftoffLine'][stage]);
  };
  return el;
}

/** The storm, driven by the scroll: tau from a normal 0.5 to 10.8 (the two real readings). */
function dustCard() {
  const num = h('span', { class: 'tau-num num' }, '0.5'), state = h('span', { class: 'sun-state' });
  const MAX = 11, at = (v) => `${(v / MAX) * 100}%`;
  const fill = h('span', { class: 'gauge-fill' });
  const tick = (v) => h('span', { class: 'gauge-tick', style: `inset-inline-start:${at(v)}` });
  const lbl = (v, text) => h('span', { style: `inset-inline-start:${at(v)}` }, text);
  const el = h('section', { class: 'card' },
    h('p', { class: 'eyebrow' }, t('dust.kicker')),
    h('h1', {}, t('dust.title')),
    h('p', { class: 'lead' }, t('dust.short')),
    h('div', { class: 'tau' }, h('span', { class: 'tau-label' }, t('dust.tau')), num, state),
    h('div', { class: 'gauge' },
      h('div', { class: 'gauge-bar' }, fill, tick(0.5), tick(2), tick(10.8)),
      h('div', { class: 'gauge-ticks' }, lbl(0.5, '0.5'), lbl(2, '2.0'), lbl(10.8, '10.8')),
      h('p', { class: 'gauge-note' }, t('scroll.recharge'), '. ', t('scroll.tauNote'))));
  el._tick = (u) => {
    const tau = 0.5 + (10.8 - 0.5) * ease(band(u, 0.15, 0.75));
    num.textContent = tau.toFixed(1);
    fill.style.setProperty('--k', tau / MAX);
    state.textContent = t(tau < 2 ? 'scroll.sunOk' : 'scroll.sunLow');
    state.classList.toggle('is-low', tau >= 2);
  };
  return el;
}

/** The last call: everything else falls away, one sentence in the middle of the dark. */
function lastCallCard() {
  const [first, ...rest] = t('dust.end').match(/[^.!?…؟]+[.!?…؟]+/g) ?? [t('dust.end')];
  return h('section', { class: 'card card-center' }, h('p', { class: 'eyebrow' }, t('dust.after')), h('h1', {}, first.trim()), h('p', { class: 'lead' }, rest.join(' ').trim()));
}

/** Each card is built once and kept. Cards for stops come from stops.js, as on the classic page. */
const views = new Map();
function view(card) {
  if (!card) return null;
  if (views.has(card)) return views.get(card);
  const own = { start: startCard, eagleArrive: eagleArriveCard, liftoff: liftoffCard, dust: dustCard, lastCall: lastCallCard }[card];
  let v;
  if (own) v = { el: own(), wide: card === 'start', center: card === 'lastCall' };
  else { const s = buildStop(card, ctx); v = { el: s.el, labels: s.labels, leave: s.leave, side: !!s.side }; }
  if (MACHINES.includes(card)) addTodayAndScience(v.el, card);
  if (card === 'start') v.labels = [{ text: t('body.moon'), kind: 'world', get: () => U.bodyPos('moon') }];
  views.set(card, v);
  return v;
}

/** On a machine's card: one bold line on the science it made possible, and its "where it is today" picture. */
function addTodayAndScience(el, id) {
  // one quiet line for status and the live sky ("Silent · 20,936 days · Now: sunlit…"), so the card reads quote first
  const nowP = el.querySelector('p.now'), status = el.querySelector('.status-line');
  if (nowP && status) { const sp = h('span', { class: 'now', 'data-now': id }); sp.textContent = nowP.textContent; nowP.remove(); status.append(sp); }
  const learned = h('p', { class: 'learned' }, h('span', { class: 'learned-k' }, t('scroll.learned')), t(`scroll.learned.${id}`));
  const voice = el.querySelector('.voice');
  if (voice) voice.after(learned); else el.querySelector('.actions')?.before(learned);
  const now = nowOf(id), actions = el.querySelector('.actions');
  if (now && actions) {
    actions.append(h('button', { type: 'button', class: spotOf(id) ? 'thumb thumb-now is-spot' : 'thumb thumb-now', onclick: (e) => showPhoto(artifact(id), { x: e.clientX, y: e.clientY }, 'now'), 'aria-label': t('scroll.now.title') },
      h('img', { src: now.src, alt: '' }), h('span', {}, t(spotOf(id) ? 'scroll.spot.btn' : 'scroll.now.title'), ' ↗')));
  } else if (!now) {
    learned.after(h('p', { class: 'now-far' }, t('scroll.now.far')));
  }
}

/** Wraps each word of a title so it can rise out of a mask. */
function split(h1) {
  if (h1.dataset.split) return;
  h1.dataset.split = '1';
  for (const node of [...h1.childNodes]) {
    if (node.nodeType !== 3) continue;
    const frag = document.createDocumentFragment();
    for (const part of node.textContent.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) frag.append(part);
      else frag.append(h('span', { class: 'w' }, h('span', {}, part)));
    }
    node.replaceWith(frag);
  }
}

/** Builds the card's lines in one after another as k goes 0 → 1 (titles word by word); out 0 → 1 takes it away. */
function reveal(el, k, out) {
  const kids = el.children, n = kids.length, s = k * (n * 0.35 + 1.6);
  for (let i = 0; i < n; i++) {
    if (kids[i].tagName === 'H1') {
      split(kids[i]);
      kids[i].querySelectorAll('.w > span').forEach((w, j) => {
        const x = ease(clamp((s - i * 0.35 - j * 0.12) * 1.4));
        w.style.transform = x === 1 ? '' : `translateY(${(1 - x) * 110}%)`;
      });
      continue;
    }
    const x = ease(clamp(s - i * 0.35));
    kids[i].style.opacity = x;
    kids[i].style.transform = x === 1 ? '' : `translateY(${(1 - x) * 22}px)`;
  }
  const o = 1 - out;
  el.style.opacity = o;
  el.style.transform = o === 1 ? '' : `translateY(${-(1 - o) * 18}px)`;
  el.style.filter = o === 1 ? '' : `blur(${(1 - o) * 6}px)`;
}

// ---- the flight readout ---------------------------------------------------------------------
const lightOf = (id, lt) => (id === 'start' ? 0 : lt[id] ?? 0);
const placeName = (id) => (id === 'start' ? t('body.earth') : id === 'moon' || id === 'mars' ? t(`body.${id}`) : stopName(id));
const MILES = [10, 60, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 57600];
/** A hop across one world: real distance along the ground and the compass heading, from the two sites' coordinates. */
const RADIUS_KM = { moon: 1737.4, mars: 3389.5 };
const DIRS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
function hopInfo(seg, i) {
  const from = SEG.slice(0, i).reverse().find((s) => s.site)?.site;
  const A = artifact(from).location, B = artifact(seg.site).location, r = Math.PI / 180;
  const p1 = A.lat * r, p2 = B.lat * r, dl = (B.lon_east - A.lon_east) * r;
  const ang = Math.acos(clamp(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl), -1, 1));
  const brg = (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / r + 360) % 360;
  return { km: Math.round(ang * RADIUS_KM[seg.world] / 10) * 10, dir: DIRS[Math.round(brg / 45) % 8] };
}
function paintHop(box, seg, i, u) {
  if (box.dataset.for !== seg.id) {
    box.dataset.for = seg.id;
    const { km, dir } = hopInfo(seg, i);
    box.replaceChildren(h('p', { class: 'eyebrow' }, t('scroll.hop.next')),
      h('p', { class: 'flight-clock hop-name' }, artifact(seg.site).name),
      h('p', { class: 'flight-km' }, t(`scroll.hop.${seg.world}`, { km: fmtNumber(km), dir: t(`scroll.dir.${dir}`) })));
  }
  box.style.opacity = band(u, 0.06, 0.16) * (1 - band(u, 0.5, 0.6));
}

function paintFlight(seg, u, i) {
  const box = $('flight');
  if (seg.hop) { box.dataset.mile = ''; paintHop(box, seg, i, u); return; }
  if (!seg.flight) { box.style.opacity = 0; box.dataset.mile = ''; return; }
  const lt = lightTimes(), a = lightOf(seg.flight[0], lt), b = lightOf(seg.flight[1], lt), to = seg.flight[1];
  if (box.dataset.for !== seg.id) {
    box.dataset.for = seg.id;
    box.replaceChildren(h('p', { class: 'eyebrow' }, to === 'start' ? t('scroll.goingHome') : [t('travel.to'), ' ', placeName(to)]),
      h('p', { class: 'flight-clock num' }), h('p', { class: 'flight-km num' }), h('p', { class: 'flight-note' }, t('travel.note')));
  }
  const la = Math.log10(a + 1), lb = Math.log10(b + 1), s = 10 ** (la + (lb - la) * ease(u)) - 1;
  box.querySelector('.flight-clock').textContent = clock(s);
  box.querySelector('.flight-km').textContent = t('live.km', { km: kmOf(s) });
  box.style.opacity = band(u, 0.04, 0.14) * (1 - band(u, 0.86, 0.97));
  // milestones on the way out: how long the light has been going, and the place still not reached
  const passed = b > a ? MILES.filter((m) => m <= s && m > a && m < b - 5).pop() : null;
  const text = passed ? t('scroll.mile', { time: clock(passed), place: placeName(to) }) : '';
  if (box.dataset.mile !== text) {
    box.dataset.mile = text;
    box.querySelector('.flight-mile')?.remove();
    if (text) box.append(h('p', { class: 'flight-mile' }, text));
  }
}

// ---- what the scene looks like at each moment --------------------------------------------------
const dayAt = (site) => clamp(((U.sunAt(site) ?? 1) + 0.05) / 0.3);     // real Sun height at a Mars site, right now
const airAt = (site) => 0.15 + 0.85 * dayAt(site);
const MARS_SURFACE = ['sojourner', 'opportunity', 'dust', 'lastCall', 'insight', 'ingenuity'];

function stormAt(seg, u) {
  if (seg.id === 'dust') return ease(band(u, 0.15, 0.75));
  if (seg.id === 'lastCall') return 1;
  if (seg.id === 'toInsight') return 1 - ease(band(u, 0.1, 0.8));      // the storm clears on the way to InSight
  return 0;
}
function airOf(seg, i, u) {
  if (seg.id === 'toSojourner') return ease(band(u, 0.3, 0.85)) * airAt('sojourner');
  if (seg.id === 'toDeep') return airAt('ingenuity') * (1 - ease(band(u, 0, 0.25)));
  if (MARS_SURFACE.includes(seg.id)) return airAt(seg.site);
  if (seg.kind === 'move' && seg.world === 'mars') return lerp(airAt(SEG[i - 1].site), airAt(seg.site), ease(u));
  return 0;
}
/** How much night light a site needs: none by day, earthshine/starlight when its Sun is down right now. */
const nightAt = (site) => (site ? 1 - dayAt(site) : 0);
function nightOf(seg, i, u) {
  if (seg.kind === 'hold') return nightAt(seg.site);
  if (seg.kind === 'move') {
    let j = i - 1; while (j > 0 && SEG[j].kind !== 'hold') j--;
    return lerp(nightAt(SEG[j].site), nightAt(seg.site), ease(band(u, 0.4, 1)));
  }
  return 0;
}
function musicOf(seg, u) {
  if (Array.isArray(seg.world)) { const [a, b] = seg.world; return { [a]: 1 - band(u, 0, 0.45), [b]: band(u, 0.55, 1) }; }
  return { [seg.world]: 1 };
}

// ---- the scroll loop ------------------------------------------------------------------------
let starts = [], total = 0, shownSeg = null, shownCard = null, cur = null, smooth = 0;
function layout() {
  const vh = innerHeight;
  starts = []; total = 0;
  for (const s of SEG) { starts.push(total); total += s.vh * vh; }
  const track = $('track');
  track.style.height = `${total}px`;
  track.replaceChildren(...SEG.map((s, i) => (s.kind !== 'hold' ? null
    : h('i', { class: 'snap', id: `snap-${s.id}`, style: `top:${i === 0 ? 0 : i === SEG.length - 1 ? total - vh : starts[i] + s.vh * vh * (s.snapAt ?? 0.5) - vh * 0.5}px` }))).filter(Boolean));
  buildPoses();
}
const anchorY = (id) => $(`snap-${id}`)?.offsetTop ?? 0;

/** Scroll position → section and progress. The view looks at the middle of the screen. */
function at(y) {
  const p = clamp(y + innerHeight * 0.5, 0, total - 1);
  let i = SEG.length - 1;
  while (i > 0 && p < starts[i]) i--;
  return { i, seg: SEG[i], u: clamp((p - starts[i]) / (SEG[i].vh * innerHeight)) };
}

function paint(y) {
  const { i, seg, u } = at(y);
  // reduced motion: no travel; cut to the other side halfway through
  const cu = reduced() && seg.kind !== 'hold' && seg.id !== 'liftoff' ? (u < 0.5 ? 0 : 1) : u;
  const pose = poses[seg.id];
  pose?.(pose.raw ? cu : ease(cu));
  if (seg.kind === 'flight' && !reduced()) {
    const k = band(u, 0.06, 0.25) * (1 - band(u, 0.75, 0.94));
    U.streaks(u * seg.vh * 80, k);
  } else U.streaks(0, 0);
  U.pulse(null);
  const fr = seg.frame ?? (seg.card === 'finale' ? 'right' : seg.card === 'start' ? 'none' : 'left');
  U.frame(fr);
  document.body.classList.toggle('card-right', fr === 'right' && seg.kind === 'hold');   // the rail steps aside for a right-hand card

  // Eagle's top half: on the lander until lift-off, gone after
  const iL = IDX.liftoff;
  U.ascent('eagle', i < iL ? 0 : i > iL ? 1 : (reduced() ? (u < 0.4 ? 0 : 1) : band(u, 0.12, 0.85)));
  const storm = stormAt(seg, u);
  U.dustNow(storm);
  U.air(airOf(seg, i, u), storm);
  U.night(nightOf(seg, i, u), Array.isArray(seg.world) ? seg.world[1] : seg.world);
  $('veil').style.opacity = storm * 0.55 + (seg.id === 'lastCall' ? 0.4 * band(u, 0, 0.3) * (1 - band(u, 0.8, 1)) : 0);
  document.body.classList.toggle('is-dusty', storm > 0.5);

  if (shownSeg !== seg.id) enterSeg(seg, i);
  if (shownCard !== seg.card) showCard(seg.card);
  if (cur?.el) {
    const [a, b] = seg.cardIn ?? (seg.hop ? [0.62, 0.98] : seg.kind === 'move' ? [0.45, 0.95] : [0, 0.3]);
    const k = SEG[i - 1]?.card === seg.card ? 1 : band(u, a, b);
    const out = SEG[i + 1]?.card === seg.card || i === SEG.length - 1 ? 0 : ease(band(u, 0.88, 1));
    reveal(cur.el, k, out);
    cur.el._tick?.(u);
  }
  paintFlight(seg, u, i);
  paintRail(y, i);
  // sound: every level from where you are
  const engine = seg.id === 'liftoff' ? band(u, 0.1, 0.14) * (1 - band(u, 0.45, 0.75)) : 0;
  document.body.classList.toggle('is-quaking', engine > 0.4 && !reduced());
  const away = seg.kind === 'flight' ? band(u, 0.06, 0.25) * (1 - band(u, 0.75, 0.94)) : 0;
  mix({
    music: musicOf(seg, u),
    hush: seg.id === 'lastCall' ? 0.9 * band(u, 0, 0.3) * (1 - band(u, 0.8, 1)) : 0,
    engine, dust: storm,
    hiss: seg.id === 'toMars' ? away * 0.25 : away,
    cruise: seg.id === 'toMars' ? away : 0,
    lift: i < iL ? -1 : i === iL ? u : seg.world === 'moon' ? 2 : 3,
    devil: seg.id === 'dust' ? storm : 0,
    mile: $('flight').dataset.mile || '',
    call: seg.id === 'lastCall' && u > 0.12 && u < 0.85,
  });
}

/** Entering a section: labels, the lamp on the machine, the address, the next models. */
function enterSeg(seg, i) {
  shownSeg = seg.id;
  U.setLabels(seg.kind === 'hold' ? view(seg.card)?.labels || [] : []);
  U.focusMachine(seg.site ?? null);
  if (seg.kind === 'hold' && location.hash !== `#/${seg.id}` && !layerOpen()) history.replaceState(null, '', `#/${seg.id}`);
  // load the next machines' models before you get there
  for (const s of SEG.slice(i, i + 6)) {
    if (!s.site || !U.hasModel(s.site) || asked.has(s.site)) continue;
    asked.add(s.site);
    U.ready(s.site).then(() => U.prewarm());      // build its shaders as soon as it arrives, not when it first shows
  }
}
const asked = new Set();

function showCard(card) {
  cur?.leave?.();
  if (shownCard === 'finale') { roll?.stop?.(); roll = null; }
  shownCard = card;
  cur = view(card);
  $('card').replaceChildren(...(cur?.el ? [cur.el] : []));
  if (cur?.el) tickStop(cur.el, new Date());
  document.body.classList.toggle('is-wide', !!cur?.wide);
  document.body.classList.toggle('is-center', !!cur?.center);
  document.body.classList.toggle('is-side', !!cur?.side);
  if (card !== 'liftoff') $('bigtype').hidden = true;
  if (card === 'finale') roll = rollCall($('rollcall-mount'));
}

function paintRail(y, i) {
  const rail = $('rail'), ys = RAIL.map(anchorY);
  let here = -1;
  for (let j = i; j >= 0 && here < 0; j--) here = RAIL.indexOf(SEG[j].id);
  let k = 0;
  for (let j = 0; j < ys.length - 1; j++) if (y >= ys[j]) k = j + clamp((y - ys[j]) / (ys[j + 1] - ys[j]));
  rail.style.setProperty('--k', k / (ys.length - 1));
  [...rail.children].forEach((a, j) => { a.classList.toggle('is-here', j === here); a.classList.toggle('is-past', j < here); });
  // where you are, in words: "The Moon · 3 / 17"
  const w = SEG[i].world, world = Array.isArray(w) ? w[1] : w;
  const text = `${world === 'earth' ? t('body.earth') : t(`chapter.${world}`)} · ${here + 1} / ${RAIL.length}`;
  const where = $('rail-where');
  if (where.textContent !== text) where.textContent = text;
}
/** Desktop: the label sits just above the rail (measured, since the rail's height depends on the screen). */
function placeRailLabel() {
  const where = $('rail-where');
  where.style.top = innerWidth >= 760 ? `${$('rail').getBoundingClientRect().top - 10}px` : '';
}

let painted = null, lastT = 0, vel = 0, frames = 0, slow = 0, lowered = false;
const SPRING = 9;     // rad/s: a critically damped spring, settles in about half a second with no jolt on start
function loop(now = performance.now()) {
  const target = scrollY, dt = Math.min(0.25, (now - (lastT || now)) / 1000);
  lastT = now;
  if (reduced()) { smooth = target; vel = 0; }
  else {
    // the journey follows the scroll on a spring: it gathers speed and settles smoothly, whatever the wheel does.
    // Small fixed steps, so it keeps real time on slow devices too.
    for (let left = dt; left > 1e-6; left -= 1 / 120) {
      const step = Math.min(left, 1 / 120);
      vel += (SPRING * SPRING * (target - smooth) - 2 * SPRING * vel) * step;
      smooth += vel * step;
    }
    if (Math.abs(target - smooth) < 0.3 && Math.abs(vel) < 3) { smooth = target; vel = 0; }
  }
  if (smooth !== painted) {
    painted = smooth; paint(smooth);
    // slow device? lower the sharpness once, so motion stays fluid
    if (!lowered && dt > 0) {
      frames++; if (dt > 1 / 40) slow++;
      if (frames >= 90) { if (slow > 45) { U.quality(1); lowered = true; } frames = slow = 0; }
    }
  }
  requestAnimationFrame(loop);
}

function goTo(id, instant) {
  if (!HOLDS.includes(id)) return;
  const y = anchorY(id);
  scrollTo({ top: y, behavior: instant || reduced() ? 'auto' : 'smooth' });
  if (instant) { smooth = y; vel = 0; }
}
const holdHere = () => { const { i } = at(smooth); for (let j = i; j >= 0; j--) if (SEG[j].kind === 'hold') return SEG[j].id; return 'start'; };

// ---- addresses: #/<stop>, #/<machine>/story/<n>, #/story/<machine>, #/sources ---------------------------
function route(instant = false) {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'sources') { showSources(() => { location.hash = `#/${holdHere()}`; }); return; }
  const storyOf = parts[0] === 'story' ? parts[1] : parts[1] === 'story' ? parts[0] : null;
  if (storyOf && MACHINES.includes(storyOf)) {
    goTo(storyOf, instant);
    const n = parts[0] === 'story' ? 0 : Math.max(0, parseInt(parts[2] || '1', 10) - 1);
    showStory(storyOf, n, MACHINES, () => { location.hash = `#/${storyOf}`; });
    return;
  }
  if (layerOpen()) closeLayer();
  goTo(HOLDS.includes(parts[0]) ? parts[0] : 'start', instant);
}

// ---- the top bar ----------------------------------------------------------------------------
function paintSoundBtn() {
  $('sound-btn').setAttribute('aria-pressed', String(soundOn()));
  for (const b of document.querySelectorAll('.btn-sound-on')) b.hidden = soundOn();
}
async function toggleSound(on = !soundOn()) { await setSound(on); paintSoundBtn(); }

function buildChrome() {
  document.querySelector('.langs').replaceChildren(...LANGUAGES.map(([code, label]) =>
    h('button', { type: 'button', lang: code, 'aria-pressed': String(code === lang), onclick: () => { if (code !== lang) chooseLanguage(code); } }, label)));
  $('rail').replaceChildren(...RAIL.map((id) => h('a', { href: `#/${id}`, onclick: (e) => { e.preventDefault(); goTo(id); } },
    h('span', {}, id === 'dust' ? t('stop.dust.name') : stopName(id)), h('i', { 'aria-hidden': 'true' }))));
  $('sound-btn').addEventListener('click', () => toggleSound());
  paintSoundBtn();
  captions((c) => {
    const box = $('caption');
    box.hidden = !c;
    if (c) box.replaceChildren(h('span', { class: 'caption-who' }, c.who), ' ', c.text);
  });
}

// ---- tap a machine to see its real photo ------------------------------------------------------
const OFF = 'a, button, input, .card-host, header, .rail, #layer, .label, .caption';
function picking() {
  const hint = $('pick-hint');
  addEventListener('click', (e) => {
    if (layerOpen() || e.target.closest(OFF)) return;
    const id = U.pick(e.clientX, e.clientY), a = id && artifact(id);
    if (a && imageOf(a)) { hint.hidden = true; showPhoto(a, { x: e.clientX, y: e.clientY }); }
  });
  // with a mouse: a hand cursor and a small tag over a machine
  let queued = null;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!queued) requestAnimationFrame(() => {
      const ev = queued; queued = null;
      const id = !layerOpen() && !ev.target.closest(OFF) ? U.pick(ev.clientX, ev.clientY) : null;
      document.body.classList.toggle('over-machine', !!id);
      hint.hidden = !id;
      if (id) { hint.textContent = t('scroll.seePhoto'); hint.style.transform = `translate(${ev.clientX + 16}px, ${ev.clientY + 14}px)`; }
    });
    queued = e;
  }, { passive: true });
}

function keys(e) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape' && layerOpen()) { closeLayer(); if (location.hash.includes('sources')) history.replaceState(null, '', `#/${holdHere()}`); return; }
  if (layerOpen() || e.target.closest('input, textarea, select, [contenteditable], .hold, audio')) return;
  // ← / → jump to the previous / next resting place
  const fwd = document.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight', back = document.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  if (e.key !== fwd && e.key !== back) return;
  e.preventDefault();
  const here = HOLDS.indexOf(holdHere()), y = anchorY(HOLDS[here]);
  const next = e.key === fwd ? HOLDS[here + 1] : smooth > y + 20 ? HOLDS[here] : HOLDS[here - 1];
  if (next) goTo(next);
}

// ---- the loading screen ----------------------------------------------------------------------
function bootStage(text, f, loaded, total) {
  const boot = $('boot');
  if (!boot) return;
  if (text) boot.querySelector('.boot-text').textContent = text;
  if (f != null) {
    boot.querySelector('.boot-bar i').style.transform = `scaleX(${f})`;
    boot.querySelector('.boot-bar').setAttribute('aria-valuenow', String(Math.round(f * 100)));
    boot.querySelector('.boot-pct').textContent = `${Math.round(f * 100)}%`;
  }
  if (total) boot.querySelector('.boot-mb').textContent = `${(loaded / 1e6).toFixed(1)} / ${(total / 1e6).toFixed(1)} MB`;
}
/** Can this browser draw 3D at all? */
function hasWebGL() {
  if (new URLSearchParams(location.search).has('no3d')) return false;      // for testing the fallback
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
/** Every file the journey uses, so it can all be downloaded before it opens. */
function journeyFiles() {
  const photos = MACHINES.map((id) => imageOf(artifact(id))?.src).filter(Boolean);
  const draco = ['draco_wasm_wrapper.js', 'draco_decoder.wasm'].map((f) => `vendor/three/addons/libs/draco/gltf/${f}`);
  return [...Object.values(MAPS).map(mapSrc), ...Object.values(MODELS).map((m) => m.file), ...SOUND_FILES, ...photos, ...NOW_FILES, ...draco];
}

// ---- no 3D: the same journey as a plain page of cards ------------------------------------------------
function textJourney() {
  document.body.classList.add('no-3d');
  ctx = { U: { hasModel: () => false, modelNote: () => null, laser: () => {}, bodyPos: () => null, deepPos: () => null, machinePos: () => null }, photo: showPhoto };
  const intro = h('section', { class: 'card', id: 'snap-start' },
    h('h1', {}, t('app.title')), h('p', { class: 'tagline' }, t('start.line')), h('p', { class: 'muted' }, t('scroll.no3d')));
  const skip = new Set(['start', 'dust', 'lastCall', 'deep']);
  const sections = HOLDS.filter((id) => !skip.has(id)).map((id) => {
    const v = view(SEG[IDX[id]].card);
    v.el._tick?.(1);
    return h('section', { class: 'tj-stop', id: `snap-${id}` }, v.el);
  });
  $('card').replaceChildren(h('div', { class: 'text-journey' }, intro, ...sections));
  buildChrome();
  addEventListener('hashchange', () => route());
  roll = rollCall($('rollcall-mount'));
  route(true);
  $('boot').remove();
  setInterval(() => { if (document.hidden) return; const now = new Date(); for (const s of document.querySelectorAll('.tj-stop')) tickStop(s, now); roll?.tick(now); }, 1000);
}

// ---- the tour: a two-minute guided scroll through the highlights -------------------------------------
// [stop, seconds travelling there, seconds resting]
const TOUR = [['moon', 7, 2], ['eagle', 11, 3], ['echo', 8, 4], ['mars', 9, 2], ['dust', 8, 2], ['lastCall', 3, 4], ['ingenuity', 9, 3], ['pioneer10', 10, 3], ['finale', 9, 0]];
let touring = null;
function startTour() {
  if (touring) return;
  if (!soundOn()) toggleSound(true);           // the tour is made to be heard (a click started it, so sound may play)
  document.documentElement.classList.add('touring');
  const stop = $('tour-stop'); stop.hidden = false;
  let i = -1, t0 = 0, from = scrollY, to = 0, phase = 'rest', restUntil = 0;
  const easeIO = (x) => x * x * (3 - 2 * x);
  const step = (now) => {
    if (!touring) return;
    if (phase === 'rest' && now >= restUntil) {
      i++;
      if (i >= TOUR.length) { endTour(); return; }
      from = scrollY; to = anchorY(TOUR[i][0]); t0 = now; phase = 'move';
    }
    if (phase === 'move') {
      const k = Math.min(1, (now - t0) / (TOUR[i][1] * 1000));
      scrollTo(0, from + (to - from) * easeIO(k));
      if (k >= 1) {
        phase = 'rest'; restUntil = now + TOUR[i][2] * 1000;
        if (TOUR[i][0] === 'echo') document.querySelector('#card .fire button')?.click();     // fire the laser
      }
    }
    touring = requestAnimationFrame(step);
  };
  touring = requestAnimationFrame(step);
}
function endTour() {
  if (touring) cancelAnimationFrame(touring);
  touring = null;
  document.documentElement.classList.remove('touring');
  $('tour-stop').hidden = true;
}

async function start() {
  history.scrollRestoration = 'manual';
  await loadLanguage(preferredLanguage());
  await loadData();
  if (!hasWebGL()) { textJourney(); return; }

  // something true to read while it loads: how far away the worlds are right now, in light time
  { const lt = lightTimes(); $('boot-hook').textContent = t('scroll.boot.hook', { moon: clock(lt.moon), mars: clock(lt.mars) }); }
  // 1. download everything (into memory), with real progress
  bootStage(t('scroll.boot.download'), 0);
  const failed = await preload(journeyFiles(), (f, loaded, total) => bootStage(null, f * 0.88, loaded, total));
  if (failed.length) console.warn('not preloaded (will load when needed):', failed);
  // cards and the lightbox show the photos from memory too
  for (const id of MACHINES) { const img = imageOf(artifact(id)); if (img) img.src = asset(img.src); }

  // 2. prepare: decode the maps, build the models, compile the graphics
  bootStage(t('scroll.boot.prepare'), 0.9);
  U = createUniverse($('space'), { onPick: (id) => goTo(id) });
  for (const id of MACHINES) U.addMachine(artifact(id), imageOf(artifact(id))?.src);
  ctx = { U, photo: showPhoto };
  U.pause(true);
  U.decoder();
  const prepared = Promise.all([U.loaded(['stars', 'earth-clouds', 'earth', 'moon', 'mars']), ...Object.keys(MODELS).map((id) => U.ready(id))]);
  await Promise.race([prepared, new Promise((r) => setTimeout(r, 25000))]);      // never hang on a broken file
  for (const id of Object.keys(MODELS)) asked.add(id);
  bootStage(null, 0.96);

  buildChrome();
  // sound was on last time: browsers still need one tap or key press before it can play
  if (soundOn()) {
    const wake = () => { setSound(true); removeEventListener('pointerdown', wake, true); removeEventListener('keydown', wake, true); };
    addEventListener('pointerdown', wake, true); addEventListener('keydown', wake, true);
  }
  layout();
  placeRailLabel();
  addEventListener('resize', () => { layout(); placeRailLabel(); shownSeg = null; painted = null; });
  addEventListener('hashchange', () => route());
  addEventListener('keydown', keys);
  picking();
  // any touch, wheel or key while the tour runs hands control back to you
  for (const ev of ['wheel', 'touchstart', 'keydown', 'pointerdown']) addEventListener(ev, (e) => { if (touring && !e.target.closest?.('#tour-stop')) endTour(); }, { passive: true });
  $('tour-stop').addEventListener('click', endTour);
  route(true);
  U.prewarm();
  U.warm();
  requestAnimationFrame(loop);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));     // first frames drawn behind the curtain
  bootStage(null, 1);

  // 3. open
  U.pause(false);
  document.body.classList.add('is-ready');
  const boot = $('boot');
  if (reduced()) boot.remove(); else gsap.to(boot, { opacity: 0, duration: 0.9, onComplete: () => boot.remove() });
  setTimeout(() => boot.remove(), 1500);      // the fade slows down on weak devices; never leave the curtain up
  if (new URLSearchParams(location.search).has('tour')) setTimeout(startTour, 800);
  setInterval(() => {
    if (document.hidden) return;
    const now = new Date();
    if (cur?.el) tickStop(cur.el, now);
    const nl = $('now-line'); if (nl) nl.textContent = nowLine(now);
    roll?.tick(now);
  }, 1000);
  setInterval(() => { U.updateSun(new Date()); buildPoses(); painted = null; }, 60e3);
}

start().catch((err) => { console.error(err); $('card').replaceChildren(h('p', { class: 'loading', role: 'alert' }, 'The data could not be loaded. Run a small web server (see README).')); });
