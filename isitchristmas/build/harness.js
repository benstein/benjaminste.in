#!/usr/bin/env node
'use strict';
/*
  Is It Christmas — authoritative correctness gate.

  An "algorithm" is a JS file that calls IIC.register({ id, name, cohort, methodology, flavor, vote }).
  `vote(ctx)` must return a boolean: is the visitor's LOCAL civil date December 25?

  ctx (frozen) is built from a single (instant, IANA timezone) pair the way the browser builds it:
    epochMs        true UTC instant (like Date.now())
    offsetMinutes  new Date().getTimezoneOffset()  == (UTC - local) in minutes
    localMs        epochMs - offsetMinutes*60000  -> epoch whose UTC breakdown == local wall clock
    timeZone       IANA zone string
    isoLocal       local wall-clock ISO, no zone (yyyy-mm-ddThh:mm:ss)

  THE TRICK: new Date(localMs).getUTC*() returns the visitor's LOCAL civil fields, so a pure
  epoch->civil algorithm operating on localMs is automatically timezone-aware.

  Usage:
    node harness.js --selftest                 self-check ground truth + reference algorithms
    node harness.js <file.js> [file2.js ...]    test specific algorithm file(s)
    node harness.js --all <dir>                 test every *.js in dir, write JSON summary to stdout
    node harness.js --all <dir> --json <out>    also write summary to <out>

  Exit code 0 if all tested algorithms PASS, 1 otherwise (in --selftest, 0 iff self-checks pass).
*/

const fs = require('fs');
const path = require('path');

// ---- ground truth -----------------------------------------------------------

function dtfParts(epochMs, tz, opts) {
  const dtf = new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, opts));
  const out = {};
  for (const p of dtf.formatToParts(new Date(epochMs))) out[p.type] = p.value;
  return out;
}

// Is it Dec 25 in `tz` at `epochMs`? (the thing we are trying to compute)
function groundTruth(epochMs, tz) {
  const p = dtfParts(epochMs, tz, { month: 'numeric', day: 'numeric' });
  return Number(p.month) === 12 && Number(p.day) === 25;
}

// (local - UTC) offset in minutes for tz at instant.
function offsetLocalMinusUTC(epochMs, tz) {
  const p = dtfParts(epochMs, tz, {
    hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  let H = Number(p.hour);
  if (H === 24) H = 0; // some engines emit 24 at midnight
  const asUTC = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), H, Number(p.minute), Number(p.second));
  return Math.round((asUTC - epochMs) / 60000);
}

function buildCtx(epochMs, tz) {
  const offLocalMinusUTC = offsetLocalMinusUTC(epochMs, tz);
  const offsetMinutes = -offLocalMinusUTC;            // browser getTimezoneOffset() convention
  const localMs = epochMs - offsetMinutes * 60000;    // == epochMs + offLocalMinusUTC*60000
  const isoLocal = new Date(localMs).toISOString().slice(0, 19);
  return Object.freeze({ epochMs, offsetMinutes, localMs, timeZone: tz, isoLocal });
}

// ---- test battery -----------------------------------------------------------

const ZONES = [
  'UTC', 'Etc/GMT+12', 'Pacific/Pago_Pago', 'Pacific/Honolulu', 'Pacific/Marquesas',
  'America/Anchorage', 'America/Los_Angeles', 'America/Denver', 'America/Chicago',
  'America/New_York', 'America/St_Johns', 'America/Sao_Paulo', 'Atlantic/Cape_Verde',
  'Europe/London', 'Europe/Berlin', 'Europe/Moscow', 'Asia/Tehran', 'Asia/Dubai',
  'Asia/Kabul', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Kathmandu', 'Asia/Dhaka',
  'Asia/Yangon', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Eucla',
  'Australia/Darwin', 'Australia/Sydney', 'Australia/Lord_Howe', 'Pacific/Auckland',
  'Pacific/Chatham', 'Pacific/Kiritimati',
];

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// Deterministic PRNG so the battery is reproducible.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN_YEAR = 1970;
const MAX_YEAR = 2200;

// Build (epochMs, tz) samples. Returns array of [epochMs, tz].
function buildBattery() {
  const samples = [];
  // 1) Dense hourly sweep around Christmas across many years and zones.
  const denseYears = [1972, 1999, 2000, 2023, 2024, 2025, 2026, 2027, 2099, 2100, 2199, 2200];
  for (const y of denseYears) {
    const start = Date.UTC(y, 11, 20, 0, 0, 0); // Dec 20
    const end = Date.UTC(y, 11, 28, 0, 0, 0);   // Dec 28
    for (let t = start; t < end; t += HOUR) {
      for (const tz of ZONES) samples.push([t, tz]);
    }
  }
  // 2) Full-year daily sweep (noon UTC) to catch leap / day-of-year errors -> all should be NO except the Dec 25 instants.
  const fullYears = [1972, 2000, 2024, 2025, 2100];
  for (const y of fullYears) {
    for (let t = Date.UTC(y, 0, 1, 12, 0, 0); t < Date.UTC(y + 1, 0, 1, 12, 0, 0); t += DAY) {
      for (const tz of ZONES) samples.push([t, tz]);
    }
  }
  // 3) Random sweep across the full supported range and all zones.
  const rnd = mulberry32(0x15171575);
  const lo = Date.UTC(MIN_YEAR, 0, 1);
  const hi = Date.UTC(MAX_YEAR, 11, 31);
  for (let i = 0; i < 8000; i++) {
    const t = lo + Math.floor(rnd() * (hi - lo));
    const tz = ZONES[Math.floor(rnd() * ZONES.length)];
    samples.push([t, tz]);
  }
  return samples;
}

let BATTERY = null;
function battery() { if (!BATTERY) BATTERY = buildBattery(); return BATTERY; }

// Prepared battery: ctx fields + expected answer, precomputed once (Intl is the bottleneck)
// and cached to disk so every algorithm test is just vote() calls.
const CACHE = path.join(__dirname, 'battery.json');
let PREPARED = null;

function prepareBattery() {
  const raw = battery();
  const out = new Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const [epochMs, tz] = raw[i];
    const ctx = buildCtx(epochMs, tz);
    out[i] = { epochMs: ctx.epochMs, offsetMinutes: ctx.offsetMinutes, localMs: ctx.localMs, timeZone: ctx.timeZone, isoLocal: ctx.isoLocal, expected: groundTruth(epochMs, tz) };
  }
  return out;
}

function loadPrepared() {
  if (PREPARED) return PREPARED;
  if (fs.existsSync(CACHE)) {
    try { PREPARED = JSON.parse(fs.readFileSync(CACHE, 'utf8')); return PREPARED; } catch (e) { /* rebuild */ }
  }
  PREPARED = prepareBattery();
  try { fs.writeFileSync(CACHE, JSON.stringify(PREPARED)); } catch (e) { /* best effort */ }
  return PREPARED;
}

// ---- algorithm loading ------------------------------------------------------

function loadAlgo(file) {
  const text = fs.readFileSync(file, 'utf8');
  let captured = null;
  const IIC = {
    register(obj) { captured = obj; },
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function('IIC', 'window', 'globalThis', text + '\n;return (typeof IIC!=="undefined")?IIC:null;');
  fn(IIC, undefined, undefined);
  if (!captured) throw new Error('file did not call IIC.register({...})');
  if (typeof captured.vote !== 'function') throw new Error('registered object has no vote() function');
  return { algo: captured, text };
}

// "from-scratch" cohorts must derive the civil date from the integer ctx.localMs alone:
// no Date, no Intl, no civil getters, no string extraction, no ctx.isoLocal/timeZone shortcut.
const SCRATCH_FORBIDDEN = /\bIntl\b|\bnew\s+Date\b|getUTC\w+|\.getMonth|\.getDate|\.getDay|\.getHours|\.getMinutes|\.getSeconds|\.getFullYear|toISOString|toLocale\w*|toUTCString|toDateString|toTimeString|isoLocal|timeZone/;
function lintScratch(text) {
  // strip line/block comments and strings so a token mentioned in prose/a label doesn't trip it
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
  const m = code.match(SCRATCH_FORBIDDEN);
  return m ? [m[0]] : [];
}

// ---- testing ----------------------------------------------------------------

function testAlgo(algo) {
  const samples = loadPrepared();
  const failures = [];
  let failCount = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const ctx = Object.freeze({ epochMs: s.epochMs, offsetMinutes: s.offsetMinutes, localMs: s.localMs, timeZone: s.timeZone, isoLocal: s.isoLocal });
    let got;
    try {
      got = algo.vote(ctx);
    } catch (e) {
      failCount++;
      if (failures.length < 12) failures.push({ epochMs: s.epochMs, tz: s.timeZone, isoLocal: s.isoLocal, expected: s.expected, error: String(e && e.message || e) });
      continue;
    }
    if (Boolean(got) !== s.expected) {
      failCount++;
      if (failures.length < 12) failures.push({ epochMs: s.epochMs, tz: s.timeZone, isoLocal: s.isoLocal, expected: s.expected, got: got });
    }
  }
  return { pass: failCount === 0, total: samples.length, failCount, sampleFailures: failures.slice(0, 12) };
}

// ---- reference algorithms (for self-test) ----------------------------------

const REF_NAIVE = {
  id: 0, name: 'reference-naive', cohort: 'reference',
  vote(ctx) { const d = new Date(ctx.localMs); return d.getUTCMonth() === 11 && d.getUTCDate() === 25; },
};
// A from-scratch epoch->civil reference (Howard Hinnant's civil_from_days).
const REF_HINNANT = {
  id: -1, name: 'reference-hinnant', cohort: 'reference',
  vote(ctx) {
    let z = Math.floor(ctx.localMs / 86400000); // days since 1970-01-01
    z += 719468;
    const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
    const doe = z - era * 146097;
    const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    const y = yoe + era * 400;
    const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    const mp = Math.floor((5 * doy + 2) / 153);
    const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
    const m = mp < 10 ? mp + 3 : mp - 9;
    return m === 12 && d === 25;
  },
};

// ---- CLI --------------------------------------------------------------------

function selftest() {
  let ok = true;
  function check(name, cond) { if (!cond) { ok = false; console.log('  FAIL  ' + name); } else { console.log('  ok    ' + name); } }

  // Hand-verified ground-truth cases.
  const ny_xmas_noonZ = Date.UTC(2026, 11, 25, 12, 0, 0); // NY local 07:00 Dec 25
  check('groundTruth NY 2026-12-25T12:00Z == YES', groundTruth(ny_xmas_noonZ, 'America/New_York') === true);
  const ny_early = Date.UTC(2026, 11, 25, 2, 0, 0);       // NY local Dec 24 21:00
  check('groundTruth NY 2026-12-25T02:00Z == NO', groundTruth(ny_early, 'America/New_York') === false);
  const kiri_start = Date.UTC(2026, 11, 24, 11, 0, 0);    // Kiritimati +14 -> Dec 25 01:00
  check('groundTruth Kiritimati 2026-12-24T11:00Z == YES', groundTruth(kiri_start, 'Pacific/Kiritimati') === true);

  // ctx local fields must equal Intl-formatted local fields.
  let ctxOk = true;
  for (const [t, tz] of [[ny_xmas_noonZ, 'America/New_York'], [kiri_start, 'Pacific/Kiritimati'], [Date.UTC(2024, 1, 29, 23, 30), 'Asia/Kolkata'], [Date.UTC(2025, 6, 1, 0, 0), 'Australia/Lord_Howe']]) {
    const ctx = buildCtx(t, tz);
    const d = new Date(ctx.localMs);
    const p = dtfParts(t, tz, { hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    let H = Number(p.hour); if (H === 24) H = 0;
    if (!(d.getUTCFullYear() === Number(p.year) && d.getUTCMonth() + 1 === Number(p.month) && d.getUTCDate() === Number(p.day) && d.getUTCHours() === H && d.getUTCMinutes() === Number(p.minute))) {
      ctxOk = false;
      console.log('    ctx mismatch', tz, ctx.isoLocal, 'vs', p);
    }
  }
  check('buildCtx local fields match Intl', ctxOk);

  // Reference algorithms must pass the whole battery.
  const rn = testAlgo(REF_NAIVE);
  check('reference-naive passes battery (' + rn.total + ' samples, ' + rn.failCount + ' fails)', rn.pass);
  if (!rn.pass) console.log('    e.g.', JSON.stringify(rn.sampleFailures[0]));
  const rh = testAlgo(REF_HINNANT);
  check('reference-hinnant passes battery (' + rh.failCount + ' fails)', rh.pass);
  if (!rh.pass) console.log('    e.g.', JSON.stringify(rh.sampleFailures[0]));

  // A deliberately-broken algorithm must FAIL (proves the gate has teeth).
  const broken = { vote(ctx) { return new Date(ctx.epochMs).getUTCMonth() === 11 && new Date(ctx.epochMs).getUTCDate() === 25; } }; // uses UTC not local -> wrong near tz boundaries
  const rb = testAlgo(broken);
  check('UTC-instead-of-local algorithm is caught (failCount=' + rb.failCount + ')', !rb.pass);

  console.log(ok ? '\nSELFTEST: PASS' : '\nSELFTEST: FAIL');
  process.exit(ok ? 0 : 1);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === '--prepare') {
    const t0 = Date.now();
    const p = prepareBattery();
    fs.writeFileSync(CACHE, JSON.stringify(p));
    console.log('prepared ' + p.length + ' samples -> ' + CACHE + ' in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
    process.exit(0);
  }
  if (argv.length === 0 || argv[0] === '--selftest') return selftest();

  if (argv[0] === '--all') {
    const dir = argv[1];
    const jsonIdx = argv.indexOf('--json');
    const outPath = jsonIdx >= 0 ? argv[jsonIdx + 1] : null;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
    const results = [];
    let allPass = true;
    for (const f of files) {
      const full = path.join(dir, f);
      let entry;
      try {
        const { algo, text } = loadAlgo(full);
        const r = testAlgo(algo);
        const scratchViolations = algo.derive === 'scratch' ? lintScratch(text) : [];
        const pass = r.pass && scratchViolations.length === 0;
        entry = { file: f, id: algo.id, name: algo.name, cohort: algo.cohort, derive: algo.derive, pass, total: r.total, failCount: r.failCount, sampleFailures: r.sampleFailures, scratchViolations };
      } catch (e) {
        entry = { file: f, pass: false, loadError: String(e && e.message || e) };
      }
      if (!entry.pass) allPass = false;
      results.push(entry);
    }
    const summary = { tested: results.length, passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length, results };
    const json = JSON.stringify(summary, null, 2);
    if (outPath) fs.writeFileSync(outPath, json);
    console.log(json);
    process.exit(allPass ? 0 : 1);
  }

  // one or more explicit files
  let allPass = true;
  for (const file of argv) {
    try {
      const { algo, text } = loadAlgo(file);
      const r = testAlgo(algo);
      const scratchViolations = algo.derive === 'scratch' ? lintScratch(text) : [];
      if (r.pass && scratchViolations.length === 0) {
        console.log('PASS  ' + path.basename(file) + '  (' + r.total + ' samples)  [' + (algo.name || '?') + ']');
      } else {
        allPass = false;
        if (!r.pass) {
          console.log('FAIL  ' + path.basename(file) + '  ' + r.failCount + '/' + r.total + ' wrong  [' + (algo.name || '?') + ']');
          console.log(JSON.stringify(r.sampleFailures, null, 2));
        }
        if (scratchViolations.length) {
          console.log('FAIL  ' + path.basename(file) + '  scratch-cohort used forbidden token: ' + scratchViolations.join(', ') + ' (derive from the integer ctx.localMs only — no Date/Intl/getters/strings)');
        }
      }
    } catch (e) {
      allPass = false;
      console.log('FAIL  ' + path.basename(file) + '  load error: ' + String(e && e.message || e));
    }
  }
  process.exit(allPass ? 0 : 1);
}

main();
