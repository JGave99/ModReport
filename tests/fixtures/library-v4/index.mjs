// Libreria predefinita v4 (16/10/2026) completa, com'era prima della libreria di riferimento dell'issue #3.
// Non è più nell'app: serve ai test per simulare le librerie degli utenti esistenti.
import * as ECO from './eco.js';
import * as RX from './rx.js';
import * as TC from './tc.js';
import * as RM from './rm.js';

const MODULES = [ECO, RX, TC, RM];

export const V4_LIBRARY = {
  defaultsVersion: 4,
  metodiche: MODULES.map((m) => m.METODICA),
  esamiByMetodica: Object.fromEntries(MODULES.map((m) => [m.METODICA, [...m.ESAMI]])),
  indicazioniByEsame: Object.assign({}, ...MODULES.map((m) => m.INDICAZIONI)),
  refertoByEsame: Object.assign({}, ...MODULES.map((m) => m.REFERTI)),
};
