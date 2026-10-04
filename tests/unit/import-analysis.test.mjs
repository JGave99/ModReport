import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPII, splitIntoSentences, classifyFinding } from '../../js/lib/import-analysis.js';

test('dati identificativi: codice fiscale, date, anagrafica, numeri, contatti, età', () => {
  const types = (t) => detectPII(t).map((p) => p.type);
  assert.deepEqual(types('CF RSSMRA50B01H501U'), ['codice-fiscale']);
  assert.ok(types('Confronto con precedente del 12/03/2025').includes('data'));
  assert.ok(types('esame del 3 marzo 2025').includes('data'));
  assert.ok(types('Paziente: ROSSI MARIO').includes('anagrafica'));
  assert.ok(types('nato il 1950').includes('anagrafica'));
  assert.ok(types('N. accettazione 2025/0012345').includes('identificativo'));
  assert.ok(types('ricoverato in Medicina 2 letto 14').includes('identificativo'));
  assert.ok(types('mario.rossi@gmail.com').includes('contatto'));
  assert.ok(types('cell. 333 1234567').includes('contatto'));
  assert.ok(types('donna di 54 anni').includes('eta'));
});

test('nessun falso allarme sulle frasi tipiche', () => {
  for (const t of ['Non addensamenti parenchimali a focolaio.', 'Nodulo di 12 mm al lobo superiore destro.', 'Aorta di 5,2 cm.', 'RX TORACE 2PR', 'Livello D12-L1.']) {
    assert.deepEqual(detectPII(t), [], t);
  }
});

test('divisione in frasi: abbreviazioni e misure non spezzano la frase', () => {
  assert.deepEqual(splitIntoSentences('Nodulo del diam. 1,5 cm in sede S. 7. Fegato regolare.'),
    ['Nodulo del diam. 1,5 cm in sede S. 7.', 'Fegato regolare.']);
  assert.deepEqual(splitIntoSentences('RADIOLOGIA\nNon addensamenti.'), ['RADIOLOGIA.', 'Non addensamenti.']);
  assert.deepEqual(splitIntoSentences('Ombra cardiaca nei\nlimiti della norma.'), ['Ombra cardiaca nei limiti della norma.']);
});

test('classificazione: reperti critici o patologici non sono mai "normali"', () => {
  for (const s of [
    'Aria libera in addome.', 'Falda di aria libera sottodiaframmatica destra.', 'Raccolta fluida libera nel Douglas.',
    'Liquido libero in pelvi.', 'Lesione a margini irregolare di 2 cm.', 'Ispessimento parietale irregolare del sigma.',
    'Non lesioni focali; lieve steatosi.', "Nella norma il calibro dell'aorta, fatta eccezione per dilatazione aneurismatica sottorenale di 5,2 cm.",
    'Non opacizzazione del ramo portale destro, da trombosi.',
  ]) {
    assert.notEqual(classifyFinding(s), 'normale', s);
  }
});

test('classificazione: frasi dubitative sono "incerte"', () => {
  assert.equal(classifyFinding('Non si può escludere lesione neoplastica.'), 'incerto');
  assert.equal(classifyFinding('Non è possibile escludere una lesione ischemica acuta.'), 'incerto');
  assert.equal(classifyFinding('Reperto da correlare con il quadro clinico.'), 'incerto');
});

test('classificazione: frasi normali tipiche', () => {
  for (const s of [
    'Non addensamenti parenchimali a focolaio.', 'Non versamento pleurico bilateralmente.',
    'Ombra cardiaca di dimensioni e morfologia nei limiti della norma.', 'Pleura libera.',
    'Fegato di dimensioni ed ecostruttura regolari.', 'Mediastino in asse, di ampiezza regolare.',
    'Vie biliari non dilatate.', 'Non segni di pneumotorace.',
  ]) {
    assert.equal(classifyFinding(s), 'normale', s);
  }
});
