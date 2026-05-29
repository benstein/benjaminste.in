export const meta = {
  name: 'isitchristmas-repair',
  description: 'Repair algorithms that failed the correctness gate, self-verifying until they pass',
  phases: [{ title: 'Repair', detail: 'one agent per failing algorithm; fix until the gate prints PASS' }],
};

const FAILURES = /*__FAILURES__*/ null; // [{id, file, name, cohort, derive, brief, failingSamples}]

const REMINDER = `THE CONTRACT (reminder). vote(ctx) returns true iff the visitor's LOCAL civil date is December 25.
ctx is frozen: { epochMs, offsetMinutes, localMs, timeZone, isoLocal }.
THE TIMEZONE TRICK: new Date(ctx.localMs).getUTC*() returns the visitor's LOCAL civil fields, because localMs = epochMs - offsetMinutes*60000. Algorithms should derive the date from ctx.localMs (or, for the Intl cohort, format with an explicit timeZone). NEVER use non-UTC getters like .getMonth()/.getDate() — they read the machine's ambient zone and fail in other timezones.
getUTCMonth() is 0-based (December === 11). epochDay = Math.floor(ctx.localMs/86400000); 1970-01-01 was a Thursday. Dec 25 is day-of-year 359 (common) / 360 (leap). Gregorian leap: %4 and not (%100 and not %400).

derive policy:
  scratch — derive (y,m,d) from the INTEGER ctx.localMs ALONE. The gate's source scan forbids: new Date, Date., Intl, getUTC*, getMonth/getDate/getDay/getHours/getMinutes/getSeconds/getFullYear, toISOString/toLocale*/toUTCString/toDateString/toTimeString, ctx.isoLocal, ctx.timeZone.
  extract — may use new Date(ctx.localMs).getUTC*(); put exotic logic in the representation/decision.
  intl    — use Intl with an explicit timeZone (UTC on localMs, or ctx.timeZone on epochMs).

Keep vote() pure and bounded. Keep everything inside the IIFE (no top-level declarations). File shape: (function(){ ...; IIC.register({ id, name, cohort, derive, methodology, flavor, vote }); })();`;

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['id', 'passed'],
  properties: {
    id: { type: 'number' }, passed: { type: 'boolean' }, attempts: { type: 'number' },
    harnessTail: { type: 'string' }, rootCause: { type: 'string' }, note: { type: 'string' },
  },
};

function promptFor(f) {
  return `An algorithm for the "Is It Christmas?" parliament FAILED the node correctness gate and needs repair. You must make it pass without abandoning its assigned method.

The file is at /tmp/iic/algos/${f.file}. Read it first.

Its assignment was:
  id ${f.id}, cohort "${f.cohort}", derive "${f.derive}"
  intended method: ${f.name}
  description: ${f.brief}

The gate reported these failing samples (expected vs got; isoLocal is the LOCAL wall clock for that sample):
${JSON.stringify(f.failingSamples, null, 2)}

${REMINDER}

Diagnose the ROOT CAUSE from the failing samples (common culprits: using UTC instead of local, off-by-one day-of-year, leap-year rule wrong, negative-epoch / pre-2000 handling, month 0- vs 1-based, integer overflow, a forbidden shortcut tripping the scratch source scan). Fix the code IN PLACE in /tmp/iic/algos/${f.file}, preserving the assigned method and the IIFE + IIC.register shape. Then run:
    node /tmp/iic/harness.js /tmp/iic/algos/${f.file}
Iterate until it prints PASS. Only then report passed:true, with a one-line rootCause.`;
}

phase('Repair');
log('Repairing ' + FAILURES.length + ' failing algorithm(s)...');

const results = await parallel(
  FAILURES.map((f) => () =>
    agent(promptFor(f), { label: 'repair algo-' + f.id, phase: 'Repair', schema: SCHEMA, agentType: 'general-purpose' })
  )
);

const fixed = results.filter(Boolean).filter((r) => r.passed);
log('Repair complete: ' + fixed.length + '/' + FAILURES.length + ' now pass.');
return { attempted: FAILURES.length, fixed: fixed.length, results: results.filter(Boolean) };
