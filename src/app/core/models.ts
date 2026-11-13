export type ThemeId =
  | 'politesse'
  | 'structures'
  | 'verbes'
  | 'transport'
  | 'directions'
  | 'restaurant'
  | 'konbini'
  | 'hotel'
  | 'shopping'
  | 'nombres'
  | 'urgences'
  | 'panneaux'
  | 'perso';

export type EntryType = 'mot' | 'verbe' | 'phrase' | 'kanji';

/** 1 = indispensable, 2 = très utile, 3 = bonus */
export type Priority = 1 | 2 | 3;

export interface VocabEntry {
  id: string;
  jp: string;
  kana: string;
  romaji: string;
  fr: string;
  theme: ThemeId;
  type: EntryType;
  priority: Priority;
  note?: string;
}

/** rec = japonais → français (comprendre), prod = français → japonais (parler) */
export type CardDirection = 'rec' | 'prod';

export type CardStatus = 'new' | 'learning' | 'review' | 'relearning';

export interface CardState {
  status: CardStatus;
  /** timestamp (ms) de la prochaine échéance */
  due: number;
  /** intervalle courant en jours (cartes en révision) */
  interval: number;
  /** facteur de facilité (SM-2), 2.5 au départ */
  ease: number;
  /** index de l'étape d'apprentissage en cours */
  step: number;
  reps: number;
  lapses: number;
  lastReview?: number;
}

/** 1 = À revoir, 2 = Difficile, 3 = Bien, 4 = Facile */
export type Grade = 1 | 2 | 3 | 4;

export interface DayLog {
  date: string; // AAAA-MM-JJ
  reviews: number;
  newCards: number;
}

export interface Settings {
  newPerDay: number;
  focusTheme: ThemeId | 'all';
  tripDate: string; // AAAA-MM-JJ ou ''
  showRomaji: boolean;
  speechRate: number;
  apiKey: string;
  model: string;
  reminderTime: string; // HH:MM
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
