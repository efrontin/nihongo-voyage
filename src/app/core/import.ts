import { VocabEntry } from './models';

export type ImportedCard = Pick<VocabEntry, 'jp' | 'kana' | 'romaji' | 'fr'>;

const HAS_JAPANESE = /[぀-ヿ㐀-鿿]/;

/**
 * Lit la liste de phrases renvoyée par Claude en fin de scène.
 * Une phrase par ligne, champs séparés par « | » ou une tabulation :
 *   日本語 | かな | romaji | français
 *   日本語 | romaji | français            (la lecture en kana reprend alors le japonais)
 * Les tableaux Markdown, puces, numéros et lignes d'en-tête sont ignorés.
 */
export function parseCardsFromText(text: string): ImportedCard[] {
  const out: ImportedCard[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || /^\|?\s*:?-{2,}/.test(line)) continue; // ligne vide ou séparateur de tableau
    line = line.replace(/^[-*•]\s+|^\d+[.)]\s+/, ''); // puces et numéros
    line = line.replace(/^[|｜]/, '').replace(/[|｜]$/, ''); // bords de tableau Markdown
    const cells = line.split(/\s*[|｜\t]\s*/).map((c) => c.replace(/\*\*/g, '').trim()).filter(Boolean);
    if (cells.length < 3 || !HAS_JAPANESE.test(cells[0])) continue; // en-tête ou texte libre

    const [jp, a, b, c] = cells;
    if (cells.length === 3 && HAS_JAPANESE.test(a)) continue; // « jp | kana | romaji » : traduction manquante
    const card: ImportedCard =
      cells.length >= 4 ? { jp, kana: a, romaji: b, fr: c } : { jp, kana: jp, romaji: a, fr: b };

    if (card.jp === '日本語' || card.kana === 'かな') continue; // ligne de format recopiée
    if (seen.has(card.jp)) continue;
    seen.add(card.jp);
    out.push(card);
  }
  return out;
}
