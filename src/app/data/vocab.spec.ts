// Tests d'intégrité du vocabulaire : `npm run test:vocab`
import assert from 'node:assert/strict';
import { BUILTIN_VOCAB, THEMES } from './vocab';
import { hasProd } from '../core/cards';

let pass = 0;
function test(name: string, fn: () => void) {
  fn();
  pass++;
  console.log('✓', name);
}

const KANJI = /[一-鿿々]/;

test('identifiants uniques', () => {
  assert.equal(new Set(BUILTIN_VOCAB.map((e) => e.id)).size, BUILTIN_VOCAB.length);
});

test('les identifiants historiques ne bougent pas (la progression enregistrée en dépend)', () => {
  const byId = new Map(BUILTIN_VOCAB.map((e) => [e.id, e.jp]));
  assert.equal(byId.get('politesse-0'), 'すみません');
  assert.equal(byId.get('konbini-1'), '袋はいりますか');
  assert.equal(byId.get('panneaux-25'), '子供');
  assert.equal(BUILTIN_VOCAB.filter((e) => e.theme !== 'entendre' && e.theme !== 'questions').length, 214);
});

test('chaque thème utilisé est déclaré', () => {
  const ids = new Set<string>(THEMES.map((t) => t.id));
  for (const e of BUILTIN_VOCAB) assert.ok(ids.has(e.theme), e.theme);
});

test('aucun champ vide, lecture kana sans kanji ni chiffre', () => {
  for (const e of BUILTIN_VOCAB) {
    assert.ok(e.jp && e.kana && e.romaji && e.fr, e.id);
    assert.ok(!KANJI.test(e.kana), `kanji dans la lecture de ${e.id} : ${e.kana}`);
    if (e.theme === 'entendre' || e.theme === 'questions') assert.ok(!/[0-9]/.test(e.kana), e.id);
  }
});

test('pas de doublon de japonais', () => {
  const seen = new Map<string, string>();
  for (const e of BUILTIN_VOCAB) {
    assert.ok(!seen.has(e.jp), `${e.jp} : ${seen.get(e.jp)} et ${e.id}`);
    seen.set(e.jp, e.id);
  }
});

test('le thème « entendre » est entièrement en écoute seule, sans carte « dire »', () => {
  const rows = BUILTIN_VOCAB.filter((e) => e.theme === 'entendre');
  assert.ok(rows.length >= 30);
  for (const e of rows) {
    assert.equal(e.heard, true, e.id);
    assert.equal(hasProd(e), false, e.id);
    assert.ok(!e.jp.includes('〜'), `gabarit illisible à voix haute : ${e.id}`);
  }
});

test('le thème « questions » mêle questions entendues et réponses à dire', () => {
  const rows = BUILTIN_VOCAB.filter((e) => e.theme === 'questions');
  assert.ok(rows.some((e) => e.heard) && rows.some((e) => hasProd(e)));
});

test('les kanji de panneaux et les phrases entendues n\'ont pas de sens « dire »', () => {
  for (const e of BUILTIN_VOCAB) assert.equal(hasProd(e), e.type !== 'kanji' && !e.heard, e.id);
});

console.log(`\n${pass} tests réussis`);
