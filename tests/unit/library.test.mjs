import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateLibrary, cloneDefaults } from '../../js/lib/library.js';
import { DEFAULT_LIBRARY, DEFAULTS_VERSION } from '../../js/lib/default-library.js';
import { V1_TEXTS, V2_TEXTS } from '../../js/lib/library-base/legacy.js';
import { baseForUser, phraseHash } from '../../js/lib/library-merge.js';
import { V4_LIBRARY } from '../fixtures/library-v4/index.mjs';

const clone = (v) => JSON.parse(JSON.stringify(v));
const allPhrases = (data) => Object.values(data.refertoByEsame).flatMap((g) => Object.values(g).flat());
const baseExams = Object.values(DEFAULT_LIBRARY.esamiByMetodica).flat();
const userExams = (data) => Object.values(data.esamiByMetodica).flat();
// Struttura confrontabile: gruppi e frasi (senza impronte) di ogni esame, indicazioni, esami per metodica.
const shape = (d) => JSON.stringify({
  metodiche: d.metodiche,
  esami: d.metodiche.map((m) => d.esamiByMetodica[m]),
  ind: userExams(d).map((e) => d.indicazioniByEsame[e]),
  referti: userExams(d).map((e) => Object.entries(d.refertoByEsame[e]).map(([g, l]) => [g, l.map((p) => [p.id, p.label, p.text, p.neg, !!p.opz])])),
});

// Libreria "v2" com'era fino allo Step 5: esami e testi di allora, frasi senza id.
function v2Library() {
  const data = { defaultsVersion: 2, metodiche: ['Ecografia', 'RX', 'TC', 'RMN'], esamiByMetodica: {}, indicazioniByEsame: {}, refertoByEsame: {} };
  for (const [m, exams] of Object.entries(V4_LIBRARY.esamiByMetodica)) data.esamiByMetodica[m] = exams.filter((e) => V2_TEXTS[e]);
  for (const [esame, texts] of Object.entries(V2_TEXTS)) {
    data.indicazioniByEsame[esame] = [...(V4_LIBRARY.indicazioniByEsame[esame] || [])].slice(0, 2);
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

test('libreria v4 mai personalizzata: diventa esattamente la libreria predefinita corrente (issue #3)', () => {
  const user = baseForUser(V4_LIBRARY);
  const { data, changed, report } = migrateLibrary(clone(user));
  assert.equal(changed, true);
  assert.equal(data.defaultsVersion, DEFAULTS_VERSION);
  assert.equal(shape(data), shape(cloneDefaults()));
  assert.ok(allPhrases(data).every((p) => p.bh === phraseHash(p)));
  assert.ok(report.esamiTolti.length > 0);
});

test('libreria dell\'account di riferimento (ricostruita): resta identica, senza doppioni', () => {
  // Com'era nell'account: frasi create da lui con id u:X, frasi della base v4 con le impronte della v4.
  const v4ById = new Map(Object.values(V4_LIBRARY.refertoByEsame).flatMap((g) => Object.values(g).flat()).map((p) => [p.id, p]));
  const lib = clone({ ...DEFAULT_LIBRARY, defaultsVersion: 4 });
  for (const groups of Object.values(lib.refertoByEsame)) {
    for (const list of Object.values(groups)) {
      list.forEach((p) => {
        if (p.id.includes(':ig.')) p.id = 'u:' + p.id.split(':ig.')[1];
        else if (v4ById.has(p.id)) p.bh = phraseHash(v4ById.get(p.id));
      });
    }
  }
  const { data } = migrateLibrary(lib);
  assert.equal(shape(data), shape(cloneDefaults()));
  assert.ok(allPhrases(data).every((p) => p.bh === phraseHash(p)), 'tutte riconosciute come base');
});

test('libreria v2 mai personalizzata: esami della base aggiornati, quelli tolti spariscono, nuovi aggiunti', () => {
  const { data, changed, report } = migrateLibrary(v2Library());
  assert.equal(changed, true);
  assert.equal(data.defaultsVersion, DEFAULTS_VERSION);
  for (const esame of Object.keys(V2_TEXTS)) {
    if (baseExams.includes(esame)) {
      assert.deepEqual(Object.keys(data.refertoByEsame[esame]), Object.keys(DEFAULT_LIBRARY.refertoByEsame[esame]), esame);
      assert.ok(report.esamiAggiornati.includes(esame), esame);
    } else {
      assert.ok(!userExams(data).includes(esame) && !data.refertoByEsame[esame], esame + ' tolto dalla base');
    }
  }
  for (const nuovo of ['TC ENCEFALO', 'RMN PROSTATA MULTIPARAMETRICA', 'ORTOPEDIA GENERICO']) assert.ok(userExams(data).includes(nuovo), nuovo);
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

test('esame personalizzato: frasi dell\'utente intatte, frasi della base aggiunte', () => {
  const lib = baseForUser(V4_LIBRARY);
  const groups = lib.refertoByEsame['RX TORACE 2PR'];
  groups.Parenchima.push({ id: 'u:mia', label: 'Mia', text: 'Frase scritta dall\'utente.', neg: true });
  groups.Cuore[0].text = 'Cuore: lo scrivo io.';
  const { data } = migrateLibrary(lib);
  const after = Object.values(data.refertoByEsame['RX TORACE 2PR']).flat();
  assert.ok(after.some((p) => p.id === 'u:mia'));
  assert.ok(after.some((p) => p.text === 'Cuore: lo scrivo io.'));
  const present = new Set(after.map((p) => p.id));
  const baseIds = Object.values(DEFAULT_LIBRARY.refertoByEsame['RX TORACE 2PR']).flat().map((p) => p.id);
  assert.ok(baseIds.filter((id) => id !== groups.Cuore[0].id).every((id) => present.has(id)), 'tutte le frasi della base presenti');
});

test('esami, metodiche e indicazioni dell\'utente non toccati; eliminati non ricompaiono', () => {
  const lib = baseForUser(V4_LIBRARY);
  lib.metodiche.push('Mammografia');
  lib.esamiByMetodica.Mammografia = ['MAMMOGRAFIA BILATERALE'];
  lib.refertoByEsame['MAMMOGRAFIA BILATERALE'] = { Reperto: [{ id: 'u:m', label: 'a', text: 'b.', neg: false }] };
  lib.esamiByMetodica.RX = lib.esamiByMetodica.RX.filter((e) => e !== 'RX POLSO');
  delete lib.refertoByEsame['RX POLSO'];
  lib.removedBase.push('esame|RX POLSO');
  lib.indicazioniByEsame['RX TORACE 2PR'].push('Mia indicazione');
  const { data } = migrateLibrary(lib);
  assert.equal(data.refertoByEsame['MAMMOGRAFIA BILATERALE'].Reperto[0].text, 'b.');
  assert.ok(data.metodiche.includes('Mammografia'));
  assert.ok(!data.esamiByMetodica.RX.includes('RX POLSO'));
  assert.ok(data.indicazioniByEsame['RX TORACE 2PR'].includes('Mia indicazione'));
});

test('idempotente: una libreria già migrata resta invariata', () => {
  const once = migrateLibrary(v2Library()).data;
  const twice = migrateLibrary(clone(once));
  assert.equal(twice.changed, false);
  assert.deepEqual(twice.data, once);
});

test('aggiornamento della base: tolte le frasi non modificate, restano quelle dell\'utente e il referto negativo', () => {
  const lib = clone(cloneDefaults());
  lib.defaultsVersion = 4;
  const base = (id, text) => { const p = { id, label: 'x', text, neg: false }; return { ...p, bh: phraseHash(p) }; };
  lib.refertoByEsame['RX TORACE 2PR'].Vecchio = [
    base('rx-torace-2p:vecchia.uno', 'Frase della base precedente.'),
    { ...base('rx-torace-2p:vecchia.due', 'Altra frase.'), text: 'Altra frase, modificata da me.' },
  ];
  const keep = Object.values(lib.refertoByEsame['RX TORACE 2PR']).flat()[0].id;
  lib.negativoByEsame = { 'RX TORACE 2PR': [keep], rotto: 'x' };
  const { data, changed } = migrateLibrary(lib);
  assert.equal(changed, true);
  assert.deepEqual(data.refertoByEsame['RX TORACE 2PR'].Vecchio.map((p) => p.text), ['Altra frase, modificata da me.']);
  assert.deepEqual(data.negativoByEsame, { 'RX TORACE 2PR': [keep] });
});
