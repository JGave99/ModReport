import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { wrapText, toWinAnsi, buildReportPdf } from '../../js/lib/pdf.js';

const require = createRequire(import.meta.url);
const PDFLib = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const root = new URL('../../', import.meta.url);
const fonts = {
  regular: readFileSync(new URL('assets/fonts/pdf/Inter-Regular.ttf', root)),
  bold: readFileSync(new URL('assets/fonts/pdf/Inter-Bold.ttf', root)),
};
const measure = (s) => s.length * 6;

test('wrapText: va a capo per parole e conserva le righe vuote', () => {
  assert.deepEqual(wrapText('uno due tre quattro', measure, 60), ['uno due', 'tre', 'quattro']);
  assert.deepEqual(wrapText('a\n\nb', measure, 60), ['a', '', 'b']);
});

test('wrapText: spezza le parole più lunghe della riga', () => {
  const lines = wrapText('x'.repeat(25), measure, 60);
  assert.deepEqual(lines, ['x'.repeat(10), 'x'.repeat(10), 'x'.repeat(5)]);
});

test('toWinAnsi: sostituisce solo i caratteri non stampabili, tiene gli a capo', () => {
  const canEncode = (ch) => ch.charCodeAt(0) < 256;
  const r = toWinAnsi('a ≥ b\nc → d', canEncode);
  assert.equal(r.text, 'a >= b\nc -> d');
  assert.deepEqual(r.replaced, ['≥', '→']);
});

async function pageCount(bytes) {
  return (await PDFLib.PDFDocument.load(bytes)).getPageCount();
}

test('PDF: testo lungo su più pagine, con caratteri Unicode', async () => {
  const text = 'Nodulo ≥ 10 mm → controllo\n' + Array.from({ length: 120 }, (_, i) => 'Riga ' + i).join('\n');
  const r = await buildReportPdf({ text, signature: 'Dott. Test', libs: { PDFLib, fontkit, fonts } });
  assert.equal(r.fontFallback, false);
  assert.ok(r.pages >= 3);
  assert.equal(await pageCount(r.bytes), r.pages);
});

test('PDF: senza font incorporato usa Helvetica e segnala i caratteri sostituiti', async () => {
  const r = await buildReportPdf({ text: 'a ≥ b', libs: { PDFLib, fontkit: null, fonts: null } });
  assert.equal(r.fontFallback, true);
  assert.deepEqual(r.replacedChars, ['≥']);
});

function pageText(doc, page) {
  const contents = page.node.Contents();
  const refs = contents instanceof PDFLib.PDFArray ? contents.asArray() : [contents];
  return refs.map((ref) => {
    const stream = ref instanceof PDFLib.PDFRef ? doc.context.lookup(ref) : ref;
    const bytes = stream instanceof PDFLib.PDFRawStream ? PDFLib.decodePDFRawStream(stream).decode() : stream.getContents();
    return Buffer.from(bytes).toString('latin1');
  }).join('\n');
}

test('PDF: carta intestata su ogni pagina, senza ripetere il testo della pagina 1', async () => {
  const tpl = await PDFLib.PDFDocument.create();
  const helv = await tpl.embedFont(PDFLib.StandardFonts.Helvetica);
  tpl.addPage([595.28, 841.89]).drawText('INTESTAZIONE', { x: 40, y: 800, size: 12, font: helv });
  const text = Array.from({ length: 100 }, (_, i) => 'Riga ' + i).join('\n');
  const r = await buildReportPdf({ text, template: await tpl.save(), libs: { PDFLib, fontkit: null, fonts: null } });
  assert.ok(r.pages >= 2);
  const doc = await PDFLib.PDFDocument.load(r.bytes);
  const [p1, p2] = doc.getPages().map((p) => pageText(doc, p));
  // pdf-lib scrive il testo in esadecimale: <52696761…> Tj
  const hex = (s) => '<' + Buffer.from(s, 'latin1').toString('hex').toUpperCase() + '>';
  assert.ok(p1.includes(hex('INTESTAZIONE')) && p2.includes(hex('INTESTAZIONE')));
  assert.ok(p1.includes(hex('Riga 0')));
  assert.ok(!p2.includes(hex('Riga 0')));
});

test('PDF: dati del paziente in testa e luogo e data accanto alla firma', async () => {
  const r = await buildReportPdf({
    text: 'Referto.', signature: 'Dott.ssa Test', dateLine: 'Milano, 05/10/2026',
    header: [{ label: 'Paziente', value: 'Rossi Mario' }, { label: 'Data di nascita', value: '' }],
    libs: { PDFLib, fontkit: null, fonts: null },
  });
  const doc = await PDFLib.PDFDocument.load(r.bytes);
  const p1 = pageText(doc, doc.getPages()[0]);
  const hex = (s) => '<' + Buffer.from(s, 'latin1').toString('hex').toUpperCase() + '>';
  for (const s of ['Paziente: ', 'Rossi Mario', 'Milano, 05/10/2026', 'Dott.ssa Test', 'Referto.']) assert.ok(p1.includes(hex(s)), s);
  assert.ok(!p1.includes(hex('Data di nascita: ')), 'i campi vuoti non si stampano');
});

test('PDF: margini troppo grandi danno un errore chiaro', async () => {
  await assert.rejects(
    buildReportPdf({ text: 'x', margins: { left: 150, right: 150 }, libs: { PDFLib, fontkit: null, fonts: null } }),
    /Margini troppo ampi/,
  );
});
