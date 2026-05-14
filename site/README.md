# 🎰 Spinfinity

Tirage au sort web avec style — 4 thèmes immersifs, 100% statique.

## Structure

```
site/
├── index.html              # Page d'accueil
├── corporate/              # Thème Corporate (sobre, business)
│   ├── index.html
│   └── sounds/             # Chimes / dings (optionnel)
├── casino/                 # Thème Casino Royale (Las Vegas)
│   ├── index.html
│   └── sounds/             # Sons jackpot (optionnel)
├── redline/                # Thème Redline Roulette (drift JDM)
│   ├── index.html
│   └── sounds/             # Sons moteur V8 (optionnel)
└── tvshow/                 # Thème Prime Time (plateau télé)
    ├── index.html
    └── sounds/             # Applaudissements (optionnel)
```

## Lancer en local

Simple serveur Python dans le dossier `site/` :

```bash
cd site
python3 -m http.server 8080
```

Puis ouvrir http://localhost:8080 dans ton navigateur.

## Sons personnalisés

Chaque thème a un dossier `sounds/` qui est **scanné automatiquement**.

Deux façons d'y mettre des sons :

**A — Simple et rapide (recommandé)** :
- Nommer les fichiers `1.mp3`, `2.mp3`, `3.mp3`, etc.
- Le site charge jusqu'à 50 fichiers numérotés séquentiellement.

**B — Avec fichier `list.json`** :

Créer `sounds/list.json` contenant la liste des noms de fichiers :
```json
["applause-1.mp3", "crowd-cheer.mp3", "golf-clap.mp3"]
```

Le site joue un son **au hasard** parmi ceux trouvés à chaque tirage gagnant.

### Suggestions de sons par thème
- **Corporate** : chimes, ding de cloche, notification douce, applaudissement discret
- **Casino** : ka-ching de machine à sous, jackpot bells, pièces qui tombent
- **Redline** : moteur V8 qui démarre, burn de pneu, turbo whoosh
- **TV Show** : applaudissements (différentes foules), drumroll + cymbale

Si aucun son n'est trouvé, un son de synthèse **fallback** est joué (généré via Web Audio API).

## Fonctionnalités communes

- ✅ Import de participants (un par ligne ou séparés par virgules)
- ✅ Liste des lots à gagner (attribués dans l'ordre des tirages)
- ✅ Liste gagnants + participants avec compteurs
- ✅ Bouton "Renvoyer dans participants" (pour réinjecter des gagnants)
- ✅ i18n FR / EN (détection automatique + localStorage)
- ✅ Son au tirage (ticks pendant + son final au gagnant)
- ✅ Banner de prix avec nom du lot gagné
- ✅ Responsive mobile (testé jusqu'à 360px)

## Spécificités par thème

| Thème     | Jauge           | Particules           | Ambiance sonore    |
|-----------|-----------------|----------------------|--------------------|
| Corporate | Progress ring   | Confettis papier     | Chimes / dings     |
| Casino    | Mini-roulette   | Pièces d'or + étoiles| Jackpot / ka-ching |
| Redline   | Compteur RPM    | Fumée de pneu        | Moteur V8          |
| TV Show   | Applausomètre   | Étoiles + confettis  | Applaudissements   |

## Déploiement

Site 100% statique — peut être déployé sur :
- Netlify (drag & drop du dossier `site/`)
- Vercel
- GitHub Pages
- Cloudflare Pages
- N'importe quel hébergeur de fichiers statiques

## Import depuis Facebook / Instagram

Chaque roue dispose d'un bouton **📘 Facebook / Instagram** à côté du bouton Import. Il ouvre une fenêtre avec deux modes :

### Mode 1 — Coller du texte (toujours disponible)
L'utilisateur copie les commentaires depuis n'importe quel post FB/IG (même un post tiers) et les colle. Les noms sont extraits automatiquement par heuristique côté navigateur. Aucun stockage, aucun appel serveur.

### Mode 2 — Connexion Facebook (nécessite une App Meta)
L'utilisateur se connecte avec son compte Facebook et choisit un de ses posts (sur une Page qu'il administre) ou une publication Instagram (compte Business/Creator lié). Les noms des personnes ayant commenté sont récupérés automatiquement via la **Graph API Meta**, directement depuis le navigateur. Spinfinity ne reçoit ni les identifiants, ni le jeton d'accès, ni les données.

#### Configurer le mode "Connexion Facebook"

1. **Créer une App Meta** :
   - Aller sur https://developers.facebook.com/apps
   - Cliquer "Créer une application" → choisir le type **"Consommateur"** ou **"Entreprise"**
   - Donner un nom (ex: "Spinfinity") et un email de contact
2. **Ajouter le produit "Connexion Facebook" (Facebook Login)** dans le tableau de bord de l'App
3. **Configurer les URL de redirection OAuth valides** :
   - Aller dans `Connexion Facebook > Paramètres`
   - Dans "URI de redirection OAuth valides", ajouter le domaine de production (ex: `https://spinfinity.example.com/`)
   - En `Domaines de l'app`, ajouter le même domaine sans le protocole
4. **Récupérer l'App ID** en haut du dashboard
5. **Renseigner l'App ID** dans `site/_shared/spinfinity-config.js` :
   ```js
   window.SPINFINITY_FB_APP_ID = '1234567890';
   ```
6. **Ajouter ton compte FB comme Testeur** (`Rôles > Rôles`) si l'app est encore en **Mode Développement** — les autres comptes ne pourront pas se connecter tant que l'app n'est pas en mode Public via revue.

#### Permissions demandées
- `pages_show_list` — lister les Pages que l'utilisateur administre
- `pages_read_engagement` — lire les commentaires sur ces Pages
- `instagram_basic` — accès aux comptes IG Business/Creator liés
- `instagram_manage_comments` — lire les commentaires Instagram

#### Passer en mode Public (App Review Meta)
Pour permettre à n'importe quel utilisateur (et pas seulement les Testeurs de l'App) d'utiliser la fonctionnalité, il faut soumettre l'App à la **revue Meta** :
- Politique de confidentialité publique (déjà disponible dans `/legal/`, à compléter pour mentionner l'usage FB/IG)
- Conditions générales d'utilisation publiques
- Business Verification (vérification d'identité Meta)
- Capture vidéo (~2 min) démontrant l'utilisation de chaque permission
- Délai typique : 3 à 15 jours ouvrés

**Tant que l'App n'est pas reviewée**, le mode "Connexion Facebook" fonctionne uniquement pour les comptes ajoutés manuellement comme **Admins / Développeurs / Testeurs** dans le dashboard Meta. Le mode "Coller du texte" reste utilisable sans aucune configuration.

#### Limitations Meta à connaître
- L'API ne renvoie que les commentaires des Pages que l'utilisateur connecté **administre**. Aucun moyen d'accéder à des Pages tierces.
- Instagram : compte **Business** ou **Creator** uniquement (les comptes Personal n'ont aucun accès API).
- Depuis 2021, Meta restreint la visibilité des noms de certains commentateurs (RGPD-like) — ils peuvent apparaître anonymisés. Le mode "Coller du texte" reste un bon fallback dans ce cas.
