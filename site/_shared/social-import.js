/* =========================================================
   Spinfinity — Social Import (Facebook / Instagram)
   Shared module: opens a modal where the user pastes copied
   comments from a Facebook or Instagram post. The script
   extracts names client-side only — nothing is stored or sent.
   Public API:
     SpinfinitySocialImport.openModal({
       lang: 'fr' | 'en',
       existingNames: string[],   // optional, for duplicate detection
       onImport: (names) => void  // called with the final list
     })
========================================================= */
(function () {
    'use strict';

    if (window.SpinfinitySocialImport) return;

    /* ---------- i18n ---------- */
    const I18N = {
        fr: {
            'btn.open':       '📘 Facebook / Instagram',
            'modal.title':    'Importer depuis Facebook / Instagram',
            'modal.intro':    'Collez ici les commentaires copiés depuis un post Facebook ou Instagram. Les noms seront extraits automatiquement. Aucune donnée n\'est envoyée ni stockée — tout reste dans votre navigateur.',
            'how.title':      'Comment faire ?',
            'how.step1':      '1. Ouvrez le post Facebook ou Instagram dans votre navigateur.',
            'how.step2':      '2. Sélectionnez la zone des commentaires (Ctrl+A puis ajustez si besoin) et copiez (Ctrl+C).',
            'how.step3':      '3. Collez ci-dessous, puis cliquez sur « Extraire les noms ».',
            'paste.placeholder': 'Collez ici le bloc copié depuis Facebook ou Instagram…',
            'btn.extract':    '🔍 Extraire les noms',
            'preview.title':  'Noms détectés',
            'preview.empty':  'Aucun nom détecté pour le moment.',
            'preview.help':   'Vous pouvez modifier la liste manuellement (un nom par ligne) avant de valider.',
            'opt.dedupe':     'Supprimer les doublons',
            'opt.dedupeExisting': 'Ignorer les noms déjà présents dans la liste',
            'count.detected': '{n} nom(s) détecté(s)',
            'count.final':    '{n} nom(s) prêt(s) à être importé(s)',
            'btn.import':     '✅ Ajouter aux participants',
            'btn.cancel':     'Annuler',
            'btn.close':      'Fermer',
            'toast.empty':    'Collez d\'abord du texte à extraire.',
            'toast.none':     'Aucun nom n\'a pu être détecté. Essayez d\'éditer la liste manuellement.',
            'toast.imported': '{n} nom(s) ajouté(s) aux participants.',
            'legal':          '⚠️ Pensez à respecter le RGPD : informez les participants que leurs noms publics peuvent être utilisés pour un tirage.'
        },
        en: {
            'btn.open':       '📘 Facebook / Instagram',
            'modal.title':    'Import from Facebook / Instagram',
            'modal.intro':    'Paste comments copied from a Facebook or Instagram post here. Names will be extracted automatically. No data is sent or stored — everything stays in your browser.',
            'how.title':      'How to do it?',
            'how.step1':      '1. Open the Facebook or Instagram post in your browser.',
            'how.step2':      '2. Select the comments area (Ctrl+A, then adjust if needed) and copy (Ctrl+C).',
            'how.step3':      '3. Paste below, then click "Extract names".',
            'paste.placeholder': 'Paste the block copied from Facebook or Instagram here…',
            'btn.extract':    '🔍 Extract names',
            'preview.title':  'Detected names',
            'preview.empty':  'No name detected yet.',
            'preview.help':   'You can edit the list manually (one name per line) before confirming.',
            'opt.dedupe':     'Remove duplicates',
            'opt.dedupeExisting': 'Skip names already in the list',
            'count.detected': '{n} name(s) detected',
            'count.final':    '{n} name(s) ready to import',
            'btn.import':     '✅ Add to participants',
            'btn.cancel':     'Cancel',
            'btn.close':      'Close',
            'toast.empty':    'Paste some text to extract first.',
            'toast.none':     'No name could be detected. Try editing the list manually.',
            'toast.imported': '{n} name(s) added to participants.',
            'legal':          '⚠️ Remember GDPR: inform participants that their public names may be used for a draw.'
        }
    };

    let currentLang = 'fr';
    const t = (key, vars) => {
        const dict = I18N[currentLang] || I18N.fr;
        let s = dict[key] ?? key;
        if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
        return s;
    };

    /* ---------- Name extraction heuristics ---------- */
    // Lines that are clearly comment metadata, not names.
    const META_RE = new RegExp(
        '^(?:' + [
            "j['’]aime(?:r)?",      // "J'aime", "J'aimer"
            'like(?:d)?',
            'love(?:d)?',
            'haha',
            'wow',
            'sad',
            'angry',
            'r[ée]pondre',
            'reply',
            'voir la traduction',
            'see translation',
            'voir plus',
            'see more',
            'voir moins',
            'see less',
            'afficher',
            'masquer',
            'hide',
            'signaler',
            'report',
            'partager',
            'share',
            'modifier',
            'edit',
            'supprimer',
            'delete',
            'envoyer',
            'send',
            'suivre',
            'follow(?:ing|ed)?',
            'abonn[eé]e?s?',
            'auteur',
            'author',
            'verified',
            'certifi[eé]e?',
            'admin',
            'modérateur',
            'moderator',
            'top fan',
            '\\d+\\s*(?:min|h|j|s|sem|m|d|w|mo|y|an|ans?|hour|hours|day|days|week|weeks|month|months|year|years|sec|seconde|secondes|minute|minutes)',
            'il y a\\s+',
            '\\d+\\s+commentaires?',
            '\\d+\\s+comments?',
            '\\d+\\s+r[ée]ponses?',
            '\\d+\\s+replies',
            '\\d+\\s+j[\'’]aimes?',
            '\\d+\\s+likes?',
            '\\d+\\s+reactions?',
            '\\d+\\s+r[ée]actions?',
            '[·•⋅—–-]+',
            '\\d+'
        ].join('|') + ')$',
        'i'
    );

    // Standalone Facebook-style display name (e.g. "Jean Dupont", "Marie-Claire O'Connor")
    // Allows Unicode letters, hyphens, apostrophes, dots, spaces. 1-5 words, total 2-60 chars.
    const NAME_RE = /^[\p{Lu}\p{Lo}][\p{L}\p{M}'’.\- ]{1,58}[\p{L}\p{M}.]$/u;
    // Instagram-style handle (lowercase letters, digits, underscores, dots) — used when followed by content.
    const HANDLE_RE = /^[a-z0-9_.]{2,30}$/;
    // Common decorations to strip from end of a line: " · Suit", " · Author", " · Follows you", etc.
    const TRAILING_DECO_RE = /\s*[·•⋅]\s*(?:suit|follows?(?: you)?|auteur|author|admin|modérateur|moderator|top fan|abonné[e]?|verified|certifié[e]?)\s*$/i;

    // Single-word lines that are almost certainly comment reactions, not names.
    // (Used only to filter 1-word candidates; multi-word "Jean Dupont" is unaffected.)
    const REACTION_WORDS = new Set([
        'salut','bonjour','coucou','hello','hi','hey','yo','bonsoir','allo',
        'merci','thanks','thx','top','super','genial','génial','cool','nice','wow',
        'bravo','bien','ouf','parfait','perfect','niquel','nickel','excellent',
        'oui','non','yes','no','ok','okay','dac','daccord',
        'amen','enfin','encore','vraiment','exact','exactement',
        'lol','mdr','ptdr','xd','haha','hihi','hehe',
        'sympa','dingue','fou','enorme','énorme','incroyable',
        'cute','awesome','great','amazing','beautiful','beau','belle','jolie',
        'félicitations','felicitations','congrats','congratulations',
        'oh','ah','eh','hmm','bof'
    ]);

    function looksLikeName(line) {
        if (!line) return false;
        if (line.length < 2 || line.length > 60) return false;
        if (/\d/.test(line)) return false;                 // names rarely contain digits
        if (/[!?]{2,}|[#@]/.test(line)) return false;
        if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(line)) return false; // emoji
        if (META_RE.test(line)) return false;
        if (!NAME_RE.test(line)) return false;
        // Filter single-word reaction words ("Salut", "Top", "Merci"...)
        const words = line.split(/\s+/);
        if (words.length === 1 && REACTION_WORDS.has(words[0].toLowerCase().replace(/[.'’\-]/g, ''))) {
            return false;
        }
        return true;
    }

    function extractNames(text) {
        if (!text) return [];
        const rawLines = text.split(/\r?\n/);
        const names = [];

        for (let raw of rawLines) {
            let line = raw.trim();
            if (!line) continue;

            // Strip trailing "· Suit / · Author" decorations from FB
            line = line.replace(TRAILING_DECO_RE, '').trim();

            // 1) Pure display name alone on its line (FB desktop pattern)
            if (looksLikeName(line)) {
                names.push(line);
                continue;
            }

            // 2) Instagram-style: handle followed by comment text on the same line
            //    e.g. "marie_dupont Super 🔥"  or  "jean.k I'm in!"
            const m = line.match(/^([a-z0-9_.]{2,30})\b\s+\S/);
            if (m && !META_RE.test(m[1]) && /[a-z]/.test(m[1]) && line.length <= 300) {
                names.push(m[1]);
                continue;
            }

            // 3) "Name: comment" pattern (some copy-pastes)
            const colonMatch = line.match(/^([^:]{2,60}?):\s+\S/);
            if (colonMatch) {
                const candidate = colonMatch[1].trim();
                if (looksLikeName(candidate)) names.push(candidate);
            }
        }
        return names;
    }

    /* ---------- Styles (injected once) ---------- */
    function injectStyles() {
        if (document.getElementById('spinfinity-social-import-styles')) return;
        const css = `
        .sfi-overlay {
            position: fixed; inset: 0; z-index: 99998;
            background: rgba(0,0,0,0.78);
            backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            padding: 16px; opacity: 0; transition: opacity .18s ease;
        }
        .sfi-overlay.visible { opacity: 1; }
        .sfi-modal {
            background: linear-gradient(180deg, #14181f 0%, #0d1015 100%);
            color: #e8eaed;
            border-radius: 16px;
            width: min(640px, 100%);
            max-height: calc(100vh - 32px);
            box-shadow: 0 20px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06);
            display: flex; flex-direction: column;
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            transform: translateY(8px); transition: transform .18s ease;
        }
        .sfi-overlay.visible .sfi-modal { transform: translateY(0); }
        .sfi-header {
            padding: 18px 22px 14px; display: flex; align-items: center; gap: 14px;
            border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .sfi-header h2 {
            margin: 0; font-size: 17px; font-weight: 600; letter-spacing: .2px;
            flex: 1; color: #fff;
        }
        .sfi-brand {
            display: inline-flex; align-items: center; justify-content: center;
            width: 34px; height: 34px; border-radius: 10px;
            background: linear-gradient(135deg, #1877F2 0%, #833AB4 50%, #E1306C 100%);
            font-size: 18px;
        }
        .sfi-close {
            background: transparent; border: 0; color: #aab; cursor: pointer;
            font-size: 22px; line-height: 1; padding: 4px 8px; border-radius: 8px;
        }
        .sfi-close:hover { background: rgba(255,255,255,.06); color: #fff; }
        .sfi-body {
            padding: 16px 22px 18px;
            overflow-y: auto; flex: 1;
        }
        .sfi-intro {
            font-size: 13.5px; line-height: 1.55; color: #c4c8d0; margin: 0 0 14px;
        }
        .sfi-how {
            background: rgba(255,255,255,.03);
            border: 1px solid rgba(255,255,255,.06);
            border-radius: 10px; padding: 10px 14px; margin: 0 0 14px;
        }
        .sfi-how summary {
            cursor: pointer; font-size: 13px; color: #d8dce4; font-weight: 500;
            list-style: none; padding: 2px 0; user-select: none;
        }
        .sfi-how summary::-webkit-details-marker { display: none; }
        .sfi-how summary::before { content: '▸ '; color: #888; transition: transform .15s; display: inline-block; }
        .sfi-how[open] summary::before { content: '▾ '; }
        .sfi-how ol { margin: 8px 0 4px; padding-left: 18px; font-size: 12.5px; color: #b8bcc4; line-height: 1.6; }
        .sfi-how ol li { margin-bottom: 2px; }
        .sfi-label {
            display: block; font-size: 12px; font-weight: 600; color: #a7adba;
            text-transform: uppercase; letter-spacing: .8px; margin: 12px 0 6px;
        }
        .sfi-textarea, .sfi-preview {
            width: 100%; min-height: 130px; box-sizing: border-box;
            background: #0a0d12; color: #e8eaed;
            border: 1px solid rgba(255,255,255,.10); border-radius: 10px;
            padding: 10px 12px; font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
            font-size: 13px; line-height: 1.5; resize: vertical;
            transition: border-color .15s, box-shadow .15s;
        }
        .sfi-textarea:focus, .sfi-preview:focus {
            outline: none; border-color: #4f8cff; box-shadow: 0 0 0 3px rgba(79,140,255,.18);
        }
        .sfi-preview { min-height: 110px; }
        .sfi-extract-row {
            display: flex; gap: 10px; margin: 10px 0 0; flex-wrap: wrap; align-items: center;
        }
        .sfi-count {
            font-size: 12.5px; color: #9aa1b0; margin-left: auto;
        }
        .sfi-options {
            display: flex; flex-direction: column; gap: 8px;
            margin: 14px 0 6px;
            padding: 10px 14px;
            background: rgba(255,255,255,.03);
            border: 1px solid rgba(255,255,255,.06);
            border-radius: 10px;
        }
        .sfi-checkbox {
            display: flex; align-items: center; gap: 9px;
            font-size: 13px; color: #d4d8e0; cursor: pointer; user-select: none;
        }
        .sfi-checkbox input {
            width: 16px; height: 16px; accent-color: #4f8cff; cursor: pointer; margin: 0;
        }
        .sfi-legal {
            font-size: 11.5px; color: #888d97; margin: 10px 2px 0; line-height: 1.5;
        }
        .sfi-footer {
            padding: 12px 22px 16px; display: flex; gap: 10px; justify-content: flex-end;
            border-top: 1px solid rgba(255,255,255,.08); flex-wrap: wrap;
        }
        .sfi-btn {
            border: 0; border-radius: 9px; cursor: pointer;
            font-size: 13.5px; font-weight: 600; padding: 9px 16px;
            font-family: inherit; transition: transform .08s, background .15s, opacity .15s;
        }
        .sfi-btn:active { transform: translateY(1px); }
        .sfi-btn[disabled] { opacity: .45; cursor: not-allowed; }
        .sfi-btn-primary {
            background: linear-gradient(135deg, #4f8cff 0%, #6f5cff 100%);
            color: #fff;
        }
        .sfi-btn-primary:hover:not([disabled]) { filter: brightness(1.08); }
        .sfi-btn-success {
            background: linear-gradient(135deg, #1dd1a1 0%, #10ac84 100%);
            color: #fff;
        }
        .sfi-btn-success:hover:not([disabled]) { filter: brightness(1.08); }
        .sfi-btn-ghost {
            background: rgba(255,255,255,.04); color: #c8ccd4;
            border: 1px solid rgba(255,255,255,.10);
        }
        .sfi-btn-ghost:hover { background: rgba(255,255,255,.08); }
        .sfi-toast {
            position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
            background: #1a1d24; color: #fff; padding: 10px 18px; border-radius: 999px;
            font-size: 13px; z-index: 99999; box-shadow: 0 8px 30px rgba(0,0,0,.5);
            border: 1px solid rgba(255,255,255,.08);
            opacity: 0; transition: opacity .2s, transform .2s;
            pointer-events: none;
        }
        .sfi-toast.show { opacity: 1; transform: translate(-50%, -6px); }
        @media (max-width: 520px) {
            .sfi-header { padding: 14px 16px 12px; }
            .sfi-body   { padding: 12px 16px 14px; }
            .sfi-footer { padding: 10px 16px 14px; }
            .sfi-header h2 { font-size: 15px; }
        }
        `;
        const style = document.createElement('style');
        style.id = 'spinfinity-social-import-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ---------- Toast ---------- */
    function toast(msg) {
        const el = document.createElement('div');
        el.className = 'sfi-toast';
        el.textContent = msg;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 250);
        }, 2200);
    }

    /* ---------- Modal ---------- */
    function openModal(opts) {
        opts = opts || {};
        currentLang = (opts.lang === 'en') ? 'en' : 'fr';
        const existing = Array.isArray(opts.existingNames) ? opts.existingNames.slice() : [];
        const onImport = typeof opts.onImport === 'function' ? opts.onImport : () => {};

        injectStyles();

        const overlay = document.createElement('div');
        overlay.className = 'sfi-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
            <div class="sfi-modal" role="document">
                <div class="sfi-header">
                    <div class="sfi-brand" aria-hidden="true">📘</div>
                    <h2>${escapeHtml(t('modal.title'))}</h2>
                    <button class="sfi-close" data-sfi-close aria-label="${escapeHtml(t('btn.close'))}">×</button>
                </div>
                <div class="sfi-body">
                    <p class="sfi-intro">${escapeHtml(t('modal.intro'))}</p>
                    <details class="sfi-how">
                        <summary>${escapeHtml(t('how.title'))}</summary>
                        <ol>
                            <li>${escapeHtml(t('how.step1'))}</li>
                            <li>${escapeHtml(t('how.step2'))}</li>
                            <li>${escapeHtml(t('how.step3'))}</li>
                        </ol>
                    </details>

                    <label class="sfi-label" for="sfi-paste">${escapeHtml(t('modal.title'))}</label>
                    <textarea id="sfi-paste" class="sfi-textarea" placeholder="${escapeHtml(t('paste.placeholder'))}"></textarea>

                    <div class="sfi-extract-row">
                        <button class="sfi-btn sfi-btn-primary" data-sfi-extract>${escapeHtml(t('btn.extract'))}</button>
                        <span class="sfi-count" data-sfi-count></span>
                    </div>

                    <label class="sfi-label" for="sfi-preview">${escapeHtml(t('preview.title'))}</label>
                    <textarea id="sfi-preview" class="sfi-preview" placeholder="${escapeHtml(t('preview.empty'))}"></textarea>
                    <p class="sfi-legal" style="margin-top:6px;color:#7a808c;">${escapeHtml(t('preview.help'))}</p>

                    <div class="sfi-options">
                        <label class="sfi-checkbox">
                            <input type="checkbox" data-sfi-dedupe checked>
                            <span>${escapeHtml(t('opt.dedupe'))}</span>
                        </label>
                        <label class="sfi-checkbox">
                            <input type="checkbox" data-sfi-dedupe-existing ${existing.length ? 'checked' : ''} ${existing.length ? '' : 'disabled'}>
                            <span>${escapeHtml(t('opt.dedupeExisting'))}</span>
                        </label>
                    </div>

                    <p class="sfi-legal">${escapeHtml(t('legal'))}</p>
                </div>
                <div class="sfi-footer">
                    <button class="sfi-btn sfi-btn-ghost" data-sfi-close>${escapeHtml(t('btn.cancel'))}</button>
                    <button class="sfi-btn sfi-btn-success" data-sfi-import disabled>${escapeHtml(t('btn.import'))}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));

        const $ = (sel) => overlay.querySelector(sel);
        const paste   = $('#sfi-paste');
        const preview = $('#sfi-preview');
        const count   = $('[data-sfi-count]');
        const dedupe  = $('[data-sfi-dedupe]');
        const dedupeEx= $('[data-sfi-dedupe-existing]');
        const btnImp  = $('[data-sfi-import]');

        function close() {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 180);
            document.removeEventListener('keydown', onKey);
        }
        function onKey(e) { if (e.key === 'Escape') close(); }
        document.addEventListener('keydown', onKey);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
            if (e.target.matches('[data-sfi-close]')) close();
        });

        function computeFinalList() {
            const lines = preview.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            let out = lines;
            if (dedupe.checked) {
                const seen = new Set();
                out = out.filter(n => {
                    const k = n.toLowerCase();
                    if (seen.has(k)) return false;
                    seen.add(k);
                    return true;
                });
            }
            if (dedupeEx.checked && existing.length) {
                const existSet = new Set(existing.map(s => s.toLowerCase()));
                out = out.filter(n => !existSet.has(n.toLowerCase()));
            }
            return out;
        }

        function refreshCount() {
            const finalList = computeFinalList();
            count.textContent = finalList.length
                ? t('count.final', { n: finalList.length })
                : t('count.detected', { n: 0 });
            btnImp.disabled = finalList.length === 0;
        }

        $('[data-sfi-extract]').addEventListener('click', () => {
            const raw = paste.value;
            if (!raw.trim()) { toast(t('toast.empty')); return; }
            const detected = extractNames(raw);
            if (detected.length === 0) {
                toast(t('toast.none'));
                preview.value = '';
            } else {
                // Append to existing preview content (so user can run extract multiple times)
                const existingPreview = preview.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                preview.value = existingPreview.concat(detected).join('\n');
            }
            count.textContent = t('count.detected', { n: detected.length });
            refreshCount();
        });

        preview.addEventListener('input', refreshCount);
        dedupe.addEventListener('change', refreshCount);
        dedupeEx.addEventListener('change', refreshCount);

        btnImp.addEventListener('click', () => {
            const finalList = computeFinalList();
            if (finalList.length === 0) return;
            try { onImport(finalList); } catch (e) { console.error(e); }
            toast(t('toast.imported', { n: finalList.length }));
            close();
        });

        setTimeout(() => paste.focus(), 50);
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
        }[c]));
    }

    window.SpinfinitySocialImport = {
        openModal,
        extractNames   // exposed for testing/debugging
    };
})();
