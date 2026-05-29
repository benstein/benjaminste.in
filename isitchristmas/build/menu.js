'use strict';
// Generates the methodology menu: ~118 distinct algorithm assignments across themed cohorts.
// derive: 'scratch' = derive civil date from the integer ctx.localMs ONLY (no Date/Intl/getters/strings).
//         'extract' = may read fields via new Date(ctx.localMs).getUTC*(); weirdness is in the representation/decision.
//         'intl'    = use Intl/locale APIs, MUST pass timeZone explicitly (UTC on localMs, or ctx.timeZone on epochMs).
const fs = require('fs');

const C = {
  CLASSICS: 'Calendrical Classics',
  EPOCH: 'Epoch Arithmetic',
  ESOLANG: 'Esolang & Exotic Interpreters',
  ML: 'Machine Learning Cosplay',
  STRING: 'Stringly Typed',
  BASE: 'Number-Base Maximalists',
  FP: 'Recursion & Functional',
  LOOKUP: 'Lookup & Memoization',
  INTL: 'Intl & Locale',
  ASTRO: 'Physics & Astronomy Cosplay',
  CURSED: 'Cursed & Over-Engineered',
};

const raw = [
  // ---- Calendrical Classics (scratch) ----
  [C.CLASSICS, "Howard Hinnant's civil_from_days", "Implement Howard Hinnant's well-known days->(y,m,d) algorithm (the era/yoe/doy/mp formulation). Use floor(localMs/86400000) as days since 1970-01-01.", 'scratch'],
  [C.CLASSICS, "Fliegel-Van Flandern", "Implement the classic Fliegel & Van Flandern Julian Day Number -> Gregorian (y,m,d) integer algorithm. Convert epoch-day to JDN first.", 'scratch'],
  [C.CLASSICS, "Richards' algorithm", "Implement Richards' algorithm (the one tabulated on Wikipedia's Julian day page, with constants y=4716, j=1401, etc.) to convert JDN -> (y,m,d).", 'scratch'],
  [C.CLASSICS, "Meeus astronomical method", "Implement Jean Meeus' calendar-date-from-Julian-Date method (Astronomical Algorithms, ch. 7): compute A, B, C, D, E from JD and recover (y,m,d).", 'scratch'],
  [C.CLASSICS, "Rata Die (Calendrical Calculations)", "Implement the Reingold & Dershowitz Rata Die approach: treat the day count as fixed days from the Gregorian epoch and invert gregorian-from-fixed.", 'scratch'],
  [C.CLASSICS, "Proleptic Gregorian ordinal", "Replicate Python's date.fromordinal: days since 0001-01-01 (proleptic Gregorian, day 1 == 0001-01-01) -> (y,m,d). Shift the epoch-day to that ordinal.", 'scratch'],
  [C.CLASSICS, "400-year supercycle decomposition", "Decompose the day count using the 146097-day 400-year cycle, then nested 36524-day century, 1461-day quad-year, and 365-day year blocks, with the leap-day correction.", 'scratch'],
  [C.CLASSICS, "March-based year (Zeller-style)", "Use the Zeller/Sakamoto trick of starting the year in March so the leap day falls last, decompose day-of-year into month/day via the (153*m+2)/5 month-length formula.", 'scratch'],
  [C.CLASSICS, "Lilian date", "Convert to the Lilian date (days since 1582-10-15, the Gregorian reform) and recover (y,m,d) from there.", 'scratch'],
  [C.CLASSICS, "Modified Julian Date path", "Convert the day count to Modified Julian Date (MJD, epoch 1858-11-17) and invert MJD -> civil date.", 'scratch'],
  [C.CLASSICS, "Tabular month-length cascade", "Build the year from the day count, then walk a 12-entry month-length table (leap-aware) subtracting each month until the remaining day-of-year lands inside a month.", 'scratch'],
  [C.CLASSICS, "Conway Doomsday locator", "Use Conway's Doomsday rule machinery (anchor day, doomsday for the year) as the scaffold to locate where Dec 25 sits and confirm the resolved date is Dec 25.", 'scratch'],

  // ---- Epoch Arithmetic (scratch) ----
  [C.EPOCH, "Leap-aware forward year walk", "From epoch-day, walk years forward from 1970 adding 365/366 (Gregorian leap rule) until the residual is this year's day-of-year, then resolve month/day.", 'scratch'],
  [C.EPOCH, "Second-granularity accumulation", "Work in seconds (floor(localMs/1000)); accumulate years and days in seconds, then resolve the civil date. Demonstrate it in the time domain, not days.", 'scratch'],
  [C.EPOCH, "BigInt nanosecond arithmetic", "Promote localMs to BigInt nanoseconds (BigInt(localMs) * 1000000n) and do the entire epoch->civil conversion in BigInt, converting back to Number only at the end.", 'scratch'],
  [C.EPOCH, "Iterative whole-year subtraction", "Repeatedly subtract whole-year day-spans (leap-aware) from the day count starting at 1970 until less than a year remains; that remainder is the day-of-year.", 'scratch'],
  [C.EPOCH, "Iterative whole-month subtraction", "After resolving the year, repeatedly subtract month lengths (Jan..Dec, leap-aware) from the day-of-year until you land in December and check the residual day == 25.", 'scratch'],
  [C.EPOCH, "Bitwise day-count decomposition", "Use bit shifts and bitwise ops where possible in the epoch-day decomposition (e.g., for the *4 / /4 leap cadence). Keep it correct; lean into the bit-twiddling aesthetic.", 'scratch'],
  [C.EPOCH, "Scaled fixed-point arithmetic", "Avoid floating point: scale by integer factors and use only integer division/mod (no Math.floor on fractional ratios) to derive the civil date.", 'scratch'],
  [C.EPOCH, "1461-day quad-year modulo", "Reduce the day count modulo 1461 (the 4-year leap cycle) with century corrections for the Gregorian rule, then resolve year-in-cycle and day-of-year.", 'scratch'],
  [C.EPOCH, "Binary search over year-start table", "Generate (in code) an array of year-start epoch-days for 1970..2200, binary-search the day count to find the year, then resolve month/day from the residual.", 'scratch'],
  [C.EPOCH, "Anchor-walk from 1970 Thursday", "Anchor on the known fact that 1970-01-01 was a Thursday and epoch-day 0; walk the Gregorian calendar in 400-year cycles to resolve the civil date.", 'scratch'],
  [C.EPOCH, "Estimate-then-correct (Newton-style)", "Estimate the year by dividing the day count by 365.2425, then correct up/down by checking year-start bounds; resolve the remaining day-of-year.", 'scratch'],
  [C.EPOCH, "Continued-fraction year length", "Approximate the mean year length (365.2425) via a continued fraction / rational convergent, estimate the year, then correct and resolve month/day.", 'scratch'],
  [C.EPOCH, "Days-in-prior-years summation", "Compute the year by summing closed-form counts of leap and common years since 1970 (using /4, /100, /400 counts), then resolve day-of-year.", 'scratch'],

  // ---- Esolang & Exotic Interpreters (extract for the two numbers, decide via interpreter) ----
  [C.ESOLANG, "Brainfuck interpreter", "Extract month and day via new Date(ctx.localMs).getUTCMonth()+1 and getUTCDate(). Then run an embedded Brainfuck interpreter on a BF program whose output encodes whether (month==12 && day==25). The interpreter must be a real BF VM.", 'extract'],
  [C.ESOLANG, "Forth / RPN stack machine", "Extract month/day, then evaluate an RPN program ('12 = swap 25 = and' style) on a real stack-machine interpreter you implement, returning the boolean.", 'extract'],
  [C.ESOLANG, "Befunge-style 2D interpreter", "Extract month/day, then run a small Befunge-like 2D grid program through an interpreter (instruction pointer with direction) that decides equality.", 'extract'],
  [C.ESOLANG, "Lambda calculus / Church numerals", "Encode 12, 25, month, day as Church numerals; implement Church-numeral equality via predecessor/isZero and AND; evaluate to a boolean.", 'extract'],
  [C.ESOLANG, "SK combinator calculus", "Implement an S/K (and I) combinator reduction engine; build a term that returns true iff month==12 and day==25; reduce it.", 'extract'],
  [C.ESOLANG, "Turing machine simulator", "Extract month/day, encode onto a tape, and run a Turing machine (states + transition table) that halts in an accept state iff the date is Dec 25.", 'extract'],
  [C.ESOLANG, "Cyclic tag system", "Implement a tag system / cyclic tag system whose production rules decide the equality of the encoded month and day.", 'extract'],
  [C.ESOLANG, "Rule 110 logic gates", "Build the equality test out of a Rule 110 cellular automaton wired as logic (or a small CA that computes AND of the two equalities). Run the CA and read the result.", 'extract'],
  [C.ESOLANG, "Thompson NFA regex VM", "Implement a Thompson-construction regex virtual machine (NFA simulation, not the built-in RegExp) and match the month/day digit string against a pattern for 12/25.", 'extract'],
  [C.ESOLANG, "Subleq OISC", "Implement a Subleq one-instruction-set computer and a Subleq program that computes (month==12 && day==25) from memory-loaded operands.", 'extract'],

  // ---- Machine Learning Cosplay (extract features, classify) ----
  [C.ML, "Hardcoded-weights MLP", "Build a small multilayer perceptron (input = features of month/day, one hidden ReLU layer, sigmoid output) with hand-chosen weights/biases so the output crosses 0.5 only for Dec 25. Implement the forward pass with real matrix math.", 'extract'],
  [C.ML, "Hand-built decision tree", "Implement a decision tree (nested threshold nodes on month and day) framed as a learned model; traverse it to a leaf label.", 'extract'],
  [C.ML, "k-Nearest-Neighbors", "Embed a labeled dataset of all 366 (month,day) points with their is-Christmas label; classify by the nearest neighbor (k=1 or small k) under a sensible distance.", 'extract'],
  [C.ML, "Logistic regression", "Engineer features from month/day, apply baked logistic-regression coefficients + bias, threshold the sigmoid at 0.5.", 'extract'],
  [C.ML, "Random forest of stumps", "Implement 5 decision stumps (each a single threshold) and take their majority vote; tune them so the ensemble fires only on Dec 25.", 'extract'],
  [C.ML, "Naive Bayes", "Implement a naive Bayes classifier over discretized date features with baked priors/likelihoods that maximize the Christmas class only on Dec 25.", 'extract'],
  [C.ML, "Single perceptron", "A single perceptron: weighted sum of month/day features + bias, step activation. Pick weights so it activates iff Dec 25.", 'extract'],
  [C.ML, "Toy self-attention 'transformer'", "Tokenize [month, day] into vectors, run one toy self-attention head + a linear head (real dot-product attention math) whose output classifies Dec 25.", 'extract'],
  [C.ML, "Max-margin SVM", "Implement an SVM decision function: sum of (alpha * label * kernel(x, support_vector)) + b with baked support vectors/kernel so the sign is positive only on Dec 25.", 'extract'],
  [C.ML, "RAG over a holiday store", "Embed a tiny 'vector store' of holidays with embeddings; embed the query date, retrieve the nearest holiday by cosine similarity, return whether it is Christmas.", 'extract'],
  [C.ML, "Gaussian RBF classifier", "Use a radial basis function centered on (12,25); return true when the RBF response exceeds a threshold (i.e., the point is close enough to the Christmas center).", 'extract'],
  [C.ML, "Genetic-algorithm 'evolved' rule", "Run a tiny deterministic genetic algorithm (fixed seed) over candidate threshold rules that converges to (month==12 && day==25), then apply the winner. Keep it deterministic and bounded.", 'extract'],

  // ---- Stringly Typed (string extraction) ----
  [C.STRING, "ISO slice compare", "new Date(ctx.localMs).toISOString().slice(5,10) === '12-25'. The honest stringly approach.", 'extract'],
  [C.STRING, "Hand-built ISO from getUTC", "Build the local date string yourself from getUTCFullYear/Month/Date on localMs (zero-padded) and compare the MM-DD portion to '12-25'.", 'extract'],
  [C.STRING, "toUTCString parse", "new Date(ctx.localMs).toUTCString() yields e.g. 'Thu, 25 Dec 2025 ...'; parse out the '25 Dec' and compare.", 'extract'],
  [C.STRING, "JSON.stringify slice", "JSON.stringify(new Date(ctx.localMs)) gives a quoted ISO string; slice the month/day characters and compare.", 'extract'],
  [C.STRING, "Built-in regex match", "Run a RegExp like /-12-25T/ against new Date(ctx.localMs).toISOString(). (Built-in RegExp is fine here; this is the regex-on-string approach.)", 'extract'],
  [C.STRING, "split('-') parts", "Split the ISO date portion on '-' and compare parts[1]==='12' && parts[2]==='25'.", 'extract'],
  [C.STRING, "padStart MM/DD", "Build 'MM/DD' with String#padStart from getUTC month/day and compare to '12/25'.", 'extract'],
  [C.STRING, "Fixed-index char compare", "Read characters at fixed indices of the ISO string (positions of MM and DD) and compare each character code.", 'extract'],
  [C.STRING, "Numeric MMDD concat", "Compose the integer month*100+day from getUTC fields and compare to 1225.", 'extract'],
  [C.STRING, "Array.join date", "Put [month, day] into an array, join with a separator, and string-compare to '12-25'.", 'extract'],

  // ---- Number-Base Maximalists (extract, compare in exotic base) ----
  [C.BASE, "Binary compare", "Compare month and day to their binary representations: month.toString(2)==='1100' && day.toString(2)==='11001'.", 'extract'],
  [C.BASE, "Octal compare", "Compare in base 8: month==='14' octal and day==='31' octal.", 'extract'],
  [C.BASE, "Hexadecimal compare", "Compare in base 16: month===0xC and day===0x19 (use toString(16)).", 'extract'],
  [C.BASE, "Base-36 compare", "Compare month/day in base 36.", 'extract'],
  [C.BASE, "Roman numerals", "Convert month and day to Roman numerals with a real converter; check month==='XII' && day==='XXV'.", 'extract'],
  [C.BASE, "Unary tally marks", "Represent month and day as unary strings of marks; check the mark-counts equal 12 and 25 (e.g., compare to '|'.repeat(12)).", 'extract'],
  [C.BASE, "Balanced ternary", "Convert month/day to balanced ternary (digits -1,0,1) and compare to the balanced-ternary forms of 12 and 25.", 'extract'],
  [C.BASE, "Sexagesimal (base 60)", "Represent month/day in Babylonian base-60 and compare. (12 and 25 are single sexagesimal digits, lean into the history.)", 'extract'],
  [C.BASE, "Base-26 alphabetic", "Map month/day into a bijective base-26 ('A'..'Z') representation and compare to the encodings of 12 and 25.", 'extract'],
  [C.BASE, "Negabinary (base -2)", "Convert month/day to negabinary and compare to the negabinary forms of 12 and 25.", 'extract'],

  // ---- Recursion & Functional (scratch) ----
  [C.FP, "Pure recursive year subtraction", "No for/while loops anywhere. Use recursion to subtract years (leap-aware) and then months from the epoch-day to resolve the civil date.", 'scratch'],
  [C.FP, "Y-combinator day counter", "Define a fixed-point Y combinator and express the day-counting/resolution as anonymous recursion through it.", 'scratch'],
  [C.FP, "Tail-recursive resolver", "Implement the epoch-day -> (y,m,d) conversion as explicitly tail-recursive helper functions (accumulator-passing).", 'scratch'],
  [C.FP, "reduce over month-length stream", "Generate the year's month-length list, then Array#reduce over it to locate the day-of-year, deriving the year first from the day count (no civil getters).", 'scratch'],
  [C.FP, "Mutual recursion isLeap/daysInMonth", "Resolve the date by mutually-recursive isLeap(year) and daysInMonth(year,month) functions walking from the epoch-day.", 'scratch'],
  [C.FP, "Continuation-passing style", "Write the whole conversion in CPS: each step takes a continuation; the final continuation receives (m,d) and returns the boolean.", 'scratch'],
  [C.FP, "Lazy take-until sequence", "Build a lazy sequence (generator) of successive days from a yearly anchor and 'take until' the cumulative day-count matches; read off month/day. Keep iterations bounded (< ~370).", 'scratch'],
  [C.FP, "Trampolined recursion", "Use a trampoline (returning thunks, driven by a bounce loop) so deep day-walking recursion never overflows the stack; resolve the civil date.", 'scratch'],
  [C.FP, "Church-encoded fold over days", "Encode the day-of-year as a fold (foldr-style) over a structure and extract month/day functionally. Distinct from the lambda-calculus interpreter.", 'scratch'],

  // ---- Lookup & Memoization (scratch to get epoch-day, then table) ----
  [C.LOOKUP, "Set membership of Christmas days", "Generate (in code, from the leap rule) the Set of all epoch-day numbers that are Dec 25 for 1970..2200; test floor(localMs/86400000) membership.", 'scratch'],
  [C.LOOKUP, "Binary search Christmas array", "Generate a sorted array of Christmas epoch-days and binary-search the current epoch-day for an exact hit.", 'scratch'],
  [C.LOOKUP, "Hash map of date keys", "Build a map from epoch-day -> is-Christmas for the supported range (or just keys for Christmas days) and look up the current day. Derive epoch-day from localMs by integer division.", 'scratch'],
  [C.LOOKUP, "Bloom filter + verify", "Build a Bloom filter of Christmas epoch-days with a couple of hash functions; on a probable hit, exact-verify against the generating rule to avoid false positives.", 'scratch'],
  [C.LOOKUP, "Perfect hash of 231 days", "Construct a minimal/perfect hash over the ~231 Christmas epoch-days in range and confirm an exact match.", 'scratch'],
  [C.LOOKUP, "Day-of-year bitmap", "Resolve the year and day-of-year from the integer, then index a 366-bit bitmap whose Dec-25 bit (accounting for leap years) is set.", 'scratch'],
  [C.LOOKUP, "Run-length-encoded calendar", "Encode the year as run-length segments of (not-christmas, christmas, not-christmas); decode to test whether the resolved day-of-year is the Christmas run.", 'scratch'],
  [C.LOOKUP, "Interval ranges", "Precompute, per year in range, the [start,end) epoch-day (or epoch-ms via localMs day) interval covering Dec 25, and test containment of the current day.", 'scratch'],
  [C.LOOKUP, "Memoized year resolver", "Memoize year-start day counts in a cache object so repeated calls are O(1); resolve month/day from the residual.", 'scratch'],

  // ---- Intl & Locale (intl; explicit timeZone required) ----
  [C.INTL, "Honest IANA Intl", "Use new Intl.DateTimeFormat('en-US', {timeZone: ctx.timeZone, month:'numeric', day:'numeric'}) on new Date(ctx.epochMs) and check month==12 && day==25. The honest, idiomatic tz-aware answer.", 'intl'],
  [C.INTL, "German locale 25.12.", "Format new Date(ctx.localMs) with locale 'de-DE' and {timeZone:'UTC'}; parse the day.month and check 25.12.", 'intl'],
  [C.INTL, "Japanese locale", "Format with 'ja-JP' and {timeZone:'UTC'} on localMs; detect 12 and 25 in the localized output (e.g., 12月25日).", 'intl'],
  [C.INTL, "French locale 25/12", "Format with 'fr-FR' and {timeZone:'UTC'} on localMs; parse DD/MM and check 25/12.", 'intl'],
  [C.INTL, "Hebrew calendar cross-check", "Use Intl with calendar:'hebrew' for flavor, but determine Christmas via an explicit gregory-calendar Intl format (timeZone UTC on localMs). Show the Hebrew date in flavor text.", 'intl'],
  [C.INTL, "Islamic calendar cross-check", "Same idea with calendar:'islamic' for flavor; the actual decision uses an explicit Gregorian Intl format with explicit timeZone.", 'intl'],
  [C.INTL, "Japanese era calendar", "Use calendar:'japanese'; recover the Gregorian month/day via an explicit gregory Intl format (timeZone UTC on localMs) for the decision.", 'intl'],
  [C.INTL, "ROC (Minguo) calendar", "Use calendar:'roc' for flavor; decide with an explicit Gregorian Intl format and explicit timeZone.", 'intl'],
  [C.INTL, "Days-until-Christmas == 0", "Compute the whole-day difference between the local date and this year's Christmas using Intl-derived fields (explicit timeZone), and check the difference is 0. RelativeTimeFormat may narrate it.", 'intl'],
  [C.INTL, "formatToParts reducer", "Use Intl.DateTimeFormat formatToParts (explicit timeZone UTC on localMs), reduce the parts into an object, and check the month/day parts.", 'intl'],

  // ---- Physics & Astronomy Cosplay (scratch) ----
  [C.ASTRO, "Astronomer's Julian Date", "Compute the astronomical Julian Date (JD, with the noon .5 offset) from the epoch and invert it to the civil (y,m,d). Frame it as astronomy; keep the math correct.", 'scratch'],
  [C.ASTRO, "Days since J2000.0", "Reference everything to the J2000.0 epoch (2000-01-01 12:00) day count, then resolve the Gregorian date.", 'scratch'],
  [C.ASTRO, "Orbital day-of-year", "Frame the day count as Earth's position along its orbit (day-of-year), resolve day-of-year from the integer, and check it equals Dec 25's ordinal (359 or 360 depending on leap year).", 'scratch'],
  [C.ASTRO, "Leap-second cosplay", "Enumerate the announced UTC leap seconds, make a show of accounting for them, then correctly note they do not change the civil date and resolve (y,m,d) from the integer anyway.", 'scratch'],
  [C.ASTRO, "Sidereal-vs-solar gag", "Compute a sidereal-flavored quantity, then resolve the actual civil date from the day count and check Dec 25. The sidereal part is narrative; the answer is correct.", 'scratch'],
  [C.ASTRO, "Hour-angle / sundial", "Frame the resolution as a sundial/hour-angle computation but actually derive the civil date from the integer day count.", 'scratch'],
  [C.ASTRO, "Ecliptic-longitude gag", "Narrate the Sun reaching a fixed ecliptic longitude, but compute the real answer via the Gregorian leap arithmetic on the day count.", 'scratch'],
  [C.ASTRO, "Kepler-constants cosplay", "Sprinkle Keplerian constants for flavor, then resolve the date with correct integer leap-year arithmetic.", 'scratch'],

  // ---- Cursed & Over-Engineered (mixed) ----
  [C.CURSED, "Seven-microservice pipeline", "Model epoch->civil as a pipeline of 7 tiny pure 'service' functions, each doing one transform (ms->days, days->era, era->year, ...), passing a payload object. derive from the integer; no Date/Intl.", 'scratch'],
  [C.CURSED, "Proxy-intercepted fields", "Wrap an object in a Proxy that lazily computes y/m/d from the integer on property access, then read .month and .day. No Date/Intl/strings.", 'scratch'],
  [C.CURSED, "eval-assembled function", "Assemble the body of the conversion as a string and bring it to life with new Function/eval, then run it on ctx.localMs. May use getUTC on localMs inside the assembled code (mark derive 'extract').", 'extract'],
  [C.CURSED, "Hash-chain 'blockchain'", "Build a bounded hash-chain of 'day blocks' from a yearly anchor; walk to the block for the current day-of-year and read its Christmas flag. Keep steps bounded (< ~370).", 'extract'],
  [C.CURSED, "One-day-step state machine", "A state machine that steps exactly one day at a time from this year's Jan 1 anchor to the current day-of-year (bounded < ~370 steps), tracking month/day. Resolve the year via getUTCFullYear on localMs (derive 'extract').", 'extract'],
  [C.CURSED, "Array(n).reduce one-liner", "Do the whole epoch->civil decomposition inside a single Array(k).fill(0).reduce(...) expression operating on the integer. No Date/Intl/strings.", 'scratch'],
  [C.CURSED, "Quantum superposition gag", "Compute both the YES branch and the NO branch, then 'collapse the wavefunction' by selecting via the real check (getUTC month/day on localMs). Lean into the bit.", 'extract'],
  [C.CURSED, "Enterprise Builder/Strategy", "Over-engineer with a DateBuilder, a ChristmasStrategy interface, and a factory; the strategy derives month/day from the integer. No Date/Intl.", 'scratch'],
  [C.CURSED, "Spreadsheet formula engine", "Implement a tiny spreadsheet (named cells with formulas referencing other cells) that recalculates to produce month and day from the integer, then read the result cells. No Date/Intl/strings.", 'scratch'],
  [C.CURSED, "Throw-driven control flow", "Use throw/try-catch as the loop-exit mechanism while day-walking a bounded count to resolve the date. Resolve the year via getUTCFullYear on localMs (derive 'extract').", 'extract'],
  [C.CURSED, "GraphQL-style resolver", "Model {date {month day}} with field resolvers that compute month/day from the integer on demand; 'execute the query' and check the fields. No Date/Intl.", 'scratch'],
  [C.CURSED, "Dependency-injection container", "Build a tiny DI container that constructs a CalendarService (which derives month/day from the integer) and asks it whether it is Christmas. No Date/Intl/strings.", 'scratch'],

  // ---- spares / extra flair ----
  [C.BASE, "Morse code compare", "Extract month/day, render them as Morse-coded digit strings, and compare to the Morse encodings of 1/2 and 2/5 digit-by-digit.", 'extract'],
  [C.BASE, "Gray code compare", "Convert month/day to reflected binary Gray code and compare to the Gray codes of 12 and 25.", 'extract'],
  [C.BASE, "Zeckendorf (Fibonacci) compare", "Represent month/day in Zeckendorf (non-consecutive Fibonacci) form and compare to the Zeckendorf forms of 12 and 25.", 'extract'],
  [C.STRING, "Reversible cipher gag", "Encode the 'MMDD' digits through a reversible substitution cipher, then compare to the encoded form of '1225'.", 'extract'],
  [C.ML, "Ensemble-of-classifiers vote", "Combine three different baked classifiers (a stump, a linear unit, an RBF) and take their majority vote; tune so the ensemble fires only on Dec 25.", 'extract'],
  [C.FP, "Foldr over a generated calendar", "Build the list of (month,day) pairs for the whole resolved year functionally and foldr to find the entry at the current day-of-year. Bounded to <= 366. No civil getters.", 'scratch'],
];

const menu = raw.map(([cohort, name, brief, derive], i) => ({ id: i + 1, cohort, name, brief, derive }));
fs.writeFileSync('/tmp/iic/menu.json', JSON.stringify(menu, null, 2));

const byCohort = {};
const byDerive = {};
for (const m of menu) { byCohort[m.cohort] = (byCohort[m.cohort] || 0) + 1; byDerive[m.derive] = (byDerive[m.derive] || 0) + 1; }
console.log('TOTAL methodologies:', menu.length);
console.log('by cohort:', JSON.stringify(byCohort, null, 2));
console.log('by derive:', JSON.stringify(byDerive, null, 2));
