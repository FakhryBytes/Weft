# Weft — DE · NL · EN

A fully offline PWA for drilling German (A1), Dutch (A1), and English
(native-like refinement) in one mixed daily session, with Arabic hints
throughout. Spaced repetition (SM-2 style), 24 grammar mini-lessons,
pronunciation via on-device TTS, streaks, and a local backup/restore —
no account, no server, no tracking.

## Get it on your phone

The fastest way to install this as a real Android app icon is to host it
somewhere with HTTPS (required for service workers / installability),
then open it once in Chrome and tap "Add to Home screen" — the app will
also offer an in-app **Install** button on the Settings page once Chrome
detects it's installable.

**Easiest option — GitHub Pages (free, matches how you deployed your
other offline tools):**

1. Create a new repo (e.g. `weft`) and push everything in this folder to
   it, unchanged (keep the folder structure as-is).
2. In the repo: **Settings → Pages → Deploy from a branch → main → /
   (root)**.
3. Open the resulting `https://<you>.github.io/weft/` URL on your phone
   in Chrome, then **⋮ menu → Add to Home screen** (or use the Install
   button under Settings once loaded).
4. After that first load, it works completely offline — the service
   worker caches the app shell, all fonts, and all vocab/grammar data.

**Alternative — any static host** (Netlify, Vercel, Firebase Hosting,
your own server): just upload the folder as-is; there's no build step.

**Local testing on desktop** (before deploying): run a static server
from this folder, e.g. `python3 -m http.server 8080`, then open
`http://localhost:8080`. Service workers also work on `localhost` without
HTTPS, so this is a good way to sanity-check before pushing.

## How it's organized

```
index.html        the app shell
manifest.json      PWA metadata (name, icons, colors)
sw.js               service worker — offline caching
css/style.css       all styling (design tokens at the top)
js/storage.js       localStorage persistence + backup/restore
js/srs.js           spaced-repetition scheduler (SM-2 style)
js/data.js          loads the JSON content decks
js/app.js           routing, rendering, drill/grammar/progress logic
data/vocab_de.json  114 German A1 words, with Arabic + English glosses
data/vocab_nl.json  114 Dutch A1 words, same format
data/vocab_en.json  52 English refinement items (collocations, idioms,
                     nuance points for closing the gap to native-like)
data/grammar_*.json 8 short lessons per language with a 3-question quiz
fonts/               IBM Plex Sans/Serif/Mono/Sans-Arabic, self-hosted
                     so the whole thing works with zero network calls
```

## How the daily drill works

Each day, the app pulls together three things per language: cards that
are **due for review** (per the SM-2 schedule), plus a capped number of
**new cards** (set in Settings — default is your "ASAP" pace: 16 new
words per language per day, 48 total). These are shuffled and interleaved
round-robin across German → Dutch → English so no session is
single-language. Grading a card "Again" requeues it a few cards later in
the *same* session instead of waiting a full day, so mistakes get an
immediate second look.

## Extending the content

The data files are the easiest way to grow this over time — Ahmed, since
you'll likely want to push past A1 fairly quickly:

- Add more items to `vocab_de.json` / `vocab_nl.json` following the same
  shape (`id`, `term`, `en`, `ar`, `cat`, `ex`, `ex_en`, `ex_ar`) — ids
  just need to stay unique per language.
- Add more lessons to `grammar_*.json` the same way.
- Bump `CACHE_VERSION` in `sw.js` (e.g. `weft-v2`) whenever you edit any
  file so the service worker picks up the change instead of serving a
  stale cached copy.
- If you want to add an A2 deck later, the simplest approach is a new
  file like `vocab_de_a2.json` plus a couple of lines in `data.js` and
  `app.js` to register it as a second deck per language.

## Data & privacy

Everything is stored in `localStorage` on your device — there's no
backend. Use **Settings → Export backup** to download a JSON snapshot
(handy before clearing browser data or switching phones), and **Import
backup** to restore it.
