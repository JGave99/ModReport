// Generazione del PDF del referto: a capo per parole, più pagine, carta intestata su ogni pagina,
// font Unicode incorporato (≥ ≤ → α μ …) con ripiego su Helvetica.

const MM = 2.834645669; // punti per millimetro
export const mmToPt = (mm) => mm * MM;
const A4 = [595.28, 841.89];

let libsPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Impossibile caricare ' + src));
    document.head.appendChild(s);
  });
}

// Carica pdf-lib, fontkit e i font solo quando serve stampare.
export function loadPdfLibs(base = 'assets/') {
  if (!libsPromise) {
    libsPromise = (async () => {
      if (!window.PDFLib) await loadScript(base + 'vendor/pdf-lib.min.js');
      let fonts = null;
      try {
        if (!window.fontkit) await loadScript(base + 'vendor/fontkit.umd.min.js');
        const [regular, bold] = await Promise.all([
          fetch(base + 'fonts/pdf/Inter-Regular.ttf').then((r) => { if (!r.ok) throw new Error(); return r.arrayBuffer(); }),
          fetch(base + 'fonts/pdf/Inter-Bold.ttf').then((r) => { if (!r.ok) throw new Error(); return r.arrayBuffer(); }),
        ]);
        fonts = { regular, bold };
      } catch (e) {
        fonts = null; // si userà Helvetica con la sostituzione dei caratteri non supportati
      }
      return { PDFLib: window.PDFLib, fontkit: window.fontkit || null, fonts };
    })().catch((e) => { libsPromise = null; throw e; });
  }
  return libsPromise;
}

// Divide il testo in righe che stanno in maxWidth. measure(text) restituisce la larghezza in punti.
// Le parole più lunghe della riga vengono spezzate per caratteri.
export function wrapText(text, measure, maxWidth) {
  const out = [];
  for (const para of String(text).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')) {
    if (!para.trim()) { out.push(''); continue; }
    let line = '';
    for (const word of para.split(/ +/)) {
      if (!word) continue;
      const candidate = line ? line + ' ' + word : word;
      if (measure(candidate) <= maxWidth) { line = candidate; continue; }
      if (line) { out.push(line); line = ''; }
      if (measure(word) <= maxWidth) { line = word; continue; }
      let chunk = '';
      for (const ch of word) {
        if (measure(chunk + ch) > maxWidth && chunk) { out.push(chunk); chunk = ch; } else chunk += ch;
      }
      line = chunk;
    }
    out.push(line);
  }
  return out;
}

// Ripiego per Helvetica (WinAnsi): sostituisce i caratteri non codificabili.
const REPLACEMENTS = {
  '≥': '>=', '≤': '<=', '→': '->', '←': '<-', '↔': '<->', '−': '-', '≈': '~', '≠': '!=',
  'α': 'alfa', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'Δ': 'Delta', 'μ': 'µ', '✓': 'v', '•': '-',
};
export function toWinAnsi(text, canEncode) {
  const replaced = new Set();
  let out = '';
  for (const ch of String(text)) {
    if (ch === '\n' || canEncode(ch)) { out += ch; continue; }
    const sub = REPLACEMENTS[ch];
    out += sub !== undefined && [...sub].every(canEncode) ? sub : '?';
    replaced.add(ch);
  }
  return { text: out, replaced: [...replaced] };
}

// Crea il PDF. template: ArrayBuffer della carta intestata (o null per pagina bianca).
// margins in mm: { top, left, right, bottom }. signature: stringa o null.
// Restituisce { bytes, pages, fontFallback, replacedChars }.
export async function buildReportPdf({ text, template = null, margins = {}, signature = null, base, libs = null }) {
  const { PDFLib, fontkit, fonts } = libs || await loadPdfLibs(base);
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const m = { top: 40, left: 20, right: 20, bottom: 20, ...margins };

  const doc = await PDFDocument.create();
  let tpl = null;
  if (template) {
    tpl = await PDFDocument.load(template, { ignoreEncryption: true });
    if (!tpl.getPageCount()) throw new Error('La carta intestata non contiene pagine.');
  }

  let font, bold, fontFallback = false;
  if (fonts && fontkit) {
    doc.registerFontkit(fontkit);
    // Font intero: il sottoinsieme (subset) di pdf-lib 1.17 perde glifi con Inter.
    font = await doc.embedFont(fonts.regular);
    bold = signature ? await doc.embedFont(fonts.bold) : font;
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
    fontFallback = true;
  }

  let body = String(text);
  let sign = signature;
  let replacedChars = [];
  if (fontFallback) {
    const canEncode = (ch) => { try { font.encodeText(ch); return true; } catch { return false; } };
    const r1 = toWinAnsi(body, canEncode);
    body = r1.text;
    replacedChars = r1.replaced;
    if (sign) sign = toWinAnsi(sign, canEncode).text;
  }

  // Prima pagina della carta intestata per la pagina 1; la seconda (se c'è) per le successive.
  const addPage = async () => {
    if (tpl) {
      const index = doc.getPageCount() === 0 || tpl.getPageCount() < 2 ? 0 : 1;
      const [copied] = await doc.copyPages(tpl, [index]);
      return doc.addPage(copied);
    }
    return doc.addPage(A4);
  };

  const fontSize = 11;
  const lineHeight = fontSize * 1.4;
  let page = await addPage();
  let { width, height } = page.getSize();
  const maxWidth = width - mmToPt(m.left) - mmToPt(m.right);
  if (maxWidth < 50) throw new Error('Margini troppo ampi per la larghezza della pagina.');
  const bottom = mmToPt(m.bottom);
  let y = height - mmToPt(m.top);

  const lines = wrapText(body, (s) => font.widthOfTextAtSize(s, fontSize), maxWidth);
  for (const line of lines) {
    if (y - lineHeight < bottom) {
      page = await addPage();
      ({ width, height } = page.getSize());
      y = height - mmToPt(m.top);
    }
    y -= lineHeight;
    if (line) page.drawText(line, { x: mmToPt(m.left), y, size: fontSize, font, color: rgb(0, 0, 0) });
  }

  if (sign) {
    const needed = lineHeight * 3;
    if (y - needed < bottom) {
      page = await addPage();
      ({ width, height } = page.getSize());
      y = height - mmToPt(m.top);
    }
    y -= lineHeight * 3;
    const w = bold.widthOfTextAtSize(sign, fontSize);
    page.drawText(sign, { x: width - mmToPt(m.right) - w, y, size: fontSize, font: bold, color: rgb(0, 0, 0) });
  }

  const pages = doc.getPageCount();
  if (pages > 1) {
    doc.getPages().forEach((p, i) => {
      const label = 'Pagina ' + (i + 1) + ' di ' + pages;
      const size = 8;
      const w = font.widthOfTextAtSize(label, size);
      const { width: pw } = p.getSize();
      p.drawText(label, { x: pw - mmToPt(m.right) - w, y: Math.max(10, bottom / 2), size, font, color: rgb(0.35, 0.35, 0.35) });
    });
  }

  return { bytes: await doc.save(), pages, fontFallback, replacedChars };
}
