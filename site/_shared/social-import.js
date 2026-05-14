/* =========================================================
   Spinfinity — Social Import (Facebook / Instagram)
   Shared module: opens a modal with two modes:
     1. PASTE — user pastes copied comments, names are extracted client-side.
     2. CONNECT — user logs in with Facebook (browser-only OAuth via FB JS SDK),
        picks one of their Pages, picks a post (or an Instagram media on the
        linked IG Business/Creator account), and we fetch commenters' names
        directly from graph.facebook.com. No backend, nothing stored.
   Public API:
     SpinfinitySocialImport.openModal({
       lang: 'fr' | 'en',
       existingNames: string[],
       onImport: (names) => void
     })

   --- SETUP (Facebook Graph API) ---
   Set window.SPINFINITY_FB_APP_ID = '123...'; BEFORE this script loads
   (a small inline <script> in each wheel page does the job).
   See site/README.md for the step-by-step Meta App creation guide.
========================================================= */
(function () {
    'use strict';

    if (window.SpinfinitySocialImport) return;

    const FB_APP_ID = (typeof window !== 'undefined' && window.SPINFINITY_FB_APP_ID) || '';
    const FB_API_VERSION = 'v19.0';
    const FB_SCOPES = 'pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_comments';

    /* ---------- i18n ---------- */
    const I18N = {
        fr: {
            'modal.title':    'Importer depuis Facebook / Instagram',
            'tab.paste':      '📋 Coller du texte',
            'tab.connect':    '📘 Se connecter à Facebook',
            'modal.intro':    'Collez ici les commentaires copiés depuis un post Facebook ou Instagram. Les noms seront extraits automatiquement. Aucune donnée n\'est envoyée ni stockée — tout reste dans votre navigateur.',
            'how.title':      'Comment faire ?',
            'how.step1':      '1. Ouvrez le post Facebook ou Instagram dans votre navigateur.',
            'how.step2':      '2. Sélectionnez la zone des commentaires (Ctrl+A puis ajustez si besoin) et copiez (Ctrl+C).',
            'how.step3':      '3. Collez ci-dessous, puis cliquez sur « Extraire les noms ».',
            'paste.placeholder': 'Collez ici le bloc copié depuis Facebook ou Instagram…',
            'btn.extract':    '🔍 Extraire les noms',
            'fb.intro':       'Connectez-vous avec Facebook pour récupérer automatiquement les noms des personnes ayant commenté un post. La connexion se fait directement avec Facebook : Spinfinity ne reçoit ni ne stocke vos identifiants ou votre jeton d\'accès.',
            'fb.scopes':      'Accès demandé (lecture seule) : vos Pages Facebook, leurs publications et commentaires, ainsi que les comptes Instagram Business/Creator liés.',
            'fb.btn.login':   '🔐 Se connecter à Facebook',
            'fb.btn.logout':  'Déconnexion',
            'fb.loading':     'Chargement du SDK Facebook…',
            'fb.loggedAs':    'Connecté en tant que {name}',
            'fb.label.platform': 'Plateforme',
            'fb.opt.facebook':'Facebook (posts d\'une Page)',
            'fb.opt.instagram':'Instagram (publications du compte Business lié)',
            'fb.label.page':  'Page Facebook',
            'fb.label.post':  'Publication',
            'fb.label.media': 'Publication Instagram',
            'fb.opt.choose':  '— Choisir —',
            'fb.btn.fetch':   '⬇️ Récupérer les commentaires',
            'fb.opt.replies': 'Inclure aussi les réponses (commentaires imbriqués)',
            'fb.fetching':    'Récupération en cours…',
            'fb.noPages':     'Aucune Page Facebook trouvée sur votre compte. Vous devez être administrateur d\'une Page pour utiliser cette fonction.',
            'fb.noIg':        'Cette Page n\'a pas de compte Instagram Business/Creator lié.',
            'fb.fetchOk':     '{n} commentaire(s) récupéré(s).',
            'fb.error':       'Erreur Facebook : {msg}',
            'fb.cancelled':   'Connexion annulée.',
            'fb.notConfigured.title': 'Configuration requise',
            'fb.notConfigured.body':  'Cette fonctionnalité nécessite une App Meta Developer. Le propriétaire du site doit créer une App sur <code>developers.facebook.com</code> puis renseigner l\'App ID dans la balise <code>&lt;script&gt;window.SPINFINITY_FB_APP_ID&lt;/script&gt;</code> de chaque page (voir <code>site/README.md</code>).',
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
            'modal.title':    'Import from Facebook / Instagram',
            'tab.paste':      '📋 Paste text',
            'tab.connect':    '📘 Connect with Facebook',
            'modal.intro':    'Paste comments copied from a Facebook or Instagram post here. Names will be extracted automatically. No data is sent or stored — everything stays in your browser.',
            'how.title':      'How to do it?',
            'how.step1':      '1. Open the Facebook or Instagram post in your browser.',
            'how.step2':      '2. Select the comments area (Ctrl+A, then adjust if needed) and copy (Ctrl+C).',
            'how.step3':      '3. Paste below, then click "Extract names".',
            'paste.placeholder': 'Paste the block copied from Facebook or Instagram here…',
            'btn.extract':    '🔍 Extract names',
            'fb.intro':       'Log in with Facebook to automatically fetch commenter names from your posts. Login happens directly with Facebook — Spinfinity never receives or stores your credentials or access token.',
            'fb.scopes':      'Read-only access: your Facebook Pages, their posts and comments, and linked Instagram Business/Creator accounts.',
            'fb.btn.login':   '🔐 Log in with Facebook',
            'fb.btn.logout':  'Log out',
            'fb.loading':     'Loading Facebook SDK…',
            'fb.loggedAs':    'Logged in as {name}',
            'fb.label.platform': 'Platform',
            'fb.opt.facebook':'Facebook (Page posts)',
            'fb.opt.instagram':'Instagram (linked Business account posts)',
            'fb.label.page':  'Facebook Page',
            'fb.label.post':  'Post',
            'fb.label.media': 'Instagram post',
            'fb.opt.choose':  '— Choose —',
            'fb.btn.fetch':   '⬇️ Fetch comments',
            'fb.opt.replies': 'Include replies (nested comments)',
            'fb.fetching':    'Fetching…',
            'fb.noPages':     'No Facebook Pages found on your account. You must be an admin of a Page to use this feature.',
            'fb.noIg':        'This Page has no linked Instagram Business/Creator account.',
            'fb.fetchOk':     '{n} comment(s) fetched.',
            'fb.error':       'Facebook error: {msg}',
            'fb.cancelled':   'Login cancelled.',
            'fb.notConfigured.title': 'Setup required',
            'fb.notConfigured.body':  'This feature requires a Meta Developer App. The site owner must create an App at <code>developers.facebook.com</code> then set the App ID in the <code>&lt;script&gt;window.SPINFINITY_FB_APP_ID&lt;/script&gt;</code> tag of each page (see <code>site/README.md</code>).',
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

    /* ---------- Name extraction heuristics (PASTE tab) ---------- */
    const META_RE = new RegExp(
        '^(?:' + [
            "j['’]aime(?:r)?", 'like(?:d)?', 'love(?:d)?', 'haha', 'wow', 'sad', 'angry',
            'r[ée]pondre', 'reply',
            'voir la traduction', 'see translation', 'voir plus', 'see more', 'voir moins', 'see less',
            'afficher', 'masquer', 'hide', 'signaler', 'report', 'partager', 'share',
            'modifier', 'edit', 'supprimer', 'delete', 'envoyer', 'send',
            'suivre', 'follow(?:ing|ed)?', 'abonn[eé]e?s?', 'auteur', 'author',
            'verified', 'certifi[eé]e?', 'admin', 'modérateur', 'moderator', 'top fan',
            '\\d+\\s*(?:min|h|j|s|sem|m|d|w|mo|y|an|ans?|hour|hours|day|days|week|weeks|month|months|year|years|sec|seconde|secondes|minute|minutes)',
            'il y a\\s+',
            '\\d+\\s+commentaires?', '\\d+\\s+comments?',
            '\\d+\\s+r[ée]ponses?', '\\d+\\s+replies',
            '\\d+\\s+j[\'’]aimes?', '\\d+\\s+likes?',
            '\\d+\\s+reactions?', '\\d+\\s+r[ée]actions?',
            '[·•⋅—–-]+', '\\d+'
        ].join('|') + ')$',
        'i'
    );
    const NAME_RE = /^[\p{Lu}\p{Lo}][\p{L}\p{M}'’.\- ]{1,58}[\p{L}\p{M}.]$/u;
    const TRAILING_DECO_RE = /\s*[·•⋅]\s*(?:suit|follows?(?: you)?|auteur|author|admin|modérateur|moderator|top fan|abonné[e]?|verified|certifié[e]?)\s*$/i;
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
        if (/\d/.test(line)) return false;
        if (/[!?]{2,}|[#@]/.test(line)) return false;
        if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(line)) return false;
        if (META_RE.test(line)) return false;
        if (!NAME_RE.test(line)) return false;
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
            line = line.replace(TRAILING_DECO_RE, '').trim();
            if (looksLikeName(line)) { names.push(line); continue; }
            const m = line.match(/^([a-z0-9_.]{2,30})\b\s+\S/);
            if (m && !META_RE.test(m[1]) && /[a-z]/.test(m[1]) && line.length <= 300) {
                names.push(m[1]); continue;
            }
            const colonMatch = line.match(/^([^:]{2,60}?):\s+\S/);
            if (colonMatch) {
                const candidate = colonMatch[1].trim();
                if (looksLikeName(candidate)) names.push(candidate);
            }
        }
        return names;
    }

    /* ---------- Facebook JS SDK loader ---------- */
    let fbSdkPromise = null;
    function loadFbSdk() {
        if (!FB_APP_ID) return Promise.reject(new Error('NOT_CONFIGURED'));
        if (window.FB) return Promise.resolve(window.FB);
        if (fbSdkPromise) return fbSdkPromise;

        fbSdkPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('SDK_TIMEOUT')), 15000);
            window.fbAsyncInit = function () {
                clearTimeout(timeout);
                window.FB.init({
                    appId: FB_APP_ID,
                    cookie: false,
                    xfbml: false,
                    version: FB_API_VERSION
                });
                resolve(window.FB);
            };
            const script = document.createElement('script');
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            script.src = 'https://connect.facebook.net/' + (currentLang === 'en' ? 'en_US' : 'fr_FR') + '/sdk.js';
            script.onerror = () => { clearTimeout(timeout); reject(new Error('SDK_LOAD_FAILED')); };
            document.head.appendChild(script);
        });
        return fbSdkPromise;
    }

    function fbApi(path, params) {
        return new Promise((resolve, reject) => {
            window.FB.api(path, 'GET', params || {}, (response) => {
                if (!response) return reject(new Error('no_response'));
                if (response.error) return reject(response.error);
                resolve(response);
            });
        });
    }

    async function fbLogin() {
        await loadFbSdk();
        return new Promise((resolve, reject) => {
            window.FB.login((response) => {
                if (response && response.authResponse) resolve(response.authResponse);
                else reject(new Error('cancelled'));
            }, { scope: FB_SCOPES, return_scopes: true, auth_type: 'rerequest' });
        });
    }

    function fbLogout() {
        if (window.FB) { try { window.FB.logout(() => {}); } catch (e) {} }
    }

    async function fbListPages() {
        const r = await fbApi('/me/accounts', { fields: 'id,name,access_token,instagram_business_account', limit: 100 });
        return r.data || [];
    }
    async function fbListPosts(pageId, pageToken) {
        const r = await fbApi('/' + pageId + '/posts', {
            fields: 'id,message,created_time',
            limit: 25,
            access_token: pageToken
        });
        return r.data || [];
    }
    async function fbListComments(postId, pageToken, includeReplies) {
        const all = [];
        const endpoint = '/' + postId + '/comments';
        let params = {
            fields: 'from{name,id},message',
            limit: 100,
            access_token: pageToken,
            filter: includeReplies ? 'stream' : 'toplevel'
        };
        let safety = 50;
        while (safety-- > 0) {
            const r = await fbApi(endpoint, params);
            if (r.data && r.data.length) all.push(...r.data);
            const next = r.paging && r.paging.cursors && r.paging.cursors.after;
            if (next && r.paging.next) params.after = next; else break;
        }
        return all;
    }
    async function igListMedia(igAccountId, pageToken) {
        const r = await fbApi('/' + igAccountId + '/media', {
            fields: 'id,caption,media_type,timestamp,permalink',
            limit: 25,
            access_token: pageToken
        });
        return r.data || [];
    }
    async function igListComments(mediaId, pageToken) {
        const all = [];
        const endpoint = '/' + mediaId + '/comments';
        let params = { fields: 'username,text', limit: 50, access_token: pageToken };
        let safety = 50;
        while (safety-- > 0) {
            const r = await fbApi(endpoint, params);
            if (r.data && r.data.length) all.push(...r.data);
            const next = r.paging && r.paging.cursors && r.paging.cursors.after;
            if (next && r.paging.next) params.after = next; else break;
        }
        return all;
    }

    /* ---------- Styles ---------- */
    function injectStyles() {
        if (document.getElementById('spinfinity-social-import-styles')) return;
        const css = `
        .sfi-overlay {
            position: fixed; inset: 0; z-index: 99998;
            background: rgba(0,0,0,0.78); backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            padding: 16px; opacity: 0; transition: opacity .18s ease;
        }
        .sfi-overlay.visible { opacity: 1; }
        .sfi-modal {
            background: linear-gradient(180deg, #14181f 0%, #0d1015 100%);
            color: #e8eaed; border-radius: 16px;
            width: min(680px, 100%); max-height: calc(100vh - 32px);
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
        .sfi-header h2 { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: .2px; flex: 1; color: #fff; }
        .sfi-brand {
            display: inline-flex; align-items: center; justify-content: center;
            width: 34px; height: 34px; border-radius: 10px;
            background: linear-gradient(135deg, #1877F2 0%, #833AB4 50%, #E1306C 100%);
            font-size: 18px;
        }
        .sfi-close { background: transparent; border: 0; color: #aab; cursor: pointer; font-size: 22px; line-height: 1; padding: 4px 8px; border-radius: 8px; }
        .sfi-close:hover { background: rgba(255,255,255,.06); color: #fff; }
        .sfi-tabs { display: flex; gap: 4px; padding: 10px 18px 0; border-bottom: 1px solid rgba(255,255,255,.08); }
        .sfi-tab {
            background: transparent; border: 0; color: #a0a5b1; cursor: pointer;
            font-family: inherit; font-size: 13px; font-weight: 600;
            padding: 10px 14px; border-radius: 8px 8px 0 0;
            border-bottom: 2px solid transparent;
            transition: color .15s, border-color .15s, background .15s;
        }
        .sfi-tab:hover { color: #d4d8e0; background: rgba(255,255,255,.03); }
        .sfi-tab.active { color: #fff; border-bottom-color: #4f8cff; background: rgba(79,140,255,.08); }
        .sfi-body { padding: 16px 22px 18px; overflow-y: auto; flex: 1; }
        .sfi-pane[hidden] { display: none !important; }
        .sfi-intro { font-size: 13.5px; line-height: 1.55; color: #c4c8d0; margin: 0 0 14px; }
        .sfi-how { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; padding: 10px 14px; margin: 0 0 14px; }
        .sfi-how summary { cursor: pointer; font-size: 13px; color: #d8dce4; font-weight: 500; list-style: none; padding: 2px 0; user-select: none; }
        .sfi-how summary::-webkit-details-marker { display: none; }
        .sfi-how summary::before { content: '▸ '; color: #888; display: inline-block; }
        .sfi-how[open] summary::before { content: '▾ '; }
        .sfi-how ol { margin: 8px 0 4px; padding-left: 18px; font-size: 12.5px; color: #b8bcc4; line-height: 1.6; }
        .sfi-how ol li { margin-bottom: 2px; }
        .sfi-label { display: block; font-size: 12px; font-weight: 600; color: #a7adba; text-transform: uppercase; letter-spacing: .8px; margin: 12px 0 6px; }
        .sfi-textarea, .sfi-preview {
            width: 100%; min-height: 130px; box-sizing: border-box;
            background: #0a0d12; color: #e8eaed;
            border: 1px solid rgba(255,255,255,.10); border-radius: 10px;
            padding: 10px 12px; font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
            font-size: 13px; line-height: 1.5; resize: vertical;
            transition: border-color .15s, box-shadow .15s;
        }
        .sfi-textarea:focus, .sfi-preview:focus, .sfi-select:focus {
            outline: none; border-color: #4f8cff; box-shadow: 0 0 0 3px rgba(79,140,255,.18);
        }
        .sfi-preview { min-height: 110px; }
        .sfi-select {
            width: 100%; box-sizing: border-box;
            background: #0a0d12; color: #e8eaed;
            border: 1px solid rgba(255,255,255,.10); border-radius: 10px;
            padding: 9px 11px; font-family: inherit; font-size: 13.5px;
        }
        .sfi-select:disabled { opacity: .5; }
        .sfi-extract-row { display: flex; gap: 10px; margin: 10px 0 0; flex-wrap: wrap; align-items: center; }
        .sfi-count { font-size: 12.5px; color: #9aa1b0; margin-left: auto; }
        .sfi-options {
            display: flex; flex-direction: column; gap: 8px;
            margin: 14px 0 6px; padding: 10px 14px;
            background: rgba(255,255,255,.03);
            border: 1px solid rgba(255,255,255,.06);
            border-radius: 10px;
        }
        .sfi-checkbox { display: flex; align-items: center; gap: 9px; font-size: 13px; color: #d4d8e0; cursor: pointer; user-select: none; }
        .sfi-checkbox input { width: 16px; height: 16px; accent-color: #4f8cff; cursor: pointer; margin: 0; }
        .sfi-legal { font-size: 11.5px; color: #888d97; margin: 10px 2px 0; line-height: 1.5; }
        .sfi-fb-card {
            background: rgba(24, 119, 242, 0.06);
            border: 1px solid rgba(24, 119, 242, 0.25);
            border-radius: 10px; padding: 14px 16px; margin: 0 0 12px;
        }
        .sfi-fb-user { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #d8dce4; }
        .sfi-fb-status { font-size: 12.5px; color: #9aa1b0; padding: 8px 0 2px; }
        .sfi-fb-error {
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.25);
            border-radius: 8px; padding: 8px 12px; color: #fca5a5;
            font-size: 12.5px; margin: 8px 0;
        }
        .sfi-setup-box {
            background: rgba(250, 204, 21, 0.06);
            border: 1px solid rgba(250, 204, 21, 0.25);
            border-radius: 10px; padding: 14px 16px; margin: 0 0 12px;
            font-size: 13px; color: #d8dce4; line-height: 1.55;
        }
        .sfi-setup-box code {
            background: rgba(0,0,0,.4); padding: 1px 6px; border-radius: 4px;
            font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: #ffe08a;
        }
        .sfi-setup-box strong { color: #ffd870; }
        .sfi-footer { padding: 12px 22px 16px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,.08); flex-wrap: wrap; }
        .sfi-btn {
            border: 0; border-radius: 9px; cursor: pointer;
            font-size: 13.5px; font-weight: 600; padding: 9px 16px;
            font-family: inherit;
            transition: transform .08s, background .15s, opacity .15s, filter .15s;
        }
        .sfi-btn:active { transform: translateY(1px); }
        .sfi-btn[disabled] { opacity: .45; cursor: not-allowed; }
        .sfi-btn-primary { background: linear-gradient(135deg, #4f8cff 0%, #6f5cff 100%); color: #fff; }
        .sfi-btn-primary:hover:not([disabled]) { filter: brightness(1.08); }
        .sfi-btn-success { background: linear-gradient(135deg, #1dd1a1 0%, #10ac84 100%); color: #fff; }
        .sfi-btn-success:hover:not([disabled]) { filter: brightness(1.08); }
        .sfi-btn-fb { background: #1877F2; color: #fff; }
        .sfi-btn-fb:hover:not([disabled]) { filter: brightness(1.08); }
        .sfi-btn-ghost { background: rgba(255,255,255,.04); color: #c8ccd4; border: 1px solid rgba(255,255,255,.10); }
        .sfi-btn-ghost:hover { background: rgba(255,255,255,.08); }
        .sfi-toast {
            position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
            background: #1a1d24; color: #fff; padding: 10px 18px; border-radius: 999px;
            font-size: 13px; z-index: 99999; box-shadow: 0 8px 30px rgba(0,0,0,.5);
            border: 1px solid rgba(255,255,255,.08);
            opacity: 0; transition: opacity .2s, transform .2s; pointer-events: none;
        }
        .sfi-toast.show { opacity: 1; transform: translate(-50%, -6px); }
        @media (max-width: 520px) {
            .sfi-header { padding: 14px 16px 12px; }
            .sfi-body   { padding: 12px 16px 14px; }
            .sfi-footer { padding: 10px 16px 14px; }
            .sfi-tabs   { padding: 8px 12px 0; }
            .sfi-tab    { padding: 9px 10px; font-size: 12px; }
            .sfi-header h2 { font-size: 15px; }
        }
        `;
        const style = document.createElement('style');
        style.id = 'spinfinity-social-import-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function toast(msg) {
        const el = document.createElement('div');
        el.className = 'sfi-toast'; el.textContent = msg;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 2400);
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }
    function truncate(s, n) {
        s = String(s || '').replace(/\s+/g, ' ').trim();
        return s.length > n ? s.slice(0, n - 1) + '…' : s;
    }
    function fmtDate(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString(currentLang === 'en' ? 'en-US' : 'fr-FR',
                { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { return iso; }
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
                <div class="sfi-tabs" role="tablist">
                    <button class="sfi-tab active" data-tab="paste" role="tab">${escapeHtml(t('tab.paste'))}</button>
                    <button class="sfi-tab" data-tab="connect" role="tab">${escapeHtml(t('tab.connect'))}</button>
                </div>
                <div class="sfi-body">
                    <div class="sfi-pane" data-pane="paste">
                        <p class="sfi-intro">${escapeHtml(t('modal.intro'))}</p>
                        <details class="sfi-how">
                            <summary>${escapeHtml(t('how.title'))}</summary>
                            <ol>
                                <li>${escapeHtml(t('how.step1'))}</li>
                                <li>${escapeHtml(t('how.step2'))}</li>
                                <li>${escapeHtml(t('how.step3'))}</li>
                            </ol>
                        </details>
                        <label class="sfi-label" for="sfi-paste">${escapeHtml(t('tab.paste'))}</label>
                        <textarea id="sfi-paste" class="sfi-textarea" placeholder="${escapeHtml(t('paste.placeholder'))}"></textarea>
                        <div class="sfi-extract-row">
                            <button class="sfi-btn sfi-btn-primary" data-sfi-extract>${escapeHtml(t('btn.extract'))}</button>
                            <span class="sfi-count" data-sfi-paste-count></span>
                        </div>
                    </div>

                    <div class="sfi-pane" data-pane="connect" hidden>
                        <p class="sfi-intro">${escapeHtml(t('fb.intro'))}</p>
                        <p class="sfi-legal" style="margin: 0 0 12px;">${escapeHtml(t('fb.scopes'))}</p>

                        <div data-fb-setup ${FB_APP_ID ? 'hidden' : ''}>
                            <div class="sfi-setup-box">
                                <strong>${escapeHtml(t('fb.notConfigured.title'))}</strong><br>
                                ${t('fb.notConfigured.body')}
                            </div>
                        </div>

                        <div data-fb-login-section ${FB_APP_ID ? '' : 'hidden'}>
                            <button class="sfi-btn sfi-btn-fb" data-fb-login>${escapeHtml(t('fb.btn.login'))}</button>
                            <div class="sfi-fb-status" data-fb-status></div>
                            <div class="sfi-fb-error" data-fb-error hidden></div>
                        </div>

                        <div data-fb-connected-section hidden>
                            <div class="sfi-fb-card">
                                <div class="sfi-fb-user">
                                    <span>👤</span>
                                    <span data-fb-user></span>
                                    <button class="sfi-btn sfi-btn-ghost" style="margin-left:auto;padding:5px 10px;font-size:12px;" data-fb-logout>${escapeHtml(t('fb.btn.logout'))}</button>
                                </div>
                            </div>

                            <label class="sfi-label">${escapeHtml(t('fb.label.platform'))}</label>
                            <select class="sfi-select" data-fb-platform>
                                <option value="fb">${escapeHtml(t('fb.opt.facebook'))}</option>
                                <option value="ig">${escapeHtml(t('fb.opt.instagram'))}</option>
                            </select>

                            <label class="sfi-label">${escapeHtml(t('fb.label.page'))}</label>
                            <select class="sfi-select" data-fb-page disabled>
                                <option value="">${escapeHtml(t('fb.opt.choose'))}</option>
                            </select>

                            <label class="sfi-label" data-fb-post-label>${escapeHtml(t('fb.label.post'))}</label>
                            <select class="sfi-select" data-fb-post disabled>
                                <option value="">${escapeHtml(t('fb.opt.choose'))}</option>
                            </select>

                            <label class="sfi-checkbox" style="margin-top:12px;" data-fb-replies-wrap>
                                <input type="checkbox" data-fb-replies checked>
                                <span>${escapeHtml(t('fb.opt.replies'))}</span>
                            </label>

                            <div class="sfi-extract-row">
                                <button class="sfi-btn sfi-btn-primary" data-fb-fetch disabled>${escapeHtml(t('fb.btn.fetch'))}</button>
                                <span class="sfi-count" data-fb-fetch-status></span>
                            </div>
                            <div class="sfi-fb-error" data-fb-error-2 hidden></div>
                        </div>
                    </div>

                    <label class="sfi-label" for="sfi-preview" style="margin-top:18px;">${escapeHtml(t('preview.title'))}</label>
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

        const $  = (sel) => overlay.querySelector(sel);
        const $$ = (sel) => Array.from(overlay.querySelectorAll(sel));

        const paste    = $('#sfi-paste');
        const preview  = $('#sfi-preview');
        const pasteCnt = $('[data-sfi-paste-count]');
        const dedupe   = $('[data-sfi-dedupe]');
        const dedupeEx = $('[data-sfi-dedupe-existing]');
        const btnImp   = $('[data-sfi-import]');

        const fbLoginSection     = $('[data-fb-login-section]');
        const fbConnectedSection = $('[data-fb-connected-section]');
        const fbStatus  = $('[data-fb-status]');
        const fbError   = $('[data-fb-error]');
        const fbError2  = $('[data-fb-error-2]');
        const fbUser    = $('[data-fb-user]');
        const fbPlatform= $('[data-fb-platform]');
        const fbPage    = $('[data-fb-page]');
        const fbPost    = $('[data-fb-post]');
        const fbPostLabel = $('[data-fb-post-label]');
        const fbRepliesWrap = $('[data-fb-replies-wrap]');
        const fbReplies = $('[data-fb-replies]');
        const fbFetch   = $('[data-fb-fetch]');
        const fbFetchStatus = $('[data-fb-fetch-status]');

        let pagesCache = [];

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

        $$('.sfi-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.sfi-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                $$('.sfi-pane').forEach(p => p.hidden = p.dataset.pane !== btn.dataset.tab);
            });
        });

        function computeFinalList() {
            const lines = preview.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            let out = lines;
            if (dedupe.checked) {
                const seen = new Set();
                out = out.filter(n => {
                    const k = n.toLowerCase();
                    if (seen.has(k)) return false;
                    seen.add(k); return true;
                });
            }
            if (dedupeEx.checked && existing.length) {
                const existSet = new Set(existing.map(s => s.toLowerCase()));
                out = out.filter(n => !existSet.has(n.toLowerCase()));
            }
            return out;
        }
        function refreshImportBtn() {
            const list = computeFinalList();
            btnImp.disabled = list.length === 0;
        }
        function appendToPreview(names) {
            if (!names || !names.length) return;
            const cur = preview.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            preview.value = cur.concat(names).join('\n');
            refreshImportBtn();
        }

        preview.addEventListener('input', refreshImportBtn);
        dedupe.addEventListener('change', refreshImportBtn);
        dedupeEx.addEventListener('change', refreshImportBtn);

        $('[data-sfi-extract]').addEventListener('click', () => {
            const raw = paste.value;
            if (!raw.trim()) { toast(t('toast.empty')); return; }
            const detected = extractNames(raw);
            if (detected.length === 0) { toast(t('toast.none')); }
            else { appendToPreview(detected); }
            pasteCnt.textContent = t('count.detected', { n: detected.length });
        });

        function showFbError(msg, secondary) {
            const node = secondary ? fbError2 : fbError;
            node.textContent = msg;
            node.hidden = false;
        }
        function clearFbErrors() { fbError.hidden = true; fbError2.hidden = true; }

        function showConnected(user) {
            fbLoginSection.hidden = true;
            fbConnectedSection.hidden = false;
            fbUser.textContent = t('fb.loggedAs', { name: user.name || '?' });
            populatePages();
        }
        function showDisconnected() {
            fbLoginSection.hidden = false;
            fbConnectedSection.hidden = true;
        }

        async function populatePages() {
            fbPage.innerHTML = '<option value="">' + escapeHtml(t('fb.opt.choose')) + '</option>';
            fbPage.disabled = true; fbPost.disabled = true; fbFetch.disabled = true;
            try {
                pagesCache = await fbListPages();
                if (!pagesCache.length) { showFbError(t('fb.noPages'), true); return; }
                pagesCache.forEach(p => {
                    const o = document.createElement('option');
                    o.value = p.id; o.textContent = p.name;
                    fbPage.appendChild(o);
                });
                fbPage.disabled = false;
            } catch (e) {
                showFbError(t('fb.error', { msg: e.message || 'unknown' }), true);
            }
        }

        async function onPageOrPlatformChange() {
            clearFbErrors();
            fbPost.innerHTML = '<option value="">' + escapeHtml(t('fb.opt.choose')) + '</option>';
            fbPost.disabled = true; fbFetch.disabled = true;
            const pageId = fbPage.value;
            if (!pageId) return;
            const page = pagesCache.find(p => p.id === pageId);
            if (!page) return;
            const platform = fbPlatform.value;
            fbPostLabel.textContent = (platform === 'ig') ? t('fb.label.media') : t('fb.label.post');
            fbRepliesWrap.style.display = (platform === 'ig') ? 'none' : '';

            try {
                if (platform === 'fb') {
                    const posts = await fbListPosts(pageId, page.access_token);
                    posts.forEach(p => {
                        const o = document.createElement('option');
                        o.value = p.id;
                        const date = fmtDate(p.created_time);
                        const msg = truncate(p.message || '(sans texte)', 80);
                        o.textContent = `[${date}] ${msg}`;
                        fbPost.appendChild(o);
                    });
                    fbPost.disabled = false;
                } else {
                    if (!page.instagram_business_account) {
                        showFbError(t('fb.noIg'), true); return;
                    }
                    const igId = page.instagram_business_account.id;
                    const media = await igListMedia(igId, page.access_token);
                    media.forEach(m => {
                        const o = document.createElement('option');
                        o.value = m.id;
                        const date = fmtDate(m.timestamp);
                        const msg = truncate(m.caption || '(sans légende)', 80);
                        o.textContent = `[${date}] ${msg}`;
                        fbPost.appendChild(o);
                    });
                    fbPost.disabled = false;
                }
            } catch (e) {
                showFbError(t('fb.error', { msg: e.message || 'unknown' }), true);
            }
        }

        fbPage.addEventListener('change', onPageOrPlatformChange);
        fbPlatform.addEventListener('change', onPageOrPlatformChange);
        fbPost.addEventListener('change', () => { fbFetch.disabled = !fbPost.value; });

        $('[data-fb-login]').addEventListener('click', async () => {
            clearFbErrors();
            fbStatus.textContent = t('fb.loading');
            try {
                await loadFbSdk();
                fbStatus.textContent = '';
                const auth = await fbLogin();
                if (!auth || !auth.accessToken) throw new Error('cancelled');
                let me = { name: '' };
                try { me = await fbApi('/me', { fields: 'name' }); } catch (e) {}
                showConnected(me);
            } catch (e) {
                fbStatus.textContent = '';
                if (e.message === 'NOT_CONFIGURED') showFbError(t('fb.notConfigured.title'));
                else if (e.message === 'cancelled') showFbError(t('fb.cancelled'));
                else showFbError(t('fb.error', { msg: e.message || 'unknown' }));
            }
        });

        $('[data-fb-logout]').addEventListener('click', () => {
            fbLogout();
            showDisconnected();
        });

        $('[data-fb-fetch]').addEventListener('click', async () => {
            clearFbErrors();
            const pageId = fbPage.value;
            const targetId = fbPost.value;
            if (!pageId || !targetId) return;
            const page = pagesCache.find(p => p.id === pageId);
            const platform = fbPlatform.value;

            fbFetch.disabled = true;
            fbFetchStatus.textContent = t('fb.fetching');
            try {
                let comments, names;
                if (platform === 'fb') {
                    comments = await fbListComments(targetId, page.access_token, fbReplies.checked);
                    names = comments.map(c => c.from && c.from.name).filter(Boolean);
                } else {
                    comments = await igListComments(targetId, page.access_token);
                    names = comments.map(c => c.username).filter(Boolean);
                }
                fbFetchStatus.textContent = t('fb.fetchOk', { n: comments.length });
                appendToPreview(names);
            } catch (e) {
                fbFetchStatus.textContent = '';
                showFbError(t('fb.error', { msg: e.message || e.type || 'unknown' }), true);
            } finally {
                fbFetch.disabled = !fbPost.value;
            }
        });

        btnImp.addEventListener('click', () => {
            const finalList = computeFinalList();
            if (finalList.length === 0) return;
            try { onImport(finalList); } catch (e) { console.error(e); }
            toast(t('toast.imported', { n: finalList.length }));
            close();
        });

        setTimeout(() => paste.focus(), 50);
    }

    window.SpinfinitySocialImport = {
        openModal,
        extractNames
    };
})();
