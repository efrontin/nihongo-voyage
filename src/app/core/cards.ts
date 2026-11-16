import { CardDirection, VocabEntry } from './models';

/** Règles propres aux cartes, sans dépendance à Angular (donc testables avec tsx). */

/** Une entrée a un sens « dire » sauf les kanji de panneaux et les phrases qu'on ne fait qu'entendre. */
export function hasProd(e: VocabEntry): boolean {
  return e.type !== 'kanji' && !e.heard;
}

/**
 * La carte se joue-t-elle à l'oreille (audio d'abord, texte japonais caché) ?
 * Toujours pour les phrases « entendues » ; pour le reste du sens « comprendre », selon le réglage.
 * Jamais pour les kanji (c'est la lecture qu'on teste) ni les gabarits en 〜 (illisibles à voix haute).
 */
export function listenOnly(e: VocabEntry, dir: CardDirection, listenFirst: boolean): boolean {
  if (dir !== 'rec' || e.type === 'kanji' || /[〜~]/.test(e.jp)) return false;
  return !!e.heard || listenFirst;
}
