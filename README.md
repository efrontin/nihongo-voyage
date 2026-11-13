# Nihongo Voyage 🇯🇵

PWA Angular 22 pour apprendre le japonais du voyage chaque jour.

## Lancer

```bash
npm install
npm start            # http://localhost:4200
npm test             # tests (répétition espacée + import des phrases)
npm run build        # build de production + service worker (dist/nihongo-voyage/browser)
```

## Déploiement (GitHub Pages)

L'app est publiée automatiquement sur https://efrontin.github.io/nihongo-voyage/ à chaque push sur `main` (workflow `.github/workflows/deploy.yml` : tests, build, déploiement).

`npm run build:pages` construit la version pour ce sous-dossier (`--base-href /nihongo-voyage/`) et copie `index.html` en `404.html`, pour que le rechargement direct d'une page (ex. `/revision`) ouvre l'app au lieu d'une 404.

Pour l'installer sur iPhone : ouvrir l'adresse ci-dessus dans Safari, puis Partager → « Sur l'écran d'accueil ».

## Écrans

| Onglet | Rôle |
|---|---|
| 家 Accueil | Cartes dues, nouvelles cartes, série de jours, compte à rebours avant le départ, progression par thème |
| 習 Révision | Session de répétition espacée : 👂 comprendre (jp → fr) puis 🗣️ dire (fr → jp). Raccourcis : espace = afficher, 1-4 = noter, r = réécouter |
| 語 Phrases | Les 214 mots et phrases par thème, audio, mode 📱 « montrer en grand » à présenter à un interlocuteur, ajout de cartes perso |
| 話 Parler | Jeu de rôle avec Claude (konbini, ramen, gare, hôtel, denim à Kojima, papeterie…). **Sans clé API (gratuit)** : copie la scène et ouvre l'app Claude, où tu peux parler en mode vocal ; en fin de scène, dis « fin » et colle la liste rendue par Claude pour en faire des cartes. **Avec une clé API** : la scène se joue dans l'app, avec corrections, suggestions et micro |
| 設 Réglages | Nouvelles cartes/jour, thème prioritaire, romaji, vitesse de voix, date de départ, rappel quotidien (.ics), clé API, export Anki, sauvegarde/restauration |

## Structure

```
src/app/
  core/
    srs.ts             moteur SM-2 (étapes 1 min / 10 min → 1 j, facteur de facilité)
    srs.spec.ts        tests (npx tsx)
    store.service.ts   état en signals + localStorage, file de révision, journal quotidien
    speech.service.ts  synthèse vocale ja-JP
    claude.prompts.ts  scénarios, prompt API (JSON) et prompt pour l'app Claude
    claude.service.ts  appel API Anthropic
    import.ts          lecture de la liste « jp | kana | romaji | fr » rendue en fin de scène
    export.ts          export Anki (TSV) et rappel .ics
  data/vocab.ts        vocabulaire (ajouter les lignes en FIN de thème : l'id dépend de la position)
  pages/               home, review, phrases, conversation, settings
```

## Notes

- Tout est stocké en local (localStorage). Sauvegarde régulièrement depuis les réglages.
- La clé API est facultative et facturée à part de tout abonnement Claude. Elle ne sort de l'appareil que vers api.anthropic.com. Modèle par défaut : `claude-haiku-5-5`.
- Le sens « dire » d'un mot se débloque quand son sens « comprendre » est passé en révision.
