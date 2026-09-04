/* Dependency-free test: re-convert each example and compare to the committed output. */
'use strict';
const fs = require('fs');
const path = require('path');
const { vegaLiteToCxfigure } = require('./vega-lite-to-cxfigure');

const dir = path.join(__dirname, 'examples');
const inputs = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.vl.json'); });

let failed = 0;
inputs.forEach(function (inFile) {
  const base = inFile.replace(/\.vl\.json$/, '');
  const vl = JSON.parse(fs.readFileSync(path.join(dir, inFile), 'utf8'));
  const got = JSON.stringify(vegaLiteToCxfigure(vl), null, 2) + '\n';
  const expectedPath = path.join(dir, base + '.cxfigure.json');
  const expected = fs.readFileSync(expectedPath, 'utf8');
  if (got !== expected) {
    failed++;
    console.error('MISMATCH: ' + base + ' (converter output differs from committed .cxfigure.json)');
  } else {
    console.log('ok: ' + base);
  }
});

if (failed) { console.error('\n' + failed + ' example(s) failed.'); process.exit(1); }
console.log('\nAll ' + inputs.length + ' example(s) passed.');
