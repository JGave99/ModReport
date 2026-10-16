import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateLibrary, cloneDefaults } from '../../js/lib/library.js';
import { DEFAULT_LIBRARY, DEFAULTS_VERSION } from '../../js/lib/default-library.js';
import { V1_TEXTS, V2_TEXTS } from '../../js/lib/library-base/legacy.js';
import { phraseHash } from '../../js/lib/library-merge.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const allPhrases = (data) => Object.values(data.refertoByEsame).flatMap((g) => Object.values(g).flat());

// Libreria "v2" com'era fino allo Step 5: stessi esami e testi di allora, frasi senza id.
function v2Library() {
  const data = { defaultsVersion: 2, metodiche: ['Ecografia', 'RX', 'TC', 'RMN'], esamiByMetodica: {}, indicazioniByEsame: {}, refertoByEsame: {} };
  for (const [m, exams] of Object.entries(DEFAULT_LIBRARY.esamiByMetodica)) {
    data.esamiByMetodica[m] = exams.filter((e) => V2_TEXTS[e]);
  }
  for (const [esame, texts] of Object.entries(V2_TEXTS)) {
    data.indicazioniByEsame[esame] = [...(DEFAULT_LIBRARY.indicazioniByEsame[esame] || [])].slice(0, 2);
    data.refertoByEsame[esame] = { Reperto: texts.map((t) => ({ label: 'x', text: t, neg: false })) };
  }
  return data;
}

test('nessun dato salvato: predefiniti correnti con impronte e abbreviazioni', () => {
  const { data } = migrateLibrary(null);
  assert.deepEqual(data, cloneDefaults());
  assert.equal(data.defaultsVersion, DEFAULTS_VERSION);
  assert.ok(allPhrases(data).every((p) => p.id && p.bh === phraseHash(p)));
  assert.ok(data.abbreviazioni['/nn']);
});

test('libreria v2 mai personalizzata: tutti gli esami passano alla v3, nuovi esami aggiunti', () => {
  const { data, changed, report } = migrateLibrary(v2Library());
  assert.equal(changed, true);
  assert.equal(data.defaultsVersion, DEFAULTS_VERSION);
  assert.equal(report.esamiAggiornati.length, Object.keys(V2_TEXTS).length);
  for (const esame of Object.keys(V2_TEXTS)) {
    assert.deepEqual(Object.keys(data.refertoByEsame[esame]), Object.keys(DEFAULT_LIBRARY.refertoByEsame[esame]), esame);
  }
  for (const nuovo of ['TC ENCEFALO', 'RMN PROSTATA MULTIPARAMETRICA', 'ECOCOLORDOPPLER TSA']) {
    assert.ok(Object.values(data.esamiByMetodica).flat().includes(nuovo), nuovo);
  }
});

test('libreria v1 (prima del 24/09): stessi risultati, frasi rischiose tolte', () => {
  const lib = v2Library();
  delete lib.defaultsVersion;
  for (const [esame, texts] of Object.entries(V1_TEXTS)) lib.refertoByEsame[esame] = { Reperto: texts.map((t) => ({ label: 'x', text: t, neg: false })) };
  const { data } = migrateLibrary(lib);
  const all = JSON.stringify(data.refertoByEsame);
  assert.ok(!all.includes('ove presenti, in sede regolare'));
  assert.ok(!all.includes('Non evidenza di lesioni secondarie a distanza'));
});

test('esame personalizzato: frasi dell\'utente intatte, nuove frasi della base aggiunte', () => {
  const lib = v2Library();
  lib.refertoByEsame['RX TORACE 2PR'].Reperto.push({ label: 'Mia', text: 'Frase scritta dall\'utente.', neg: true });
  const { data } = migrateLibrary(lib);
  const groups = data.refertoByEsame['RX TORACE 2PR'];
  const mine = Object.values(groups).flat().find((p) => p.text === 'Frase scritta dall\'utente.');
  assert.ok(mine && mine.id.startsWith('u:'));
  const baseIds = new Set(Object.values(DEFAULT_LIBRARY.refertoByEsame['RX TORACE 2PR']).flat().map((p) => p.id));
  const present = new Set(Object.values(groups).flat().map((p) => p.id));
  assert.ok([...baseIds].every((id) => present.has(id)), 'tutte le frasi della base presenti');
});

test('esami, metodiche e indicazioni dell\'utente non toccati; eliminati non ricompaiono', () => {
  const lib = v2Library();
  lib.metodiche.push('Mammografia');
  lib.esamiByMetodica.Mammografia = ['MAMMOGRAFIA BILATERALE'];
  lib.refertoByEsame['MAMMOGRAFIA BILATERALE'] = { Reperto: [{ label: 'a', text: 'b.', neg: false }] };
  lib.esamiByMetodica.RX = lib.esamiByMetodica.RX.filter((e) => e !== 'RX POLSO');
  delete lib.refertoByEsame['RX POLSO'];
  lib.metodiche = lib.metodiche.filter((m) => m !== 'RMN');
  delete lib.esamiByMetodica.RMN;
  const { data } = migrateLibrary(lib);
  assert.equal(data.refertoByEsame['MAMMOGRAFIA BILATERALE'].Reperto[0].text, 'b.');
  assert.ok(!data.esamiByMetodica.RX.includes('RX POLSO'));
  assert.ok(!data.metodiche.includes('RMN'));
});

test('idempotente: una libreria già migrata resta invariata', () => {
  const once = migrateLibrary(v2Library()).data;
  const twice = migrateLibrary(clone(once));
  assert.equal(twice.changed, false);
  assert.deepEqual(twice.data, once);
});

test('libreria v3 → v4: tolti Tecnica e Conclusioni non modificati, restano quelli dell\'utente e la scelta del referto negativo', () => {
  const lib = clone(cloneDefaults());
  lib.defaultsVersion = 3;
  const base = (id, text) => { const p = { id, label: 'x', text, neg: false }; return { ...p, bh: phraseHash(p) }; };
  const groups = lib.refertoByEsame['RX TORACE 2PR'];
  lib.refertoByEsame['RX TORACE 2PR'] = {
    Tecnica: [base('rx-torace-2p:tecnica.limiti', 'Esame eseguito in condizioni subottimali.')],
    ...groups,
    Conclusioni: [
      base('rx-torace-2p:concl.norma', 'Quadro radiografico del torace nei limiti della norma.'),
      { ...base('rx-torace-2p:concl.edema', 'Quadro di edema.'), text: 'Quadro di edema polmonare, modificato da me.' },
    ],
  };
  lib.negativoByEsame = { 'RX TORACE 2PR': ['rx-torace-2p:versamento.norma'], rotto: 'x' };
  const { data, changed } = migrateLibrary(lib);
  assert.equal(changed, true);
  assert.equal(data.defaultsVersion, DEFAULTS_VERSION);
  const after = data.refertoByEsame['RX TORACE 2PR'];
  assert.ok(!after.Tecnica, 'Tecnica non modificata: tolta');
  assert.deepEqual(after.Conclusioni.map((p) => p.text), ['Quadro di edema polmonare, modificato da me.']);
  assert.deepEqual(data.negativoByEsame, { 'RX TORACE 2PR': ['rx-torace-2p:versamento.norma'] });
});
