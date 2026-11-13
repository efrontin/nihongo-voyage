// Tests de l'import des phrases de fin de scène : `npm run test:import`
import assert from 'node:assert/strict';
import { buildAppPrompt, SCENARIOS } from './claude.prompts';
import { parseCardsFromText } from './import';

let pass = 0;
function test(name: string, fn: () => void) {
  fn();
  pass++;
  console.log('✓', name);
}

test('lignes simples à 4 champs', () => {
  const r = parseCardsFromText('袋はいりません | ふくろはいりません | fukuro wa irimasen | Je n\'ai pas besoin de sac');
  assert.deepEqual(r, [{ jp: '袋はいりません', kana: 'ふくろはいりません', romaji: 'fukuro wa irimasen', fr: 'Je n\'ai pas besoin de sac' }]);
});

test('tableau Markdown avec en-tête, séparateur et gras', () => {
  const md = `| Japonais | Kana | Romaji | Français |
|---|---|---|---|
| **温めますか** | あたためますか | atatamemasu ka | Je vous le réchauffe ? |
| お箸はご利用ですか | おはしはごりようですか | ohashi wa goriyō desu ka | Voulez-vous des baguettes ? |`;
  const r = parseCardsFromText(md);
  assert.equal(r.length, 2);
  assert.equal(r[0].jp, '温めますか');
  assert.equal(r[1].fr, 'Voulez-vous des baguettes ?');
});

test('3 champs : la lecture kana reprend le japonais', () => {
  const r = parseCardsFromText('- ありがとう | arigatō | Merci');
  assert.deepEqual(r, [{ jp: 'ありがとう', kana: 'ありがとう', romaji: 'arigatō', fr: 'Merci' }]);
});

test('tabulations, numéros, texte libre ignoré, doublons retirés', () => {
  const txt = `Voici ta liste :
1. 駅はどこですか\tえきはどこですか\teki wa doko desu ka\tOù est la gare ?
2. 駅はどこですか | えきはどこですか | eki wa doko desu ka | Où est la gare ?
Bonne révision !`;
  const r = parseCardsFromText(txt);
  assert.equal(r.length, 1);
  assert.equal(r[0].romaji, 'eki wa doko desu ka');
});

test('le prompt de scène tient dans la limite du lien (~14 000 caractères) et demande le format importable', () => {
  for (const s of SCENARIOS) {
    const p = buildAppPrompt(s);
    assert.ok(encodeURIComponent(p).length < 14000, `${s.id} trop long`);
    assert.ok(p.includes('日本語 | かな | romaji | français'));
  }
});

test('l\'exemple de format donné dans le prompt est lui-même importable', () => {
  const p = buildAppPrompt(SCENARIOS[0]);
  const example = p.split('\n').find((l) => l.startsWith('袋'))!;
  assert.equal(parseCardsFromText(example).length, 1);
});

test('la ligne de format recopiée par Claude n\'est pas importée', () => {
  const r = parseCardsFromText('日本語 | かな | romaji | français\n乾杯 | かんぱい | kanpai | Santé !');
  assert.deepEqual(r.map((c) => c.jp), ['乾杯']);
});

test('séparateur pleine chasse ｜ accepté', () => {
  assert.equal(parseCardsFromText('乾杯｜かんぱい｜kanpai｜Santé !')[0]?.fr, 'Santé !');
});

test('ligne sans traduction ignorée plutôt que décalée', () => {
  assert.equal(parseCardsFromText('乾杯 | かんぱい | kanpai').length, 0);
});

console.log(`\n${pass} tests OK`);
