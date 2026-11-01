// Libreria predefinita, versione 5 (21/10/2026): la libreria dell'account di riferimento, copiata una volta
// sola (issue #3; generata con scripts/preset-da-libreria.mjs in library-base/preset.js).
// Convenzione per i campi da compilare: [testo] = campo libero, [a/b] = scelta tra opzioni.
// neg: true = reperto patologico; opz: true = frase aggiuntiva (fuori dal "Referto negativo" predefinito).
// Le versioni precedenti servono solo ad aggiornare le librerie degli utenti: legacy.js (v1-v2), legacy-v4.js (v4).
import { PRESET } from './library-base/preset.js';

export const DEFAULTS_VERSION = 5;

export const DEFAULT_LIBRARY = {
  defaultsVersion: DEFAULTS_VERSION,
  metodiche: PRESET.metodiche,
  esamiByMetodica: PRESET.esamiByMetodica,
  indicazioniByEsame: PRESET.indicazioniByEsame,
  refertoByEsame: PRESET.refertoByEsame,
};

// Frasi proposte per il "Referto negativo" di alcuni esami, finché l'utente non sceglie le sue (⚙ nell'editor).
export const DEFAULT_NEGATIVO = PRESET.negativoByEsame || {};

// Frasi del punto 04 "Confronto con precedenti": uguali per tutte le metodiche e tutti gli esami. Ogni libreria
// (personale o del team) può avere le sue in `confronti`; se non le ha, valgono queste.
export const DEFAULT_CONFRONTI = [
  { id: 'confronto', label: 'Confronto', text: 'Confronto con precedente analogo del [data].' },
  { id: 'presa-visione', label: 'Presa visione', text: 'Presa visione di precedente analogo del [data].' },
  { id: 'non-precedenti', label: 'Non precedenti', text: 'Non disponibili precedenti per confronto.' },
];
