export interface Scenario {
  id: string;
  label: string;
  icon: string;
  role: string;
  goal: string;
}

export const SCENARIOS: Scenario[] = [
  { id: 'konbini', label: 'Konbini', icon: '🏪', role: 'caissier ou caissière d\'un konbini (7-Eleven) à Tokyo', goal: 'payer des achats, répondre aux questions sur le sac, le réchauffage et les baguettes' },
  { id: 'ramen', label: 'Restaurant de ramen', icon: '🍜', role: 'serveur d\'un petit restaurant de ramen', goal: 'être placé, commander, demander une recommandation, payer' },
  { id: 'gare', label: 'Guichet de gare', icon: '🚄', role: 'agent au guichet JR de la gare de Tokyo', goal: 'acheter un billet de shinkansen pour Kyoto, choisir place réservée ou non, connaître le quai' },
  { id: 'chemin', label: 'Demander son chemin', icon: '🧭', role: 'passant aimable dans la rue à Shibuya', goal: 'trouver la gare la plus proche ou un magasin, comprendre droite/gauche/tout droit' },
  { id: 'hotel', label: 'Hôtel', icon: '🏨', role: 'réceptionniste d\'un hôtel d\'affaires', goal: 'faire le check-in, laisser ses bagages, demander l\'heure du check-out et du petit-déjeuner' },
  { id: 'denim', label: 'Boutique de denim', icon: '👖', role: 'vendeur d\'une boutique de denim à Kojima (Okayama)', goal: 'essayer un jean, demander une autre taille, faire l\'ourlet, la détaxe' },
  { id: 'papeterie', label: 'Papeterie', icon: '✒️', role: 'vendeuse au rayon stylos de Itoya à Ginza', goal: 'chercher un stylo-plume ou un carnet, demander des coloris, une édition limitée' },
  { id: 'libre', label: 'Discussion libre', icon: '💬', role: 'ami japonais rencontré dans un échange linguistique', goal: 'se présenter, parler de ses loisirs (anime, sacs à dos, volley-ball)' },
];

export interface TutorReply {
  jp: string;
  kana: string;
  romaji: string;
  fr: string;
  correction: string | null;
  suggestions: { jp: string; romaji: string; fr: string }[];
}

export function apiSystemPrompt(s: Scenario): string {
  return `Tu es un partenaire de jeu de rôle pour un Français débutant en japonais (niveau JLPT N5) qui prépare un voyage au Japon.
Rôle : tu joues un(e) ${s.role}. Objectif de la scène : ${s.goal}.

Règles :
- Tu parles UNIQUEMENT japonais dans le jeu, en phrases courtes, polies (forme です/ます), vocabulaire courant de voyage.
- Une seule réplique à la fois, comme dans une vraie interaction ; tu commences la scène si l'historique est vide.
- L'utilisateur peut écrire en japonais, en romaji ou en français s'il est bloqué.
- Si sa phrase contient une erreur ou s'il a écrit en français/romaji, donne dans "correction" la bonne formulation japonaise avec une explication très brève en français. Sinon null.
- Propose 2 ou 3 réponses possibles simples dans "suggestions" pour l'aider à enchaîner.

Réponds TOUJOURS et SEULEMENT avec un objet JSON valide, sans texte autour :
{"jp": "ta réplique en japonais naturel (kanji + kana)", "kana": "la même réplique tout en hiragana/katakana", "romaji": "en romaji Hepburn", "fr": "traduction française", "correction": null, "suggestions": [{"jp": "...", "romaji": "...", "fr": "..."}]}`;
}


/**
 * Prompt à coller dans l'app Claude (texte ou mode vocal) : aucune clé API nécessaire.
 * En fin de scène, Claude renvoie les phrases dans un format que l'onglet Parler sait importer.
 */
export function buildAppPrompt(s: Scenario): string {
  return `Jeu de rôle pour pratiquer le japonais avant mon voyage au Japon. Je suis français, débutant (niveau JLPT N5).

Tu joues : ${s.role}.
Objectif de la scène : ${s.goal}.

Règles :
1. Commence la scène tout de suite, en japonais, avec une seule réplique courte et polie (forme です/ます).
2. Une réplique à la fois, comme dans la vraie vie, puis tu attends ma réponse.
3. Sous chaque réplique, ajoute la lecture en hiragana et la traduction française entre parenthèses. Si on se parle en mode vocal, n'ajoute rien : je te demanderai « traduis » si je bloque.
4. Je réponds en japonais, en romaji ou en français si je suis bloqué. Si je fais une erreur, ou si je réponds en français, donne-moi d'abord la bonne phrase japonaise en une ligne, puis continue la scène.
5. Si je dis « aide », propose-moi 2 réponses simples possibles.
6. Quand je dis « fin », sors du rôle et donne-moi les phrases utiles de la scène (les tiennes et mes phrases corrigées), une par ligne, sans titre ni commentaire, exactement sous ce format :
日本語 | かな | romaji | français
Exemple :
袋はいりません | ふくろはいりません | fukuro wa irimasen | Je n'ai pas besoin de sac

C'est parti !`;
}
