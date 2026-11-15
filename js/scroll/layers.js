// What sits on top of the scroll journey: the story player, the photo lightbox and the sources sheet
// (one #layer, as on the classic site), plus the signal you send at the start and its payoff at the finale.
// Adapted from js/app.js so the classic page keeps working unchanged.
import { h, statusMark } from '../v1/dom.js';
import { t, lang } from '../i18n.js';
import { db } from '../data.js';
import { openStory, imageOf } from '../story.js';
import { lightTimes, clock, kmOf } from '../reach.js';
import { nowOf } from './now.js';

const $ = (id) => document.getElementById(id);
const gsap = globalThis.gsap;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'still-out-there-v2:';
const store = {
  get(k) { try { return localStorage.getItem(KEY + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(KEY + k, v); } catch { /* private mode */ } },
};

// ---- the layer ------------------------------------------------------------------------------
let story = null, onShut = null;
export const layerOpen = () => !$('layer').hidden;

function openLayer(build, shut) {
  const layer = $('layer'), opening = layer.hidden;
  story?.destroy(); story = null;
  onShut = shut;
  layer.hidden = false;
  document.body.classList.add('layer-open');
  build(layer);
  if (opening && !reduced()) gsap.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
}

export function closeLayer() {
  const layer = $('layer');
  story?.destroy(); story = null;
  if (layer.hidden) return;
  const done = () => { layer.hidden = true; layer.replaceChildren(); document.body.classList.remove('layer-open'); onShut?.(); onShut = null; };
  if (reduced()) done(); else gsap.to(layer, { opacity: 0, duration: 0.3, onComplete: () => { gsap.set(layer, { clearProps: 'opacity' }); done(); } });
}

/** The five-chapter story of machine `id`, starting at chapter `start` (0–4). */
export function showStory(id, start, order, onClose) {
  openLayer((layer) => { story = openStory(layer, id, start, order, { onClose }); }, null);
}

/** The real photos of machine a: on the surface (then) and where it is today (now), with a switch between them.
 *  from = {x, y}: the screen point it grows out of (where you tapped). which: 'then' or 'now'. */
export function showPhoto(a, from, which = 'then') {
  const img = imageOf(a), now = nowOf(a.id);
  if (!img && !now) return;
  const views = {
    then: img && { src: img.src, alt: t(img.alt_key), caption: t(img.caption_key), credit: img.credit, cls: a.id === 'opportunity' ? 'pixelated' : '' },
    now: now && { src: now.src, alt: t(`scroll.now.${a.id}`), caption: t(`scroll.now.${a.id}`), credit: now.credit, cls: now.wide ? 'wide' : '' },
  };
  if (!views[which]) which = views.then ? 'then' : 'now';
  openLayer((layer) => {
    const pic = h('img', {}), cap = h('figcaption', {});
    const tabs = views.then && views.now ? h('div', { class: 'seg photo-tabs', role: 'group', 'aria-label': t('scroll.now.title') },
      ['then', 'now'].map((k) => h('button', { type: 'button', 'data-k': k, onclick: () => show(k) }, t(k === 'then' ? 'scroll.now.then' : 'scroll.now.title')))) : null;
    function show(k) {
      const v = views[k];
      pic.src = v.src; pic.alt = v.alt; pic.className = v.cls;
      cap.replaceChildren(v.caption, ' ', h('span', { class: 'muted' }, t('media.credit', { credit: v.credit })));
      for (const b of tabs?.children ?? []) b.setAttribute('aria-pressed', String(b.dataset.k === k));
    }
    layer.replaceChildren(h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': a.name },
      h('button', { type: 'button', class: 'icon-btn lightbox-close', 'aria-label': t('sources.close'), onclick: closeLayer }, '×'),
      h('figure', {}, tabs, pic, cap)));
    show(which);
    layer.querySelector('.lightbox-close').focus();
    if (from && !reduced()) {
      const fig = layer.querySelector('figure'), r = fig.getBoundingClientRect();
      gsap.from(fig, { x: from.x - (r.left + r.width / 2), y: from.y - (r.top + r.height / 2), scale: 0.12, opacity: 0, duration: 0.75, ease: 'expo.out' });
    }
  });
}

export function showSources(onClose) {
  openLayer((layer) => {
    layer.replaceChildren(h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'src-title' },
      h('div', { class: 'sheet-head' }, h('p', { class: 'eyebrow' }, t('app.title')),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('sources.close'), onclick: onClose }, '×')),
      h('div', { class: 'sheet-body' },
        h('h1', { id: 'src-title', tabindex: '-1' }, t('sources.title')),
        h('p', { class: 'lead' }, t('about.lead')),
        h('h2', {}, t('about.why.title')), h('p', {}, t('about.why')),
        h('h2', {}, t('about.live')),
        h('ul', { class: 'bullets' }, ['mars', 'moon', 'deep'].map((k) => h('li', {}, t(`about.live.${k}`)))),
        h('p', {}, t('about.sorted')),
        h('h2', {}, t('about.models')), h('p', {}, t('about.models.body')),
        h('h2', {}, t('about.scale')), h('p', {}, t('about.scale.body')),
        h('h2', {}, t('about.all')),
        h('ol', { class: 'src-list' }, [...db.sources.values()].map((s) => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title),
          h('span', { class: 'muted' }, ` · ${s.publisher}`), s.official_resource ? h('span', { class: 'tag' }, t('story.official')) : null))),
        h('p', { class: 'muted small' }, t('app.notNasa')))));
    layer.querySelector('h1').focus();
  });
}

// ---- the signal ---------------------------------------------------------------------------
let sentAt = Number(store.get('sent')) || null;

function chirp() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(660, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.6);
    setTimeout(() => ctx.close(), 900);
  } catch { /* silent is fine */ }
}

/** The "hold to send" button on the first screen. onSent runs once the signal has left. */
export function holdButton(onSent) {
  const hold = h('button', { type: 'button', class: 'hold' },
    h('span', { class: 'hold-fill', 'aria-hidden': 'true' }), h('span', { class: 'hold-dot', 'aria-hidden': 'true' }), h('span', { class: 'hold-label' }, t(sentAt ? 'start.again' : 'start.hold')));
  const label = hold.querySelector('.hold-label');
  const MS = reduced() ? 300 : 1200;
  let t0 = 0, raf = 0, done = false;
  const set = (k) => hold.style.setProperty('--k', k);
  const tickHold = (n) => { const k = Math.min(1, (n - t0) / MS); set(k); if (k < 1) raf = requestAnimationFrame(tickHold); else fire(); };
  const down = (e) => {
    if (done || t0) return;
    if (e.type === 'keydown') { if (e.key !== ' ' && e.key !== 'Enter') return; e.preventDefault(); if (e.repeat) return; }
    t0 = performance.now(); hold.classList.add('is-holding'); label.textContent = t('start.holding');
    raf = requestAnimationFrame(tickHold);
  };
  const up = () => { if (done || !t0) return; cancelAnimationFrame(raf); t0 = 0; hold.classList.remove('is-holding'); label.textContent = t(sentAt ? 'start.again' : 'start.hold'); set(0); };
  function fire() {
    done = true; sentAt = Date.now(); store.set('sent', String(sentAt));
    hold.classList.remove('is-holding'); hold.classList.add('is-sent'); label.textContent = t('start.sent');
    chirp(); paintSignal();
    setTimeout(() => { onSent?.(); done = false; t0 = 0; }, reduced() ? 0 : 700);
  }
  hold.addEventListener('pointerdown', (e) => { hold.setPointerCapture?.(e.pointerId); down(e); });
  hold.addEventListener('pointerup', up);
  hold.addEventListener('pointercancel', up);
  hold.addEventListener('keydown', down);
  hold.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
  hold.addEventListener('contextmenu', (e) => e.preventDefault());
  return hold;
}

/** The chip in the top bar: where your signal is now. */
export function paintSignal(now = new Date()) {
  const chip = $('signal');
  if (!sentAt) { chip.hidden = true; paintPayoff(now); return; }
  const lt = lightTimes(now), out = (now - sentAt) / 1000;
  const targets = [['moon', t('body.moon')], ['mars', t('body.mars')], ['kepler', 'Kepler'], ['pioneer10', 'Pioneer 10']]
    .filter(([k]) => lt[k] != null).map(([k, name]) => ({ name, lt: lt[k] })).sort((a, b) => a.lt - b.lt);
  const next = targets.find((x) => x.lt > out);
  chip.hidden = false;
  chip.replaceChildren(h('i', { 'aria-hidden': 'true' }), h('span', { class: 'sig-label' }, t('signal.label')),
    h('span', {}, next ? t('signal.next', { name: next.name, when: clock(next.lt - out) }) : t('signal.done')));
  chip.title = t('hud.out', { km: kmOf(out) });
  paintPayoff(now);
}

/** At the finale: when your signal reaches Pioneer 10 (or an invitation to send one). */
export function paintPayoff(now = new Date()) {
  const box = $('payoff');
  if (!box) return;
  const p = lightTimes(now).pioneer10;
  if (p == null) { box.hidden = true; return; }
  const loc = lang === 'ar' ? 'ar-u-nu-latn' : lang;
  if (!sentAt) {
    if (box.dataset.text === 'none') return;
    box.dataset.text = 'none';
    box.replaceChildren(h('p', { class: 'eyebrow' }, t('eta.kicker')), h('p', { class: 'payoff-line' }, t('eta.none', { time: clock(p) })), h('a', { class: 'btn', href: '#/start' }, t('eta.send')));
    return;
  }
  const at = new Date(sentAt + p * 1000), arrived = now >= at;
  const text = t(arrived ? 'signal.arrived' : 'eta.at', { day: at.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }), time: at.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) });
  if (box.dataset.text === text) return;
  box.dataset.text = text;
  box.replaceChildren(h('p', { class: 'eyebrow' }, t('eta.kicker')), h('p', { class: 'payoff-line' }, text), h('p', { class: 'muted' }, t('eta.come')));
}

