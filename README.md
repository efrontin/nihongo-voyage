# Nihongo Voyage 🇯🇵

PWA Angular 22 pour apprendre le japonais du voyage chaque jour.

## Lancer

```bash
npm install
npm start            # http://localhost:4200
npm test             # tests (répétition espacée, import des phrases, intégrité du vocabulaire, lectures des nombres)
npm run build        # build de production + service worker (dist/nihongo-voyage/browser)
```

## Déploiement (GitHub Pages)

L'app est publiée automatiquement sur https://efrontin.github.io/nihongo-voyage/ à chaque push sur `main` (workflow `.github/workflows/deploy.yml` : tests, build, déploiement).

`npm run build:pages` construit la version pour ce sous-dossier (`--base-href /nihongo-voyage/`) et copie `index.html` en `404.html`, pour que le rechargement direct d'une page (ex. `/revision`) ouvre l'app au lieu d'une 404.

Pour l'installer sur iPhone : ouvrir l'adresse ci-dessus dans Safari, puis Partager → « Sur l'écran d'accueil ».

## Écrans

| Onglet | Rôle |
|---|---|
| 家 Accueil | Cartes dues, nouvelles cartes, série de jours, compte à rebours avant le départ, progression par thème, accès à l'🔢 écoute des nombres (la voix dit un prix, une heure ou un quai à vitesse réelle, on tape les chiffres) et au ⚡ tri rapide (écarter ce qu'on connaît déjà : la carte part en révision à 21-30 jours) |
| 習 Révision | Session de répétition espacée : 👂 écouter (audio d'abord, texte japonais caché, « Voir le texte » à la demande) ou 👁 lire (kanji des panneaux, gabarits en 〜), puis 🗣️ dire (fr → jp). Raccourcis : espace = afficher, 1-4 = noter, r = réécouter |
| 語 Phrases | Les 278 mots et phrases par thème (dont 👂 « Ce que tu vas entendre » : le keigo de service, à vitesse réelle, en compréhension seule, et 💬 « Les questions qu'on te pose »), audio, mode 📱 « montrer en grand » à présenter à un interlocuteur, ajout de cartes perso |
| 話 Parler | Jeu de rôle avec Claude (konbini, ramen, gare, hôtel, denim à Kojima, papeterie…). À partir du niveau A2, chaque scène cache un imprévu tiré au sort (plat épuisé, carte refusée, train complet…) et se termine par un bilan en trois lignes. **Sans clé API (gratuit)** : copie la scène et ouvre l'app Claude, où tu peux parler en mode vocal ; en fin de scène, dis « fin » et colle la liste rendue par Claude pour en faire des cartes. **Avec une clé API** : la scène se joue dans l'app, avec corrections, suggestions et micro |
| 設 Réglages | Nouvelles cartes/jour, thème prioritaire, écoute d'abord, romaji, niveau des jeux de rôle (A1/A2/B1), vitesse de voix, date de départ, rappel quotidien (.ics), clé API, export Anki, sauvegarde/restauration |

## Structure

```
src/app/
  core/
    srs.ts             moteur SM-2 (étapes 1 min / 10 min → 1 j, facteur de facilité)
    numbers.ts         lectures kana des prix, heures et quais + tirage des exercices d'écoute
    cards.ts           règles des cartes : qui a un sens « dire », qui se joue à l'oreille
    srs.spec.ts        tests (npx tsx)
    store.service.ts   état en signals + localStorage, file de révision, journal quotidien
    speech.service.ts  synthèse vocale ja-JP
    claude.prompts.ts  scénarios, prompt API (JSON) et prompt pour l'app Claude
    claude.service.ts  appel API Anthropic
    import.ts          lecture de la liste « jp | kana | romaji | fr » rendue en fin de scène
    export.ts          export Anki (TSV) et rappel .ics
  data/vocab.ts        vocabulaire (ajouter les lignes en FIN de thème : l'id dépend de la position)
  data/vocab.spec.ts   intégrité du vocabulaire (ids stables, lectures kana, doublons)
  pages/               home, review, triage, numbers, phrases, conversation, settings
```

## Notes

- Tout est stocké en local (localStorage). Sauvegarde régulièrement depuis les réglages.
- La clé API est facultative et facturée à part de tout abonnement Claude. Elle ne sort de l'appareil que vers api.anthropic.com. Modèle par défaut : `claude-haiku-5-5`.
- Le sens « dire » d'un mot se débloque quand son sens « comprendre » est passé en révision.
