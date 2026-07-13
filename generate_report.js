/**
 * Daily Semiconductor Market Report Generator
 *
 * Usage:  node generate_report.js <content.json>
 * Output: reports/YYYY.M.D市场点评.docx
 *
 * content.json schema:
 *   date     {string}  "4月17日"
 *   year     {number}  2026  (optional, defaults to current year)
 *   section1 {string}  三大股指 + 国证芯片（合并一段）       ≥60 chars
 *   section2 {string}  半导体盘面行情（盘初…截至收盘…点评）  ≥125 chars
 *   section3 {string}  策略建议（必须以"建议策略："开头）    ≥50 chars
 *
 * Rules:
 *   - First sentence of each body paragraph is bolded automatically
 *   - ASCII double-quotes in content are converted to Chinese curly quotes " "
 *   - Template is the latest docx found in reports/
 *   - Output is saved to reports/
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const AdmZip  = require('adm-zip');
const mammoth = require('mammoth');

const REPORTS_DIR = path.join(__dirname, 'reports');

// ── XML helpers ──────────────────────────────────────────────────────────────

function smartQuotes(str) {
  let open = true;
  return str.replace(/"/g, () => { const q = open ? '\u201C' : '\u201D'; open = !open; return q; });
}

function esc(str) {
  return smartQuotes(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const KTI_RPR  = `<w:rFonts w:ascii="楷体" w:eastAsia="楷体" w:hAnsi="楷体" w:cs="楷体"/>`;
const BOLD_RPR = KTI_RPR + `<w:b/><w:bCs/>`;

function titlePara(text) {
  return `<w:p><w:pPr><w:jc w:val="center"/><w:rPr>${BOLD_RPR}<w:sz w:val="28"/><w:szCs w:val="36"/></w:rPr></w:pPr>` +
         `<w:r><w:rPr>${BOLD_RPR}<w:sz w:val="28"/><w:szCs w:val="36"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`;
}

// Body paragraph: bold region is determined by boldEnd (char count) if given,
// otherwise defaults to the first sentence (up to first 。).
function bodyPara(text, boldEnd) {
  const pPr = `<w:pPr><w:ind w:firstLineChars="200" w:firstLine="422"/><w:rPr>${KTI_RPR}</w:rPr></w:pPr>`;
  let head, tail;
  if (boldEnd !== undefined) {
    head = text.slice(0, boldEnd);
    tail = text.slice(boldEnd);
  } else {
    const idx = text.indexOf('。');
    head = idx !== -1 ? text.slice(0, idx + 1) : text;
    tail = idx !== -1 ? text.slice(idx + 1)    : '';
  }
  let runs = `<w:r><w:rPr>${BOLD_RPR}</w:rPr><w:t xml:space="preserve">${esc(head)}</w:t></w:r>`;
  if (tail) runs += `<w:r><w:rPr>${KTI_RPR}</w:rPr><w:t xml:space="preserve">${esc(tail)}</w:t></w:r>`;
  return `<w:p>${pPr}${runs}</w:p>`;
}

// ── Document builder ─────────────────────────────────────────────────────────

function buildDocumentXml(templateXml, content) {
  const ns     = templateXml.slice(0, templateXml.indexOf('<w:body>'));
  const sectPr = (templateXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/) || ['<w:sectPr/>'])[0];
  const paras  = [
    titlePara(`电子半导体行情点评（${content.date}）`),
    bodyPara(content.section1),
    bodyPara(content.section2),
    bodyPara(content.section3, '建议策略：'.length),
    '<w:p/>',
  ].join('');
  return `${ns}<w:body>${paras}${sectPr}</w:body></w:document>`;
}

// ── Validation ───────────────────────────────────────────────────────────────

function validate(content) {
  if (!content.date) throw new Error('Missing: date');
  const rules = [
    { f: 'section1', min: 60,  kw: ['沪指', '深指', '创业板', '980017'] },
    { f: 'section2', min: 125, kw: ['截至收盘'] },
    { f: 'section3', min: 50,  sw: '建议策略' },
  ];
  for (const r of rules) {
    const v = (content[r.f] || '').trim();
    if (!v)           throw new Error(`Missing: ${r.f}`);
    if (v.length < r.min) throw new Error(`${r.f} too short (${v.length} < ${r.min})`);
    for (const kw of (r.kw || [])) if (!v.includes(kw)) throw new Error(`${r.f} missing "${kw}"`);
    if (r.sw && !v.startsWith(r.sw)) throw new Error(`${r.f} must start with "${r.sw}"`);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function findLatestTemplate() {
  const parse = f => { const [y,m,d] = f.match(/(\d+)\.(\d+)\.(\d+)/).slice(1); return new Date(+y,+m-1,+d); };
  const files = fs.readdirSync(REPORTS_DIR)
    .filter(f => /^\d{4}\.\d+\.\d+市场点评\.docx$/.test(f))
    .sort((a, b) => parse(b) - parse(a));
  if (!files.length) throw new Error('No template docx in ' + REPORTS_DIR);
  return path.join(REPORTS_DIR, files[0]);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) { console.error('Usage: node generate_report.js <content.json>'); process.exit(1); }

  const content     = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  validate(content);

  const zip         = new AdmZip(findLatestTemplate());
  zip.updateFile('word/document.xml',
    Buffer.from(buildDocumentXml(zip.readAsText('word/document.xml'), content), 'utf8'));

  const dateParsed  = content.date.replace('月', '.').replace('日', '');
  const year        = content.year || new Date().getFullYear();
  const outputPath  = path.join(REPORTS_DIR, `${year}.${dateParsed}市场点评.docx`);
  zip.writeZip(outputPath);

  const { value: text } = await mammoth.extractRawText({ path: outputPath });
  if (!text.includes('电子半导体行情点评') || text.length < 400) {
    fs.unlinkSync(outputPath); throw new Error(`Validation failed: ${text.length} chars`);
  }
  console.log(`✓ reports/${year}.${dateParsed}市场点评.docx  [${text.length} chars]`);

  if (path.basename(inputPath).endsWith('_temp.json')) fs.unlinkSync(inputPath);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
