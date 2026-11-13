import { Injectable, computed, effect, signal } from '@angular/core';
import { BUILTIN_VOCAB } from '../data/vocab';
import { CardDirection, CardState, DayLog, Grade, Settings, VocabEntry } from './models';
import { newCard, schedule } from './srs';

const STORAGE_KEY = 'nihongo-voyage.v1';
/** On peut revoir en avance une carte en apprentissage si elle tombe dans les 20 min. */
export const LEARN_AHEAD = 20 * 60_000;

interface PersistedState {
  cards: Record<string, CardState>;
  custom: VocabEntry[];
  log: DayLog[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 10,
  focusTheme: 'all',
  tripDate: '',
  showRomaji: true,
  speechRate: 0.85,
  apiKey: '',
  model: 'claude-haiku-5-5',
  reminderTime: '08:00',
};

function emptyState(): PersistedState {
  return { cards: {}, custom: [], log: [], settings: { ...DEFAULT_SETTINGS } };
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      cards: parsed.cards ?? {},
      custom: parsed.custom ?? [],
      log: parsed.log ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return emptyState();
  }
}

export function todayKey(ts = Date.now()): string {
  const d = new Date(ts - 4 * 3_600_000); // la journée commence à 4 h
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function newCustomId(): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `perso-${Date.now().toString(36)}-${rand}`;
}

export function cardId(entryId: string, dir: CardDirection): string {
  return `${entryId}|${dir}`;
}

export function parseCardId(id: string): { entryId: string; dir: CardDirection } {
  const [entryId, dir] = id.split('|');
  return { entryId, dir: dir as CardDirection };
}

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly state = signal<PersistedState>(load());

  readonly settings = computed(() => this.state().settings);
  readonly cards = computed(() => this.state().cards);
  readonly custom = computed(() => this.state().custom);
  readonly log = computed(() => this.state().log);

  readonly entries = computed<VocabEntry[]>(() => [...BUILTIN_VOCAB, ...this.state().custom]);
  readonly entryById = computed(() => new Map(this.entries().map((e) => [e.id, e])));

  readonly today = computed<DayLog>(() => {
    const key = todayKey();
    return this.state().log.find((l) => l.date === key) ?? { date: key, reviews: 0, newCards: 0 };
  });

  /** Nombre de jours consécutifs avec au moins une révision. */
  readonly streak = computed(() => {
    const days = new Set(this.state().log.filter((l) => l.reviews > 0).map((l) => l.date));
    let count = 0;
    const cursor = new Date();
    if (!days.has(todayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(todayKey(cursor.getTime()))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  });

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
      } catch {
        /* stockage plein ou indisponible : on garde l'état en mémoire */
      }
    });
  }

  /* ---------- File de révision ---------- */

  dueCards(now = Date.now()): string[] {
    return Object.entries(this.cards())
      .filter(([id, c]) => c.status !== 'new' && c.due <= now + (c.status === 'review' ? 0 : LEARN_AHEAD) && this.entryById().has(parseCardId(id).entryId))
      .sort((a, b) => a[1].due - b[1].due)
      .map(([id]) => id);
  }

  /**
   * Nouvelles cartes du jour : d'abord le sens « comprendre » (jp → fr) par priorité ;
   * le sens « parler » (fr → jp) se débloque quand le premier est passé en révision.
   */
  newCardsAvailable(limit = this.remainingNewToday()): string[] {
    if (limit <= 0) return [];
    const focus = this.settings().focusTheme;
    const cards = this.cards();
    const pool = this.entries()
      .filter((e) => focus === 'all' || e.theme === focus)
      .map((e, index) => ({ e, index }))
      .sort((a, b) => a.e.priority - b.e.priority || a.index - b.index)
      .map(({ e }) => e);

    const out: string[] = [];
    // sens « parler » débloqués en premier : ils consolident ce qui est déjà vu
    for (const e of pool) {
      if (e.type === 'kanji') continue;
      const rec = cards[cardId(e.id, 'rec')];
      if (rec?.status === 'review' && !cards[cardId(e.id, 'prod')]) out.push(cardId(e.id, 'prod'));
      if (out.length >= limit) return out;
    }
    for (const e of pool) {
      if (!cards[cardId(e.id, 'rec')]) out.push(cardId(e.id, 'rec'));
      if (out.length >= limit) return out;
    }
    return out;
  }

  remainingNewToday(): number {
    return Math.max(0, this.settings().newPerDay - this.today().newCards);
  }

  buildSession(now = Date.now()): string[] {
    return [...this.dueCards(now), ...this.newCardsAvailable()];
  }

  getCard(id: string, now = Date.now()): CardState {
    return this.cards()[id] ?? newCard(now);
  }

  preview(id: string, grade: Grade, now = Date.now()): CardState {
    return schedule(this.getCard(id, now), grade, now);
  }

  grade(id: string, grade: Grade, now = Date.now()): CardState {
    const before = this.getCard(id, now);
    const after = schedule(before, grade, now);
    const key = todayKey(now);
    this.state.update((s) => {
      const log = [...s.log];
      let idx = log.findIndex((l) => l.date === key);
      if (idx === -1) {
        log.push({ date: key, reviews: 0, newCards: 0 });
        idx = log.length - 1;
      }
      log[idx] = {
        ...log[idx],
        reviews: log[idx].reviews + 1,
        newCards: log[idx].newCards + (before.status === 'new' ? 1 : 0),
      };
      return { ...s, cards: { ...s.cards, [id]: after }, log: log.slice(-400) };
    });
    return after;
  }

  /* ---------- Progression ---------- */

  themeProgress(theme: string): { seen: number; total: number } {
    const entries = this.entries().filter((e) => e.theme === theme);
    const cards = this.cards();
    const seen = entries.filter((e) => cards[cardId(e.id, 'rec')]).length;
    return { seen, total: entries.length };
  }

  /* ---------- Cartes perso ---------- */

  addCustom(entry: Omit<VocabEntry, 'id' | 'theme'>): VocabEntry {
    const full: VocabEntry = { ...entry, id: newCustomId(), theme: 'perso' };
    this.state.update((s) => ({ ...s, custom: [...s.custom, full] }));
    return full;
  }

  /** Ajoute des cartes perso en ignorant celles dont le japonais existe déjà. Renvoie le nombre ajouté. */
  importCards(cards: Pick<VocabEntry, 'jp' | 'kana' | 'romaji' | 'fr'>[]): number {
    const known = new Set(this.entries().map((e) => e.jp));
    const fresh: VocabEntry[] = cards
      .filter((c) => !known.has(c.jp) && known.add(c.jp))
      .map((c) => ({ ...c, id: newCustomId(), theme: 'perso', type: 'phrase', priority: 1 }));
    if (fresh.length) this.state.update((s) => ({ ...s, custom: [...s.custom, ...fresh] }));
    return fresh.length;
  }

  removeCustom(id: string): void {
    this.state.update((s) => {
      const cards = { ...s.cards };
      delete cards[cardId(id, 'rec')];
      delete cards[cardId(id, 'prod')];
      return { ...s, cards, custom: s.custom.filter((e) => e.id !== id) };
    });
  }

  /* ---------- Réglages & sauvegarde ---------- */

  updateSettings(patch: Partial<Settings>): void {
    this.state.update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }

  exportBackup(): string {
    return JSON.stringify(this.state(), null, 2);
  }

  importBackup(json: string): void {
    const parsed = JSON.parse(json) as Partial<PersistedState>;
    if (typeof parsed !== 'object' || !parsed || !('cards' in parsed)) throw new Error('Fichier de sauvegarde invalide');
    this.state.set({
      cards: parsed.cards ?? {},
      custom: parsed.custom ?? [],
      log: parsed.log ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    });
  }

  resetProgress(): void {
    this.state.update((s) => ({ ...s, cards: {}, log: [] }));
  }
}
