// Controlli di forma sulla libreria predefinita (js/lib/library-base/*.js).
// LIB_FILE=rx node --test tests/unit/library-base.test.mjs controlla un solo file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const FILES = { rx: 'RX', eco: 'Ecografia', tc: 'TC', rm: 'RMN' };
const only = process.env.LIB_FILE;
const root = new URL('../../js/lib/library-base/', import.meta.url);
const modules = [];
for (const [file, metodica] of Object.entries(FILES)) {
  if (only && only !== file) continue;
  if (!existsSync(new URL(file + '.js', root))) continue;
  modules.push({ file, metodica, mod: await import(new URL(file + '.js', root)) });
}

const FIELD = /\[[^\][\n]+\]/g;

test('moduli della libreria: esami, indicazioni e referti coerenti', () => {
  assert.ok(modules.length, 'nessun file della libreria trovato');
  for (const { file, metodica, mod } of modules) {
    assert.equal(mod.METODICA, metodica, file + ': METODICA');
    assert.ok(Array.isArray(mod.ESAMI) && mod.ESAMI.length, file + ': ESAMI vuoto');
    assert.equal(new Set(mod.ESAMI).size, mod.ESAMI.length, file + ': esami duplicati');
    for (const esame of mod.ESAMI) {
      assert.ok(Array.isArray(mod.INDICAZIONI[esame]) && mod.INDICAZIONI[esame].length, esame + ': indicazioni mancanti');
      assert.equal(new Set(mod.INDICAZIONI[esame]).size, mod.INDICAZIONI[esame].length, esame + ': indicazioni duplicate');
      assert.ok(mod.REFERTI[esame] && Object.keys(mod.REFERTI[esame]).length, esame + ': referto mancante');
    }
    assert.deepEqual(Object.keys(mod.REFERTI).sort(), [...mod.ESAMI].sort(), file + ': REFERTI e ESAMI non coincidono');
  }
});

test('frasi: ID unici, etichette brevi, campi ben formati, regole dei gruppi', () => {
  const ids = new Set();
  for (const { mod } of modules) {
    for (const [esame, groups] of Object.entries(mod.REFERTI)) {
      const names = Object.keys(groups);
      if (names.includes('Tecnica')) assert.equal(names[0], 'Tecnica', esame + ': "Tecnica" deve essere il primo gruppo');
      assert.equal(names[names.length - 1], 'Conclusioni', esame + ': "Conclusioni" deve essere l\'ultimo gruppo');
      for (const [group, phrases] of Object.entries(groups)) {
        assert.ok(Array.isArray(phrases) && phrases.length, esame + ' / ' + group + ': gruppo vuoto');
        const labels = new Set();
        for (const p of phrases) {
          const where = esame + ' / ' + group + ' / ' + p.label;
          assert.match(p.id, /^[a-z0-9-]+:[a-z0-9.-]+$/, where + ': ID non valido ' + p.id);
          assert.ok(!ids.has(p.id), where + ': ID duplicato ' + p.id);
          ids.add(p.id);
          assert.ok(p.label && p.label.length <= 28, where + ': etichetta vuota o più lunga di 28 caratteri');
          assert.ok(!labels.has(p.label), where + ': etichetta ripetuta nel gruppo');
          labels.add(p.label);
          assert.equal(typeof p.neg, 'boolean', where + ': neg mancante');
          assert.ok(/[.:]$/.test(p.text.trim()), where + ': il testo deve finire con un punto');
          assert.equal((p.text.match(/\[/g) || []).length, (p.text.match(/\]/g) || []).length, where + ': parentesi quadre non bilanciate');
          assert.equal(p.text.replace(FIELD, '').includes('['), false, where + ': campo malformato');
          assert.ok(!/\b(paziente|nato|nata|anni)\b/i.test(p.text), where + ': niente dati del paziente nei testi');
        }
        const allOptional = phrases.every((p) => p.opz);
        if (!allOptional) {
          const firstNormal = phrases.find((p) => !p.opz);
          assert.equal(firstNormal.neg, false, esame + ' / ' + group + ': la prima frase non opzionale deve essere quella normale');
        }
      }
    }
  }
});

test('frasi: nessun testo ripetuto o contenuto in un altro nello stesso esame', () => {
  for (const { mod } of modules) {
    for (const [esame, groups] of Object.entries(mod.REFERTI)) {
      const texts = Object.values(groups).flat().map((p) => p.text);
      texts.forEach((t, i) => texts.forEach((u, j) => {
        if (i !== j) assert.ok(!u.includes(t), esame + ': "' + t + '" compare anche in "' + u + '"');
      }));
    }
  }
});
