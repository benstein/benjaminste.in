/*
  Is It Christmas? — the parliament engine.

  The visitor sees one word. Under the hood, ~121 completely independent algorithms each
  decide whether the visitor's LOCAL civil date is December 25, and they vote. This file is
  the runtime: it builds the context, runs every algorithm, tallies the consensus, renders
  YES or NO, and (for the curious who open the console) prints the full roll-call.

  Algorithms register themselves by calling IIC.register({...}). They are loaded from
  algorithms.js, which is assembled from files that each passed a node correctness gate
  over ~148,000 (timezone, instant) samples. See https://benjaminste.in/blog/2026/05/29/building-isitchristmas/
*/
(function (global) {
  'use strict';

  var ALGORITHMS = [];

  function perf() {
    return (global.performance && typeof global.performance.now === 'function')
      ? global.performance.now()
      : Date.now();
  }

  // Build the frozen context the way the gate does: localMs is an epoch value whose UTC
  // breakdown equals the visitor's local wall clock. Reading new Date(localMs).getUTC* gives
  // local civil fields, which is how every algorithm stays timezone-aware without knowing the zone.
  function buildContext(nowMs) {
    var epochMs = (typeof nowMs === 'number') ? nowMs : Date.now();
    var offsetMinutes = new Date(epochMs).getTimezoneOffset(); // (UTC - local) in minutes
    var localMs = epochMs - offsetMinutes * 60000;
    var timeZone;
    try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { timeZone = 'UTC'; }
    var isoLocal = new Date(localMs).toISOString().slice(0, 19);
    return Object.freeze({ epochMs: epochMs, offsetMinutes: offsetMinutes, localMs: localMs, timeZone: timeZone, isoLocal: isoLocal });
  }

  // Used only to break an exact tie, which cannot happen when every algorithm is correct.
  function groundTruth(ctx) {
    var d = new Date(ctx.localMs);
    return d.getUTCMonth() === 11 && d.getUTCDate() === 25;
  }

  function runParliament(ctx) {
    var votes = [];
    var yes = 0, no = 0, errors = 0;
    for (var i = 0; i < ALGORITHMS.length; i++) {
      var a = ALGORITHMS[i];
      var t0 = perf(), v = null, err = null;
      try { v = !!a.vote(ctx); } catch (e) { err = e; }
      var ms = perf() - t0;
      if (err) {
        errors++;
        votes.push({ id: a.id, name: a.name, cohort: a.cohort, vote: null, ms: ms, error: String((err && err.message) || err) });
      } else {
        if (v) yes++; else no++;
        votes.push({ id: a.id, name: a.name, cohort: a.cohort, vote: v, ms: ms });
      }
    }
    return { votes: votes, yes: yes, no: no, errors: errors, total: ALGORITHMS.length };
  }

  function decide(tally, ctx) {
    if (tally.yes === tally.no) return groundTruth(ctx); // tie-break safety net
    return tally.yes > tally.no;
  }

  function render(verdict) {
    var text = verdict ? 'YES' : 'NO';
    var el = (typeof document !== 'undefined') && document.getElementById('answer');
    if (el) { el.innerHTML = text; el.setAttribute('title', text); }
  }

  function reveal(tally, ctx, verdict, elapsedMs) {
    if (!global.console || !console.log) return;
    var big = verdict ? 'YES' : 'NO';
    var color = verdict ? '#0a7d28' : '#c0392b';
    try {
      console.log('%c' + big, 'font-size:54px;font-weight:bold;font-family:Arial,sans-serif;color:' + color + ';');
      console.log('%cIs It Christmas? — decided by a parliament of %c' + tally.total + '%c independent algorithms.',
        'font-weight:bold;font-size:13px;', 'font-weight:bold;font-size:13px;color:' + color + ';', 'font-weight:bold;font-size:13px;');
      console.log('Your local date: ' + ctx.isoLocal.replace('T', ' ') + '   (' + ctx.timeZone + ')');
      console.log('Tally: ' + tally.yes + ' YES / ' + tally.no + ' NO'
        + (tally.errors ? ' / ' + tally.errors + ' abstained' : '')
        + '   →   consensus: ' + big);
      console.log('The parliament deliberated in ' + elapsedMs.toFixed(2) + ' ms.');

      var dissenters = tally.votes.filter(function (v) { return v.vote !== null && v.vote !== verdict; });
      if (dissenters.length === 0) {
        console.log('%cThe vote was unanimous. As it should be.', 'color:#888;');
      } else {
        console.log('%c' + dissenters.length + ' dissenter(s): '
          + dissenters.map(function (d) { return '#' + d.id + ' ' + d.name; }).join(', '),
          'color:#c0392b;font-weight:bold;');
      }

      if (console.table) {
        console.table(tally.votes.map(function (v) {
          return {
            id: v.id,
            algorithm: v.name,
            cohort: v.cohort,
            vote: v.vote === null ? 'ERROR' : (v.vote ? 'YES' : 'NO'),
            'ms': Number(v.ms.toFixed(4)),
          };
        }));
      }
      console.log('How this was built (and why): https://benjaminste.in/blog/2026/05/29/building-isitchristmas/');
      console.log('Poke at it:  IsItChristmas.poll("2026-12-25")   IsItChristmas.roster()   IsItChristmas.cohorts()');
    } catch (e) { /* console styling is best-effort */ }
  }

  var LAST = null;

  function runAndRender(opts) {
    var t0 = perf();
    var ctx = buildContext(opts && typeof opts.nowMs === 'number' ? opts.nowMs : undefined);
    var tally = runParliament(ctx);
    var verdict = decide(tally, ctx);
    var elapsedMs = perf() - t0;
    render(verdict);
    LAST = { ctx: ctx, tally: tally, verdict: verdict, elapsedMs: elapsedMs };
    if (!(opts && opts.silent)) reveal(tally, ctx, verdict, elapsedMs);
    return verdict;
  }

  // Re-evaluate at the next local midnight so the answer flips live without a reload.
  function msUntilNextLocalMidnight() {
    var now = new Date();
    var next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
    return Math.max(1000, next.getTime() - now.getTime());
  }
  function scheduleFlip() {
    var ms = msUntilNextLocalMidnight();
    if (ms > 2147483647) ms = 2147483647; // setTimeout ceiling
    setTimeout(function () { runAndRender({ silent: true }); scheduleFlip(); }, ms);
  }

  // ---- public toy API (interpret strings as LOCAL wall-clock) ----
  function parseLocalToMs(s) {
    s = String(s).trim().replace(' ', 'T');
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T12:00:00';
    var ms = Date.parse(s + 'Z'); // treat the given wall clock as UTC -> localMs
    return ms;
  }
  function ctxFromLocalMs(localMs) {
    var offsetMinutes = new Date(localMs).getTimezoneOffset();
    var epochMs = localMs + offsetMinutes * 60000;
    var timeZone;
    try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { timeZone = 'UTC'; }
    var isoLocal = new Date(localMs).toISOString().slice(0, 19);
    return Object.freeze({ epochMs: epochMs, offsetMinutes: offsetMinutes, localMs: localMs, timeZone: timeZone, isoLocal: isoLocal });
  }

  var IIC = {
    register: function (obj) { ALGORITHMS.push(obj); return ALGORITHMS.length; },
    algorithms: ALGORITHMS,
    boot: function () { var v = runAndRender(); scheduleFlip(); return v; },
    run: function () { return runAndRender(); },
  };

  var PublicAPI = {
    run: function () { return runAndRender(); },
    verdict: function () { return LAST ? LAST.verdict : runAndRender({ silent: true }); },
    poll: function (s) {
      var ms = parseLocalToMs(s);
      if (isNaN(ms)) return { error: 'could not parse "' + s + '" — try "2026-12-25" or "2026-12-25T23:30:00"' };
      var ctx = ctxFromLocalMs(ms);
      var tally = runParliament(ctx);
      var verdict = decide(tally, ctx);
      return {
        date: ctx.isoLocal.replace('T', ' '),
        verdict: verdict ? 'YES' : 'NO',
        yes: tally.yes, no: tally.no, abstained: tally.errors,
        dissenters: tally.votes.filter(function (v) { return v.vote !== null && v.vote !== verdict; })
          .map(function (v) { return '#' + v.id + ' ' + v.name; }),
      };
    },
    roster: function () { return ALGORITHMS.map(function (a) { return { id: a.id, name: a.name, cohort: a.cohort, derive: a.derive }; }); },
    cohorts: function () {
      var c = {};
      ALGORITHMS.forEach(function (a) { c[a.cohort] = (c[a.cohort] || 0) + 1; });
      return c;
    },
    explain: function (id) {
      for (var i = 0; i < ALGORITHMS.length; i++) {
        if (ALGORITHMS[i].id === id) {
          var a = ALGORITHMS[i];
          return { id: a.id, name: a.name, cohort: a.cohort, derive: a.derive, methodology: a.methodology, flavor: a.flavor, source: a.vote.toString() };
        }
      }
      return { error: 'no algorithm with id ' + id };
    },
    algorithms: ALGORITHMS,
    last: function () { return LAST; },
    count: function () { return ALGORITHMS.length; },
  };

  global.IIC = IIC;
  global.IsItChristmas = PublicAPI;
})(typeof window !== 'undefined' ? window : this);
