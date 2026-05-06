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
- ✅ **3D cylinder slot effect in replay** — items are now projected on a virtual rotating drum: padding above first/below winner, perspective scaling + alpha falloff, vertical gradient inside drum (Feb 2026)
- ✅ **Replay header rebrand** — "Spinfinity" matches the landing-page mixed-case gradient (white → purple → pink), theme title is bigger with theme-specific gradient + glow, theme subtitle line added for visual coherence with each theme page (Feb 2026)
- ✅ **Animated replay preview on landing page** — small 9:16 canvas above the themes grid plays a real-time replay loop and cycles through all 4 themes (Casino → Prime Time → Redline → Corporate) with active dots indicator. Pauses when off-screen for perf. Same render engine as the actual replay → 100% visual coherence. (Feb 2026)
- ✅ **Audio in recorded replay video** — synthesized soundtrack mixed into the MP4/WebM via `MediaStreamDestination`. Audio tracks added to the MediaStream alongside video before MediaRecorder starts. (Feb 2026)
- ✅ **Theme-specific tick sounds in replay video** — copies of each theme's `playTick()` exact implementation (Casino square 1800Hz→900Hz, TV Show triangle 200Hz→80Hz drum-like, Redline noise burst + triangle pluck 1600Hz→900Hz, Corporate sine 1800Hz→1100Hz). NO reveal/lock/celebration sounds — only ticks. Synced with the wheel's easeOut deceleration. (Feb 2026)
- ✅ **Fixed share button on Android Chrome / Samsung** — strip codec params from MIME (`video/webm;codecs=vp9` → `video/webm`), graceful fallback chain: file share → auto-download + text share → alert. Updated `shareFail` message to reflect the auto-download. (Feb 2026)
- ✅ **Sound toggle on landing preview** — circular speaker button (top-right of preview frame). Off by default (browsers block autoplay with sound). Click to unmute → schedules audio aligned with the next cycle start. Auto-suspends AudioContext when tab is hidden. (Feb 2026)
- ✅ **Reveal label simplified** — "Et le gagnant est" → "Le gagnant est" (FR) for a punchier on-screen reveal. (Feb 2026)
- ✅ **TV Show prize phrasing** — TV Show overrides the reveal label to empty (no "LE GAGNANT EST" header) and the prize label to "🎉 Félicitations ! Tu as gagné" / "🎉 Congratulations! You won". With prize: name + connector + prize pill. Without prize: just the name. Layout auto-adjusts (name lifted up by 30px when no top label). (Feb 2026)
- ✅ **/help/ page created** — full how-it-works guide with 6 illustrated steps (SVG icons), 4 theme showcases with dedicated illustrations (car+flag for Redline, laptop+chart for Corporate, chips+dice for Casino, mic+spots for TV Show), 4 "good to know" tips, FR/EN switch, sticky top bar with back link, themed CSS variables per step/theme. Linked from the landing via a glass "Comment ça marche ?" button placed below the themes grid. (Feb 2026)
- ✅ **/legal/ page created** — full legal notice + privacy policy in same style as /help/. 8 numbered sections (publisher, hosting, privacy, cookies, AdSense, GDPR rights, IP, contact), clickable TOC, info-cards with editable placeholders for publisher info, full FR/EN. Covers GDPR, AdSense disclosure (DART cookies, opt-out links), localStorage explanation, "100% local zero tracking" promise. Linked from landing footer ("Mentions légales", "Contact"). Ready for AdSense review. (Feb 2026)
- ✅ **TV Show page**: prize-label changed to "🎉 Félicitations ! Tu as gagné" (was "🎉 ET LE GAGNANT EST") — page label, not video. (Feb 2026)
- ✅ **/about/ and /contact/ pages** — provisional "Under construction" pages with cone icon, gradient title, CTA back to home + help, FR/EN. (Feb 2026)
- ✅ **Universal site footer** (`_shared/footer.js`) — auto-injected on every theme page (redline, corporate, casino, tvshow), help, legal, about, contact. Glass-blur strip with "© 2026 Spinfinity — Tirage au sort avec style" / "Random draws with style" + 3 links (À propos, Mentions légales, Contact). Honors `spinfinity-lang` localStorage. (Feb 2026)
- ✅ **Landing footer links fixed** — pointing to `./about/`, `./legal/`, `./contact/` (were `./help/` and `./legal/#contact`). (Feb 2026)
- ✅ **Corporate theme**: subtitle removed from replay header (matches the page which has no subtitle) (Feb 2026)
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
