# Still Out There (v2)

*They stopped talking. They never left.*

**NASA Space Apps Challenge 2026 · "Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars"**

You scroll through one 3D universe from Earth to the Moon, then to Mars, then out to deep space, and stop at each of the ten machines people left behind. The scroll drives everything: the camera flies and lands as you scroll, cards build as you arrive, and scrolling back rewinds it all. Six machines are real NASA 3D models; NASA has no model of the other four (Surveyor 3, the Lunar Roving Vehicle, the laser retroreflector, Sojourner), so they are simplified models we built from NASA photos and sizes, and each card says so. Each machine tells its own story in its own recorded voice.

Everything you see is lit as it is **right now**. Earth, the Moon and Mars are turned so that today's sunlit side faces the Sun. The Sun angle drawn at every machine matches the Mars24 and Astronomy Engine values to 0.1°. If it is night at Eagle's landing site, the close-up is dark.

## The journey (18 stops, about 15 minutes)

| Chapter | Stops |
|---|---|
| Start | Hold to send a real signal at light speed. Its progress shows in the top bar, and the finale tells you when it reaches Pioneer 10. |
| 1 · The Moon | Overview → Surveyor 3 → Eagle → Lunar Roving Vehicle → Apollo 14 mirror → **the echo** (fire a laser at the mirror; the round trip takes real time) |
| 2 · Mars | Overview → Sojourner → Opportunity → **the dust storm** (the sky darkens; tau goes from 0.5 to 10.8) → InSight (real marsquake audio) → Ingenuity (real flight audio) |
| 3 · Deep space | Overview with live light times → Kepler → Pioneer 10 |
| Roll call | An Earthrise over the lunar horizon; all ten answer in their own voices |

**Getting around:**
- Scroll (or swipe, or Space / Page Down). The page settles gently at each stop. ← → jump to the previous or next stop.
- The rail on the side shows where you are; click a dot to fly there.
- Every stop has its own address (`#/opportunity`, `#/opportunity/story/3`), so links, Back and reloads all work.
- Flights between worlds show the real light-travel time; the flight to Mars is long on purpose.
- Sound (music, real NASA recordings, captions for the Apollo 11 lift-off) starts with the sound button.
- `classic.html` keeps the earlier step-by-step version (Next button and Map).
- **Watch a 2-minute tour** (on the first screen, or `index.html?tour`) scrolls itself through the highlights; any scroll, tap or key stops it.
- The site opens only once everything is downloaded and ready (about 12.8 MB on desktop, less on phones; story narration streams when you press Listen). Browsers without 3D (WebGL) get the same stops as a plain page of cards; `?no3d` shows it.

**Stories:** "Hear its story" opens five chapters. Each sentence lights up as the AI voice reads it, and every chapter has a **Real data** drawer with the sourced facts.

## Honesty notes

- Sizes and distances between worlds are not to scale, so that everything fits on screen. The on-screen clocks give the real distances.
- Every machine stands at its real latitude and longitude. For Opportunity and Ingenuity, NASA has published only the landing site, and the card says so.
- The Eagle model shows only the bottom half, because the top half flew the astronauts home.
- Facts, sources and narration come from v1. `npm test` checks the time engines against published references and refuses unverified facts.

## Run it

```sh
python3 -m http.server 8092      # open http://localhost:8092
npm test
```

No build step. Everything is vendored in `vendor/`: three.js, GSAP, Astronomy Engine and fonts. Add `?debug` to the address to expose `window.__sot` for checking the lighting.

## Layout

```
index.html  css/universe.css css/scroll.css      the scroll journey (main page)
js/scroll/scroll.js    the track: sections, camera moves, cards, readouts, all driven by the scroll
js/scroll/universe.js  the 3D scene with scroll-scrubbed flights, Mars sky, dust storm, Eagle's lift-off
js/scroll/sound.js     music and real recordings mixed from the scroll position
js/scroll/layers.js    story / photo / sources overlays, the signal you send
classic.html  js/app.js js/universe.js  the earlier step-by-step version
assets/audio/music/    background music loops; assets/audio/scroll/ real NASA recordings (see CREDITS.md)
js/stops.js      the 18 stops: camera shot, floating labels, card of words
js/story.js      story player with sentence-synced narration
js/rollcall.js   finale roll call
js/reach.js      live light time to each stop
js/time/ js/data.js js/i18n.js js/live.js js/v1/   from v1
data/i18n/v2/    interface strings (en, fr, ar)
assets/models/   NASA 3D Resources glTF models
assets/maps/     4K planet maps
tools/model-preview.html   dev page that renders all models side by side
```

## Credits

See [CREDITS.md](CREDITS.md). We used an AI coding assistant (Claude, by Anthropic) for code and first drafts; narration voices are AI-generated (elevenlabs.io). A student project, not made or endorsed by NASA.
