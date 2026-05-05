# Spinfinity — PRD

## Problem Statement (original)
User asked to resume a previously buggy project: a web app for random drawing using a roulette.
Two pages already coded (Main + Redline). Task: create the 3 missing themes (Corporate first, then Casino, TV Show) while keeping them integrated together.

## Architecture
- 100% static HTML/CSS/JS (no backend, no build step)
- Served from `/app/site/`
- User codes from phone, tests locally → simple `python -m http.server` workflow
- Future: may evolve to add social sharing of results

## User preferences captured
- Keep Redline slot-machine structure fidèle (vertical reel, prize banner, i18n, audio loader)
- Adapt the gauge widget per theme (mini roulette for Casino, applause meter for TV Show, progress ring for Corporate)
- Adapt smoke/particles per theme (gold coins for Casino, stars+confetti for TV Show, paper streamers for Corporate)
- Sound buckets per theme: applause (TV Show), jackpot (Casino), chimes/dings suggested for Corporate
- Start implementation with Corporate

## Implementation — completed (Jan 2026)

### Structure
```
/app/site/
├── index.html              # Landing page (from user's code, integrated)
├── README.md               # Usage instructions
├── corporate/index.html    # NEW — sober business theme
├── casino/index.html       # NEW — Las Vegas golden frame
├── redline/index.html      # from user's code (integrated)
├── tvshow/index.html       # NEW — Prime Time broadcast stage
└── {theme}/sounds/         # Auto-discovered sound folders per theme
```

### Theme specifications
| Theme     | Font                 | Gauge widget          | Particles           | Winner sound  |
|-----------|----------------------|-----------------------|---------------------|---------------|
| Corporate | Space Grotesk        | Progress ring         | Paper streamers     | Synth chime   |
| Casino    | Bungee               | Mini roulette wheel   | Gold coins+sparkles | Synth ka-ching|
| Redline   | Audiowide (user's)   | RPM tachometer        | Smoke puffs         | V8 engine mp3 |
| TV Show   | Bebas Neue           | Applause-o-meter      | Stars + confetti    | Synth applause|

### Features (all themes)
- ✅ Vertical slot machine with idle scroll + winner snap
- ✅ Import participants (lines or commas)
- ✅ Prize list (auto-attributed in order)
- ✅ Winners & Participants lists with counters
- ✅ "Restore winners to pool" action
- ✅ Reset confirmation dialog
- ✅ i18n FR/EN with localStorage + URL query `?lang=`
- ✅ Audio auto-discovery (`sounds/list.json` or `1.mp3..N.mp3`)
- ✅ Synth fallback when no sound file provided
- ✅ Prize banner with auto-hide after 10s
- ✅ Full responsive (mobile layout tested @ 680px breakpoint)
- ✅ Toast notification when no participants
- ✅ Fireworks/confetti on winner
- ✅ data-testid attributes on all interactive elements
- ✅ **Video Replay (9:16) for social media** — canvas-based MediaRecorder generates an MP4/WebM with intro → spin → winner reveal → outro. Share via Web Share API (TikTok / Insta / Stories) or download.
- ✅ **Watermark `spinfinity.app`** — frosted pill with theme-color glowing dot, positioned above default video controls (Feb 2026)
- ✅ **Prize displayed in replay video** — when prizes are imported, the winning prize is shown in a themed pill below the winner name with "WINS" / "GAGNE" label (Feb 2026)
- ✅ **Dynamic prize hashtag in share text** — share text becomes "Et le gagnant du {prize} est {winner}! 🎉 #Spinfinity #PrizeName" (Feb 2026)
- ✅ **"Keep winners in the pool" checkbox** — under the names input, persisted to localStorage per theme. When enabled, winners stay in the participants list (draw with replacement, useful for repeating draws like games / icebreakers) (Feb 2026)
- ✅ **Multi-win counter badge** — when the same person wins multiple times (keep-pool mode), each subsequent entry shows a `×N 🏆` badge in theme accent color in the Winners list (Feb 2026)
- ✅ Editable Corporate theme title (localStorage persisted)
- ✅ "Audio loaded" log hidden across all themes

### Testing
- Manual screenshot verification on all 4 themes (empty / idle / spinning / winner states)
- Links from landing page correctly route to each theme
- Back-home link on each theme returns to landing page
- i18n tested: FR ↔ EN switching updates all strings

## Backlog / Future work (P1/P2)

### P1 — Social sharing (user explicitly mentioned)
- Generate shareable result image (canvas → PNG) with winner + theme branding
- Copy-to-clipboard of winners list
- "Share" button → Twitter/Facebook/LinkedIn pre-filled posts
- Shareable URL with encoded participants+winners (read-only view)

### P2 — Quality of life
- Save/load draw sessions via localStorage
- Export winners CSV
- Drag & drop .txt / .csv files to import names
- "Multi-draw" mode (pick N winners at once)
- Keyboard shortcuts (space = spin, R = reset)
- Confetti intensity slider
- Custom theme builder

### P3 — Backend (if needed later)
- Persistent draw history
- Multi-user collaborative draws (room codes)
- Leaderboard / stats

## Notes
- All page files are standalone: opening `index.html` directly in a browser works (no build step, no npm)
- Sound discovery uses `fetch('sounds/list.json')` → requires http-server; from `file://` only the synth fallback plays
- Consider deploying to Netlify / Vercel for production (drag & drop of `site/` folder)
