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
        note:         'Format 9:16 prêt pour TikTok, Reels, Stories. Sur mobile, le bouton Partager ouvre directement l\'app de votre choix.',
        revealLabel:  '🎉 ET LE GAGNANT EST',
        shareFail:    'Le partage direct n\'est pas disponible sur ce navigateur. Téléchargez la vidéo et partagez-la depuis votre app.',
        notSupported: 'Votre navigateur ne supporte pas la génération vidéo (MediaRecorder).',
    },
    en: {
        title:        'Draw replay',
        loading:      'Generating video...',
        download:     '📥 Download',
        share:        '📲 Share (TikTok / Insta / FB)',
        close:        'Close',
        shareText:    'And the winner is {winner}! 🎉 #Spinfinity',
        note:         'Vertical 9:16 format ready for TikTok, Reels, Stories. On mobile, the Share button opens your app of choice directly.',
        revealLabel:  '🎉 AND THE WINNER IS',
        shareFail:    'Direct share is not available on this browser. Download the video and share it from your app.',
        notSupported: 'Your browser does not support video generation (MediaRecorder).',
    }
};

function getLang() {
    const stored = localStorage.getItem('spinfinity-lang');
    if (stored && I18N[stored]) return stored;
    const nav = (navigator.language || 'fr').slice(0,2).toLowerCase();
    return I18N[nav] ? nav : 'fr';
}

/* ---------- Recorder ---------- */
class ReplayRecorder {
    constructor(theme) {
        this.theme = theme;
        this.W = 720;
        this.H = 1280;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.W;
        this.canvas.height = this.H;
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

    async record(participants, winner, onProgress) {
        if (typeof MediaRecorder === 'undefined') {
            throw new Error(I18N[this.lang].notSupported);
        }
        try { await document.fonts.ready; } catch (e) {}

        const mime = this.pickMime();
        const stream = this.canvas.captureStream(30);
        const opts = { videoBitsPerSecond: 5_000_000 };
        if (mime) opts.mimeType = mime;
        const recorder = new MediaRecorder(stream, opts);
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

        const recDone = new Promise(resolve => {
            recorder.onstop = () => {
                const type = mime || 'video/webm';
                resolve({ blob: new Blob(chunks, { type }), mime: type });
            };
        });

        recorder.start();

        // Phases (ms)
        const T_INTRO = 800;
        const T_SPIN = 3500;
        const T_REVEAL = 1400;
        const T_OUTRO = 1100;
        const TOTAL = T_INTRO + T_SPIN + T_REVEAL + T_OUTRO;

        const seq = this.buildSequence(participants, winner, 60);
        this.confetti = [];

        const startTime = performance.now();
        await new Promise(resolve => {
            const tick = (now) => {
                const t = now - startTime;
                this.renderFrame(t, T_INTRO, T_SPIN, T_REVEAL, T_OUTRO, seq, winner);
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
        const seq = [];
        for (let i = 0; i < count; i++) {
            seq.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        seq[seq.length - 1] = winner;
        return seq;
    }

    renderFrame(t, T_INTRO, T_SPIN, T_REVEAL, T_OUTRO, seq, winner) {
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
            this.drawWinnerReveal(winner, phase === 'reveal' ? pt : 1, phase === 'outro' ? pt : 0);
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

        // Brand
        ctx.font = '800 38px "Manrope", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('SPINFINITY', W/2, 100);

        // Theme name
        ctx.font = '600 22px "Manrope", system-ui, sans-serif';
        ctx.fillStyle = theme.accent1;
        ctx.letterSpacing = '0.2em';
        ctx.fillText(theme.display.toUpperCase(), W/2, 140);

        ctx.restore();
    }

    drawSlot(seq, phase, pt) {
        const ctx = this.ctx, { W, theme } = this;
        const SX = 60, SY = 220, SW = 600, SH = 700;
        const ITEM_H = 110;
        const CENTER = SY + SH/2;

        let scrollIdx;
        if (phase === 'intro') scrollIdx = 0;
        else if (phase === 'spin') {
            const eased = 1 - Math.pow(1 - pt, 5);
            scrollIdx = eased * (seq.length - 1);
        } else scrollIdx = seq.length - 1;

        // Frame background
        ctx.save();
        ctx.fillStyle = this.shade(theme.bg, -0.5);
        this.roundRect(ctx, SX, SY, SW, SH, 18);
        ctx.fill();
        ctx.restore();

        // Inner clip + names
        ctx.save();
        this.roundRect(ctx, SX+10, SY+10, SW-20, SH-20, 12);
        ctx.clip();

        const offsetY = -scrollIdx * ITEM_H;
        const startIdx = Math.max(0, Math.floor(scrollIdx) - 4);
        const endIdx = Math.min(seq.length - 1, Math.floor(scrollIdx) + 4);
        const isWinnerVisible = phase === 'reveal' || phase === 'outro';

        for (let i = startIdx; i <= endIdx; i++) {
            const y = CENTER + (i * ITEM_H + offsetY);
            const isThisTheWinner = i === seq.length - 1 && isWinnerVisible;

            ctx.font = '700 56px ' + theme.font;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (isThisTheWinner) {
                ctx.fillStyle = theme.accent_text;
                ctx.shadowColor = theme.accent_text;
                ctx.shadowBlur = 30;
            } else {
                ctx.fillStyle = theme.text;
                ctx.shadowBlur = 0;
            }

            const name = seq[i] || '';
            ctx.fillText(this.truncate(ctx, name, SW - 60), SX + SW/2, y);
            ctx.shadowBlur = 0;
        }
        ctx.restore();

        // Highlight band
        ctx.save();
        const hY = CENTER - ITEM_H/2;
        const accent = isWinnerVisible ? theme.accent_text : theme.accent1;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.shadowColor = accent;
        ctx.shadowBlur = isWinnerVisible ? 22 : 12;
        ctx.beginPath();
        ctx.moveTo(SX+12, hY);
        ctx.lineTo(SX+SW-12, hY);
        ctx.moveTo(SX+12, hY + ITEM_H);
        ctx.lineTo(SX+SW-12, hY + ITEM_H);
        ctx.stroke();
        ctx.restore();

        // Outer frame
        ctx.save();
        ctx.strokeStyle = isWinnerVisible ? theme.accent_text : this.toRGBA(theme.accent1, 0.5);
        ctx.lineWidth = 4;
        ctx.shadowColor = isWinnerVisible ? theme.accent_text : theme.accent1;
        ctx.shadowBlur = isWinnerVisible ? 30 : 14;
        this.roundRect(ctx, SX, SY, SW, SH, 18);
        ctx.stroke();
        ctx.restore();

        // Top/bottom fade overlays
        ctx.save();
        const topG = ctx.createLinearGradient(0, SY+10, 0, SY+90);
        topG.addColorStop(0, this.shade(theme.bg, -0.5));
        topG.addColorStop(1, 'transparent');
        ctx.fillStyle = topG;
        ctx.fillRect(SX+10, SY+10, SW-20, 80);

        const botG = ctx.createLinearGradient(0, SY+SH-90, 0, SY+SH-10);
        botG.addColorStop(0, 'transparent');
        botG.addColorStop(1, this.shade(theme.bg, -0.5));
        ctx.fillStyle = botG;
        ctx.fillRect(SX+10, SY+SH-90, SW-20, 80);
        ctx.restore();
    }

    drawWinnerReveal(winner, rt, ot) {
        const ctx = this.ctx, { W, theme } = this;
        const labelY = 990;
        const nameY = 1080;
        const labelText = I18N[this.lang].revealLabel;

        ctx.save();
        ctx.globalAlpha = Math.min(1, rt * 1.8);
        ctx.font = '700 22px "Manrope", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.text;
        ctx.fillText(labelText, W/2, labelY);
        ctx.restore();

        ctx.save();
        const scale = 0.5 + this.easeOutBack(Math.min(1, rt * 1.3)) * 0.5;
        ctx.translate(W/2, nameY);
        ctx.scale(scale, scale);

        ctx.font = '800 70px ' + theme.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.accent_text;
        ctx.shadowColor = theme.accent1;
        ctx.shadowBlur = 30;

        const truncated = this.truncate(ctx, winner, W - 60);
        ctx.fillText(truncated, 0, 0);
        ctx.restore();
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
async function showReplayModal(theme, participants, winner) {
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
        });
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
    video.muted = true;
    video.play().catch(() => {});
    modal.querySelector('.replay-loading').style.display = 'none';
    modal.querySelector('.replay-actions').style.display = 'grid';
    modal.querySelector('.replay-note').style.display = 'block';

    modal.querySelector('.replay-download').onclick = () => {
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
    };

    modal.querySelector('.replay-share').onclick = async () => {
        const file = new File([blob], filename, { type: mime });
        const shareText = dict.shareText.replace('{winner}', winner);
        const shareData = { files: [file], title: 'Spinfinity', text: shareText };

        if (navigator.canShare && navigator.canShare(shareData)) {
            try { await navigator.share(shareData); }
            catch (e) { if (e.name !== 'AbortError') alert(dict.shareFail); }
        } else {
            alert(dict.shareFail);
        }
    };

    const close = () => {
        try { video.pause(); } catch (e) {}
        URL.revokeObjectURL(url);
        modal.remove();
    };
    modal.querySelector('.replay-close').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
}

window.SpinfinityReplay = { ReplayRecorder, showReplayModal };

})();
