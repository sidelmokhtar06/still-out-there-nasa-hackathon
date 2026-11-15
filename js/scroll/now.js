// "Where it is today": the latest look at each machine where it rests now. From orbit where a camera can
// see it (LROC on the Moon, HiRISE on Mars); for Ingenuity, Perseverance's photo; for Sojourner, the
// panorama that marks where it may be. Kepler and Pioneer 10 are too far away for any photo.
// Captions are in data/i18n/v2/*.json (scroll.now.<id>); sources and credits are in CREDITS.md.
import { asset } from './preload.js';

export const NOW = {
  eagle: { src: 'assets/img/now/eagle.webp', credit: 'NASA/GSFC/Arizona State University (LRO, PIA12909)' },
  surveyor3: { src: 'assets/img/now/surveyor3.webp', credit: 'NASA/GSFC/Arizona State University (LROC M104662862R)' },
  lrv: { src: 'assets/img/now/lrv.webp', credit: 'NASA/GSFC/Arizona State University (LROC M175252641)' },
  retro: { src: 'assets/img/now/retro.webp', credit: 'NASA/GSFC/Arizona State University (LROC M150633128)' },
  sojourner: { src: 'assets/img/now/sojourner.webp', credit: 'NASA/JPL (PIA09105, figure 5)', wide: true },
  opportunity: { src: 'assets/img/now/opportunity.webp', credit: 'NASA/JPL-Caltech/University of Arizona (HiRISE, PIA22549)' },
  insight: { src: 'assets/img/now/insight.webp', credit: 'NASA/JPL-Caltech/University of Arizona (HiRISE, PIA23376)' },
  ingenuity: { src: 'assets/img/now/ingenuity.webp', credit: 'NASA/JPL-Caltech/ASU/MSSS (Perseverance, PIA26236)' },
};
export const NOW_FILES = Object.values(NOW).map((n) => n.src);
/** The "today" picture for machine id (from memory once preloaded), or null. */
export const nowOf = (id) => (NOW[id] ? { ...NOW[id], src: asset(NOW[id].src) } : null);
