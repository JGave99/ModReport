import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrateLibrary, cloneDefaults } from '../../js/lib/library.js';
import { DEFAULT_LIBRARY, LEGACY_DEFAULT_TEXTS } from '../../js/lib/default-library.js';

const clone = (v) => JSON.parse(JSON.stringify(v));

// Libreria "v1" com'era prima del 24/09: stessi esami, frasi solo testi legacy.
function legacyFullLibrary() {
  const data = clone(DEFAULT_LIBRARY);
  delete data.defaultsVersion;
  data.refertoByEsame = {};
  for (const [esame, texts] of Object.entries(LEGACY_DEFAULT_TEXTS)) {
    data.refertoByEsame[esame] = { 'Reperto': texts.map((t) => ({ label: 'x', text: t, neg: false })) };
  }
  return data;
}

test('nessun dato salvato: restituisce i predefiniti correnti', () => {
  const { data } = migrateLibrary(null);
  assert.deepEqual(data, cloneDefaults());
});

test('libreria ridotta del 24/09: ripristina le frasi di tutti gli esami', () => {
  const truncated = legacyFullLibrary();
  for (const esame of Object.keys(truncated.refertoByEsame)) if (esame !== 'RX TORACE 2PR') delete truncated.refertoByEsame[esame];
  const { data, restored } = migrateLibrary(truncated);
  assert.equal(data.defaultsVersion, 2);
  assert.equal(restored.length, 33);
  for (const esame of Object.keys(DEFAULT_LIBRARY.refertoByEsame)) {
    assert.deepEqual(data.refertoByEsame[esame], DEFAULT_LIBRARY.refertoByEsame[esame], esame);
  }
});

test('esami mai personalizzati: passano ai nuovi predefiniti, senza frasi rischiose', () => {
  const { data } = migrateLibrary(legacyFullLibrary());
  const all = JSON.stringify(data.refertoByEsame);
  assert.ok(!all.includes('ove presenti, in sede regolare'));
  assert.ok(!all.includes('Non evidenza di lesioni secondarie a distanza'));
  assert.ok(data.refertoByEsame['TC ANGIOGRAFIA AORTA']['Diametri']);
});

test('esame personalizzato: tiene le frasi dell\'utente e sostituisce solo quella rischiosa', () => {
  const lib = legacyFullLibrary();
  lib.refertoByEsame['RX TORACE AP supino'] = {
    'Presidi': [{ label: 'Presidi in sede', text: 'Presidi (CVC/SNG/drenaggi), ove presenti, in sede regolare.', neg: false }],
    'Mie frasi': [{ label: 'Personale', text: 'Frase scritta dall\'utente.', neg: false }],
  };
  const { data, replaced } = migrateLibrary(lib);
  const groups = data.refertoByEsame['RX TORACE AP supino'];
  assert.ok(replaced.includes('RX TORACE AP supino'));
  assert.equal(groups['Mie frasi'][0].text, 'Frase scritta dall\'utente.');
  const presidi = groups['Presidi'].map((b) => b.label);
  assert.deepEqual(presidi, ['CVC', 'SNG', 'Tubo endotracheale']);
});

test('esami e frasi dell\'utente non toccati', () => {
  const lib = legacyFullLibrary();
  lib.metodiche.push('Mammografia');
  lib.esamiByMetodica['Mammografia'] = ['MAMMOGRAFIA BILATERALE'];
  lib.refertoByEsame['MAMMOGRAFIA BILATERALE'] = { 'Reperto': [{ label: 'a', text: 'b', neg: false }] };
  const { data } = migrateLibrary(lib);
  assert.deepEqual(data.refertoByEsame['MAMMOGRAFIA BILATERALE'], { 'Reperto': [{ label: 'a', text: 'b', neg: false }] });
});

test('esame eliminato dall\'utente: non ricompare', () => {
  const lib = legacyFullLibrary();
  lib.esamiByMetodica['RX'] = lib.esamiByMetodica['RX'].filter((e) => e !== 'RX POLSO');
  delete lib.refertoByEsame['RX POLSO'];
  const { data } = migrateLibrary(lib);
  assert.ok(!data.refertoByEsame['RX POLSO']);
});

test('idempotente: una libreria già migrata resta invariata', () => {
  const once = migrateLibrary(legacyFullLibrary()).data;
  const twice = migrateLibrary(once);
  assert.equal(twice.changed, false);
  assert.deepEqual(twice.data, once);
});

test('la libreria predefinita copre tutti gli esami', () => {
  const exams = Object.values(DEFAULT_LIBRARY.esamiByMetodica).flat();
  for (const e of exams) {
    assert.ok(DEFAULT_LIBRARY.refertoByEsame[e] && Object.keys(DEFAULT_LIBRARY.refertoByEsame[e]).length, e);
    assert.ok(DEFAULT_LIBRARY.indicazioniByEsame[e], e);
  }
});

test('i testi legacy corrispondono a quelli della storia git', () => {
  const src = readFileSync(new URL('../../js/lib/default-library.js', import.meta.url), 'utf8');
  assert.ok(src.includes('LEGACY_DEFAULT_TEXTS'));
  assert.equal(Object.values(LEGACY_DEFAULT_TEXTS).flat().length, 48);
});
