import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cards, endings, owners, achievements } from './fixtures/fixture.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const realChars = JSON.parse(readFileSync(join(root, 'web/data/characters.json'), 'utf8'));
const realCos = JSON.parse(readFileSync(join(root, 'web/data/cosmetics.json'), 'utf8'));

function makeDir(mutate = (d) => d) {
  const dir = mkdtempSync(join(tmpdir(), 'nr-val-'));
  mkdirSync(join(dir, 'cards'));
  const d = mutate({
    cards: JSON.parse(JSON.stringify(cards)),
    endings: JSON.parse(JSON.stringify(endings)),
    owners, achievements: { achievements: achievements.achievements.map((a) => ({ ...a, unlocks: { flag: 'x' } })) },
  });
  writeFileSync(join(dir, 'cards/index.json'), JSON.stringify({ files: ['a.json'] }));
  writeFileSync(join(dir, 'cards/a.json'), JSON.stringify({ cards: d.cards }));
  writeFileSync(join(dir, 'endings.json'), JSON.stringify(d.endings));
  writeFileSync(join(dir, 'owners.json'), JSON.stringify(d.owners));
  writeFileSync(join(dir, 'achievements.json'), JSON.stringify(d.achievements));
  writeFileSync(join(dir, 'characters.json'), JSON.stringify(realChars));
  writeFileSync(join(dir, 'cosmetics.json'), JSON.stringify(realCos));
  return dir;
}
const run = (dir) => spawnSync(process.execPath, [join(root, 'tools/validate.js'), dir], { encoding: 'utf8' });

test('validator passes good fixture data', () => {
  const r = run(makeDir());
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /Bags:/);
});

test('validator catches errors', () => {
  const r = run(makeDir((d) => {
    d.cards.push({ ...d.cards[0] }); // duplicate id
    d.cards.push({ id: 'bad', char: 'nobody', text: 'x', left: { label: 'This label is far too long to fit', fx: { joyy: 5 }, next: 'missing', end: 'nope' } });
    d.cards.push({ id: 'badcond', char: 'owner', text: 'x', when: [{ slot: 'brunch' }, { bogus: 1 }], left: { label: 'ok' } });
    return d;
  }));
  assert.equal(r.status, 1);
  for (const s of ['duplicate card id', 'unknown char', 'max 24', 'unknown fx key', 'unknown card "missing"', 'unknown ending "nope"', 'unknown slot', 'unknown condition key']) {
    assert.ok(r.stdout.includes(s), `expected "${s}" in output:\n${r.stdout}`);
  }
});
