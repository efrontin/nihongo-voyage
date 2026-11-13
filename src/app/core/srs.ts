import { CardState, Grade } from './models';

/**
 * Répétition espacée façon SM-2 / Anki :
 * - nouvelle carte → étapes d'apprentissage courtes (1 min, 10 min) puis 1 jour ;
 * - carte connue → l'intervalle est multiplié par le facteur de facilité ;
 * - carte oubliée → retour en réapprentissage et intervalle réduit.
 */

export const MINUTE = 60_000;
export const DAY = 86_400_000;

export const LEARNING_STEPS = [1 * MINUTE, 10 * MINUTE];
export const RELEARNING_STEPS = [10 * MINUTE];
export const GRADUATING_INTERVAL = 1; // jours
export const EASY_INTERVAL = 4; // jours
export const START_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL = 365;
export const LAPSE_FACTOR = 0.2;
export const HARD_FACTOR = 1.2;
export const EASY_BONUS = 1.3;

export function newCard(now: number): CardState {
  return { status: 'new', due: now, interval: 0, ease: START_EASE, step: 0, reps: 0, lapses: 0 };
}

/** Début du jour local (pour qu'une carte « à demain » soit dispo dès le matin). */
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(4, 0, 0, 0); // la journée « Anki » commence à 4 h
  if (d.getTime() > ts) d.setDate(d.getDate() - 1);
  return d.getTime();
}

function dueInDays(now: number, days: number): number {
  return startOfDay(now) + Math.round(days) * DAY;
}

function clampInterval(days: number): number {
  return Math.min(MAX_INTERVAL, Math.max(1, Math.round(days)));
}

export function schedule(card: CardState, grade: Grade, now: number): CardState {
  const c: CardState = { ...card, reps: card.reps + 1, lastReview: now };

  if (c.status === 'new' || c.status === 'learning') {
    return stepCard(c, grade, now, LEARNING_STEPS, false);
  }
  if (c.status === 'relearning') {
    return stepCard(c, grade, now, RELEARNING_STEPS, true);
  }

  // status === 'review'
  switch (grade) {
    case 1:
      c.lapses += 1;
      c.ease = Math.max(MIN_EASE, c.ease - 0.2);
      c.interval = clampInterval(c.interval * LAPSE_FACTOR);
      c.status = 'relearning';
      c.step = 0;
      c.due = now + RELEARNING_STEPS[0];
      return c;
    case 2:
      c.ease = Math.max(MIN_EASE, c.ease - 0.15);
      c.interval = clampInterval(Math.max(c.interval + 1, c.interval * HARD_FACTOR));
      break;
    case 3:
      c.interval = clampInterval(Math.max(c.interval + 1, c.interval * c.ease));
      break;
    case 4:
      c.ease = c.ease + 0.15;
      c.interval = clampInterval(Math.max(c.interval + 2, c.interval * c.ease * EASY_BONUS));
      break;
  }
  c.due = dueInDays(now, c.interval);
  return c;
}

function stepCard(c: CardState, grade: Grade, now: number, steps: number[], relearning: boolean): CardState {
  const graduate = (days: number) => {
    c.status = 'review';
    c.step = 0;
    c.interval = relearning ? Math.max(1, c.interval) : days;
    c.due = dueInDays(now, c.interval);
    return c;
  };

  switch (grade) {
    case 1:
      c.status = relearning ? 'relearning' : 'learning';
      c.step = 0;
      c.due = now + steps[0];
      return c;
    case 2: {
      c.status = relearning ? 'relearning' : 'learning';
      const cur = steps[c.step] ?? steps[steps.length - 1];
      const next = steps[c.step + 1] ?? cur * 1.5;
      c.due = now + Math.round((cur + next) / 2);
      return c;
    }
    case 3:
      if (c.step + 1 >= steps.length) return graduate(GRADUATING_INTERVAL);
      c.status = relearning ? 'relearning' : 'learning';
      c.step += 1;
      c.due = now + steps[c.step];
      return c;
    case 4:
      if (relearning) c.interval = Math.max(c.interval, 1) + 1;
      return graduate(EASY_INTERVAL);
  }
}

/** Libellé court de l'échéance, pour afficher sous chaque bouton de réponse. */
export function formatDelay(due: number, now: number): string {
  const ms = Math.max(0, due - now);
  if (ms < 60 * MINUTE) return `${Math.max(1, Math.round(ms / MINUTE))} min`;
  if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))} h`;
  const days = Math.round(ms / DAY);
  if (days < 31) return `${days} j`;
  if (days < 365) return `${Math.round(days / 30)} mois`;
  return `${(days / 365).toFixed(1)} an`;
}
