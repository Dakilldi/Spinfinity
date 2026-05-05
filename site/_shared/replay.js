/* =========================================================
   Spinfinity — Shared Replay Module
   Generates a 9:16 vertical video replay (TikTok / Reels / Stories)
   of a draw, with theme-aware visuals + Web Share API integration.
========================================================= */
(function() {
'use strict';

/* ---------- Modal styles ---------- */
const STYLE = `
.replay-modal {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: replayFadeIn 0.3s ease;
    font-family: 'Manrope', system-ui, -apple-system, sans-serif;
}
@keyframes replayFadeIn { from { opacity: 0; } to { opacity: 1; } }
.replay-content {
    max-width: 420px; width: 100%;
    background: #14141c;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    padding: 20px;
    display: flex; flex-direction: column;
    gap: 14px;
    max-height: 95vh;
    overflow-y: auto;
}
.replay-title {
    font-size: 17px; font-weight: 700;
    color: #fff; text-align: center;
    letter-spacing: -0.01em;
    margin: 0;
}
.replay-loading {
    display: flex; flex-direction: column; align-items: center;
    padding: 30px 20px; gap: 14px; color: #9a9ba5;
    font-size: 14px;
}
.replay-spinner {
    width: 38px; height: 38px; border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: #a855f7;
    animation: replaySpin 0.8s linear infinite;
}
@keyframes replaySpin { to { transform: rotate(360deg); } }
.replay-progress {
    width: 100%; height: 4px; background: rgba(255,255,255,0.08);
    border-radius: 2px; overflow: hidden;
}
.replay-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #a855f7, #ec4899);
    transition: width 0.1s linear;
    width: 0%;
}
.replay-video {
    width: 100%; aspect-ratio: 9/16;
    border-radius: 12px;
    background: #000; max-height: 60vh; object-fit: contain;
    display: block;
}
.replay-actions {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 10px;
}
.replay-actions button {
    padding: 14px 14px;
    font-family: inherit;
    font-size: 14px; font-weight: 700;
    border-radius: 10px;
    cursor: pointer;
    border: 1px solid rgba(255,255,255,0.10);
    transition: transform 0.1s, background 0.2s, filter 0.2s;
    color: #fff;
    letter-spacing: 0.01em;
}
.replay-actions button:hover { transform: translateY(-1px); filter: brightness(1.08); }
.replay-actions button:active { transform: translateY(0); }
.replay-actions .replay-share {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, #a855f7, #ec4899);
    border: none;
    box-shadow: 0 6px 18px rgba(168,85,247,0.35);
}
.replay-actions .replay-download {
    background: rgba(255,255,255,0.05);
}
.replay-actions .replay-download:hover { background: rgba(255,255,255,0.1); }
.replay-actions .replay-close {
    background: transparent;
    color: #9a9ba5;
}
.replay-actions .replay-close:hover { background: rgba(255,255,255,0.04); color: #fff; }
.replay-note {
    font-size: 11px; color: #5a5b65; text-align: center;
    line-height: 1.5;
    padding: 0 4px;
}
.replay-error {
    color: #ef4444; padding: 24px; text-align: center;
    font-size: 14px;
}
@media (max-width: 480px) {
    .replay-actions button { font-size: 13px; padding: 12px 10px; }
    .replay-content { padding: 16px; }
}
`;

if (!document.querySelector('style[data-replay-style]')) {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-replay-style', '');
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);
}

/* ---------- i18n ---------- */
const I18N = {
    fr: {
        title:        'Replay du tirage',
        loading:      'Génération de la vidéo...',
        download:     '📥 Télécharger',
        share:        '📲 Partager (TikTok / Insta / FB)',
        close:        'Fermer',
        shareText:    'Et le gagnant est {winner} ! 🎉 #Spinfinity',
        shareTextPrize: 'Et le gagnant du {prize} est {winner} ! 🎉 #Spinfinity{prizeTag}',
        note:         'Format 9:16 prêt pour TikTok, Reels, Stories. Sur mobile, le bouton Partager ouvre directement l\'app de votre choix.',
        revealLabel:  '🎉 LE GAGNANT EST',
        prizeLabel:   'GAGNE',
        shareFail:    'Le partage direct du fichier vidéo n\'est pas supporté par votre navigateur. La vidéo a été téléchargée — partagez-la depuis votre galerie ou app de fichiers.',
        notSupported: 'Votre navigateur ne supporte pas la génération vidéo (MediaRecorder).',
    },
    en: {
        title:        'Draw replay',
        loading:      'Generating video...',
        download:     '📥 Download',
        share:        '📲 Share (TikTok / Insta / FB)',
        close:        'Close',
        shareText:    'And the winner is {winner}! 🎉 #Spinfinity',
        shareTextPrize: 'And the winner of {prize} is {winner}! 🎉 #Spinfinity{prizeTag}',
        note:         'Vertical 9:16 format ready for TikTok, Reels, Stories. On mobile, the Share button opens your app of choice directly.',
        revealLabel:  '🎉 AND THE WINNER IS',
        prizeLabel:   'WINS',
        shareFail:    'Direct video file sharing isn\'t supported by your browser. The video was downloaded — share it from your gallery or files app.',
        notSupported: 'Your browser does not support video generation (MediaRecorder).',
    }
};

function getLang() {
    const stored = localStorage.getItem('spinfinity-lang');
    if (stored && I18N[stored]) return stored;
    const nav = (navigator.language || 'fr').slice(0,2).toLowerCase();
    return I18N[nav] ? nav : 'fr';
}

/* ---------- Audio (ticks only — synchronized with the wheel deceleration) ----------
   The tick functions below are byte-for-byte copies of each theme's playTick(),
   re-routed to a custom AudioNode destination so they can be captured by MediaRecorder
   AND played live in the landing preview. */
const ReplayAudio = {
    profiles: {
        /* --- Redline: noise burst + triangle pluck (matches /redline/playTick) --- */
        redline(ctx, dest, when) {
            const dur = 0.05;
            const len = Math.floor(ctx.sampleRate * dur);
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/len, 0.7);
            const noise = ctx.createBufferSource(); noise.buffer = buf;
            const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 5;
            const nGain = ctx.createGain();
            nGain.gain.setValueAtTime(0.0001, when);
            nGain.gain.linearRampToValueAtTime(0.18, when + 0.001);
            nGain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
            const o = ctx.createOscillator(); o.type = 'triangle';
            o.frequency.setValueAtTime(1600, when);
            o.frequency.exponentialRampToValueAtTime(900, when + 0.025);
            const oGain = ctx.createGain();
            oGain.gain.setValueAtTime(0.0001, when);
            oGain.gain.linearRampToValueAtTime(0.06, when + 0.001);
            oGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
            noise.connect(bp); bp.connect(nGain); nGain.connect(dest);
            o.connect(oGain); oGain.connect(dest);
            noise.start(when); noise.stop(when + dur);
            o.start(when); o.stop(when + 0.035);
        },
        /* --- Casino: bright square tick (matches /casino/playTick) --- */
        casino(ctx, dest, when) {
            const dur = 0.04;
            const o = ctx.createOscillator(); o.type = 'square';
            o.frequency.setValueAtTime(1800, when);
            o.frequency.exponentialRampToValueAtTime(900, when + dur);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, when);
            g.gain.linearRampToValueAtTime(0.05, when + 0.001);
            g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
            o.connect(g); g.connect(dest);
            o.start(when); o.stop(when + dur + 0.01);
        },
        /* --- TV Show: drum-like low triangle (matches /tvshow/playTick) --- */
        tvshow(ctx, dest, when) {
            const dur = 0.06;
            const o = ctx.createOscillator(); o.type = 'triangle';
            o.frequency.setValueAtTime(200, when);
            o.frequency.exponentialRampToValueAtTime(80, when + dur);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, when);
            g.gain.linearRampToValueAtTime(0.09, when + 0.001);
            g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
            o.connect(g); g.connect(dest);
            o.start(when); o.stop(when + dur + 0.01);
        },
        /* --- Corporate: soft sine wooden tick (matches /corporate/playTick) --- */
        corporate(ctx, dest, when) {
            const dur = 0.04;
            const o = ctx.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(1800, when);
            o.frequency.exponentialRampToValueAtTime(1100, when + dur);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, when);
            g.gain.linearRampToValueAtTime(0.035, when + 0.001);
            g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
            o.connect(g); g.connect(dest);
            o.start(when); o.stop(when + dur + 0.01);
        }
    },

    /**
     * Schedule the spin tick soundtrack. No lock-clunk, no reveal sound.
     * The ticks fire on every integer step boundary of the wheel, using the
     * same easeOut profile as the visual deceleration.
     */
    scheduleSoundtrack(ctx, dest, T_INTRO, T_SPIN, totalSpinSteps, audioStart, profileSlug) {
        const tick = this.profiles[profileSlug] || this.profiles.corporate;
        const total = Math.max(1, totalSpinSteps);
        for (let k = 1; k <= total; k++) {
            const targetEased = k / total;
            const pt = 1 - Math.pow(1 - targetEased, 1/5);
            const tMs = T_INTRO + pt * T_SPIN;
            tick(ctx, dest, audioStart + tMs / 1000);
        }
    }
};

/* ---------- Recorder ---------- */
class ReplayRecorder {
    constructor(theme, externalCanvas) {
        this.theme = theme;
        if (externalCanvas) {
            this.canvas = externalCanvas;
            this.W = externalCanvas.width;
            this.H = externalCanvas.height;
        } else {
            this.W = 720;
            this.H = 1280;
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.W;
            this.canvas.height = this.H;
        }
        this.ctx = this.canvas.getContext('2d');
        this.confetti = [];
        this.lang = getLang();
    }

    pickMime() {
        const list = [
            'video/mp4;codecs=avc1.42E01F',
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        for (const m of list) {
            try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {}
        }
        return '';
    }

    async record(participants, winner, onProgress, prize) {
        if (typeof MediaRecorder === 'undefined') {
            throw new Error(I18N[this.lang].notSupported);
        }
        try { await document.fonts.ready; } catch (e) {}

        const mime = this.pickMime();

        // ---- Audio: synthesize a soundtrack and merge it with the canvas video ----
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        let audioCtx = null;
        let audioDest = null;
        if (AudioCtx) {
            try {
                audioCtx = new AudioCtx();
                if (audioCtx.state === 'suspended') {
                    try { await audioCtx.resume(); } catch (e) {}
                }
                audioDest = audioCtx.createMediaStreamDestination();
            } catch (e) {
                audioCtx = null;
            }
        }

        const videoStream = this.canvas.captureStream(30);
        const tracks = [...videoStream.getVideoTracks()];
        if (audioDest) tracks.push(...audioDest.stream.getAudioTracks());
        const stream = new MediaStream(tracks);

        const opts = { videoBitsPerSecond: 5_000_000 };
        if (audioDest) opts.audioBitsPerSecond = 128_000;
        if (mime) opts.mimeType = mime;
        const recorder = new MediaRecorder(stream, opts);
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

        const recDone = new Promise(resolve => {
            recorder.onstop = () => {
                const type = mime || 'video/webm';
                if (audioCtx) { try { audioCtx.close(); } catch (e) {} }
                resolve({ blob: new Blob(chunks, { type }), mime: type });
            };
        });

        recorder.start();

        // Phases (ms) — slightly longer reveal/outro when there's a prize
        const T_INTRO = 800;
        const T_SPIN = 3500;
        const T_REVEAL = prize ? 1700 : 1400;
        const T_OUTRO = prize ? 1400 : 1100;
        const TOTAL = T_INTRO + T_SPIN + T_REVEAL + T_OUTRO;

        const seq = this.buildSequence(participants, winner, 60);
        this.confetti = [];

        // Schedule the audio soundtrack so it stays perfectly in sync with the visuals
        if (audioCtx && audioDest) {
            const totalSpinSteps = seq.winnerIdx - seq.startIdx;
            ReplayAudio.scheduleSoundtrack(
                audioCtx, audioDest,
                T_INTRO, T_SPIN, totalSpinSteps,
                audioCtx.currentTime + 0.05,
                this.theme.slug
            );
        }

        const startTime = performance.now();
        await new Promise(resolve => {
            const tick = (now) => {
                const t = now - startTime;
                this.renderFrame(t, T_INTRO, T_SPIN, T_REVEAL, T_OUTRO, seq, winner, prize);
                if (onProgress) onProgress(Math.min(1, t / TOTAL));
                if (t < TOTAL) requestAnimationFrame(tick);
                else resolve();
            };
            requestAnimationFrame(tick);
        });

        await new Promise(r => setTimeout(r, 250));
        recorder.stop();
        return recDone;
    }

    buildSequence(participants, winner, count) {
        const others = (participants || []).filter(p => p && p !== winner);
        const pool = others.length ? others : [winner];
        const PAD = 8;
        const items = [];
        // Top padding (visible above first spin item at intro)
        for (let i = 0; i < PAD; i++) items.push(pool[Math.floor(Math.random() * pool.length)]);
        // Main spin sequence (random names from the pool)
        for (let i = 0; i < count - 1; i++) items.push(pool[Math.floor(Math.random() * pool.length)]);
        // Winner at the end of the spin
        items.push(winner);
        const winnerIdx = items.length - 1;
        // Bottom padding (visible below winner during reveal)
        for (let i = 0; i < PAD; i++) items.push(pool[Math.floor(Math.random() * pool.length)]);
        return { items, startIdx: PAD, winnerIdx };
    }

    drawSlot(seq, phase, pt) {
        const { items, startIdx: spinStart, winnerIdx } = seq;
        const ctx = this.ctx, { W, theme } = this;
        const SX = 60, SY = 220, SW = 600, SH = 700;
        const ITEM_H = 110;
        const CENTER = SY + SH/2;
        const R = (SH - 60) / 2; // cylinder radius

        let scrollIdx;
        if (phase === 'intro') scrollIdx = spinStart;
        else if (phase === 'spin') {
            const eased = 1 - Math.pow(1 - pt, 5);
            scrollIdx = spinStart + eased * (winnerIdx - spinStart);
        } else scrollIdx = winnerIdx;

        // Frame background
        ctx.save();
        ctx.fillStyle = this.shade(theme.bg, -0.5);
        this.roundRect(ctx, SX, SY, SW, SH, 18);
        ctx.fill();
        ctx.restore();

        // Inner clip + items rendered with cylinder projection
        ctx.save();
        this.roundRect(ctx, SX+10, SY+10, SW-20, SH-20, 12);
        ctx.clip();

        // Subtle vertical gradient inside the drum (top darker, middle lit, bottom darker)
        const drumG = ctx.createLinearGradient(0, SY+10, 0, SY+SH-10);
        drumG.addColorStop(0,   this.shade(theme.bg, -0.7));
        drumG.addColorStop(0.5, this.shade(theme.bg, -0.45));
        drumG.addColorStop(1,   this.shade(theme.bg, -0.7));
        ctx.fillStyle = drumG;
        ctx.fillRect(SX+10, SY+10, SW-20, SH-20);

        const isWinnerRevealed = phase === 'reveal' || phase === 'outro';
        const range = 9;
        const startI = Math.max(0, Math.floor(scrollIdx) - range);
        const endI = Math.min(items.length - 1, Math.floor(scrollIdx) + range);

        // Render each visible item with cylindrical projection
        for (let i = startI; i <= endI; i++) {
            const dy = (i - scrollIdx) * ITEM_H;
            const theta = dy / R; // angle around the drum axis
            const cosT = Math.cos(theta);
            if (cosT <= 0.04) continue; // behind the drum
            const projY = CENTER + R * Math.sin(theta);
            const scale = Math.max(0.42, cosT);
            const alpha = Math.pow(cosT, 1.35);
            const isThisTheWinner = (i === winnerIdx) && isWinnerRevealed;

            const fontSize = Math.round(56 * scale);
            ctx.font = `700 ${fontSize}px ` + theme.font;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.save();
            ctx.globalAlpha = alpha;
            if (isThisTheWinner) {
                ctx.fillStyle = theme.accent_text;
                ctx.shadowColor = theme.accent_text;
                ctx.shadowBlur = 30;
            } else {
                ctx.fillStyle = theme.text;
                ctx.shadowBlur = 0;
            }
            const name = items[i] || '';
            ctx.fillText(this.truncate(ctx, name, SW - 60), SX + SW/2, projY);
            ctx.restore();
        }
        ctx.restore();

        // Highlight band (always at the geometric center)
        ctx.save();
        const hY = CENTER - ITEM_H/2;
        const accent = isWinnerRevealed ? theme.accent_text : theme.accent1;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.shadowColor = accent;
        ctx.shadowBlur = isWinnerRevealed ? 22 : 12;
        ctx.beginPath();
        ctx.moveTo(SX+12, hY);
        ctx.lineTo(SX+SW-12, hY);
        ctx.moveTo(SX+12, hY + ITEM_H);
        ctx.lineTo(SX+SW-12, hY + ITEM_H);
        ctx.stroke();
        ctx.restore();

        // Outer frame
        ctx.save();
        ctx.strokeStyle = isWinnerRevealed ? theme.accent_text : this.toRGBA(theme.accent1, 0.5);
        ctx.lineWidth = 4;
        ctx.shadowColor = isWinnerRevealed ? theme.accent_text : theme.accent1;
        ctx.shadowBlur = isWinnerRevealed ? 30 : 14;
        this.roundRect(ctx, SX, SY, SW, SH, 18);
        ctx.stroke();
        ctx.restore();

        // Top/bottom fade overlays (sell the cylinder illusion)
        ctx.save();
        const topG = ctx.createLinearGradient(0, SY+10, 0, SY+130);
        topG.addColorStop(0, this.shade(theme.bg, -0.7));
        topG.addColorStop(1, 'transparent');
        ctx.fillStyle = topG;
        ctx.fillRect(SX+10, SY+10, SW-20, 120);

        const botG = ctx.createLinearGradient(0, SY+SH-130, 0, SY+SH-10);
        botG.addColorStop(0, 'transparent');
        botG.addColorStop(1, this.shade(theme.bg, -0.7));
        ctx.fillStyle = botG;
        ctx.fillRect(SX+10, SY+SH-130, SW-20, 120);
        ctx.restore();
    }

    renderFrame(t, T_INTRO, T_SPIN, T_REVEAL, T_OUTRO, seq, winner, prize) {
        let phase, pt;
        if (t < T_INTRO) { phase = 'intro'; pt = t / T_INTRO; }
        else if (t < T_INTRO + T_SPIN) { phase = 'spin'; pt = (t - T_INTRO) / T_SPIN; }
        else if (t < T_INTRO + T_SPIN + T_REVEAL) { phase = 'reveal'; pt = (t - T_INTRO - T_SPIN) / T_REVEAL; }
        else { phase = 'outro'; pt = (t - T_INTRO - T_SPIN - T_REVEAL) / T_OUTRO; }

        this.drawBackground();
        this.drawHeader(phase, pt);
        this.drawSlot(seq, phase, pt);

        if (phase === 'reveal' || phase === 'outro') {
            this.updateConfetti(phase === 'reveal' ? pt : 1.1);
            this.drawConfetti();
            this.drawWinnerReveal(winner, phase === 'reveal' ? pt : 1, phase === 'outro' ? pt : 0, prize);
        }
        this.drawWatermark(phase, pt);
    }

    drawBackground() {
        const ctx = this.ctx, { W, H, theme } = this;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, theme.bg);
        g.addColorStop(1, this.shade(theme.bg, -0.35));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        const r = ctx.createRadialGradient(W/2, 0, 0, W/2, 0, W*0.95);
        r.addColorStop(0, this.toRGBA(theme.accent1, 0.28));
        r.addColorStop(1, 'transparent');
        ctx.fillStyle = r;
        ctx.fillRect(0, 0, W, H);

        const r2 = ctx.createRadialGradient(W/2, H, 0, W/2, H, W*0.7);
        r2.addColorStop(0, this.toRGBA(theme.accent2, 0.22));
        r2.addColorStop(1, 'transparent');
        ctx.fillStyle = r2;
        ctx.fillRect(0, 0, W, H);
    }

    drawHeader(phase, pt) {
        const ctx = this.ctx, { W, theme } = this;
        const alpha = phase === 'intro' ? this.easeOut(pt) : 1;
        ctx.save();
        ctx.globalAlpha = alpha;

        // 1) "Spinfinity" brand — smaller, mixed-case, landing-page gradient (white → purple → pink)
        const BRAND_Y = 72;
        ctx.font = '800 34px "Manrope", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const brandText = 'Spinfinity';
        const bw = ctx.measureText(brandText).width;
        const bg = ctx.createLinearGradient(W/2 - bw/2, BRAND_Y - 30, W/2 + bw/2, BRAND_Y + 6);
        bg.addColorStop(0,    '#ffffff');
        bg.addColorStop(0.55, '#a855f7');
        bg.addColorStop(1,    '#ec4899');
        ctx.fillStyle = bg;
        ctx.fillText(brandText, W/2, BRAND_Y);

        // 2) Theme title — BIG, theme font, themed gradient + glow
        const TITLE_Y = 138;
        const titleSize = 62;
        ctx.font = `800 ${titleSize}px ` + theme.font;
        ctx.shadowColor = theme.titleShadow || theme.accent1;
        ctx.shadowBlur = 26;
        const display = (theme.display || '').toString();
        if (theme.titleGradient && theme.titleGradient.length >= 2) {
            const tw = ctx.measureText(display).width;
            const tg = ctx.createLinearGradient(W/2 - tw/2, TITLE_Y - 50, W/2 + tw/2, TITLE_Y + 8);
            const stops = theme.titleGradient;
            stops.forEach((c, i) => tg.addColorStop(i / (stops.length - 1), c));
            ctx.fillStyle = tg;
        } else {
            ctx.fillStyle = '#ffffff';
        }
        ctx.fillText(display, W/2, TITLE_Y);

        // 3) Subtitle — single or two lines, soft text color
        ctx.shadowBlur = 0;
        if (theme.subtitle) {
            ctx.font = '500 19px "Manrope", system-ui, sans-serif';
            ctx.fillStyle = this.toRGBA(theme.text, 0.7);
            const lines = this.wrapText(ctx, theme.subtitle, W - 100, 2);
            const baseY = 175;
            lines.forEach((ln, i) => ctx.fillText(ln, W/2, baseY + i * 24));
        }

        ctx.restore();
    }

    drawWinnerReveal(winner, rt, ot, prize) {
        const ctx = this.ctx, { W, theme } = this;
        const hasPrize = prize && String(prize).trim().length > 0;
        const dict = I18N[this.lang];
        const themeLabels = theme.labels && theme.labels[this.lang];
        const labelText = themeLabels && 'revealLabel' in themeLabels ? themeLabels.revealLabel : dict.revealLabel;
        const prizeLabelText = (themeLabels && themeLabels.prizeLabel) || dict.prizeLabel;
        const showLabel = !!labelText;
        // Tighter layout when there's a prize line, default otherwise; lift the name when no top label
        const labelY = hasPrize ? 945 : 990;
        const nameY = (hasPrize ? 1015 : 1080) - (showLabel ? 0 : 30);

        if (showLabel) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, rt * 1.8);
            ctx.font = '700 22px "Manrope", system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = theme.text;
            ctx.fillText(labelText, W/2, labelY);
            ctx.restore();
        }

        ctx.save();
        const scale = 0.5 + this.easeOutBack(Math.min(1, rt * 1.3)) * 0.5;
        ctx.translate(W/2, nameY);
        ctx.scale(scale, scale);

        const nameSize = hasPrize ? 58 : 70;
        ctx.font = `800 ${nameSize}px ` + theme.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.accent_text;
        ctx.shadowColor = theme.accent1;
        ctx.shadowBlur = 30;

        const truncated = this.truncate(ctx, winner, W - 60);
        ctx.fillText(truncated, 0, 0);
        ctx.restore();

        if (hasPrize) {
            // Prize line appears just after the name, slightly delayed
            const prizeAlpha = Math.max(0, Math.min(1, (rt - 0.35) * 2.4));
            if (prizeAlpha > 0) {
                ctx.save();
                ctx.globalAlpha = prizeAlpha;

                // "WINS" label (or theme override, e.g. TV Show: "Félicitations, tu as gagné")
                ctx.font = '700 18px "Manrope", system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = theme.text;
                ctx.fillText(prizeLabelText, W/2, 1075);

                // Prize pill
                ctx.font = '700 28px ' + theme.font;
                const prizeStr = String(prize).trim();
                const truncPrize = this.truncate(ctx, prizeStr, W - 120);
                const tw = ctx.measureText(truncPrize).width;
                const pillPad = 26;
                const pillH = 46;
                const pillW = Math.min(W - 80, tw + pillPad * 2);
                const pillX = W/2 - pillW/2;
                const pillY = 1095;

                ctx.fillStyle = this.toRGBA(theme.accent1, 0.18);
                this.roundRect(ctx, pillX, pillY, pillW, pillH, pillH/2);
                ctx.fill();

                ctx.strokeStyle = theme.accent_text;
                ctx.lineWidth = 2;
                ctx.shadowColor = theme.accent_text;
                ctx.shadowBlur = 16;
                this.roundRect(ctx, pillX, pillY, pillW, pillH, pillH/2);
                ctx.stroke();

                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.textBaseline = 'middle';
                ctx.fillText(truncPrize, W/2, pillY + pillH/2 + 2);

                ctx.restore();
            }
        }
    }

    drawWatermark(phase, pt) {
        const ctx = this.ctx, { W, H, theme } = this;
        // Always visible after a quick fade-in during intro
        const alpha = phase === 'intro' ? this.easeOut(pt) : 1;
        if (alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = alpha;

        const text = 'spinfinity.app';
        ctx.font = '700 26px "Manrope", system-ui, sans-serif';
        ctx.textBaseline = 'middle';

        const padding = 22;
        const dotSize = 9;
        const gap = 12;
        const textW = ctx.measureText(text).width;
        const pillW = padding + dotSize + gap + textW + padding;
        const pillH = 52;
        const pillX = W/2 - pillW/2;
        const pillY = H - 135;

        // Soft drop shadow under pill
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;

        // Pill background (frosted)
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        this.roundRect(ctx, pillX, pillY, pillW, pillH, pillH/2);
        ctx.fill();

        // Reset shadow for crisp border
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Theme-color glowing dot
        ctx.fillStyle = theme.accent1;
        ctx.shadowColor = theme.accent1;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(pillX + padding + dotSize/2, pillY + pillH/2, dotSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Brand text
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, pillX + padding + dotSize + gap, pillY + pillH/2 + 1);

        ctx.restore();
    }

    updateConfetti(rt) {
        if (rt < 0.06 && this.confetti.length === 0) {
            const colors = [this.theme.accent1, this.theme.accent2, this.theme.accent_text, '#ffffff'];
            for (let i = 0; i < 90; i++) {
                this.confetti.push({
                    x: this.W/2 + (Math.random() - 0.5) * 240,
                    y: this.H/2 + 100,
                    vx: (Math.random() - 0.5) * 22,
                    vy: -10 - Math.random() * 14,
                    size: 6 + Math.random() * 9,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    angle: Math.random() * Math.PI * 2,
                    spin: (Math.random() - 0.5) * 0.4,
                    life: 1
                });
            }
        }
        for (const p of this.confetti) {
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.55; p.vx *= 0.985;
            p.angle += p.spin;
            p.life -= 0.005;
        }
        this.confetti = this.confetti.filter(p => p.life > 0 && p.y < this.H + 100);
    }

    drawConfetti() {
        const ctx = this.ctx;
        for (const p of this.confetti) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size/2, -p.size/3, p.size, p.size*0.5);
            ctx.restore();
        }
    }

    /* Helpers */
    easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    easeOutBack(t) {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
    truncate(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let s = text;
        while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1);
        return s + '…';
    }
    wrapText(ctx, text, maxWidth, maxLines) {
        const max = maxLines || 2;
        const words = String(text).split(/\s+/).filter(Boolean);
        const lines = [];
        let line = '';
        let i = 0;
        while (i < words.length && lines.length < max) {
            const w = words[i];
            const test = line ? line + ' ' + w : w;
            if (ctx.measureText(test).width <= maxWidth) {
                line = test;
                i++;
            } else if (line) {
                lines.push(line);
                line = '';
            } else {
                // single word too long → force-truncate
                lines.push(this.truncate(ctx, w, maxWidth));
                line = '';
                i++;
            }
        }
        if (line && lines.length < max) lines.push(line);
        // If words remain, force them into the last line with truncation
        if (i < words.length && lines.length > 0) {
            const tail = lines[lines.length - 1] + ' ' + words.slice(i).join(' ');
            lines[lines.length - 1] = this.truncate(ctx, tail, maxWidth);
        }
        return lines;
    }
    toRGBA(hex, alpha) {
        const c = hex.replace('#', '');
        const r = parseInt(c.substring(0,2), 16);
        const g = parseInt(c.substring(2,4), 16);
        const b = parseInt(c.substring(4,6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    shade(hex, amt) {
        const c = hex.replace('#', '');
        let r = parseInt(c.substring(0,2), 16);
        let g = parseInt(c.substring(2,4), 16);
        let b = parseInt(c.substring(4,6), 16);
        const f = 1 + amt;
        r = Math.max(0, Math.min(255, Math.floor(r * f)));
        g = Math.max(0, Math.min(255, Math.floor(g * f)));
        b = Math.max(0, Math.min(255, Math.floor(b * f)));
        return `rgb(${r},${g},${b})`;
    }
}

/* ---------- Modal flow ---------- */
async function showReplayModal(theme, participants, winner, prize) {
    const lang = getLang();
    const dict = I18N[lang];

    const modal = document.createElement('div');
    modal.className = 'replay-modal';
    modal.setAttribute('data-testid', 'replay-modal');
    modal.innerHTML = `
        <div class="replay-content">
            <div class="replay-title">${dict.title}</div>
            <div class="replay-loading">
                <div class="replay-spinner"></div>
                <div>${dict.loading}</div>
                <div class="replay-progress"><div class="replay-progress-bar"></div></div>
            </div>
            <video class="replay-video" controls playsinline loop style="display:none"></video>
            <div class="replay-actions" style="display:none">
                <button class="replay-share" data-testid="replay-share-btn">${dict.share}</button>
                <button class="replay-download" data-testid="replay-download-btn">${dict.download}</button>
                <button class="replay-close" data-testid="replay-close-btn">${dict.close}</button>
            </div>
            <div class="replay-note" style="display:none">${dict.note}</div>
        </div>
    `;
    document.body.appendChild(modal);

    const progressBar = modal.querySelector('.replay-progress-bar');
    const recorder = new ReplayRecorder(theme);

    let result;
    try {
        result = await recorder.record(participants, winner, p => {
            progressBar.style.width = `${(p * 100).toFixed(1)}%`;
        }, prize);
    } catch (e) {
        modal.querySelector('.replay-loading').innerHTML =
            `<div class="replay-error">⚠ ${e.message || dict.notSupported}</div>`;
        setTimeout(() => modal.remove(), 4000);
        return;
    }

    const { blob, mime } = result;
    const url = URL.createObjectURL(blob);
    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
    const safe = (winner || 'winner').replace(/[^\w\u00C0-\u017F-]/g, '_').substring(0, 30);
    const filename = `spinfinity-${theme.slug}-${safe}.${ext}`;

    const video = modal.querySelector('.replay-video');
    video.src = url;
    video.style.display = 'block';
    // Try with sound first (user just clicked Replay → counts as gesture); fall back to muted if blocked
    video.muted = false;
    video.volume = 0.85;
    video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
    });
    modal.querySelector('.replay-loading').style.display = 'none';
    modal.querySelector('.replay-actions').style.display = 'grid';
    modal.querySelector('.replay-note').style.display = 'block';

    modal.querySelector('.replay-download').onclick = () => {
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
    };

    modal.querySelector('.replay-share').onclick = async () => {
        // Strip codec parameters from the MIME (Android share intents reject types like "video/webm;codecs=vp9")
        const baseMime = (mime || '').split(';')[0] || 'video/webm';
        const file = new File([blob], filename, { type: baseMime });
        const hasPrize = prize && String(prize).trim().length > 0;
        let shareText;
        if (hasPrize) {
            const prizeStr = String(prize).trim();
            const prizeTag = prizeStr
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9 ]/g, ' ')
                .split(/\s+/).filter(Boolean)
                .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join('');
            shareText = dict.shareTextPrize
                .replace('{winner}', winner)
                .replace('{prize}', prizeStr)
                .replace('{prizeTag}', prizeTag ? ' #' + prizeTag : '');
        } else {
            shareText = dict.shareText.replace('{winner}', winner);
        }

        const filesShareData = { files: [file], title: 'Spinfinity', text: shareText };
        const textShareData  = { title: 'Spinfinity', text: shareText, url: location.href };

        // 1) Try sharing the actual video file
        if (navigator.canShare && navigator.canShare(filesShareData)) {
            try {
                await navigator.share(filesShareData);
                return;
            } catch (e) {
                if (e.name === 'AbortError') return;
                // fall through to text share
            }
        }
        // 2) File share unsupported (common with WebM on Android Chrome) → auto-download then share text/link
        try {
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); a.remove();
        } catch (e) {}
        if (navigator.share) {
            try {
                await navigator.share(textShareData);
                return;
            } catch (e) {
                if (e.name === 'AbortError') return;
            }
        }
        // 3) Last-resort message — vidéo déjà téléchargée, l'utilisateur peut la partager depuis sa galerie
        alert(dict.shareFail);
    };

    const close = () => {
        try { video.pause(); } catch (e) {}
        URL.revokeObjectURL(url);
        modal.remove();
    };
    modal.querySelector('.replay-close').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
}

window.SpinfinityReplay = { ReplayRecorder, showReplayModal, ReplayAudio };

})();
