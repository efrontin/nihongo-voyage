// Tests des lectures de nombres : `npm run test:numbers`
import assert from 'node:assert/strict';
import { NumberKind, checkAnswer, randomItem, readNumber, readPlatform, readTime, readYen } from './numbers';

let pass = 0;
function test(name: string, fn: () => void) {
  fn();
  pass++;
  console.log('✓', name);
}

test('nombres : lectures régulières', () => {
  assert.equal(readNumber(1), 'いち');
  assert.equal(readNumber(10), 'じゅう');
  assert.equal(readNumber(11), 'じゅういち');
  assert.equal(readNumber(47), 'よんじゅうなな');
  assert.equal(readNumber(100), 'ひゃく');
  assert.equal(readNumber(1000), 'せん');
  assert.equal(readNumber(1480), 'せんよんひゃくはちじゅう');
  assert.equal(readNumber(10_000), 'いちまん');
  assert.equal(readNumber(24_800), 'にまんよんせんはっぴゃく');
  assert.equal(readNumber(11_111), 'いちまんせんひゃくじゅういち');
});

test('nombres : lectures irrégulières (300, 600, 800, 3 000, 8 000)', () => {
  assert.equal(readNumber(300), 'さんびゃく');
  assert.equal(readNumber(600), 'ろっぴゃく');
  assert.equal(readNumber(800), 'はっぴゃく');
  assert.equal(readNumber(3000), 'さんぜん');
  assert.equal(readNumber(8000), 'はっせん');
  assert.equal(readNumber(3680), 'さんぜんろっぴゃくはちじゅう');
});

test('prix : 4 円 se lit よえん', () => {
  assert.equal(readYen(4), 'よえん');
  assert.equal(readYen(14), 'じゅうよえん');
  assert.equal(readYen(104), 'ひゃくよえん');
  assert.equal(readYen(40), 'よんじゅうえん');
  assert.equal(readYen(648), 'ろっぴゃくよんじゅうはちえん');
  assert.equal(readYen(9), 'きゅうえん');
});

test('heures : よじ, しちじ, くじ et format 24 h', () => {
  assert.equal(readTime(4, 0), 'よじ');
  assert.equal(readTime(7, 0), 'しちじ');
  assert.equal(readTime(9, 0), 'くじ');
  assert.equal(readTime(10, 0), 'じゅうじ');
  assert.equal(readTime(14, 0), 'じゅうよじ');
  assert.equal(readTime(17, 0), 'じゅうしちじ');
  assert.equal(readTime(19, 0), 'じゅうくじ');
  assert.equal(readTime(20, 0), 'にじゅうじ');
  assert.equal(readTime(23, 0), 'にじゅうさんじ');
  assert.equal(readTime(0, 0), 'れいじ');
});

test('minutes : ふん / ぷん', () => {
  assert.equal(readTime(9, 5), 'くじごふん');
  assert.equal(readTime(7, 10), 'しちじじゅっぷん');
  assert.equal(readTime(8, 1), 'はちじいっぷん');
  assert.equal(readTime(8, 3), 'はちじさんぷん');
  assert.equal(readTime(8, 4), 'はちじよんぷん');
  assert.equal(readTime(8, 6), 'はちじろっぷん');
  assert.equal(readTime(8, 8), 'はちじはっぷん');
  assert.equal(readTime(8, 30), 'はちじさんじゅっぷん');
  assert.equal(readTime(14, 36), 'じゅうよじさんじゅうろっぷん');
  assert.equal(readTime(12, 47), 'じゅうにじよんじゅうななふん');
  assert.equal(readTime(6, 19), 'ろくじじゅうきゅうふん');
});

test('quais', () => {
  assert.equal(readPlatform(4), 'よんばんせん');
  assert.equal(readPlatform(7), 'ななばんせん');
  assert.equal(readPlatform(21), 'にじゅういちばんせん');
});

test('réponse tapée : seuls les chiffres comptent', () => {
  const time = { kind: 'heure' as const, value: 905, kana: '', label: '9:05' };
  for (const ok of ['9:05', '905', '0905', '9h05', '９：０５', ' 9 05 ']) assert.ok(checkAnswer(time, ok), ok);
  for (const ko of ['', '95', '9:50', 'abc']) assert.ok(!checkAnswer(time, ko), ko);
  const price = { kind: 'prix' as const, value: 1480, kana: '', label: '' };
  assert.ok(checkAnswer(price, '1 480') && checkAnswer(price, '1480円') && !checkAnswer(price, '1840'));
});

test('tirages : valeurs dans les bornes, corrigé cohérent, que des kana', () => {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (const kind of ['prix', 'heure', 'quai'] as NumberKind[]) {
    const values = new Set<number>();
    for (let i = 0; i < 3000; i++) {
      const it = randomItem(kind, rnd);
      values.add(it.value);
      assert.match(it.kana, /^[ぁ-んー]+$/, it.kana);
      assert.ok(checkAnswer(it, it.label), `${it.label} ≠ ${it.value}`);
      if (kind === 'prix') assert.ok(it.value >= 100 && it.value <= 59_800);
      if (kind === 'heure') assert.ok(it.value >= 500 && it.value <= 2359 && it.value % 100 < 60);
      if (kind === 'quai') assert.ok(it.value >= 1 && it.value <= 23);
    }
    assert.ok(values.size >= 23, `${kind} : tirages trop peu variés`);
  }
});

console.log(`\n${pass} tests OK`);
