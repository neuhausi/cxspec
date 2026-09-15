/* Dependency-free tests for both converters + the round trip on the shared fixture corpus.
 *
 *   *.vl.json       Vega-Lite inputs  -> *.cxfigure.json         (vega-lite-to-cxfigure)
 *   *.cx.json       cxfigure inputs   -> *.export.vl.json + *.export.report.json (cxfigure-to-vega-lite)
 *   round trip      vl -> cx -> vl  and  cx -> vl -> cx  must agree on the mapped surface
 *
 * Run with UPDATE=1 to (re)write the committed outputs deliberately.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { vegaLiteToCxfigure } = require('./vega-lite-to-cxfigure');
const { cxfigureToVegaLite } = require('./cxfigure-to-vega-lite');

const dir = path.join(__dirname, 'examples');
const UPDATE = process.env.UPDATE === '1';
let failed = 0, n = 0;
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const pretty = (o) => JSON.stringify(o, null, 2) + '\n';
function check(name, got, expectedFile) {
  n++;
  const p = path.join(dir, expectedFile);
  if (UPDATE || !fs.existsSync(p)) { fs.writeFileSync(p, got); console.log('wrote: ' + expectedFile); return; }
  if (fs.readFileSync(p, 'utf8') !== got) { failed++; console.error('MISMATCH: ' + name + ' (' + expectedFile + ')'); } else { console.log('ok: ' + name); }
}
function assert(cond, msg) { n++; if (!cond) { failed++; console.error('FAIL: ' + msg); } else { console.log('ok: ' + msg); } }
const markOf = (s) => typeof s.mark === 'string' ? s.mark : s.mark.type;
const fields = (s) => { const e = s.encoding || {}; const o = {}; Object.keys(e).forEach((k) => { if (e[k] && e[k].field) o[k] = e[k].field; }); return o; };
const recordKey = (r) => JSON.stringify(Object.keys(r).sort().map((k) => [k, r[k]]));
const sameRecords = (a, b) => a.length === b.length && a.map(recordKey).sort().join('|') === b.map(recordKey).sort().join('|');

// ---- inbound + round trip vl -> cx -> vl ----
fs.readdirSync(dir).filter((f) => f.endsWith('.vl.json') && !f.endsWith('.export.vl.json')).forEach((inFile) => {
  const base = inFile.replace(/\.vl\.json$/, '');
  const vl = read(inFile);
  const cx = vegaLiteToCxfigure(vl);
  check('inbound ' + base, pretty(cx), base + '.cxfigure.json');
  const back = cxfigureToVegaLite(cx).spec;
  assert(markOf(back) === markOf(vl), 'roundtrip ' + base + ': mark ' + markOf(vl));
  const fin = fields(vl), fout = fields(back);
  // Compare the channels the inbound converter maps (x, y, color, size, shape, theta).
  ['x', 'y', 'color', 'size', 'shape', 'theta'].forEach((ch) => {
    if (fin[ch]) { assert(fout[ch] === fin[ch], 'roundtrip ' + base + ': encoding.' + ch + '.field ' + fin[ch]); }
  });
  assert(sameRecords(back.data.values, vl.data.values), 'roundtrip ' + base + ': data records identical (' + vl.data.values.length + ')');
});

// ---- outbound + round trip cx -> vl -> cx ----
fs.readdirSync(dir).filter((f) => f.endsWith('.cx.json')).forEach((inFile) => {
  const base = inFile.replace(/\.cx\.json$/, '');
  const cx = read(inFile);
  const out = cxfigureToVegaLite(cx);
  check('outbound ' + base, pretty(out.spec), base + '.export.vl.json');
  check('report ' + base, pretty(out.report), base + '.export.report.json');
  assert(Array.isArray(out.report.dropped) && typeof out.report.lossless === 'boolean', 'report ' + base + ': has dropped[] + lossless');
  const back = vegaLiteToCxfigure(out.spec);
  const gt = cx.config.graphType;
  assert(back.config.graphType === gt, 'roundtrip ' + base + ': graphType ' + gt);
  // The mapped surface: the re-imported figure must plot the same fields the export encoded.
  const e = out.spec.encoding;
  if (gt === 'Scatter2D') {
    assert(back.config.xAxis[0] === e.x.field && back.config.yAxis[0] === e.y.field, 'roundtrip ' + base + ': axes ' + e.x.field + '/' + e.y.field);
    if (e.color) { assert(back.config.colorBy === e.color.field, 'roundtrip ' + base + ': colorBy ' + e.color.field); }
  }
  // Data: the export's records survive the trip as the data-frame rows.
  const rows = back.data; const hdr = rows[0];
  const recs = rows.slice(1).map((r) => { const o = {}; hdr.forEach((h, i) => { o[h] = r[i]; }); return o; });
  assert(sameRecords(recs, out.spec.data.values), 'roundtrip ' + base + ': ' + out.spec.data.values.length + ' records survive');
});

if (failed) { console.error('\n' + failed + ' of ' + n + ' checks failed.'); process.exit(1); }
console.log('\nAll ' + n + ' checks passed.');
