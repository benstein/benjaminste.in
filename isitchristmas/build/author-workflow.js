export const meta = {
  name: 'isitchristmas-authors',
  description: 'Author ~121 independent "is it Christmas?" algorithms, each self-verified against the node gate',
  phases: [
    { title: 'Author algorithms', detail: 'one agent per methodology; writes + self-verifies a vote(ctx) function' },
  ],
};

const MENU = /*__MENU__*/ null;

const CONTRACT = `You are contributing ONE algorithm to "Is It Christmas?", a deliberately over-engineered parody of isitchristmas.com. The site answers a single yes/no question — is the visitor's LOCAL civil date December 25? — using a parliament of ~121 INDEPENDENT algorithms that each cast a vote. Your algorithm is one voter. It must be CORRECT, and it must be written in the specific style your assignment dictates.

THE ONE HARD REQUIREMENT — pass the node correctness gate:
    node /tmp/iic/harness.js /tmp/iic/algos/algo-<ID>.js
The gate tests your vote(ctx) against ~148,000 (timezone, instant) samples spanning UTC-12..UTC+14, INCLUDING southern-hemisphere DST zones (Pacific/Auckland, Australia/Lord_Howe) that observe daylight saving in December, every hour around Christmas across many years (1972..2200), full-year daily sweeps to catch leap-year and day-of-year bugs, and 8,000 random instants. It prints "PASS ..." or "FAIL ..." with up to 12 failing samples ({epochMs, tz, isoLocal, expected, got}). ITERATE UNTIL IT PRINTS PASS. Do not declare success until it PASSes. If after a sustained, genuine effort it still fails, report passed:false and describe the failing samples.

THE INTERFACE — the engine calls vote(ctx) where ctx is frozen:
    ctx.epochMs        Number  the true UTC instant (like Date.now())
    ctx.offsetMinutes  Number  getTimezoneOffset() == (UTC - local) in minutes
    ctx.localMs        Number  epochMs - offsetMinutes*60000.  THE KEY TRICK: new Date(ctx.localMs) read with getUTC* methods returns the visitor's LOCAL civil fields. Treating localMs as if it were a UTC instant gives you local wall-clock time. This is how the whole site stays timezone-aware without any algorithm knowing the zone.
    ctx.timeZone       String  IANA zone (only the Intl cohort should need this)
    ctx.isoLocal       String  local wall-clock ISO, no zone
vote(ctx) returns a boolean: true iff the local civil date is December 25.
vote MUST be PURE: no Date.now(), no Math.random() (unless you implement your own seeded deterministic PRNG), no network, no I/O, no reading the real clock. It depends only on ctx.

USEFUL FACTS: epochDay = Math.floor(ctx.localMs / 86400000) is the integer day count since 1970-01-01 (a Thursday). getUTCMonth() is 0-based, so December is 11. Dec 25 is the 359th day of a common year and the 360th of a leap year (0-indexed 358 / 359). Gregorian leap rule: year % 4 === 0, except year % 100 === 0 && year % 400 !== 0.

FILE FORMAT — write EXACTLY this shape to /tmp/iic/algos/algo-<ID>.js. It is an IIFE so NOTHING leaks into the shared global scope when all 121 files are concatenated into the browser bundle:

    (function () {
      // any helper functions / lookup tables you need, scoped in here
      IIC.register({
        id: <ID>,
        name: "<your algorithm's display name>",
        cohort: "<COHORT>",
        derive: "<DERIVE>",
        methodology: "<1-2 sentences of accurate, plain-English prose describing how this algorithm actually works, for a public technical writeup>",
        flavor: "<one dry, witty sentence of personality, no emojis>",
        vote: function (ctx) { /* returns boolean */ }
      });
    })();

ALL helpers and tables MUST live inside the IIFE (or inside vote). Do NOT declare any top-level const/var/function outside the IIFE — the other 120 files share the same global scope and names WILL collide. Reading the global IIC inside the IIFE is correct and expected.

PERFORMANCE: vote(ctx) is called ~148,000 times by the gate and ~121 times per page load. Keep it bounded — no unbounded loops; cap any day-by-day walk to a few hundred iterations; build lookup tables ONCE at IIFE-load time (outside vote), never per-call.

VOICE for the methodology and flavor strings: plain, specific, dry. No emojis. No marketing tone. Avoid "it's not X, it's Y", needless rule-of-three lists, and em-dash pile-ups. Technical wit lands well.`;

const CONSTRAINTS = {
  scratch: `YOUR CONSTRAINT (derive: "scratch"): derive the civil (year, month, day) from the INTEGER ctx.localMs ALONE, with arithmetic. The gate runs a SOURCE SCAN and will FAIL your file if it finds any of: "new Date", "Date.", "Intl", "getUTC...", "getMonth/getDate/getDay/getHours/getMinutes/getSeconds/getFullYear", "toISOString/toLocale.../toUTCString/toDateString/toTimeString", or references to ctx.isoLocal / ctx.timeZone. You MAY use ctx.localMs, ctx.epochMs, ctx.offsetMinutes, Math, BigInt, Number, Array, objects, loops, recursion, and bit operations. Start from epochDay = Math.floor(ctx.localMs/86400000). This is the genuinely impressive part of the whole project: actually convert that integer into a calendar date. Do it for real.`,
  extract: `YOUR CONSTRAINT (derive: "extract"): you MAY read civil fields via new Date(ctx.localMs).getUTCFullYear() / .getUTCMonth() / .getUTCDate(). getUTC* ON localMs returns the visitor's LOCAL date (the timezone trick), so it stays correct in every zone. NEVER use the non-UTC getters (.getMonth()/.getDate()/...): those read the machine's ambient timezone and WILL FAIL the gate. Remember getUTCMonth() is 0-based (December === 11). Put the exotic, characteristic part of your assigned method into the REPRESENTATION or the DECISION step — not into the date extraction.`,
  intl: `YOUR CONSTRAINT (derive: "intl"): use Intl / locale formatting as your method, and you MUST pass timeZone explicitly, exactly one of:
  - new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ... }).format(new Date(ctx.localMs))      // localMs-as-UTC == local civil
  - new Intl.DateTimeFormat(locale, { timeZone: ctx.timeZone, ... }).format(new Date(ctx.epochMs))
If you OMIT timeZone, the gate machine's zone differs from each sample's zone and you WILL FAIL. You may also read getUTC* on localMs for numeric fields if helpful.`,
};

function promptFor(m) {
  return `${CONTRACT}

${CONSTRAINTS[m.derive]}

YOUR ASSIGNMENT:
  id: ${m.id}
  cohort: "${m.cohort}"
  derive: "${m.derive}"
  algorithm to implement: ${m.name}
  what to build: ${m.brief}

Implement THIS specific method (not a generic shortcut). Make the registered name and methodology honestly describe what you actually did. Steps:
  1. Write /tmp/iic/algos/algo-${m.id}.js in the exact IIFE + IIC.register shape, with id ${m.id}, cohort "${m.cohort}", derive "${m.derive}".
  2. Run: node /tmp/iic/harness.js /tmp/iic/algos/algo-${m.id}.js
  3. If it FAILs, study the failing samples, fix your code, and re-run. Repeat until PASS.
  4. Only then return your structured result. Set passed:true only if the gate printed PASS.`;
}

const AUTHOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'passed'],
  properties: {
    id: { type: 'number', description: 'the algorithm id you were assigned' },
    name: { type: 'string', description: 'the display name you registered' },
    cohort: { type: 'string' },
    derive: { type: 'string' },
    passed: { type: 'boolean', description: 'true ONLY if the gate printed PASS' },
    attempts: { type: 'number', description: 'how many times you ran the gate' },
    harnessTail: { type: 'string', description: 'the final PASS/FAIL line the gate printed' },
    note: { type: 'string', description: 'brief note; if failed, describe the failing samples' },
  },
};

phase('Author algorithms');
log(`Authoring ${MENU.length} algorithms across the parliament...`);

const results = await parallel(
  MENU.map((m) => () =>
    agent(promptFor(m), {
      label: `algo-${m.id} ${m.cohort}`,
      phase: 'Author algorithms',
      schema: AUTHOR_SCHEMA,
      agentType: 'general-purpose',
    })
  )
);

const authored = results.filter(Boolean);
const passed = authored.filter((a) => a.passed);
log(`Authoring complete: ${authored.length}/${MENU.length} agents returned, ${passed.length} self-reported PASS.`);

return {
  total: MENU.length,
  returned: authored.length,
  selfReportedPass: passed.length,
  results: authored,
};
