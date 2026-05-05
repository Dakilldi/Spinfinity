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
