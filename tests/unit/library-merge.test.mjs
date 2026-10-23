import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseForUser, mergeBase, migrateFromV2, phraseHash, isBaseId, newPhraseId, tomb } from '../../js/lib/library-merge.js';

const ph = (id, label, text, neg = false) => ({ id, label, text, neg });
const BASE3 = {
  defaultsVersion: 3,
  metodiche: ['RX', 'TC'],
  esamiByMetodica: { RX: ['RX TORACE', 'RX MANO'], TC: ['TC ENCEFALO'] },
  indicazioniByEsame: { 'RX TORACE': ['Tosse', 'Dispnea'], 'RX MANO': ['Trauma'], 'TC ENCEFALO': ['Cefalea'] },
  refertoByEsame: {
    'RX TORACE': {
      Parenchima: [ph('rxt:par.norma', 'Nella norma', 'Non addensamenti.'), ph('rxt:par.add', 'Addensamento', 'Addensamento [sede].', true)],
      Pleura: [ph('rxt:pl.norma', 'Nella norma', 'Non versamento pleurico.'), ph('rxt:pl.vers', 'Versamento', 'Versamento [destro/sinistro].', true)],
      Cuore: [ph('rxt:cuore.norma', 'Nella norma', 'Cuore nella norma.')],
      Conclusioni: [ph('rxt:concl.norma', 'Nella norma', 'Quadro nella norma.')],
    },
    'RX MANO': { Ossa: [ph('rxm:ossa.norma', 'Nella norma', 'Non fratture.')], Conclusioni: [ph('rxm:concl', 'Nella norma', 'Mano nella norma.')] },
    'TC ENCEFALO': { Parenchima: [ph('tce:par', 'Nella norma', 'Parenchima nella norma.')], Conclusioni: [ph('tce:concl', 'Nella norma', 'TC nella norma.')] },
  },
};
const LEGACY = {
  V1_TEXTS: { 'RX TORACE': ['Vecchia frase v1.'] },
  V2_TEXTS: { 'RX TORACE': ['Non addensamenti.', 'Non versamento pleurico.', 'Cuore e mediastino nella norma.'] },
  DEPRECATED_TEXTS: [{ esame: 'RX TORACE', text: 'Frase rischiosa.' }],
  V2_METODICHE: ['RX', 'TC'],
};
const v2user = (groups, extra = {}) => ({
  defaultsVersion: 2,
  metodiche: ['RX'],
  esamiByMetodica: { RX: ['RX TORACE'] },
  indicazioniByEsame: { 'RX TORACE': ['Tosse', 'Mia indicazione'] },
  refertoByEsame: { 'RX TORACE': groups },
  ...extra,
});

test('id: base e utente, impronta stabile', () => {
  assert.ok(isBaseId('rxt:par.norma') && !isBaseId('u:abc') && !isBaseId(undefined));
  assert.match(newPhraseId(), /^u:[a-z0-9]{6,}$/);
  const p = ph('x:y', 'A', 'B.');
  assert.equal(phraseHash(p), phraseHash({ ...p }));
  assert.notEqual(phraseHash(p), phraseHash({ ...p, text: 'C.' }));
});

test('migrazione v2: esame mai personalizzato → nuovi predefiniti; esami nuovi della base aggiunti per le metodiche dell\'utente', () => {
  const user = v2user({ Parenchima: [{ label: 'Nella norma', text: 'Non addensamenti.', neg: false }], 'Cuore e mediastino': [{ label: 'Norma', text: 'Cuore e mediastino nella norma.', neg: false }] });
  const { data, report } = migrateFromV2(user, BASE3, LEGACY);
  assert.deepEqual(report.esamiAggiornati, ['RX TORACE']);
  assert.deepEqual(Object.keys(data.refertoByEsame['RX TORACE']), ['Parenchima', 'Pleura', 'Cuore', 'Conclusioni']);
  assert.ok(data.refertoByEsame['RX TORACE'].Pleura.every((p) => p.bh === phraseHash(p)));
  assert.deepEqual(data.esamiByMetodica.RX, ['RX TORACE', 'RX MANO'], 'esame nuovo aggiunto');
  assert.deepEqual(data.indicazioniByEsame['RX TORACE'], ['Tosse', 'Mia indicazione', 'Dispnea']);
  assert.ok(!data.metodiche.includes('TC'), 'metodica della v2 eliminata dall\'utente: non torna');
  assert.ok(data.removedBase.includes(tomb.metodica('TC')));
  assert.equal(data.defaultsVersion, 3);
});

test('migrazione v2: esame personalizzato → frasi dell\'utente intatte, vecchi predefiniti sostituiti, rischiose tolte', () => {
  const user = v2user({
    Parenchima: [
      { label: 'Nella norma', text: 'Non addensamenti.', neg: false },
      { label: 'Mia', text: 'Mia frase personale.', neg: true },
      { label: 'Rischiosa', text: 'Frase rischiosa.', neg: false },
    ],
    'Cuore e mediastino': [{ label: 'Norma', text: 'Cuore e mediastino nella norma.', neg: false }],
  });
  const { data, report } = migrateFromV2(user, BASE3, LEGACY);
  const groups = data.refertoByEsame['RX TORACE'];
  assert.deepEqual(report.esamiAggiornati, []);
  assert.deepEqual(groups.Parenchima.map((p) => p.text), ['Non addensamenti.', 'Addensamento [sede].', 'Mia frase personale.']);
  assert.equal(groups.Parenchima[0].id, 'rxt:par.norma', 'id della base assegnato per testo');
  assert.match(groups.Parenchima[2].id, /^u:/);
  assert.equal(groups['Cuore e mediastino'], undefined, 'vecchio predefinito non modificato sostituito');
  assert.deepEqual(Object.keys(groups), ['Parenchima', 'Pleura', 'Cuore', 'Conclusioni']);
  const again = mergeBase(data, BASE3);
  assert.deepEqual(again.data, data, 'idempotente');
  assert.equal(again.report.frasiAggiunte, 0);
});

test('aggiornamento della base: frasi non modificate aggiornate, modificate ed eliminate rispettate', () => {
  const user = baseForUser(BASE3);
  user.refertoByEsame['RX TORACE'].Pleura[0].text = 'Pleura libera (testo mio).';
  const removedId = 'rxt:pl.vers';
  user.refertoByEsame['RX TORACE'].Pleura.splice(1, 1);
  user.removedBase.push(removedId, tomb.esame('TC ENCEFALO'));
  user.esamiByMetodica.TC = [];
  delete user.refertoByEsame['TC ENCEFALO'];

  const base4 = JSON.parse(JSON.stringify(BASE3));
  base4.defaultsVersion = 4;
  base4.refertoByEsame['RX TORACE'].Parenchima[0].text = 'Non addensamenti parenchimali.';
  base4.refertoByEsame['RX TORACE'].Pleura[0].text = 'Non versamento (nuovo testo).';
  base4.refertoByEsame['RX TORACE'].Pleura.push(ph('rxt:pl.pnx', 'PNX', 'Pneumotorace [destro/sinistro].', true));
  base4.refertoByEsame['RX TORACE'].Cuore = [ph('rxt:cuore.cmg', 'Cardiomegalia', 'Cardiomegalia.', true)];
  base4.refertoByEsame['RX TORACE'] = { Tecnica: [ph('rxt:tec', 'Tecnica', 'Due proiezioni.')], ...base4.refertoByEsame['RX TORACE'] };

  const { data, report } = mergeBase(user, base4);
  const g = data.refertoByEsame['RX TORACE'];
  assert.equal(g.Parenchima[0].text, 'Non addensamenti parenchimali.', 'non modificata: aggiornata');
  assert.equal(g.Pleura[0].text, 'Pleura libera (testo mio).', 'modificata: rispettata');
  assert.ok(!g.Pleura.some((p) => p.id === removedId), 'eliminata dall\'utente: non torna');
  assert.ok(g.Pleura.some((p) => p.id === 'rxt:pl.pnx'), 'nuova frase aggiunta');
  assert.ok(!g.Cuore.some((p) => p.id === 'rxt:cuore.norma'), 'tolta dalla base e non modificata: sparisce');
  assert.equal(Object.keys(g)[0], 'Tecnica', 'Tecnica in testa');
  assert.equal(Object.keys(g).at(-1), 'Conclusioni');
  assert.deepEqual(data.esamiByMetodica.TC, [], 'esame eliminato dall\'utente: non torna');
  assert.equal(report.frasiAggiunte, 3);
  assert.equal(data.defaultsVersion, 4);
});

// Come jsonb: chiavi ordinate per lunghezza in byte e poi byte per byte.
const asJsonb = (v) => {
  if (Array.isArray(v)) return v.map(asJsonb);
  if (!v || typeof v !== 'object') return v;
  const enc = new TextEncoder();
  const cmp = (a, b) => { const x = enc.encode(a), y = enc.encode(b); if (x.length !== y.length) return x.length - y.length; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
  return Object.fromEntries(Object.keys(v).sort(cmp).map((k) => [k, asJsonb(v[k])]));
};

test('ordine dei gruppi: sopravvive al database (jsonb) grazie a ordineGruppi (issue #2)', async () => {
  const { forStorage, normalize } = await import('../../js/lib/library-merge.js');
  const lib = { metodiche: ['RX'], esamiByMetodica: { RX: ['RX X'] }, indicazioniByEsame: {}, refertoByEsame: {
    'RX X': { Pneumotorace: [{ id: 'u:1', label: 'a', text: 'A.', neg: false }], Cuore: [{ id: 'u:2', label: 'b', text: 'B.', neg: false }], Parenchima: [] },
  } };
  const stored = asJsonb(forStorage(lib));
  assert.deepEqual(Object.keys(stored.refertoByEsame['RX X']), ['Cuore', 'Parenchima', 'Pneumotorace'], 'jsonb riordina');
  const back = normalize(stored);
  assert.deepEqual(Object.keys(back.refertoByEsame['RX X']), ['Pneumotorace', 'Cuore', 'Parenchima']);
  assert.equal(back.ordineGruppi, undefined, 'in memoria l\'ordine è quello delle chiavi');
  assert.equal(back.refertoByEsame['RX X'].Pneumotorace[0].text, 'A.');
  // Dati già letti dal database: ordineGruppi resta quello salvato
  assert.equal(forStorage(stored), stored);
});

test('ordine dei gruppi: librerie salvate prima della correzione tornano all\'ordine dei predefiniti', async () => {
  const { migrateLibrary, cloneDefaults } = await import('../../js/lib/library.js');
  const lib = cloneDefaults();
  lib.refertoByEsame['RX TORACE 2PR'].Mio = [{ id: 'u:x', label: 'Mio', text: 'Frase mia.', neg: false }];
  const scrambled = asJsonb(lib);
  const { data } = migrateLibrary(scrambled);
  const keys = Object.keys(data.refertoByEsame['RX TORACE 2PR']);
  const { DEFAULT_LIBRARY } = await import('../../js/lib/default-library.js');
  const baseKeys = Object.keys(DEFAULT_LIBRARY.refertoByEsame['RX TORACE 2PR']);
  assert.deepEqual(keys.slice(0, baseKeys.length), baseKeys);
  assert.equal(keys[keys.length - 1], 'Mio', 'i gruppi dell\'utente vanno in fondo');
});

test('confronti (punto 04): conservati e ripuliti; senza modifiche valgono i predefiniti', async () => {
  const { normalize } = await import('../../js/lib/library-merge.js');
  const { DEFAULT_CONFRONTI } = await import('../../js/lib/default-library.js');
  const d = normalize({ confronti: [{ id: 'c1', label: 'Conf', text: 'Confronto con TC del [data].' }, { label: 'vuoto', text: '  ' }, 'x', { text: 'Senza etichetta e id.' }] });
  assert.equal(d.confronti.length, 2);
  assert.deepEqual(d.confronti[0], { id: 'c1', label: 'Conf', text: 'Confronto con TC del [data].' });
  assert.ok(d.confronti[1].id && d.confronti[1].label);
  assert.ok(!('confronti' in normalize({ confronti: 'rotto' })));
  assert.ok(!('confronti' in normalize({})));
  assert.deepEqual(DEFAULT_CONFRONTI.map((c) => c.label), ['Confronto', 'Presa visione', 'Non precedenti']);
});
