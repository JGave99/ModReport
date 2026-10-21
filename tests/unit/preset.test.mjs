// Nuova libreria predefinita dalla libreria di un account (issue #3) e aggiornamento degli utenti esistenti.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreset, presetModule } from '../../scripts/preset-da-libreria.mjs';
import { cloneDefaults } from '../../js/lib/library.js';
import { baseForUser, mergeBase, forStorage, phraseHash } from '../../js/lib/library-merge.js';
import { V4_BASE } from '../../js/lib/library-base/legacy-v4.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const texts = (groups) => Object.values(groups).flat().map((p) => p.text);
const ESAME = 'RX TORACE 2PR';

// Libreria dell'account di riferimento: frasi riviste, frasi nuove, un esame tolto, gruppi riordinati.
function referenceLibrary() {
  const lib = cloneDefaults();
  const g = lib.refertoByEsame[ESAME];
  g.Parenchima[0].text = 'Parenchima polmonare senza addensamenti.';
  g.Cuore.push({ id: 'u:abc123def456', label: 'Protesi valvolare', text: 'Protesi valvolare in sede.', neg: false, opz: true });
  lib.refertoByEsame[ESAME] = { Cuore: g.Cuore, ...g };
  lib.esamiByMetodica.RX = lib.esamiByMetodica.RX.filter((e) => e !== 'RX MANO');
  delete lib.refertoByEsame['RX MANO'];
  lib.removedBase.push('esame|RX MANO');
  lib.indicazioniByEsame[ESAME] = ['Dispnea', 'Controllo post-operatorio'];
  lib.abbreviazioni = { '/x': 'personale' };
  lib.negativoByEsame = { [ESAME]: ['x'] };
  return lib;
}

test('preset: ordine, ID stabili e niente dati personali dell\'account', () => {
  const exported = { app: 'ModReport', kind: 'libreria', data: forStorage(referenceLibrary()) };
  const { preset, warnings, stats } = buildPreset(clone(exported));
  assert.ok(!('abbreviazioni' in preset) && !('negativoByEsame' in preset) && !('removedBase' in preset));
  assert.ok(!preset.refertoByEsame['RX MANO']);
  assert.equal(Object.keys(preset.refertoByEsame[ESAME])[0], 'Cuore');
  const nuova = preset.refertoByEsame[ESAME].Cuore.find((p) => p.text === 'Protesi valvolare in sede.');
  assert.equal(nuova.id, 'rx-torace-2p:ig.abc123def456');
  assert.ok(Object.values(preset.refertoByEsame).every((gr) => Object.values(gr).flat().every((p) => !('bh' in p) && /^[a-z0-9-]+:[a-z0-9.-]+$/.test(p.id))));
  assert.equal(stats.esami, 37);
  assert.deepEqual(warnings, []);
  assert.match(presetModule(preset, { date: '2026-10-21' }), /^\/\/ Libreria predefinita: copia .* 2026-10-21/);
});

test('aggiornamento: l\'account di riferimento non cambia e non ha doppioni', () => {
  const ref = referenceLibrary();
  const { preset } = buildPreset(clone(forStorage(ref)));
  const base = { defaultsVersion: 5, ...preset };
  const { data } = mergeBase(clone(ref), base, { previous: V4_BASE });
  assert.deepEqual(texts(data.refertoByEsame[ESAME]), texts(ref.refertoByEsame[ESAME]));
  const all = Object.values(data.refertoByEsame[ESAME]).flat();
  assert.ok(all.every((p) => p.bh === phraseHash(p)), 'tutte riconosciute come frasi della base');
  assert.ok(all.some((p) => p.id === 'rx-torace-2p:ig.abc123def456'));
  assert.deepEqual(data.abbreviazioni, { '/x': 'personale' });
});

test('aggiornamento: gli altri utenti ricevono la nuova base e tengono le loro modifiche', () => {
  const { preset } = buildPreset(clone(forStorage(referenceLibrary())));
  const base = { defaultsVersion: 5, ...preset };
  const user = cloneDefaults(); // libreria v4 di un altro utente
  user.refertoByEsame[ESAME].Pneumotorace.push({ id: 'u:mia', label: 'Mia', text: 'Frase mia.', neg: false });
  user.refertoByEsame[ESAME]['Versamento pleurico'][0].text = 'Versamento: lo scrivo io.';
  user.refertoByEsame['RX MANO'].Mio = [{ id: 'u:mano', label: 'Mano', text: 'Nota sulla mano.', neg: false }];
  user.indicazioniByEsame[ESAME].push('Mia indicazione');
  const { data, report } = mergeBase(user, base, { previous: V4_BASE });
  const g = data.refertoByEsame[ESAME];
  assert.equal(Object.keys(g)[0], 'Cuore', 'ordine dei gruppi della nuova base');
  assert.ok(texts(g).includes('Parenchima polmonare senza addensamenti.'), 'frase rivista');
  assert.ok(texts(g).includes('Protesi valvolare in sede.'), 'frase nuova');
  assert.ok(texts(g).includes('Frase mia.') && texts(g).includes('Versamento: lo scrivo io.'), 'modifiche dell\'utente intatte');
  assert.deepEqual(data.indicazioniByEsame[ESAME], ['Dispnea', 'Controllo post-operatorio', 'Mia indicazione']);
  // RX MANO non è più nella base: restano solo le frasi dell'utente.
  assert.deepEqual(texts(data.refertoByEsame['RX MANO']), ['Nota sulla mano.']);
  // Un esame tolto dalla base e mai personalizzato sparisce.
  const plain = mergeBase(cloneDefaults(), { ...base, esamiByMetodica: { ...base.esamiByMetodica, RX: base.esamiByMetodica.RX.filter((e) => e !== 'RX PIEDE') }, refertoByEsame: Object.fromEntries(Object.entries(base.refertoByEsame).filter(([e]) => e !== 'RX PIEDE')) }, { previous: V4_BASE });
  assert.ok(!plain.data.esamiByMetodica.RX.includes('RX PIEDE') && !plain.data.refertoByEsame['RX PIEDE']);
  assert.ok(plain.report.esamiTolti.includes('RX PIEDE'));
  assert.ok(report.esamiTolti.length === 0, 'RX MANO tenuto perché personalizzato');
});

test('nuovo utente: la base è esattamente la libreria di riferimento', () => {
  const ref = referenceLibrary();
  const { preset } = buildPreset(clone(forStorage(ref)));
  const fresh = baseForUser({ defaultsVersion: 5, ...preset });
  assert.deepEqual(Object.keys(fresh.refertoByEsame[ESAME]), Object.keys(ref.refertoByEsame[ESAME]));
  assert.deepEqual(fresh.indicazioniByEsame[ESAME], ['Dispnea', 'Controllo post-operatorio']);
});
