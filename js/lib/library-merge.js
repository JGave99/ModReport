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
  for (const [esame, groups] of Object.entries(data.refertoByEsame)) {
    if (!isObj(groups)) { data.refertoByEsame[esame] = {}; continue; }
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
function mergeExam(userGroups, baseGroups, removed) {
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
export function mergeBase(rawData, base) {
  const data = normalize(rawData);
  const removed = new Set(data.removedBase);
  const report = { esamiAggiunti: [], frasiAggiunte: 0 };
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
      report.frasiAggiunte += mergeExam(data.refertoByEsame[esame], base.refertoByEsame[esame] || {}, removed);
    }
  }
  data.defaultsVersion = base.defaultsVersion;
  return { data, report };
}

// Migrazione dalle versioni 1-2 (frasi senza id) alla 3. legacy: { V1_TEXTS, V2_TEXTS, DEPRECATED_TEXTS }.
// Gli esami mai personalizzati passano ai nuovi predefiniti; in quelli personalizzati restano le frasi
// dell'utente, spariscono le vecchie frasi predefinite non modificate e arrivano quelle nuove.
export function migrateFromV2(rawData, base, legacy) {
  const data = normalize(rawData);
  const restored = [];
  for (const esame of Object.values(data.esamiByMetodica).flat()) {
    const baseGroups = base.refertoByEsame[esame];
    if (!baseGroups) {
      for (const list of Object.values(data.refertoByEsame[esame] || {})) list.forEach((p) => { if (!p.id) p.id = newPhraseId(); });
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
  const { data: merged, report } = mergeBase(data, base);
  return { data: merged, report: { ...report, esamiAggiornati: restored } };
}
