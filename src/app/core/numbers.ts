/**
 * Lectures japonaises des nombres, prix, heures et quais, et tirage d'exercices d'écoute.
 * On génère soi-même les kana (さんびゃく, よじ, じゅっぷん…) plutôt que de laisser la
 * synthèse vocale deviner : c'est aussi ce qui sert de corrigé.
 */

export type NumberKind = 'prix' | 'heure' | 'quai';

export interface NumberItem {
  kind: NumberKind;
  /** valeur attendue : yens, n° de quai, ou heures × 100 + minutes */
  value: number;
  /** phrase lue par la synthèse */
  kana: string;
  /** réponse affichée au corrigé */
  label: string;
}

const UNITS = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
const HUNDREDS = ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく', 'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく'];
const THOUSANDS = ['', 'せん', 'にせん', 'さんぜん', 'よんせん', 'ごせん', 'ろくせん', 'ななせん', 'はっせん', 'きゅうせん'];
const HOURS = ['れい', 'いち', 'に', 'さん', 'よ', 'ご', 'ろく', 'しち', 'はち', 'く'];
const MINUTES = ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん'];

function tens(n: number): string {
  return n === 0 ? '' : n === 1 ? 'じゅう' : UNITS[n] + 'じゅう';
}

/** Nombre entier de 0 à 99 999 en kana (0 = ゼロ). */
export function readNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99_999) throw new RangeError(`nombre hors limites : ${n}`);
  if (n === 0) return 'ゼロ';
  const man = Math.floor(n / 10_000);
  const rest = n % 10_000;
  return (
    (man ? UNITS[man] + 'まん' : '') +
    THOUSANDS[Math.floor(rest / 1000)] +
    HUNDREDS[Math.floor(rest / 100) % 10] +
    tens(Math.floor(rest / 10) % 10) +
    UNITS[rest % 10]
  );
}

/** Prix en yens : 4 円 se lit よえん (14 円 = じゅうよえん). */
export function readYen(n: number): string {
  const num = readNumber(n);
  return (n % 10 === 4 ? num.slice(0, -1) : num) + 'えん';
}

/** Heure sur 24 h, comme dans les annonces de gare : 4 h = よじ, 7 h = しちじ, 9 h = くじ. */
export function readTime(h: number, m: number): string {
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new RangeError(`heure invalide : ${h}:${m}`);
  const hour = (h >= 20 ? 'にじゅう' : h >= 10 ? 'じゅう' : '') + (h % 10 === 0 && h > 0 ? '' : HOURS[h % 10]) + 'じ';
  if (m === 0) return hour;
  const unit = m % 10;
  const minutes = unit === 0 ? tens(m / 10).replace(/じゅう$/, 'じゅっぷん') : tens(Math.floor(m / 10)) + MINUTES[unit];
  return hour + minutes;
}

export function readPlatform(n: number): string {
  return readNumber(n) + 'ばんせん';
}

const pad = (n: number) => String(n).padStart(2, '0');
const int = (rnd: () => number, min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const pick = <T>(rnd: () => number, list: T[]) => list[Math.floor(rnd() * list.length)];

/** Tire un exercice. Les prix suivent ce qu'on entend en vrai : konbini, restaurant, boutique. */
export function randomItem(kind: NumberKind, rnd: () => number = Math.random): NumberItem {
  if (kind === 'prix') {
    const value = pick(rnd, [
      () => int(rnd, 100, 999), // konbini : 138 円, 648 円
      () => int(rnd, 100, 999) * 10, // repas, billets : 1 480 円
      () => int(rnd, 100, 598) * 100, // boutique : 24 800 円
    ])();
    return { kind, value, kana: readYen(value) + pick(rnd, ['になります', 'です', 'でございます']), label: `${value.toLocaleString('fr-FR')} 円` };
  }
  if (kind === 'heure') {
    const h = int(rnd, 5, 23);
    const m = pick(rnd, [() => int(rnd, 0, 11) * 5, () => int(rnd, 0, 59)])();
    return { kind, value: h * 100 + m, kana: readTime(h, m) + pick(rnd, ['です', 'はっしゃです', 'にしゅっぱつします']), label: `${h}:${pad(m)}` };
  }
  const n = int(rnd, 1, 23);
  return { kind, value: n, kana: readPlatform(n) + pick(rnd, ['です', 'からはっしゃします', 'にまいります']), label: `quai ${n}` };
}

/** Réponse tapée → juste ou non. On ne garde que les chiffres : « 9:05 », « 9h05 » et « 905 » se valent. */
export function checkAnswer(item: NumberItem, input: string): boolean {
  const digits = input.normalize('NFKC').replace(/\D/g, '');
  return digits !== '' && Number(digits) === item.value;
}
