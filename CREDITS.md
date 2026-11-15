# Credits

## Imagery and 3D
- **Moon surface map:** NASA's Scientific Visualization Studio, CGI Moon Kit (LRO color mosaic, 4K). https://svs.gsfc.nasa.gov/4720
- **Mars, Earth, Earth clouds and Milky Way maps:** Solar System Scope textures (based on NASA elevation and imagery data), CC BY 4.0. https://www.solarsystemscope.com/textures/ (resized to 4K/2K)
- **3D models** of the Apollo Lunar Module (Eagle), Opportunity (MER-B), Ingenuity, Kepler, Pioneer 10 and InSight ("InSight Cruise Lander (arm deployed)", NASA/Brian E. Kumanchik): NASA 3D Resources. https://github.com/nasa/NASA-3D-Resources
- **Surveyor 3, the Lunar Roving Vehicle, the Apollo 14 laser retroreflector and Sojourner** have no public NASA 3D model. On the scroll journey they are simplified models we built in code (`js/scroll/models.js`) from NASA photos and published sizes; each card says so, and shows the real photo.

## Data
- Facts: see `data/sources.json` (also listed on the site's Sources page).
- Spacecraft distances: NASA JPL Horizons. https://ssd.jpl.nasa.gov/horizons/
- Mars time: NASA GISS Mars24 algorithm. https://www.giss.nasa.gov/tools/mars24/help/algorithm.html

## Software and fonts
- Astronomy Engine 2.1.19 by Don Cross, MIT License: `vendor/astronomy.browser.min.js`
- Atkinson Hyperlegible, © Braille Institute of America, SIL Open Font License 1.1: `vendor/fonts/`
- IBM Plex Mono, © IBM Corp., SIL Open Font License 1.1: `vendor/fonts/`
- IBM Plex Sans Arabic, SIL Open Font License 1.1: `vendor/fonts/` (loaded only for Arabic text)
- Geist and Geist Mono, © Vercel, SIL Open Font License 1.1: `vendor/fonts/`
- three.js 0.160.1 (MIT), with its GLTFLoader, DRACOLoader, OrbitControls and RoomEnvironment: `vendor/three/`
- GSAP 3.12.5 by GreenSock (free under the GSAP Standard "no charge" licence): `vendor/gsap/`

No NASA logos or mission patches are used. This project is not endorsed by NASA.

## Photos in the stories (NASA Image and Video Library)
| Machine | NASA ID | Credit |
|---|---|---|
| Eagle | as11-40-5927 | NASA / Neil Armstrong |
| Lunar Roving Vehicle | as15-86-11603 | NASA / David R. Scott |
| Laser Retroreflector | as14-67-09386 | NASA |
| Surveyor 3 | AS12-48-7133 | NASA |
| Sojourner | PIA00623 | NASA/JPL |
| Opportunity | PIA22930 | NASA/JPL-Caltech/Cornell/ASU (white gutters darkened, enlarged) |
| Ingenuity | PIA26243 | NASA/JPL-Caltech |
| InSight | PIA25287 | NASA/JPL-Caltech |
| Pioneer 10 | ARC-1972-AC72-2135 | NASA Ames Research Center |
| Kepler | PIA11188 | NASA/JPL-Caltech/Ball Aerospace |

Each links to https://images.nasa.gov/details/&lt;NASA ID&gt;. Photos are resized and compressed.

## "Where it is today" (`assets/img/now/`, resized, WebP)
| Machine | Image | Credit / source |
|---|---|---|
| Eagle | Apollo 11: Second Look (LRO, 2009), PIA12909 | NASA/GSFC/Arizona State University, https://images.nasa.gov/details/PIA12909 |
| Surveyor 3 | First Look: Apollo 12 and Surveyor 3 (LROC NAC M104662862R) | NASA/GSFC/Arizona State University, https://lroc.im-ldi.com/images/141 |
| Lunar Roving Vehicle | Follow the Tracks (LROC NAC M175252641, 2011) | NASA/GSFC/Arizona State University, https://lroc.im-ldi.com/images/491 |
| Laser retroreflector | New View of Apollo 14, close-up (LROC NAC M150633128) | NASA/GSFC/Arizona State University, https://lroc.im-ldi.com/images/285 |
| Sojourner | Mars Pathfinder Landing Site and Surroundings, figure 5 (panorama marked "Sojourner?"), PIA09105 | NASA/JPL, https://science.nasa.gov/photojournal/mars-pathfinder-landing-site-and-surroundings |
| Opportunity | Opportunity After the Dust Storm (HiRISE, 20 Sept 2018), figure 1, PIA22549 | NASA/JPL-Caltech/University of Arizona, https://science.nasa.gov/photojournal/opportunity-after-the-dust-storm |
| InSight | The Best View of InSight (HiRISE, 23 Sept 2019), PIA23376 | NASA/JPL-Caltech/University of Arizona, https://images.nasa.gov/details/PIA23376 |
| Ingenuity | Perseverance Spots Ingenuity at Its Final Airfield (4 Feb 2024), PIA26236 | NASA/JPL-Caltech/ASU/MSSS, https://images.nasa.gov/details/PIA26236 |

## Sounds (trimmed, converted to mono MP3, volume normalised)
| Machine | What | Credit / source |
|---|---|---|
| InSight | Sonification of the magnitude 5 marsquake, 4 May 2022 (PIA25281) | NASA/JPL-Caltech/CNES/IPGP, https://science.nasa.gov/photojournal/seismogram-and-sonification-of-insights-big-martian-quake/ |
| Ingenuity | Perseverance SuperCam microphone recording of Ingenuity's 4th flight, 30 April 2021 | NASA/JPL-Caltech/ASU/MSSS/LANL/CNES/CNRS/ISAE-SUPAERO, NASA Image and Video Library |

### Scroll prototype (`assets/audio/scroll/`)
| File | What | Credit / source |
|---|---|---|
| `apollo11-ascent-onboard.mp3` | Eagle's onboard recorder at lift-off from the Moon, 21 July 1969 (124:21:54–124:22:08 GET): Aldrin's countdown to "We're off". Onboard channel only, voice band, 14 s. Captions use the Apollo Lunar Surface Journal transcript. | NASA (JSC onboard audio, transferred by John Stoll, JSC). Synchronised file by Colin Mackellar, Honeysuckle Creek: https://honeysucklecreek.net/msfn_missions/MSFN/Network_A11_lunar_ascent.html · transcript: https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.launch.html |
| `perseverance-cruise-loop.mp3` | Perseverance's heat-rejection pump humming in deep space, recorded by its EDL microphone on the way to Mars, 19 Oct 2020. 30 s seamless loop, amplified. | NASA/JPL-Caltech/DPA, https://science.nasa.gov/resource/in-flight-perseverance-rovers-interplanetary-sound/ |
| `mars-wind-sol4-loop.mp3` | Wind on Mars, Perseverance SuperCam microphone, sol 4 (22 Feb 2021). 23 s seamless loop. | NASA/JPL-Caltech/LANL/CNES/CNRS/ISAE-Supaero, https://www.nasa.gov/sounds-from-beyond/ |
| `mars-dust-devil.mp3` | The first recording of a Martian dust devil, passing over Perseverance on sol 215 (27 Sept 2021). Used as one gust in the Opportunity storm scene: a different place and year, chosen for its sound. | NASA/JPL-Caltech/LANL/CNES/CNRS/INTA-CSIC/Space Science Institute/ISAE-Supaero, https://www.nasa.gov/sounds-from-beyond/ |

The scroll prototype also generates a little sound in the browser (ignition thump, radio static, high wind for small speakers) and does not use the recordings to claim anything they are not: Opportunity had no microphone.

## Background music
Three tracks from Pixabay, used under the Pixabay Content License (https://pixabay.com/service/license-summary/; no attribution required, credited with thanks). Each is gently compressed, made into a seamless loop and normalised to −26 LUFS (`assets/audio/music/`). The original downloads are not shipped.

| Loop | Track | Artist | Pixabay ID |
|---|---|---|---|
| `moon.mp3` | "Space" | leberch | 626368 |
| `mars.mp3` | "Space Ambient" | leberch | 509783 |
| `deep.mp3` | "Space Ambient" | freemusicforvideo | 446647 |

The earlier synthesised loops (`assets/audio/music-*.mp3`, made by `tools/make-music.py`, MIT) are no longer played.

## Narration voices
Story narration is AI-generated with ElevenLabs (free plan, non-commercial, attribution required): **elevenlabs.io**.
Voices: Brian, Charlie, Alice, Daniel, Laura, Matilda, Jessica, Eric, George, Lily (ElevenLabs default voices), model eleven_turbo_v2_5.
Generated by `tools/narrate.mjs` in English, French and Arabic; the narration text is our own.
