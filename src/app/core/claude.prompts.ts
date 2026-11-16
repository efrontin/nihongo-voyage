import { Level } from './models';

export interface Scenario {
  id: string;
  label: string;
  icon: string;
  role: string;
  goal: string;
  /** Imprévus possibles : un seul est tiré au sort par scène (à partir du niveau A2). */
  twists: string[];
}

export const SCENARIOS: Scenario[] = [
  { id: 'konbini', label: 'Konbini', icon: '🏪', role: 'caissier ou caissière d\'un konbini (7-Eleven) à Tokyo', goal: 'payer des achats, répondre aux questions sur le sac, le réchauffage et les baguettes', twists: ['le terminal de carte est en panne : espèces ou carte de transport (IC) seulement', 'tu demandes si les articles chauds et froids doivent aller dans des sacs séparés', 'un des articles est en promotion « deux achetés, le deuxième à moitié prix » et tu le proposes'] },
  { id: 'ramen', label: 'Restaurant de ramen', icon: '🍜', role: 'serveur d\'un petit restaurant de ramen', goal: 'être placé, commander, demander une recommandation, payer', twists: ['le plat demandé est épuisé : tu en proposes un autre', 'il faut d\'abord acheter un ticket au distributeur à l\'entrée, et tu l\'expliques', 'c\'est complet : environ quinze minutes d\'attente, tu demandes le nom et le nombre de personnes'] },
  { id: 'gare', label: 'Guichet de gare', icon: '🚄', role: 'agent au guichet JR de la gare de Tokyo', goal: 'acheter un billet de shinkansen pour Kyoto, choisir place réservée ou non, connaître le quai', twists: ['les places réservées du prochain train sont complètes : tu proposes le train suivant ou une place non réservée', 'tu demandes fenêtre ou couloir, puis annonces que seul le couloir reste', 'le train a vingt minutes de retard et part d\'un autre quai que prévu'] },
  { id: 'chemin', label: 'Demander son chemin', icon: '🧭', role: 'passant aimable dans la rue à Shibuya', goal: 'trouver la gare la plus proche ou un magasin, comprendre droite/gauche/tout droit', twists: ['tu ne connais pas l\'endroit : tu conseilles de demander au kōban tout proche et tu indiques où il est', 'c\'est trop loin à pied : tu conseilles le métro et précises la ligne et le nombre de stations', 'tu indiques d\'abord le mauvais côté, puis tu te corriges'] },
  { id: 'hotel', label: 'Hôtel', icon: '🏨', role: 'réceptionniste d\'un hôtel d\'affaires', goal: 'faire le check-in, laisser ses bagages, demander l\'heure du check-out et du petit-déjeuner', twists: ['la chambre n\'est pas prête avant 15 h : tu proposes de garder les bagages', 'tu ne trouves pas la réservation sous ce nom : tu demandes l\'orthographe, puis la date de réservation', 'le petit-déjeuner n\'est pas compris : tu en donnes le prix et demandes s\'il faut l\'ajouter'] },
  { id: 'denim', label: 'Boutique de denim', icon: '👖', role: 'vendeur d\'une boutique de denim à Kojima (Okayama)', goal: 'essayer un jean, demander une autre taille, faire l\'ourlet, la détaxe', twists: ['la taille demandée n\'est plus disponible dans ce coloris : tu proposes un autre coloris ou une autre coupe', 'l\'ourlet demande quarante minutes : tu demandes si le client attend ou repasse plus tard', 'la détaxe n\'est possible qu\'à partir de 5 000 yens hors taxe, et tu demandes le passeport'] },
  { id: 'papeterie', label: 'Papeterie', icon: '✒️', role: 'vendeuse au rayon stylos de Itoya à Ginza', goal: 'chercher un stylo-plume ou un carnet, demander des coloris, une édition limitée', twists: ['l\'édition limitée est épuisée : tu proposes un modèle voisin', 'tu demandes si c\'est un cadeau et proposes l\'emballage', 'le coloris demandé n\'existe qu\'en plume fine : tu demandes quelle largeur de plume est souhaitée'] },
  { id: 'libre', label: 'Discussion libre', icon: '💬', role: 'ami japonais rencontré dans un échange linguistique', goal: 'se présenter, parler de ses loisirs (anime, sacs à dos, volley-ball)', twists: ['tu poses une question inattendue sur la France (la cuisine, une ville)', 'tu proposes d\'aller manger ensemble et demandes ce qu\'il aime ou ne peut pas manger', 'tu demandes ce qui l\'a le plus surpris au Japon'] },
];

/** Ce que chaque niveau change : la présentation de l'apprenant et le registre de l'interlocuteur. */
export const LEVELS: Record<Level, { label: string; learner: string; speech: string }> = {
  A1: {
    label: 'A1 · débutant (JLPT N5)',
    learner: 'débutant (niveau A1, JLPT N5)',
    speech: 'phrases courtes et polies (forme です/ます), vocabulaire courant de voyage',
  },
  A2: {
    label: 'A2 · élémentaire (JLPT N4)',
    learner: 'de niveau élémentaire (A2, JLPT N4)',
    speech: 'le vrai langage de service (keigo courant : いらっしゃいませ, 少々お待ちください, 〜でよろしいですか…), en phrases de longueur normale ; reformule plus simplement seulement si on te le demande',
  },
  B1: {
    label: 'B1 · intermédiaire (JLPT N3)',
    learner: 'de niveau intermédiaire (B1, JLPT N3)',
    speech: 'un japonais naturel, au débit et au registre réels de la situation (keigo de service compris), sans simplifier ; reformule seulement si on te le demande',
  },
};

/** Tire l'imprévu de la scène. Au niveau A1 il n'y en a pas : la scène se déroule sans surprise. */
export function pickTwist(s: Scenario, level: Level, rnd: () => number = Math.random): string | null {
  if (level === 'A1' || !s.twists.length) return null;
  return s.twists[Math.floor(rnd() * s.twists.length)];
}

export interface TutorReply {
  jp: string;
  kana: string;
  romaji: string;
  fr: string;
  correction: string | null;
  /** Bilan de fin de scène, en français ; null tant que la scène continue. */
  bilan: string | null;
  suggestions: { jp: string; romaji: string; fr: string }[];
}

export function apiSystemPrompt(s: Scenario, level: Level = 'A2', twist: string | null = null): string {
  const l = LEVELS[level];
  return `Tu es un partenaire de jeu de rôle pour un Français ${l.learner} en japonais, qui prépare un voyage au Japon.
Rôle : tu joues un(e) ${s.role}. Objectif de la scène : ${s.goal}.

Règles :
- Tu parles UNIQUEMENT japonais dans le jeu. Registre : ${l.speech}.
- Une seule réplique à la fois, comme dans une vraie interaction ; tu commences la scène si l'historique est vide.
- L'utilisateur peut écrire en japonais, en romaji ou en français s'il est bloqué.
- Si sa phrase contient une erreur ou s'il a écrit en français/romaji, donne dans "correction" la bonne formulation japonaise avec une explication très brève en français. Sinon null.
- Propose 2 ou 3 réponses possibles simples dans "suggestions" pour l'aider à enchaîner.${twist ? `
- Imprévu de la scène, à amener naturellement au bon moment, sans l'annoncer ni l'expliquer en français : ${twist}.` : ''}
- Quand l'utilisateur écrit « fin », conclus la scène par une dernière réplique dans "jp" et remplis "bilan" : trois lignes en français (objectif de la scène atteint ou non, ce qu'il a bien dit, le point précis à retravailler avec la bonne phrase japonaise). Le reste du temps, "bilan" vaut null.

Réponds TOUJOURS et SEULEMENT avec un objet JSON valide, sans texte autour :
{"jp": "ta réplique en japonais naturel (kanji + kana)", "kana": "la même réplique tout en hiragana/katakana", "romaji": "en romaji Hepburn", "fr": "traduction française", "correction": null, "bilan": null, "suggestions": [{"jp": "...", "romaji": "...", "fr": "..."}]}`;
}


/**
 * Prompt à coller dans l'app Claude (texte ou mode vocal) : aucune clé API nécessaire.
 * En fin de scène, Claude renvoie les phrases dans un format que l'onglet Parler sait importer.
 */
export function buildAppPrompt(s: Scenario, level: Level = 'A2', twist: string | null = null): string {
  const l = LEVELS[level];
  return `Jeu de rôle pour pratiquer le japonais avant mon voyage au Japon. Je suis français, ${l.learner}.

Tu joues : ${s.role}.
Objectif de la scène : ${s.goal}.

Règles :
1. Commence la scène tout de suite, en japonais, avec une seule réplique. Registre : ${l.speech}.
2. Une réplique à la fois, comme dans la vraie vie, puis tu attends ma réponse.
3. Sous chaque réplique, ajoute la lecture en hiragana et la traduction française entre parenthèses. Si on se parle en mode vocal, n'ajoute rien : je te demanderai « traduis » si je bloque.
4. Je réponds en japonais, en romaji ou en français si je suis bloqué. Si je fais une erreur, ou si je réponds en français, donne-moi d'abord la bonne phrase japonaise en une ligne, puis continue la scène.
5. Si je dis « aide », propose-moi 2 réponses simples possibles.
6. Quand je dis « fin », sors du rôle. Donne d'abord un bilan de trois lignes en français : objectif atteint ou non, ce que j'ai bien dit, le point précis à retravailler. Puis donne-moi les phrases utiles de la scène (les tiennes et mes phrases corrigées), une par ligne, sans titre, exactement sous ce format :
日本語 | かな | romaji | français
Exemple :
袋はいりません | ふくろはいりません | fukuro wa irimasen | Je n'ai pas besoin de sac
${twist ? `
7. Imprévu à glisser dans la scène au bon moment, sans me prévenir ni l'expliquer : ${twist}.
` : ''}
C'est parti !`;
}
