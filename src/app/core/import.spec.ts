// Tests de l'import des phrases de fin de scène : `npm run test:import`
import assert from 'node:assert/strict';
import { apiSystemPrompt, buildAppPrompt, pickTwist, SCENARIOS } from './claude.prompts';
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

test('imprévu : aucun au niveau A1, un par scène ensuite, et il figure dans les deux prompts', () => {
  for (const s of SCENARIOS) {
    assert.ok(s.twists.length >= 2, s.id);
    assert.equal(pickTwist(s, 'A1'), null);
    s.twists.forEach((expected, i) => {
      const twist = pickTwist(s, 'A2', () => i / s.twists.length);
      assert.equal(twist, expected);
      assert.ok(buildAppPrompt(s, 'A2', twist).includes(expected));
      assert.ok(apiSystemPrompt(s, 'B1', twist).includes(expected));
      assert.ok(buildAppPrompt(s, 'A2', twist).length < 14_000);
    });
    assert.ok(!buildAppPrompt(s, 'A1', null).includes('Imprévu'));
  }
});

test('le bilan demandé en fin de scène ne pollue pas l\'import des phrases', () => {
  const reply = `Objectif atteint : tu as payé et refusé le sac.
Bien dit : 袋はいりません.
À retravailler : カードで払えますか (tu as dit カードを払えますか).

袋はいりません | ふくろはいりません | fukuro wa irimasen | Je n'ai pas besoin de sac
カードで払えますか | カードではらえますか | kādo de haraemasu ka | Puis-je payer par carte ?`;
  assert.equal(parseCardsFromText(reply).length, 2);
  for (const p of [buildAppPrompt(SCENARIOS[0]), apiSystemPrompt(SCENARIOS[0])]) assert.ok(p.includes('bilan'));
});

console.log(`\n${pass} tests OK`);
