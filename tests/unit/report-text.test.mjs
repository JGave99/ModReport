import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findFields, nextField, fieldAt, prepareMeasure, phrasePattern, findPhrase, removalEdit,
  splitSections, planInsert, planToggle, applyEdits, normalReport, doseEdit, readDoseClass, checkReport, isIonizing,
} from '../../js/lib/report-text.js';

const GROUPS = [
  { name: 'Tecnica', phrases: [{ text: 'Esame eseguito [senza/con] mdc.', neg: false }] },
  { name: 'Pleura', phrases: [
    { text: 'Non versamento pleurico bilateralmente.', neg: false },
    { text: 'Versamento pleurico [destro/sinistro] di [lieve/moderata] entità.', neg: true },
    { text: 'Ispessimento pleurico [destro/sinistro].', neg: true },
  ] },
  { name: 'Cuore', phrases: [
    { text: 'Ombra cardiaca nei limiti della norma.', neg: false },
    { text: 'Ombra cardiaca aumentata di volume.', neg: true },
  ] },
  { name: 'Presidi', phrases: [{ text: 'SNG con estremità in sede gastrica.', neg: false, opz: true }] },
  { name: 'Conclusioni', phrases: [
    { text: 'Quadro nei limiti della norma.', neg: false },
    { text: 'Versamento pleurico [destro/sinistro].', neg: true },
  ] },
];

test('campi: scelta, misura e libero; navigazione con Tab in avanti e indietro', () => {
  const t = 'Nodulo di [___ mm] al lobo [destro/sinistro], sede [sede]; residuo ___ ml.';
  const f = findFields(t);
  assert.deepEqual(f.map((x) => x.kind), ['misura', 'scelta', 'libero', 'misura']);
  assert.deepEqual(f[1].options, ['destro', 'sinistro']);
  assert.equal(nextField(t, 0, 0).raw, '[___ mm]');
  assert.equal(nextField(t, f[0].start, f[0].end).raw, '[destro/sinistro]');
  assert.equal(nextField(t, f[3].start, f[3].end).raw, '[___ mm]', 'ricomincia dall\'inizio');
  assert.equal(nextField(t, f[1].start, f[1].end, { backwards: true }).raw, '[___ mm]');
  assert.equal(fieldAt(t, f[1].start, f[1].end).raw, '[destro/sinistro]');
  const prep = prepareMeasure(f[0]);
  const after = applyEdits(t, [prep.edit]);
  assert.ok(after.startsWith('Nodulo di ___ mm al lobo'));
  assert.equal(after.slice(...prep.select), '___');
});

test('frasi: riconosciute anche con i campi compilati, non quelle fatte solo di campi', () => {
  const tpl = 'Versamento pleurico [destro/sinistro] di [lieve/moderata] entità.';
  const t = 'RX TORACE\n\nVersamento pleurico destro di lieve entità.\nAltro.';
  const r = findPhrase(t, tpl);
  assert.equal(t.slice(r.start, r.end), 'Versamento pleurico destro di lieve entità.');
  assert.equal(phrasePattern('[___] mm.'), null);
  const dec = findPhrase('Nodulo di 1.5 cm.\n', 'Nodulo di [___ cm].');
  assert.equal(dec.end, 'Nodulo di 1.5 cm.'.length, 'il punto decimale non chiude la frase');
});

test('rimozione: riga intera o frase dentro una riga', () => {
  const t = 'A.\nB frase.\nC.';
  const r = findPhrase(t, 'B frase.');
  assert.equal(applyEdits(t, [removalEdit(t, r)]), 'A.\nC.');
  const t2 = 'Prima. Seconda. Terza.';
  const r2 = findPhrase(t2, 'Seconda.');
  assert.equal(applyEdits(t2, [removalEdit(t2, r2)]), 'Prima. Terza.');
});

test('inserimento nell\'ordine dei distretti, a prescindere dall\'ordine dei clic', () => {
  let t = 'RX TORACE\n';
  t = applyEdits(t, [planInsert(t, GROUPS, 2, GROUPS[2].phrases[0].text, { blankBefore: true })]);
  assert.equal(t, 'RX TORACE\n\nOmbra cardiaca nei limiti della norma.\n');
  t = applyEdits(t, [planInsert(t, GROUPS, 1, GROUPS[1].phrases[0].text)]);
  t = applyEdits(t, [planInsert(t, GROUPS, 0, 'Esame eseguito senza mdc.')]);
  assert.equal(t, 'RX TORACE\n\nEsame eseguito senza mdc.\nNon versamento pleurico bilateralmente.\nOmbra cardiaca nei limiti della norma.\n');
});

test('variante patologica: sostituisce la normale del distretto e viceversa; secondo clic la toglie', () => {
  let t = 'RX\n\nNon versamento pleurico bilateralmente.\nOmbra cardiaca nei limiti della norma.\n';
  let plan = planToggle(t, GROUPS, 1, 1);
  assert.equal(plan.action, 'replace');
  t = applyEdits(t, plan.edits);
  assert.equal(t, 'RX\n\nVersamento pleurico [destro/sinistro] di [lieve/moderata] entità.\nOmbra cardiaca nei limiti della norma.\n');
  t = t.replace('[destro/sinistro]', 'destro').replace('[lieve/moderata]', 'lieve');
  plan = planToggle(t, GROUPS, 1, 2); // seconda variante patologica: coesiste
  assert.equal(plan.action, 'insert');
  t = applyEdits(t, plan.edits);
  assert.ok(t.includes('Versamento pleurico destro di lieve entità.\nIspessimento pleurico'));
  plan = planToggle(t, GROUPS, 1, 0); // torna normale: sostituisce entrambe le patologiche
  t = applyEdits(t, plan.edits);
  assert.equal(t, 'RX\n\nNon versamento pleurico bilateralmente.\nOmbra cardiaca nei limiti della norma.\n');
  plan = planToggle(t, GROUPS, 2, 0);
  assert.equal(plan.action, 'remove');
  assert.equal(applyEdits(t, plan.edits), 'RX\n\nNon versamento pleurico bilateralmente.\n');
});

test('conclusioni: sezione con intestazione in fondo, prima della classe di dose', () => {
  let t = 'RX\n\nNon versamento pleurico bilateralmente.\n';
  t = applyEdits(t, [doseEdit(t, 'II')]);
  assert.equal(readDoseClass(t), 'II');
  t = applyEdits(t, [planInsert(t, GROUPS, 4, 'Quadro nei limiti della norma.')]);
  assert.equal(t, 'RX\n\nNon versamento pleurico bilateralmente.\n\nConclusioni:\nQuadro nei limiti della norma.\n\nClasse di dose: II (1-5 mSv).\n');
  t = applyEdits(t, [planInsert(t, GROUPS, 2, 'Ombra cardiaca nei limiti della norma.')]);
  assert.ok(t.includes('bilateralmente.\nOmbra cardiaca nei limiti della norma.\n\nConclusioni:'));
  t = applyEdits(t, [doseEdit(t, 'III')]);
  assert.equal(readDoseClass(t), 'III');
  t = applyEdits(t, [doseEdit(t, null)]);
  assert.equal(readDoseClass(t), null);
  const s = splitSections('Indicazione: Dispnea\n\n' + t);
  assert.equal(s.indicazione, 'Dispnea');
  assert.ok(s.referto.startsWith('RX') && !s.referto.includes('Conclusioni'));
  assert.equal(s.conclusioni, 'Quadro nei limiti della norma.');
});

test('referto normale: Tecnica, prima frase normale di ogni distretto, conclusione; niente opzionali', () => {
  const { text, added } = normalReport('TC TORACE\n', GROUPS, { blankBefore: true });
  assert.equal(text, 'TC TORACE\n\nEsame eseguito [senza/con] mdc.\nNon versamento pleurico bilateralmente.\nOmbra cardiaca nei limiti della norma.\n\nConclusioni:\nQuadro nei limiti della norma.\n');
  assert.equal(added.length, 4);
  const again = normalReport(text, GROUPS);
  assert.equal(again.text, text, 'idempotente');
});

test('controlli: campi vuoti, lato, contraddizioni, classe di dose', () => {
  const knee = 'Indicazione: Trauma ginocchio destro\n\nRX GINOCCHIO\n\nFrattura del piatto tibiale sinistro. Versamento [lieve/moderato].\n';
  assert.deepEqual(checkReport(knee, { esame: 'RX GINOCCHIO', metodica: 'RX' }).map((i) => i.type), ['campi', 'lato', 'dose']);
  const ok = 'Indicazione: Trauma ginocchio destro\n\nRX GINOCCHIO\n\nFrattura del piatto tibiale destro.\nClasse di dose: I (< 1 mSv).\n';
  assert.deepEqual(checkReport(ok, { esame: 'RX GINOCCHIO', metodica: 'RX' }), []);
  const chest = 'RX TORACE\n\nNon versamento pleurico bilateralmente.\nVersamento pleurico destro di lieve entità.\n';
  assert.deepEqual(checkReport(chest, { groups: GROUPS, metodica: 'Ecografia' }).map((i) => i.type), ['contraddizione']);
  assert.deepEqual(checkReport('Ecografia nella norma.', { metodica: 'Ecografia' }), []);
  assert.ok(isIonizing('TC') && isIonizing('Mammografia') && !isIonizing('RMN') && !isIonizing('Ecografia'));
});
