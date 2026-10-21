// Controlli di forma sulla libreria predefinita (js/lib/library-base/preset.js, generata dalla libreria
// dell'account di riferimento). Lo stile dei testi è scelta del radiologo: qui si controlla ciò che serve all'app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESET } from '../../js/lib/library-base/preset.js';
import { DEFAULT_LIBRARY, DEFAULT_NEGATIVO } from '../../js/lib/default-library.js';

const FIELD = /\[[^\][\n]+\]/g;
const exams = Object.values(PRESET.esamiByMetodica).flat();

test('esami, metodiche e indicazioni coerenti', () => {
  assert.ok(PRESET.metodiche.length && exams.length);
  assert.equal(new Set(exams).size, exams.length, 'esami ripetuti');
  for (const m of PRESET.metodiche) assert.ok(Array.isArray(PRESET.esamiByMetodica[m]), m);
  assert.deepEqual(Object.keys(PRESET.refertoByEsame).sort(), [...exams].sort(), 'referti e esami non coincidono');
  for (const esame of exams) {
    const ind = PRESET.indicazioniByEsame[esame];
    assert.ok(Array.isArray(ind), esame + ': indicazioni');
    assert.equal(new Set(ind).size, ind.length, esame + ': indicazioni ripetute');
    assert.ok(Object.keys(PRESET.refertoByEsame[esame]).length, esame + ': nessun gruppo');
  }
  assert.equal(DEFAULT_LIBRARY.refertoByEsame, PRESET.refertoByEsame);
});

test('frasi: ID unici e stabili, testi e campi ben formati', () => {
  const ids = new Set();
  for (const [esame, groups] of Object.entries(PRESET.refertoByEsame)) {
    for (const [group, phrases] of Object.entries(groups)) {
      assert.ok(phrases.length, esame + ' / ' + group + ': gruppo vuoto');
      for (const p of phrases) {
        const where = esame + ' / ' + group + ' / ' + p.label;
        assert.match(p.id, /^[a-z0-9-]+:[a-z0-9.-]+$/, where + ': ID non valido');
        assert.ok(!ids.has(p.id), where + ': ID duplicato ' + p.id);
        ids.add(p.id);
        assert.ok(p.label.trim() && p.text.trim(), where + ': etichetta o testo vuoti');
        assert.equal(typeof p.neg, 'boolean', where);
        assert.ok(!('bh' in p), where + ': impronta personale nella base');
        assert.equal((p.text.match(/\[/g) || []).length, (p.text.match(/\]/g) || []).length, where + ': parentesi quadre non bilanciate');
        assert.equal(p.text.replace(FIELD, '').includes('['), false, where + ': campo malformato');
      }
    }
  }
});

test('referto negativo proposto: solo frasi esistenti dello stesso esame', () => {
  for (const [esame, list] of Object.entries(DEFAULT_NEGATIVO)) {
    const ids = new Set(Object.values(PRESET.refertoByEsame[esame] || {}).flat().map((p) => p.id));
    assert.ok(list.length && list.every((id) => ids.has(id)), esame);
  }
});
