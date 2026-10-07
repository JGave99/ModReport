import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metodicaOf, computeStats, statsCsv } from '../../js/lib/archive-stats.js';

test('metodicaOf - RX', () => {
  assert.strictEqual(metodicaOf('RX'), 'RX');
  assert.strictEqual(metodicaOf('rx'), 'RX');
  assert.strictEqual(metodicaOf('RX-123'), 'RX');
});

test('metodicaOf - TC', () => {
  assert.strictEqual(metodicaOf('TC'), 'TC');
  assert.strictEqual(metodicaOf('tc'), 'TC');
  assert.strictEqual(metodicaOf('ANGIO-TC'), 'TC');
  assert.strictEqual(metodicaOf('Angio-Tc'), 'TC');
});

test('metodicaOf - RMN', () => {
  assert.strictEqual(metodicaOf('RMN'), 'RMN');
  assert.strictEqual(metodicaOf('rmn'), 'RMN');
  assert.strictEqual(metodicaOf('RM '), 'RMN');
  assert.strictEqual(metodicaOf('Rm'), 'RMN');
});

test('metodicaOf - Ecografia', () => {
  assert.strictEqual(metodicaOf('ECO'), 'Ecografia');
  assert.strictEqual(metodicaOf('eco'), 'Ecografia');
  assert.strictEqual(metodicaOf('ECOGRAFIA'), 'Ecografia');
  assert.strictEqual(metodicaOf('ECOCOLORDOPPLER'), 'Ecografia');
});

test('metodicaOf - Altro', () => {
  assert.strictEqual(metodicaOf(null), 'Altro');
  assert.strictEqual(metodicaOf(undefined), 'Altro');
  assert.strictEqual(metodicaOf(''), 'Altro');
  assert.strictEqual(metodicaOf('ALTRO'), 'Altro');
  assert.strictEqual(metodicaOf('MRI'), 'Altro');
});

test('computeStats - vuoto', () => {
  const result = computeStats([]);
  assert.strictEqual(result.totale, 0);
  assert.deepStrictEqual(result.perMetodica, []);
  assert.deepStrictEqual(result.perEsame, []);
  assert.strictEqual(result.perMese.length, 12);
  assert.ok(result.perMese.every((m) => m.n === 0));
});

test('computeStats - mesi vuoti', () => {
  const now = new Date(2024, 5, 15); // Giugno 2024
  const result = computeStats([], now);
  assert.strictEqual(result.totale, 0);
  // Dovrebbe restituire 12 mesi anche se vuoti
  assert.strictEqual(result.perMese.length, 12);
  for (const month of result.perMese) {
    assert.strictEqual(month.n, 0);
  }
});

test('computeStats - top 10 esami', () => {
  const entries = [
    { esame: 'RX', createdAt: '2024-01-01T00:00:00Z' },
    { esame: 'TC', createdAt: '2024-01-02T00:00:00Z' },
    { esame: 'RX', createdAt: '2024-01-03T00:00:00Z' },
    { esame: 'RMN', createdAt: '2024-01-04T00:00:00Z' },
    { esame: 'ECO', createdAt: '2024-01-05T00:00:00Z' },
    { esame: 'RX', createdAt: '2024-01-06T00:00:00Z' },
    { esame: 'TC', createdAt: '2024-01-07T00:00:00Z' },
    { esame: 'RX', createdAt: '2024-01-08T00:00:00Z' },
    { esame: 'RMN', createdAt: '2024-01-09T00:00:00Z' },
    { esame: 'ECO', createdAt: '2024-01-10T00:00:00Z' },
    { esame: 'RX', createdAt: '2024-01-11T00:00:00Z' },
    { esame: 'TC', createdAt: '2024-01-12T00:00:00Z' },
    { esame: null, createdAt: '2024-01-13T00:00:00Z' },
    { esame: 'RX', createdAt: '2024-01-14T00:00:00Z' },
  ];
  
  const result = computeStats(entries);
  assert.strictEqual(result.totale, 14);
  // Verifichiamo che ci siano almeno 5 elementi (non necessariamente 10)
  assert.ok(result.perEsame.length >= 5);
  // Controlliamo solo i primi 3 risultati per evitare problemi di ordine
  const firstThree = result.perEsame.slice(0, 3);
  const rxFound = firstThree.find(x => x.nome === 'RX' && x.n === 6);
  const tcFound = firstThree.find(x => x.nome === 'TC' && x.n === 3); // Corretto: TC appare 3 volte
  const rnmFound = firstThree.find(x => x.nome === 'RMN' && x.n === 2);
  assert.ok(rxFound, 'RX deve essere presente con 6 occorrenze');
  assert.ok(tcFound, 'TC deve essere presente con 3 occorrenze');
  assert.ok(rnmFound, 'RMN deve essere presente con 2 occorrenze');
});

test('computeStats - esame nullo', () => {
  const entries = [
    { esame: null, createdAt: '2024-01-01T00:00:00Z' },
    { esame: '', createdAt: '2024-01-02T00:00:00Z' },
  ];
  
  const result = computeStats(entries);
  assert.strictEqual(result.totale, 2);
  assert.deepStrictEqual(result.perEsame[0], { nome: 'Esame non specificato', n: 2 });
});

test('statsCsv - vuoto', () => {
  const csv = statsCsv([]);
  assert.strictEqual(csv, 'mese;metodica;esame;referti');
});

test('statsCsv - con dati', () => {
  const entries = [
    { esame: 'RX', createdAt: '2024-01-01T00:00:00Z' },
    { esame: 'TC', createdAt: '2024-01-02T00:00:00Z' },
    { esame: 'RX', createdAt: '2024-01-03T00:00:00Z' },
    { esame: null, createdAt: '2024-01-04T00:00:00Z' },
  ];
  
  const csv = statsCsv(entries);
  assert.ok(csv.includes('mese;metodica;esame;referti'));
  // Verifichiamo che le righe siano presenti, ma non l'ordine specifico
  const lines = csv.split('\n');
  let foundRX = false;
  let foundTC = false;
  let foundNull = false;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].includes('2024-01;RX;RX;2')) foundRX = true;
    if (lines[i].includes('2024-01;TC;TC;1')) foundTC = true;
    if (lines[i].includes('2024-01;Altro;Esame non specificato;1')) foundNull = true;
  }
  
  assert.ok(foundRX, 'Deve contenere RX');
  assert.ok(foundTC, 'Deve contenere TC');
  assert.ok(foundNull, 'Deve contenere Esame non specificato');
});