// Libreria predefinita, versione 3 (07/10/2026): BOZZA da validare clinicamente (vedi docs/libreria-revisione.md).
// I contenuti sono in js/lib/library-base/ (un file per metodica, regole in helpers.js).
// Convenzione per i campi da compilare: [testo] = campo libero, [a/b] = scelta tra opzioni.
// neg: true = reperto patologico; opz: true = frase aggiuntiva (fuori dal "Referto normale").
import * as ECO from './library-base/eco.js';
import * as RX from './library-base/rx.js';
import * as TC from './library-base/tc.js';
import * as RM from './library-base/rm.js';

export const DEFAULTS_VERSION = 3;

const MODULES = [ECO, RX, TC, RM];

export const DEFAULT_LIBRARY = {
  defaultsVersion: DEFAULTS_VERSION,
  metodiche: MODULES.map((m) => m.METODICA),
  esamiByMetodica: Object.fromEntries(MODULES.map((m) => [m.METODICA, [...m.ESAMI]])),
  indicazioniByEsame: Object.assign({}, ...MODULES.map((m) => m.INDICAZIONI)),
  refertoByEsame: Object.assign({}, ...MODULES.map((m) => m.REFERTI)),
};
