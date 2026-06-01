'use strict';
/*
  Assemble the verified algorithms into the browser bundle.

  Usage: node assemble.js <results.json> <algosDir> <out-algorithms.js> <out-manifest.json>

  - results.json: output of `node harness.js --all <algosDir> --json results.json`
  - Only algorithms with pass === true are included.
  - Files are concatenated in id order (each is already an IIFE calling IIC.register).
  - A manifest of metadata is written for the writeup / data needs.
*/
const fs = require('fs');
const path = require('path');

const [, , resultsPath, algosDir, outBundle, outManifest] = process.argv;
if (!resultsPath || !algosDir || !outBundle || !outManifest) {
  console.error('usage: node assemble.js <results.json> <algosDir> <out-bundle.js> <out-manifest.json>');
  process.exit(2);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const passing = results.results.filter((r) => r.pass);

// load metadata by re-running each file against an IIC stub
function meta(file) {
  const text = fs.readFileSync(file, 'utf8');
  let captured = null;
  const IIC = { register(o) { captured = o; } };
  // eslint-disable-next-line no-new-func
  new Function('IIC', text)(IIC);
  return { obj: captured, text };
}

const entries = [];
for (const r of passing) {
  const full = path.join(algosDir, r.file);
  const { obj, text } = meta(full);
  entries.push({
    id: obj.id, name: obj.name, cohort: obj.cohort, derive: obj.derive,
    methodology: obj.methodology, flavor: obj.flavor, file: r.file, text,
  });
}
entries.sort((a, b) => a.id - b.id);

// ---- bundle ----
const header = `/*
  algorithms.js — the parliament.

  ${entries.length} independent algorithms, each assembled verbatim from a file that passed a node
  correctness gate over ~148,000 (timezone, instant) samples spanning 1970..2200 and every populated
  UTC offset. Each is an IIFE that registers itself with the engine via IIC.register(). They do not
  share state; they only share the question.

  Generated, not hand-written. See https://benjaminste.in/blog/2026/05/29/building-isitchristmas/
*/
`;
const body = entries
  .map((e) => `/* #${e.id} — ${e.name} [${e.cohort}] */\n${e.text.trim()}\n`)
  .join('\n');
fs.writeFileSync(outBundle, header + '\n' + body);

// ---- manifest (metadata only, no source) ----
const manifest = {
  count: entries.length,
  cohorts: entries.reduce((acc, e) => { acc[e.cohort] = (acc[e.cohort] || 0) + 1; return acc; }, {}),
  derive: entries.reduce((acc, e) => { acc[e.derive] = (acc[e.derive] || 0) + 1; return acc; }, {}),
  algorithms: entries.map((e) => ({ id: e.id, name: e.name, cohort: e.cohort, derive: e.derive, methodology: e.methodology, flavor: e.flavor })),
};
fs.writeFileSync(outManifest, JSON.stringify(manifest, null, 2));

console.log('Assembled ' + entries.length + ' algorithms into ' + outBundle);
console.log('Bundle size: ' + (fs.statSync(outBundle).size / 1024).toFixed(1) + ' KB');
console.log('Cohorts: ' + JSON.stringify(manifest.cohorts));
console.log('Derive:  ' + JSON.stringify(manifest.derive));
