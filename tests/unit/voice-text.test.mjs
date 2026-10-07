import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVoiceCommands, abbreviationEdit, validAbbreviation } from '../../js/lib/voice-text.js';
import { applyEdits } from '../../js/lib/report-text.js';

test('comandi vocali: punteggiatura, a capo, maiuscole', () => {
  assert.equal(applyVoiceCommands('non versamento virgola non pnx punto a capo cuore nella norma'),
    'non versamento, non pnx.\nCuore nella norma');
  assert.equal(applyVoiceCommands('lesione apri parentesi 12 mm chiudi parentesi punto e virgola altro due punti nulla punto'),
    'lesione (12 mm); altro: nulla.');
  assert.equal(applyVoiceCommands('esame nella norma punto nuovo paragrafo conclusioni'),
    'esame nella norma.\n\nConclusioni');
  assert.equal(applyVoiceCommands('appuntamento e appunto'), 'appuntamento e appunto', 'niente sostituzioni dentro le parole');
});

test('abbreviazioni: espansione al separatore, solo per le chiavi definite', () => {
  const abbr = { '/nn': 'nei limiti della norma' };
  const t = 'Fegato /nn ';
  const e = abbreviationEdit(t, t.length, abbr);
  assert.equal(applyEdits(t, [e]), 'Fegato nei limiti della norma ');
  const t2 = 'Fegato /nn.';
  assert.equal(applyEdits(t2, [abbreviationEdit(t2, t2.length, abbr)]), 'Fegato nei limiti della norma.');
  assert.equal(abbreviationEdit('Fegato nn ', 10, abbr), null);
  assert.equal(abbreviationEdit('Fegato /nn', 10, abbr), null, 'senza separatore non espande');
  assert.ok(validAbbreviation('/nn') && !validAbbreviation('a') && !validAbbreviation('con spazio'));
});
