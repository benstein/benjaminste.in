---
layout: default
title: "Building 'Is It Christmas' in 2026"
permalink: /building-isitchristmas/
---

<style>
.iic-receipts { margin: 2em 0; }
.iic-receipts table { width: 100%; border-collapse: collapse; font-family: Georgia, 'Times New Roman', serif; }
.iic-receipts td { padding: 0.55em 0.4em; border-bottom: 1px solid #e6e3da; vertical-align: top; }
.iic-receipts tr td:first-child { color: #555; padding-right: 1.5em; width: 48%; }
.iic-receipts tr td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
</style>

# Building 'Is It Christmas' in 2026

<p class="post-subtitle">484 AI agents. 16 million tokens. Turns out it's not Christmas.</p>

[isitchristmas.com](https://isitchristmas.com) has done one thing for fifteen years: tell you, in one giant word, whether it's Christmas. Eric Mill ([@konklone](https://bsky.app/profile/konklone.com)) built it, and it's always doubled as his excuse to try new web tech. There's a websocket in there, live multiplayer cursors, a phone-app manifest, an IFTTT hook, none of which a calendar needs. Take a site with one job, use it as a lab.

I run an AI startup and ship agents every day. Claude Code just added a feature I couldn't get a feel for, [dynamic workflows](https://code.claude.com/docs/en/workflows), so I did the konklone thing and pointed it at a problem that needs exactly none of it.

The result looks identical to the original. One word. The difference is that about 500 throwaway AI agents built it on my laptop in an hour, and the way that works is the part worth writing down.

## What "Claude writes code to run a swarm" actually means

Every article about this feature lands on the same line: Claude writes code that spins up a swarm of subagents. True, but that's the view from orbit. One click down, it's simpler than it sounds.

A dynamic workflow ([new in Opus 4.8](https://www.anthropic.com/news/claude-opus-4-8)) is a plain JavaScript program. Claude writes it and the runtime runs it in the background while your session keeps going. There's no model inside the script. It's loops and arrays and `await`, with a few extra functions the runtime hands you. The important one is `agent()`:

```js
// agent() boots a fresh Claude with its own context, shell, and tools,
// points it at one task, and hands back a structured result.
const result = await agent("write an algorithm that...", { schema: RESULT });
```

That's the whole primitive. `agent(prompt)` is a function call that spins up a complete Claude, gives it one job, and waits. Pass a `schema` and you get a clean object back instead of a wall of text.

The second function turns one agent into a swarm. `parallel()` takes a list of those calls and runs them at the same time, sixteen at once, up to a thousand total:

```js
// 121 agents, one per algorithm, all running at once
const algorithms = await parallel(
  specs.map((spec) => () => agent(writePrompt(spec), { schema: RESULT }))
);
```

A `.map()` over a list, wrapped in `parallel()`. That is the swarm. Claude wrote roughly that, the runtime ran it on my machine, and 121 copies of Claude wrote code at the same time. (There's a sibling, `pipeline()`, for when the work is stages instead of a batch.) Everything past here is just me pointing those two functions at something ridiculous.

## A job that needs 121 of something

To get a feel for fan-out you need a pile of independent work, and "is it Christmas" is one line: is the month December and the day the 25th. So I made up a job that fits. Check the date 121 times, with 121 completely different programs, and have them vote. A hash table that memorized every Christmas through 2400. A hand-weighted neural network. A Brainfuck interpreter. The date in Roman numerals, in Morse code, in base 60 like the Babylonians.

None of it is necessary. That's the joke. The absurd algorithms are there so the swarm has something to fan out across. They're the load, not the point.

## Wave one: writing them

Asking 121 agents to write 121 date algorithms is 121 chances to be subtly wrong, and I wasn't going to read 121 hand-rolled calendar algorithms to find the broken ones. So before the swarm, Claude wrote a test suite: a Node script that runs an algorithm against 148,488 dates, covering every timezone, leap years, and the hours on either side of midnight where date bugs hide. Big and brute-force, nothing clever.

The `parallel()` snippet above doesn't show the trick that made it trustworthy, because it isn't in the orchestration code. It's in what each agent was told: write your algorithm, run it against the test suite, fix what fails, and don't report back until it's green. Each subagent has its own shell, so it runs the tests and loops on its own. The script just launches the 121 and collects what they return.

115 passed on the first try. The six that didn't are the fun ones, because they're the bugs a human skim sails right past. My favorite used Rata Die, an old trick for counting days as one running number, and got a single constant off by one: 719163 instead of 719162. That one digit pushed about 20,000 of the test dates a day early, all of them bunched around midnight in the far-eastern timezones, where you'd never catch it by eye. The test suite catches it. The agent saw the failures, fixed the constant, and moved on. I found out from the logs.

## Wave two: tearing them apart

Wave one is the easy case, because the answer is checkable. Wave two is the interesting one, because nothing here is.

I fanned out a second swarm, 363 agents, three per algorithm. The code is a `parallel()` inside a `parallel()`:

```js
await parallel(algorithms.map((algo) => async () => {
  const [honest, fragile, oneLiner] = await parallel([
    () => agent(`Does this code do what it claims?\n${algo.src}`, { schema: VERDICT }),
    () => agent(`Where would this break?\n${algo.src}`,           { schema: VERDICT }),
    () => agent(`Describe it in one sharp line.\n${algo.src}`,    { schema: LINE }),
  ]);
  return { id: algo.id, honest, fragile, oneLiner };
}));
```

The outer `parallel()` fans across all 121 algorithms. The inner one asks three questions about each at the same time. 363 Claudes running at once, each reading one algorithm and answering one question, and the results land back in the script as plain objects I can sort and count.

But none of those three questions has a test. "Is this code honest about what it does" has no answer I can compute. "Where would it break" is a judgment call. So wave two isn't verification, it's 363 opinions, and I read them as opinions. They flagged nine algorithms as maybe misrepresenting themselves; I checked all nine by hand and disagreed with every one. The only finding that stuck was a limitation, not a bug: most of these only work between 1970 and 2200. Nobody's loading this site in 2250, but it's true.

That contrast is the thing I actually came away with. When the output is cheap to test, fan-out is a cheat code: you trust a hundred agents without reading a line, because the test does the reading for you. When it isn't, fan-out still buys you something real, a hundred independent reads you'd never sit down and do yourself, but now judging them is your job. Same machinery, opposite amount of trust.

## What ships

None of this ships. Not the test suite, not the 484 agents. What ships is the 121 finished algorithms in one file plus a few lines that run them and count the vote. Your browser runs all 121, they vote, you get one word, in about a tenth of a millisecond. Open the developer console to watch them argue, which the original has been telling people to do for fifteen years.

A few of the voters, in the words of the agents that wrote them: **Church Numeral Equality** "proves it's Christmas without ever using a number." **RAG over a Holiday Store** "consults a 366-document vector database, which is roughly the engineering equivalent of hiring a librarian to confirm your own birthday." **Quantum Wavefunction Collapse** "keeps both Christmas and not-Christmas alive until you look, then admits it was an if statement wearing a lab coat." All 121 are in the appendix at the bottom, if that's your idea of a good time.

## Was it worth it?

A decent engineer writes that test suite and one correct algorithm in an afternoon. The other 120 algorithms and the 484 agents bought me nothing I needed, except the thing I came for: a feel for when to reach for this. Wide work with a cheap test, reach for it without thinking. Wide work you can't test, still useful, but you're signing up to read the output. And it's neither free nor repeatable. Run it again tomorrow and you get different agents, different bugs, and a different couple hundred dollars on the bill.

<div class="iic-receipts" markdown="1">

| | |
|---|---|
| Feature | **[dynamic workflows](https://code.claude.com/docs/en/workflows)** (Claude Opus 4.8) |
| Agents | **484** (121 wrote algorithms, 363 reviewed them) |
| Algorithms shipped | **121** |
| Tokens / cost | **~16 million** / a couple hundred dollars |
| Test suite | **a Node script**, 148,488 dates per algorithm |
| Passed on the first try | **115 / 121** |
| What ships to your browser | **121 algorithms + a vote counter** (~420 KB) |
| What you see | **one word** |

</div>

Is It Christmas is Eric Mill's, and so is the idea that a single-purpose site is the perfect place to try something new. [Go read the original](https://isitchristmas.com). The test suite and all four workflow scripts are [in the repo](https://github.com/benstein/benjaminste.in/tree/main/isitchristmas/build) if you want the real thing instead of the simplified snippets. Then open the console on [my version](/isitchristmas) and watch 121 algorithms agree on the obvious.

## Appendix: the whole parliament

All 121 voters, grouped by cohort, each described by the agent that wrote it. Every one is also in the [page source](/isitchristmas/algorithms.js).

### Calendrical Classics (12)

- **#1 Hinnant civil_from_days.** It moves the start of the year to March so February's leap day stops causing trouble, which is the kind of thing only a calendar nerd would call elegant.
- **#2 Fliegel–Van Flandern JDN Decoder.** A FORTRAN one-liner from 1968 that still knows exactly when to hang the stockings.
- **#3 Richards JDN Decomposition.** A 4,000-year-old counting system, pressed into service to answer whether you should be opening presents.
- **#4 Meeus Julian-Day Inversion.** The same arithmetic astronomers use to date eclipses, pointed at a far more pressing question.
- **#5 Rata Die (Reingold–Dershowitz).** It counts days the way medieval chronologists wished they could: one integer, no calendar, all the way back to a January in year one that nobody actually observed.
- **#6 Proleptic Gregorian ordinal (CPython fromordinal).** It is the same loop datetime.date.fromordinal runs every time you parse a timestamp, minus the import.
- **#7 400-Year Supercycle Decomposition.** It rebuilds the Gregorian calendar from four magic numbers every single time you ask it what day it is.
- **#8 March-Based Year (Zeller-Style).** Starts every year in March so February's leap-day mischief is always somebody else's last problem.
- **#9 Lilian Date Reconstruction.** Pope Gregory XIII deleted ten days in 1582; this voter just counts the ones that survived.
- **#10 Modified Julian Date Path.** Routes the question through an astronomer's day count from 1858, because the direct path felt too easy.
- **#11 Tabular Month-Length Cascade.** It does the long division of the calendar by hand, one month at a time, the way you balanced a checkbook before banks did it for you.
- **#12 Conway Doomsday Locator.** It would rather recite Conway's anchor days from memory than trust a calendar it did not personally derive.

### Epoch Arithmetic (13)

- **#13 Leap-Aware Forward Year Walk.** It counts off the years on its fingers from 1970, leap years included, and refuses to skip ahead.
- **#14 Second-Granularity Accumulator.** It treats the date like a budget: spend a year of seconds at a time until you can't afford another, then do the same with months, and whatever's left is the 25th or it isn't.
- **#15 BigInt Nanosecond Reducer.** Carries every intermediate as a BigInt so no December gets rounded into January by a wayward float.
- **#16 Iterative Whole-Year Subtraction.** Counts off the years one whole trip around the sun at a time, the way you'd tear pages off a very long calendar.
- **#17 Iterative Whole-Month Subtraction.** It refuses any clever closed-form shortcut and instead subtracts the calendar one month at a time, like counting change.
- **#18 Bitwise Day-Count Decomposition.** Counts to Christmas in two's complement and refuses to allocate a Date object on principle.
- **#19 Scaled fixed-point civil date.** It would rather carry around a 146097 than ever let a decimal point near the calendar.
- **#20 Quad-Year 1461 Modulo.** It treats the calendar as four nested odometers (146097, 36524, 1461, 365) and just reads off the digits.
- **#21 Year-Start Table Binary Search.** It would rather do log-n lookups in a table it built itself than trust a single modulo.
- **#22 Anchor-Walk From 1970 Thursday.** It refuses to trust any date library and instead re-derives the calendar by stepping forward from a single Thursday in 1970.
- **#23 Estimate-then-Correct Year Solver.** Guesses the year, checks its own work, and adjusts, like a clerk who never quite trusts the first answer.
- **#24 Continued-Fraction Year Length.** It trusts a fraction to get close and then makes the leap days answer for the gap.
- **#25 Days-In-Prior-Years Summation.** It would rather re-tabulate every leap year since the moon landing than ask a calendar what year it is.

### Recursion & Functional (10)

- **#68 Recursive year-and-month subtraction.** It refuses to use a loop on principle and subtracts years one stack frame at a time, like counting down to Christmas the hard way.
- **#69 Y-Combinator Day Counter.** It refuses to name its own recursion on principle, so it borrows a fixed point and lets the lambda calculus carry the loop.
- **#70 Tail-Recursive Resolver.** It never holds onto a stack frame longer than it has to, which is more than can be said for most of us in December.
- **#71 Month-Length Reduce.** It folds a list of month lengths the way an accountant reconciles a ledger, one column at a time, refusing to trust a calendar it did not foot itself.
- **#72 Mutually Recursive isLeap / daysInMonth.** Two functions that each insist the other one knows whether it's a leap year, which somehow still arrives at the right answer.
- **#73 Continuation-Passing Civil Date.** Nothing here returns a value; it just keeps passing the buck until someone has to answer for December.
- **#74 Lazy Take-Until Sequence.** It refuses to compute a month it has not yet been asked for, and it asks for at most twelve.
- **#75 Trampolined Day-Walker.** It refuses to recurse the way nature intended, preferring to leap off the stack and land on the trampoline between every single year.
- **#76 Church-encoded fold over days.** It refuses to index an array on principle and instead lets the answer fall out of a right fold, which is either functional purity or a cry for help.
- **#121 Foldr over a generated calendar.** Manufactures an entire year's calendar just to read one square off it, then folds the whole thing from the right because that is the functional thing to do.

### Lookup & Memoization (9)

- **#77 Christmas Day-Number Set.** It keeps a guest list of all the Christmases and checks whether today's day-number is on it.
- **#78 Binary Search Christmas Array.** Keeps a sorted ledger of every Christmas from 1900 to 2400 and bisects its way to an answer in a dozen comparisons.
- **#79 Christmas Hash Map.** It precomputed every Christmas it will ever need and now just checks the guest list at the door.
- **#80 Bloom filter + verify.** The Bloom filter is happy to be wrong in one direction, so the verify step exists purely to keep it honest the other way.
- **#81 Perfect hash of 231 days.** It memorized every Christmas between 1969 and 2201 so it would never have to think about the calendar again.
- **#82 Day-of-year bitmap.** A whole bitmap allocated to remember the location of exactly one bit, which is either thrifty or absurd depending on how you feel about Christmas.
- **#83 Run-Length-Encoded Calendar.** It compresses the entire year into three numbers, which is either admirable thrift or proof that 363 of those days are beneath its notice.
- **#84 Christmas Interval Table.** It keeps two and a half centuries of Christmases in a table just to avoid doing arithmetic at vote time, which is either thrift or hoarding depending on your view.
- **#85 Memoized Year Resolver.** It pays the cost of counting days to a year boundary exactly once, files the answer away, and bills every later visitor at the cached rate.

### Number-Base Maximalists (13)

- **#58 Binary Compare.** Refuses to acknowledge a month called twelve until you spell it out in four bits.
- **#59 Octal Compare.** Christmas is the 14th of Octember, the 31st, if you count on eight fingers.
- **#60 Hexadecimal Compare.** Insists that Christmas falls on the 19th of month C, and is technically correct about it.
- **#61 Base-36 Compare.** In base 36 the answer is just whether today is the c of p; everyone insists on writing it as 12/25 instead.
- **#62 Roman Numeral Date.** The kind of date format that was already obsolete by the time anyone wrote down the date of the first Christmas.
- **#63 Unary Tally Marks.** The only counting system that needs a separate symbol for nothing and the same symbol for everything else.
- **#64 Balanced Ternary Comparator.** Counts in a base where some digits are negative, and still manages to find December 25.
- **#65 Babylonian Sexagesimal Numerals.** It keeps the books the way the scribes of Babylon did, where the twelfth month and the twenty-fifth day each fit in a single wedge.
- **#66 Base-26 alphabetic.** It insists on spelling the date in spreadsheet-column letters before admitting that, yes, December the twenty-fifth is in fact L-Y.
- **#67 Negabinary Date Match.** A number base where carrying borrows from a negative neighbor, applied to the deeply pressing question of whether today is a Thursday in December or just looks like one.
- **#116 Morse Code Compare.** Establishes Christmas by radiotelegraph: if the month doesn't key out as dah-dit and the day as dit-dah, no presents.
- **#117 Reflected Gray Code Comparator.** Insists on a numbering scheme where neighbors disagree by one bit, then checks whether today is the 10/21 of Gray-code December.
- **#118 Zeckendorf Compare.** Files Christmas under F8 + F4 + F2 of month F6 + F4 + F2, then double-checks no two Fibonacci numbers are sitting next to each other.

### Stringly Typed (11)

- **#48 ISO Slice Compare.** It never learns that December is month twelve; it just trusts that the two characters after the first dash will say so.
- **#49 Hand-built ISO from getUTC.** Reinvents Date.prototype.toISOString one zero-pad at a time, then throws away the year and most of the work to compare five characters.
- **#50 toUTCString Substring Match.** It does not know what December is, only that the string says so.
- **#51 JSON.stringify Slice.** It would rather parse a string it just printed than ask a Date object what month it is.
- **#52 ISO string regex /-12-25T/.** Why parse a date when you can ask a regular expression whether it looks Christmassy.
- **#53 Hyphen-Delimited Field Split.** Treats the date like a CSV row with a hyphen delimiter, then judges Christmas by inspecting columns two and three.
- **#54 padStart MM/DD.** It trusts a string comparison over a pair of integer checks, which is either lazy or principled depending on how you feel about types.
- **#55 Fixed-Index Char Compare.** It distrusts parseInt and trusts only the bytes at the addresses it was promised.
- **#56 Numeric MMDD Concat.** It treats the calendar like a four-digit padlock and only opens for the combination 1225.
- **#57 Array.join Date Compare.** It builds a tiny array just to flatten it back into a string, which is exactly the sort of detour the name 'stringly typed' deserves.
- **#119 Reversible Digit Cipher.** Encrypts the date before checking it, purely so it can claim chain-of-custody on the number twelve.

### Intl & Locale (10)

- **#86 Honest IANA Intl.** The boring, correct way to do this, which is presumably why the other 120 algorithms exist.
- **#87 German locale 25.12..** Germany writes the day before the month and ends it with a full stop, which is the most German way imaginable to assert that today is the 25th of the 12th.
- **#88 Japanese Locale (12月25日).** If the kanji say twelfth-month twenty-fifth-day, that is good enough for Santa.
- **#89 French locale 25/12.** The French put the day first and join it with slashes, so noel arrives as a tidy 25/12 well before anyone reaches for the month.
- **#90 Hebrew calendar cross-check.** It double-checks Christmas against the Hebrew calendar, which has its own strong opinions about December and is not consulted on any of them.
- **#91 Hijri cross-check, Gregorian verdict.** It dutifully prints the Hijri date next to the verdict, mostly to remind you that 25 December means nothing to a calendar that wandered off eleven days ago.
- **#92 Japanese era calendar.** It dutifully figures out which imperial era you're in, then quietly ignores that and checks the Gregorian date like everyone else.
- **#93 Minguo 民國 12/25.** Taiwan files Christmas under 民國115, but the 12/25 underneath never moved an inch.
- **#94 Days-until-Christmas == 0.** It counts the sleeps until Christmas and only believes it has arrived when there are none left.
- **#95 formatToParts Reducer.** Array.prototype.reduce was invented for summing numbers, but it will happily fold a date into a verdict instead.

### Esolang & Exotic Interpreters (10)

- **#26 Brainfuck Comparison VM.** Outsources a two-field date comparison to an eight-instruction esolang, because the obvious if-statement felt insufficiently load-bearing.
- **#27 Forth RPN Stack Machine.** It answers the question in postfix, because asking a stack machine for an opinion in any other order would be rude.
- **#28 Befunge Grid Walker.** A two-dimensional program counter wanders a grid of glyphs and somehow comes back with the right answer; this is what computing looked like in the timeline where we never standardized on rows.
- **#29 Church Numeral Equality.** It proves it's Christmas without ever using a number, only functions that have strong opinions about how many times to call other functions.
- **#30 S/K Combinator Christmas Predicate.** It owns no concept of the number 25; it only knows that I, K, and S rewrite, and lets December fall out of the reductions.
- **#31 Turing Machine Date Tape.** It is a fully operational Turing machine whose entire computable purpose is to recognize one five-character string.
- **#32 Cyclic Tag System Equality Tester.** It decides the date by feeding a string of ones and zeros to a machine that does nothing but delete symbols and occasionally append a zero, which is somehow exactly enough.
- **#33 Rule 110 Logic Gate.** Turing-complete since 2004, and finally given a job it is wildly overqualified for.
- **#34 Thompson NFA Regex VM.** It rebuilds Ken Thompson's 1968 NFA every page load just to confirm what a glance at the calendar would, and regrets nothing.
- **#35 Subleq OISC Date Check.** It owns exactly one instruction and has decided that subtracting things until they stop being positive is a complete philosophy of computing.

### Machine Learning Cosplay (13)

- **#36 Hardcoded-Weights MLP.** No training data, no gradient descent, no GPU bill, just a network whose weights I typed in by hand until it agreed it was Christmas.
- **#37 Hand-Built Decision Tree.** It is three if-statements wearing a trench coat labeled 'model', and it would absolutely list 'decision trees' on a resume.
- **#38 Calendar k-Nearest-Neighbors (k=1).** A machine-learning model that memorized the entire calendar and calls looking things up in it inference.
- **#39 Logistic Regression on Squared Date Features.** It is a one-neuron model with two features and a bias, which is the smallest possible machine that can still claim it was trained.
- **#40 Random Forest of Stumps.** Five stumps too weak to mean anything on their own, outvoting each other into a calendar lookup that scikit-learn would quietly disown.
- **#41 Naive Bayes over Discretized Month/Day.** It is real Bayes arithmetic over a prior that was decided in advance and likelihoods that were never fit to anything, which is most of machine learning.
- **#42 Single Perceptron AND-Gate.** It is the AND gate every intro-to-ML lecture builds, cosplaying as a date validator with delusions of being a neural network.
- **#43 Toy Self-Attention Transformer.** It is a transformer in the same way a paper hat is a crown, but the dot products and softmax are real and it does correctly attend to Christmas.
- **#44 Max-Margin RBF SVM.** A maximum-margin classifier with exactly one thing on the right side of the hyperplane, and it's the twenty-fifth of December.
- **#45 RAG over a Holiday Store.** It answers a yes-or-no question by consulting a 366-document vector database, which is roughly the engineering equivalent of hiring a librarian to confirm your own birthday.
- **#46 Gaussian RBF Classifier.** A one-support-vector kernel machine whose entire training set is the day it cares about, tuned just tight enough to overfit Christmas on purpose.
- **#47 Genetic Algorithm Evolved Rule.** Eighty generations of natural selection to rediscover that Christmas is on the twenty-fifth.
- **#120 Majority-Vote Ensemble (Stump + Linear Unit + RBF).** Three classifiers that have never met, asked the same question, and somehow all blurted out the same date.

### Physics & Astronomy Cosplay (8)

- **#96 Astronomer's Julian Date.** Counts the days since a noon in 4713 BC, which is the least convenient possible way to find out whether to hang the stockings.
- **#97 Days Since J2000.0.** Astronomers reset their clocks to noon on the first day of 2000; this voter measures Christmas as a displacement from that fixed point in the sky.
- **#98 Orbital Day-of-Year.** Counts how far Earth has swung around the Sun and only celebrates when the planet reaches the exact spot where the presents are.
- **#99 Leap-Second Cosplay.** It performs the entire ritual of leap-second bookkeeping and then admits, at the end, that the calendar never cared.
- **#100 Sidereal Clock, Solar Answer.** It runs the star clock to look impressive, notices the stars are 3 minutes 56 seconds ahead of the calendar, and quietly uses the calendar anyway.
- **#101 Hour-Angle Sundial Resolver.** It insists on counting shadow revolutions even though the sun has the good sense not to come up at midnight.
- **#102 Solar Ecliptic Longitude Marker.** It speaks fluent ephemeris but settles every dispute with long division.
- **#103 Kepler-Constants Cosplay.** Wears a sidereal year and an eccentricity figure to the party, then quietly does honest calendar arithmetic when no one is looking.

### Cursed & Over-Engineered (12)

- **#104 Seven-Microservice Pipeline.** Seven services, one boolean, zero good reasons to split it this way.
- **#105 Proxy-Intercepted Fields.** A perfectly good integer hidden behind a metaprogramming trap so that asking for the month feels like an honest day's work.
- **#106 Self-Assembling Function.** Writes its own punchline at startup, then spends the rest of its life delivering it.
- **#107 Day-Block Hash Chain.** It reinvents a calendar lookup as a single-node private blockchain, then mines up to 366 blocks just to read the one it already knew the index of.
- **#108 One-Day-Step State Machine.** It could have looked at the date, but it preferred to count to it one day at a time.
- **#109 Array(9).reduce epoch-to-civil one-liner.** An entire calendar algorithm folded into one array reduction, because a for-loop would have been too easy to read.
- **#110 Quantum Wavefunction Collapse.** It keeps both Christmas and not-Christmas alive until you look, at which point it admits it was just an if statement wearing a lab coat.
- **#111 Enterprise Builder/Strategy.** Four classes and a factory to ask whether a number is December 25, which is exactly the amount of ceremony the question deserves.
- **#112 Recalculating Spreadsheet.** It is a spreadsheet that does exactly one thing, has no UI, and would still somehow have a circular-reference bug if I weren't careful.
- **#113 Throw-Driven Day Walker.** Uses exceptions for ordinary loop control, which every style guide forbids and which works perfectly anyway.
- **#114 GraphQL Field Resolver.** Spins up an entire query executor and field-resolution layer to answer one boolean, which is roughly the industry-standard ratio.
- **#115 DI Container CalendarService.** Three services and a token registry to answer a yes/no question, because wiring it inline would have denied a future maintainer the joy of tracing the object graph.
