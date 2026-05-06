/* ==========================================================================
   Spinfinity — Universal page footer (loaded by every page)
   Injects a small copyright + nav block at the bottom of <body>.
   Honors the user's saved language (spinfinity-lang in localStorage).
   ========================================================================== */
(function() {
    if (document.querySelector('.sp-footer')) return;

    const COPY = {
        fr: '© 2026 Spinfinity — Tirage au sort avec style',
        en: '© 2026 Spinfinity — Random draws with style'
    };
    const LABELS = {
        fr: { about: 'À propos', legal: 'Mentions légales', contact: 'Contact' },
        en: { about: 'About',    legal: 'Legal notice',     contact: 'Contact' }
    };

    function pickLang() {
        const stored = (localStorage.getItem('spinfinity-lang') || '').toLowerCase();
        if (stored === 'fr' || stored === 'en') return stored;
        return (navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
    }

    function rootRel() {
        // Compute prefix to reach site root from current path.
        // /              → ''
        // /redline/      → '../'
        // /help/         → '../'
        // /about/        → '../'
        // /redline/sub/  → '../../' (defensive)
        const parts = location.pathname.replace(/\/[^/]*$/, '/').split('/').filter(Boolean);
        return parts.length ? '../'.repeat(parts.length) : '';
    }

    function inject() {
        const lang = pickLang();
        const labels = LABELS[lang];
        const prefix = rootRel();

        const footer = document.createElement('footer');
        footer.className = 'sp-footer';
        footer.setAttribute('role', 'contentinfo');
        footer.innerHTML = `
            <style>
                .sp-footer {
                    margin-top: auto;
                    padding: 26px 20px 30px;
                    text-align: center;
                    font: 500 12.5px/1.55 'Manrope', system-ui, -apple-system, Segoe UI, sans-serif;
                    color: rgba(255,255,255,0.55);
                    border-top: 1px solid rgba(255,255,255,0.07);
                    background: rgba(0,0,0,0.20);
                    backdrop-filter: blur(6px);
                    -webkit-backdrop-filter: blur(6px);
                    letter-spacing: 0.01em;
                    position: relative; z-index: 5;
                }
                .sp-footer .sp-copy {
                    color: rgba(255,255,255,0.65);
                }
                .sp-footer nav {
                    display: flex; justify-content: center; flex-wrap: wrap;
                    gap: 6px 18px;
                    margin-top: 8px;
                }
                .sp-footer a {
                    color: rgba(255,255,255,0.55);
                    text-decoration: none;
                    transition: color .2s;
                    font-weight: 600;
                }
                .sp-footer a:hover, .sp-footer a:focus-visible {
                    color: #fff;
                    text-decoration: underline;
                    text-underline-offset: 3px;
                }
            </style>
            <div class="sp-copy">${COPY[lang]}</div>
            <nav aria-label="Footer">
                <a href="${prefix}about/">${labels.about}</a>
                <a href="${prefix}legal/">${labels.legal}</a>
                <a href="${prefix}contact/">${labels.contact}</a>
            </nav>
        `;
        document.body.appendChild(footer);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();
