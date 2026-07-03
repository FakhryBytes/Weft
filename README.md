# Weft — DE · NL · EN

A fully offline PWA for drilling German (A1), Dutch (A1), and English
(native-like refinement) in one mixed daily session, with Arabic hints
throughout. Spaced repetition (SM-2 style), 24 grammar mini-lessons,
pronunciation via on-device TTS, streaks, and a local backup/restore —
no account, no server, no tracking.

## Get it on your phone

The fastest way to install this as a real Android app icon isto do this:
1. Open the folloiwnng link `https://fakhrybytes.github.io/Weft/` URL on your phone
   in Chrome, then **⋮ menu → Add to Home screen** (or use the Install
   button under Settings once loaded).
2. After that first load, it works completely offline — the service
   worker caches the app shell, all fonts, and all vocab/grammar data.


## How the daily drill works

Each day, the app pulls together three things per language: cards that
are **due for review** (per the SM-2 schedule), plus a capped number of
**new cards** (set in Settings — default is your "ASAP" pace: 16 new
words per language per day, 48 total). These are shuffled and interleaved
round-robin across German → Dutch → English so no session is
single-language. Grading a card "Again" requeues it a few cards later in
the *same* session instead of waiting a full day, so mistakes get an
immediate second look.



## Data & privacy

Everything is stored in `localStorage` on your device — there's no
backend. Use **Settings → Export backup** to download a JSON snapshot
(handy before clearing browser data or switching phones), and **Import
backup** to restore it.
