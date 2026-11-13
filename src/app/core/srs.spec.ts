// Tests du moteur de répétition espacée : `npm run test:srs`
import assert from 'node:assert/strict';
import { DAY, MINUTE, newCard, schedule } from './srs';

const now = new Date(2026, 10, 1, 10, 0).getTime();
let pass = 0;
function test(name: string, fn: () => void) {
  fn();
  pass++;
  console.log('✓', name);
}

test('nouvelle carte + Bien → étape 2 (10 min)', () => {
  const c = schedule(newCard(now), 3, now);
  assert.equal(c.status, 'learning');
  assert.equal(c.step, 1);
  assert.equal(c.due, now + 10 * MINUTE);
});

test('deux fois Bien → passe en révision à J+1', () => {
  let c = schedule(newCard(now), 3, now);
  c = schedule(c, 3, now + 10 * MINUTE);
  assert.equal(c.status, 'review');
  assert.equal(c.interval, 1);
  assert.ok(c.due > now && c.due <= now + DAY);
});

test('Facile sur une nouvelle carte → J+4', () => {
  const c = schedule(newCard(now), 4, now);
  assert.equal(c.status, 'review');
  assert.equal(c.interval, 4);
});

test('À revoir → revient dans 1 min', () => {
  const c = schedule(newCard(now), 1, now);
  assert.equal(c.due, now + MINUTE);
});

test('les intervalles grandissent : 1 → 3 → 8 → 20 j environ', () => {
  let c = schedule(newCard(now), 4, now);
  c = { ...c, interval: 1 };
  const seen: number[] = [];
  let t = now;
  for (let i = 0; i < 4; i++) {
    t = c.due;
    c = schedule(c, 3, t);
    seen.push(c.interval);
  }
  assert.ok(seen.every((v, i) => i === 0 || v > seen[i - 1]), `croissant: ${seen}`);
});

test('oubli d\'une carte en révision → réapprentissage, intervalle réduit, facilité baisse', () => {
  const review = { ...newCard(now), status: 'review' as const, interval: 30, due: now };
  const c = schedule(review, 1, now);
  assert.equal(c.status, 'relearning');
  assert.equal(c.lapses, 1);
  assert.equal(c.interval, 6);
  assert.equal(c.ease, 2.3);
  const back = schedule(c, 3, now + 10 * MINUTE);
  assert.equal(back.status, 'review');
  assert.equal(back.interval, 6);
});

test('la facilité ne descend jamais sous 1.3', () => {
  let c = { ...newCard(now), status: 'review' as const, interval: 10, ease: 1.35 };
  for (let i = 0; i < 5; i++) c = { ...schedule(c, 2, now), status: 'review' };
  assert.ok(c.ease >= 1.3);
});

console.log(`\n${pass} tests OK`);
