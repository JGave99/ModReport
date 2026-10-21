// Libreria con ID stabili: base versionata (predefiniti) + modifiche dell'utente. Funzioni pure.
//
// - Ogni frase ha un id. Quelle della base hanno id "esame:locale" (stabili tra le versioni) e bh,
//   l'impronta del testo della base al momento in cui sono entrate nella libreria dell'utente:
//   se l'utente non le ha toccate (impronta uguale) un aggiornamento della base le può aggiornare.
// - Le frasi create dall'utente hanno id "u:…" e non vengono mai toccate.
// - removedBase raccoglie ciò che l'utente ha eliminato dalla base (frasi, esami, metodiche,
//   indicazioni): gli aggiornamenti non lo ripropongono.

const clone = (v) => JSON.parse(JSON.stringify(v));
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export function phraseHash(p) {
  const s = [p.label, p.text, p.neg ? 1 : 0, p.opz ? 1 : 0].join('\u0001');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export const isBaseId = (id) => typeof id === 'string' && id.includes(':') && !id.startsWith('u:');

export function newPhraseId() {
  const r = globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
  return 'u:' + r;
}

export const tomb = {
  esame: (name) => 'esame|' + name,
  metodica: (name) => 'metodica|' + name,
  ind: (esame, text) => 'ind|' + esame + '|' + text,
};

// Copia della base con le impronte, per un nuovo utente.
export function baseForUser(base) {
  const data = clone(base);
  for (const groups of Object.values(data.refertoByEsame || {})) {
    for (const phrases of Object.values(groups)) phrases.forEach((p) => { p.bh = phraseHash(p); });
  }
  data.removedBase = [];
  return data;
}

// Ordine dei gruppi (sezioni) di ogni esame. I gruppi sono le chiavi di un oggetto, ma il database li salva in
// jsonb, che riordina le chiavi (per lunghezza e poi alfabeticamente): l'ordine si salva quindi anche come
// elenco, in ordineGruppi { esame: [nomi dei gruppi] }, scritto da forStorage e applicato da normalize.
// In memoria l'ordine è quello delle chiavi e ordineGruppi non c'è.
export const GROUP_ORDER_KEY = 'ordineGruppi';

function reorderKeys(obj, order) {
  const out = {};
  for (const k of order) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  for (const k of Object.keys(obj)) if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = obj[k];
  return out;
}

// Copia della libreria pronta per il database (user_data, team_libraries, library_versions).
// Se ha già ordineGruppi (dati appena letti dal database) resta com'è.
export function forStorage(data) {
  if (!isObj(data) || isObj(data[GROUP_ORDER_KEY])) return data;
  const order = {};
  for (const [esame, groups] of Object.entries(data.refertoByEsame || {})) {
    if (isObj(groups)) order[esame] = Object.keys(groups);
  }
  return { ...data, [GROUP_ORDER_KEY]: order };
}

// Librerie salvate prima di ordineGruppi: l'ordine delle chiavi è quello di jsonb. Per gli esami della base
// si torna all'ordine dei predefiniti; i gruppi creati dall'utente vanno in fondo, nell'ordine in cui sono.
export function orderGroupsLikeBase(data, base) {
  for (const [esame, groups] of Object.entries(data.refertoByEsame || {})) {
    const baseGroups = base.refertoByEsame && base.refertoByEsame[esame];
    if (isObj(groups) && baseGroups) data.refertoByEsame[esame] = reorderKeys(groups, Object.keys(baseGroups));
  }
  return data;
}

// Struttura minima valida (librerie salvate vecchie o incomplete).
export function normalize(raw) {
  const data = isObj(raw) ? clone(raw) : {};
  data.metodiche = Array.isArray(data.metodiche) ? data.metodiche.filter((m) => typeof m === 'string') : [];
  data.esamiByMetodica = isObj(data.esamiByMetodica) ? data.esamiByMetodica : {};
  data.indicazioniByEsame = isObj(data.indicazioniByEsame) ? data.indicazioniByEsame : {};
  data.refertoByEsame = isObj(data.refertoByEsame) ? data.refertoByEsame : {};
  data.removedBase = Array.isArray(data.removedBase) ? data.removedBase : [];
  if (data.abbreviazioni !== undefined && !isObj(data.abbreviazioni)) delete data.abbreviazioni;
  // Frasi del "Referto negativo" scelte dall'utente, per esame (ID delle frasi).
  if (data.negativoByEsame !== undefined) {
    data.negativoByEsame = isObj(data.negativoByEsame) ? Object.fromEntries(Object.entries(data.negativoByEsame)
      .filter(([, ids]) => Array.isArray(ids)).map(([e, ids]) => [e, ids.filter((id) => typeof id === 'string')])) : {};
  }
  for (const m of data.metodiche) if (!Array.isArray(data.esamiByMetodica[m])) data.esamiByMetodica[m] = [];
  const order = isObj(data[GROUP_ORDER_KEY]) ? data[GROUP_ORDER_KEY] : {};
  delete data[GROUP_ORDER_KEY];
  for (const [esame, saved] of Object.entries(data.refertoByEsame)) {
    if (!isObj(saved)) { data.refertoByEsame[esame] = {}; continue; }
    const groups = Array.isArray(order[esame]) ? reorderKeys(saved, order[esame].filter((g) => typeof g === 'string')) : saved;
    data.refertoByEsame[esame] = groups;
    for (const [g, phrases] of Object.entries(groups)) {
      groups[g] = (Array.isArray(phrases) ? phrases : []).filter((p) => isObj(p) && typeof p.text === 'string')
        .map((p) => ({ ...p, label: String(p.label || p.text.slice(0, 28)), neg: !!p.neg }));
    }
  }
  return data;
}

// Tutte le frasi di un esame con il loro gruppo.
function phrasesIn(groups) {
  const out = [];
  for (const [g, list] of Object.entries(groups || {})) list.forEach((p, i) => out.push({ group: g, index: i, phrase: p }));
  return out;
}

// Mette la frase della base nella libreria dell'utente, nel gruppo e nella posizione più vicini a quelli della base.
function placeBasePhrase(userGroups, baseGroups, baseGroup, basePhrase) {
  const baseList = baseGroups[baseGroup];
  const siblings = new Set(baseList.map((p) => p.id));
  let target = Object.prototype.hasOwnProperty.call(userGroups, baseGroup) ? baseGroup : null;
  if (!target) {
    const holder = phrasesIn(userGroups).find((x) => siblings.has(x.phrase.id));
    target = holder ? holder.group : null;
  }
  const entry = { ...clone(basePhrase), bh: phraseHash(basePhrase) };
  if (!target) {
    // Nuovo gruppo dopo l'ultimo gruppo dell'utente che corrisponde a un gruppo precedente della base;
    // "Tecnica" sempre in testa, "Conclusioni" sempre in fondo.
    const baseNames = Object.keys(baseGroups);
    const pos = baseNames.indexOf(baseGroup);
    const entries = Object.entries(userGroups);
    const conclIdx = entries.findIndex(([name]) => /^conclusion[ie]$/i.test(name));
    const basePosOf = ([name, list]) => Math.max(baseNames.indexOf(name),
      ...list.map((p) => baseNames.findIndex((bn) => baseGroups[bn].some((bp) => bp.id === p.id))));
    let insertAt;
    if (/^conclusion[ie]$/i.test(baseGroup)) insertAt = entries.length;
    else if (/^tecnica$/i.test(baseGroup)) insertAt = 0;
    else {
      insertAt = entries.length && /^tecnica$/i.test(entries[0][0]) ? 1 : 0;
      entries.forEach((e, i) => { const bp = basePosOf(e); if (bp !== -1 && bp < pos) insertAt = Math.max(insertAt, i + 1); });
      if (conclIdx !== -1) insertAt = Math.min(insertAt, conclIdx);
    }
    entries.splice(insertAt, 0, [baseGroup, [entry]]);
    for (const k of Object.keys(userGroups)) delete userGroups[k];
    for (const [k, v] of entries) userGroups[k] = v;
    return;
  }
  const list = userGroups[target];
  const bi = baseList.findIndex((p) => p.id === basePhrase.id);
  let at = list.length;
  for (let j = bi - 1; j >= 0; j--) {
    const k = list.findIndex((p) => p.id === baseList[j].id);
    if (k !== -1) { at = k + 1; break; }
  }
  if (bi === 0 && at === list.length) at = 0;
  list.splice(at, 0, entry);
}

// Aggiorna un esame dell'utente rispetto all'esame della base. Restituisce il numero di frasi aggiunte.
// Frase dell'utente che corrisponde a una frase nuova della base, da "adottare" invece di duplicarla:
// stessa origine (la base è stata creata dalla libreria di un utente: u:X diventa esame:ig.X) o stesso testo.
function findTwin(userGroups, basePhrase, baseById) {
  const own = phrasesIn(userGroups).map((x) => x.phrase).filter((p) => !baseById.has(p.id));
  const m = /:ig\.([a-z0-9]+)$/.exec(basePhrase.id);
  const byOrigin = m && own.find((p) => typeof p.id === 'string' && p.id.toLowerCase().replace(/[^a-z0-9:]/g, '') === 'u:' + m[1]);
  return byOrigin || own.find((p) => p.text.trim() === basePhrase.text.trim()) || null;
}

// renamed: raccoglie gli ID cambiati dall'adozione (vecchio → nuovo), per aggiornare chi li usa (referto negativo).
function mergeExam(userGroups, baseGroups, removed, renamed = new Map()) {
  const present = new Map(phrasesIn(userGroups).map((x) => [x.phrase.id, x]));
  const baseById = new Map();
  for (const [g, list] of Object.entries(baseGroups)) list.forEach((p) => baseById.set(p.id, { group: g, phrase: p }));
  let added = 0;

  // Frasi della base già presenti: se l'utente non le ha modificate, prendono il testo nuovo;
  // se la base le ha tolte, spariscono anche qui (sempre solo se non modificate).
  for (const [id, x] of present) {
    if (!isBaseId(id)) continue;
    const untouched = x.phrase.bh && phraseHash(x.phrase) === x.phrase.bh;
    const base = baseById.get(id);
    // Modificata dall'utente ma ora uguale alla base (es. la base ha adottato il suo testo): torna "non modificata".
    if (!untouched && base && phraseHash(x.phrase) === phraseHash(base.phrase)) x.phrase.bh = phraseHash(base.phrase);
    if (!untouched) continue;
    if (!base) {
      const list = userGroups[x.group];
      list.splice(list.indexOf(x.phrase), 1);
      if (!list.length) delete userGroups[x.group];
      continue;
    }
    const fresh = phraseHash(base.phrase);
    if (fresh !== x.phrase.bh) {
      Object.assign(x.phrase, { label: base.phrase.label, text: base.phrase.text, neg: base.phrase.neg, bh: fresh });
      if (base.phrase.opz) x.phrase.opz = true; else delete x.phrase.opz;
    }
  }
  // Frasi nuove della base.
  for (const [g, list] of Object.entries(baseGroups)) {
    for (const p of list) {
      if (present.has(p.id) || removed.has(p.id)) continue;
      const twin = findTwin(userGroups, p, baseById);
      if (twin) { renamed.set(twin.id, p.id); twin.id = p.id; twin.bh = phraseHash(p); continue; }
      placeBasePhrase(userGroups, baseGroups, g, p);
      added += 1;
    }
  }
  return added;
}

const appendMissing = (target, items, skip) => {
  let n = 0;
  for (const it of items) if (!target.includes(it) && !skip(it)) { target.push(it); n += 1; }
  return n;
};

// Allinea la libreria dell'utente a una nuova versione della base (versione già ≥ 3).
// previous: struttura della base precedente ({ metodiche, esamiByMetodica, indicazioniByEsame }). Se c'è, si
// tolgono anche esami, indicazioni e metodiche che erano della base precedente e nella nuova non ci sono più
// (solo se l'utente non li ha personalizzati) e gruppi ed esami prendono l'ordine della nuova base.
export function mergeBase(rawData, base, { previous = null } = {}) {
  const data = normalize(rawData);
  const removed = new Set(data.removedBase);
  const report = { esamiAggiunti: [], frasiAggiunte: 0 };
  const renamed = new Map();
  for (const m of base.metodiche) {
    if (!data.metodiche.includes(m)) {
      if (removed.has(tomb.metodica(m))) continue;
      data.metodiche.push(m);
      data.esamiByMetodica[m] = [];
    }
    for (const esame of base.esamiByMetodica[m] || []) {
      if (removed.has(tomb.esame(esame))) continue;
      const userHas = Object.values(data.esamiByMetodica).some((l) => l.includes(esame));
      if (!userHas) {
        data.esamiByMetodica[m].push(esame);
        data.indicazioniByEsame[esame] = (base.indicazioniByEsame[esame] || []).filter((t) => !removed.has(tomb.ind(esame, t)));
        const groups = {};
        for (const [g, list] of Object.entries(base.refertoByEsame[esame] || {})) {
          const kept = list.filter((p) => !removed.has(p.id)).map((p) => ({ ...clone(p), bh: phraseHash(p) }));
          if (kept.length) groups[g] = kept;
        }
        data.refertoByEsame[esame] = groups;
        report.esamiAggiunti.push(esame);
        continue;
      }
      data.indicazioniByEsame[esame] = Array.isArray(data.indicazioniByEsame[esame]) ? data.indicazioniByEsame[esame] : [];
      appendMissing(data.indicazioniByEsame[esame], base.indicazioniByEsame[esame] || [], (t) => removed.has(tomb.ind(esame, t)));
      data.refertoByEsame[esame] = isObj(data.refertoByEsame[esame]) ? data.refertoByEsame[esame] : {};
      report.frasiAggiunte += mergeExam(data.refertoByEsame[esame], base.refertoByEsame[esame] || {}, removed, renamed);
    }
  }
  if (previous) retirePrevious(data, base, previous, removed, report);
  if (renamed.size && isObj(data.negativoByEsame)) {
    for (const [esame, ids] of Object.entries(data.negativoByEsame)) data.negativoByEsame[esame] = ids.map((id) => renamed.get(id) || id);
  }
  data.defaultsVersion = base.defaultsVersion;
  return { data, report };
}

function retirePrevious(data, base, previous, removed, report) {
  const inBase = (esame) => !!(base.refertoByEsame && base.refertoByEsame[esame]);
  const prevExams = new Set(Object.values(previous.esamiByMetodica || {}).flat());
  report.esamiTolti = [];
  for (const [m, list] of Object.entries(data.esamiByMetodica)) {
    data.esamiByMetodica[m] = list.filter((esame) => {
      if (inBase(esame)) return true;
      const groups = isObj(data.refertoByEsame[esame]) ? data.refertoByEsame[esame] : {};
      mergeExam(groups, {}, removed); // toglie le frasi della base precedente non modificate
      if (phrasesIn(groups).length || !prevExams.has(esame)) return true;
      delete data.refertoByEsame[esame];
      delete data.indicazioniByEsame[esame];
      if (data.negativoByEsame) delete data.negativoByEsame[esame];
      report.esamiTolti.push(esame);
      return false;
    });
    // Ordine degli esami: quello della nuova base, poi quelli aggiunti dall'utente.
    const order = (base.esamiByMetodica && base.esamiByMetodica[m]) || [];
    data.esamiByMetodica[m] = [...order.filter((e) => data.esamiByMetodica[m].includes(e)), ...data.esamiByMetodica[m].filter((e) => !order.includes(e))];
  }
  for (const [esame, list] of Object.entries(data.indicazioniByEsame)) {
    if (!inBase(esame) || !Array.isArray(list)) continue;
    const now = base.indicazioniByEsame[esame] || [];
    const before = (previous.indicazioniByEsame || {})[esame] || [];
    const kept = list.filter((t) => now.includes(t) || !before.includes(t));
    data.indicazioniByEsame[esame] = [...now.filter((t) => kept.includes(t)), ...kept.filter((t) => !now.includes(t))];
  }
  const prevMetodiche = new Set(previous.metodiche || []);
  data.metodiche = data.metodiche.filter((m) => {
    if (base.metodiche.includes(m) || !prevMetodiche.has(m) || (data.esamiByMetodica[m] || []).length) return true;
    delete data.esamiByMetodica[m];
    return false;
  });
  data.metodiche = [...base.metodiche.filter((m) => data.metodiche.includes(m)), ...data.metodiche.filter((m) => !base.metodiche.includes(m))];
  // Struttura dei gruppi della nuova base: le frasi della base non modificate vanno nel loro gruppo (che può
  // essere stato rinominato o unito a un altro) e nell'ordine della base; quelle dell'utente restano in coda.
  for (const [esame, baseGroups] of Object.entries(base.refertoByEsame || {})) {
    const groups = data.refertoByEsame[esame];
    if (!isObj(groups)) continue;
    const where = new Map();
    for (const [g, list] of Object.entries(baseGroups)) list.forEach((p, i) => where.set(p.id, { g, i }));
    for (const [g, list] of Object.entries(groups)) {
      for (const p of [...list]) {
        const w = where.get(p.id);
        if (!w || w.g === g || !(p.bh && phraseHash(p) === p.bh)) continue;
        list.splice(list.indexOf(p), 1);
        (groups[w.g] = groups[w.g] || []).push(p);
      }
    }
    for (const [g, list] of Object.entries(groups)) {
      if (!list.length) { delete groups[g]; continue; }
      const pos = (p) => { const w = where.get(p.id); return w && w.g === g ? w.i : Infinity; };
      groups[g] = list.map((p, k) => [p, k]).sort((a, b) => (pos(a[0]) - pos(b[0])) || (a[1] - b[1])).map(([p]) => p);
    }
  }
  orderGroupsLikeBase(data, base);
}

// Migrazione dalle versioni 1-2 (frasi senza id) alla 3. legacy: { V1_TEXTS, V2_TEXTS, DEPRECATED_TEXTS }.
// Gli esami mai personalizzati passano ai nuovi predefiniti; in quelli personalizzati restano le frasi
// dell'utente, spariscono le vecchie frasi predefinite non modificate e arrivano quelle nuove.
export function migrateFromV2(rawData, base, legacy, { previous = null } = {}) {
  const data = normalize(rawData);
  const restored = [];
  for (const esame of Object.values(data.esamiByMetodica).flat()) {
    const baseGroups = base.refertoByEsame[esame];
    if (!baseGroups) {
      // Esame che la base corrente non ha più: i vecchi predefiniti non modificati spariscono, il resto è dell'utente.
      const old = new Set([...(legacy.V1_TEXTS[esame] || []), ...(legacy.V2_TEXTS[esame] || []),
        ...legacy.DEPRECATED_TEXTS.filter((d) => d.esame === esame).map((d) => d.text)]);
      const groups = isObj(data.refertoByEsame[esame]) ? data.refertoByEsame[esame] : {};
      for (const [g, list] of Object.entries(groups)) {
        groups[g] = list.filter((p) => p.id || !old.has(p.text));
        groups[g].forEach((p) => { if (!p.id) p.id = newPhraseId(); });
        if (!groups[g].length) delete groups[g];
      }
      continue;
    }
    const old = new Set([...(legacy.V1_TEXTS[esame] || []), ...(legacy.V2_TEXTS[esame] || [])]);
    const deprecated = new Set(legacy.DEPRECATED_TEXTS.filter((d) => d.esame === esame).map((d) => d.text));
    const groups = isObj(data.refertoByEsame[esame]) ? data.refertoByEsame[esame] : {};
    const all = phrasesIn(groups).map((x) => x.phrase);
    if (!all.length || all.every((p) => old.has(p.text))) {
      data.refertoByEsame[esame] = baseForUser({ refertoByEsame: { [esame]: baseGroups } }).refertoByEsame[esame];
      restored.push(esame);
      continue;
    }
    const baseByText = new Map(phrasesIn(baseGroups).map((x) => [x.phrase.text, x.phrase]));
    for (const [g, list] of Object.entries(groups)) {
      groups[g] = list.filter((p) => {
        if (p.id) return true;
        if (deprecated.has(p.text)) return false;
        const b = baseByText.get(p.text);
        if (b) { p.id = b.id; p.bh = phraseHash(b); return true; }
        if (old.has(p.text)) return false; // vecchio predefinito non modificato: lo sostituisce la nuova base
        p.id = newPhraseId();
        return true;
      });
      if (!groups[g].length) delete groups[g];
    }
    data.refertoByEsame[esame] = groups;
  }
  // Ciò che c'era nella base v2 e manca qui l'ha eliminato l'utente: non va riproposto.
  const userExams = new Set(Object.values(data.esamiByMetodica).flat());
  for (const m of legacy.V2_METODICHE || []) if (!data.metodiche.includes(m)) data.removedBase.push(tomb.metodica(m));
  for (const esame of Object.keys(legacy.V2_TEXTS)) if (!userExams.has(esame)) data.removedBase.push(tomb.esame(esame));
  data.defaultsVersion = 2;
  const { data: merged, report } = mergeBase(data, base, { previous });
  return { data: merged, report: { ...report, esamiAggiornati: restored } };
}
