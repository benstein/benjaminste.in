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

[isitchristmas.com](https://isitchristmas.com) has done one job for more than a decade. You load it, and it tells you whether it is Christmas. The answer is a single word, YES or NO, in giant bold type, and it is right every day of the year by the grace of the calendar. Eric Mill ([@konklone](https://bsky.app/profile/konklone.com)) has quietly maintained it the whole time. It is one of my favorite things on the web, because it is finished. There is nothing left to add.

So I added everything.

My version, at [benjaminste.in/isitchristmas](/isitchristmas), shows you the same single word. The difference is underneath. The answer is not read off the clock once. It gets computed 121 separate times, by 121 completely independent algorithms that each decide, on their own, whether your local date is December 25. Then they vote, and the site renders the majority verdict.

I did not write those 121 algorithms. I wrote a correctness test and a few hundred words of instructions, and a swarm of Claude Opus 4.8 agents wrote the rest, tested their own work against the gate until it passed, then reviewed each other while I watched. This is an account of what they did.

<aside class="pull-quote"><p>It gets computed 121 separate times, and they vote.</p></aside>

## What you actually see

Nothing changed about the experience. You get one word. On December 25, in your own timezone, it says YES. Every other day it says NO. There are no flags, no visitor counts, no cookie banner asking permission to tell you the date.

The original has a famous comment in its source: `Open the developer console (around Christmas).` I kept the tradition. Open the console on my version any day of the year and the parliament shows its work: the running tally, any dissenters, and a 121-row table of every vote with its timing. The whole spectacle is one `console.table` away and otherwise invisible, which felt like the right amount of restraint for a project that has none.

## Why a parliament

The simplest correct way to answer this is to read the local month and day and check for the twelfth and the twenty-fifth. A version of exactly that, done properly with the platform's internationalization, is one of the 121. It is the most boring algorithm in the building, and the other 120 are the reason it needs the company.

They exist because turning a millisecond timestamp into a calendar date is a real problem with a deep literature: Howard Hinnant's `civil_from_days`, the Fliegel–Van Flandern algorithm from a 1968 issue of *Communications of the ACM*, Julian Day numbers, Rata Die, the proleptic Gregorian ordinal that Python runs every time you call `date.fromordinal`. Each is a different, genuine route from a number to a date. I wanted all of them in one room, plus a hundred worse ideas.

Every algorithm gets the same input and answers the same boolean. To handle timezones without any of them needing to understand timezones, the engine hands each one a single number: the millisecond count, shifted so that reading it as if it were UTC reproduces your local wall clock. Load the page at 9pm on December 25 in Auckland and the true UTC instant is still the morning of the 25th in London; the engine shifts it by your offset so the integer it passes out reads back as the evening of the 25th. An algorithm that correctly turns that integer into a date is right in every timezone we tested, including the ones that observe daylight saving in December. The algorithms never know where you are. They just know the number.

Here is the part worth saying out loud, before anyone else does: the vote is decorative. Correct algorithms never disagree, so the tally comes back 121 to nothing every single day, and the majority rule has never once had to break a tie. I built a parliament that has never been divided. That is the joke, and it cost 16 million tokens.

## The eleven cohorts

I sorted the 121 methodologies into eleven cohorts and assigned each agent exactly one, so no two would collide. The reviewers later rated them: 11 elegant, 58 clever, 51 cursed, and one, fittingly, unhinged. Each algorithm describes itself in a line; those descriptions, quoted below, were also written by the agents.

**Calendrical Classics (12).** The published, respectable algorithms: Hinnant, Fliegel–Van Flandern, Meeus' astronomical method, Conway's Doomsday rule. *#5 Rata Die "counts days the way medieval chronologists wished they could: one integer, no calendar, all the way back to a January in year one that nobody actually observed."*

**Epoch Arithmetic (13).** Raw number-crunching on the millisecond count. One marches forward from 1970 counting leap years on its fingers. One does the whole conversion in BigInt nanoseconds so no December rounds into January. *#23 "guesses the year, checks its own work, and adjusts, like a clerk who never quite trusts the first answer."*

**Esolang & Exotic Interpreters (10).** These build a tiny computer and make it do the work. A real Brainfuck interpreter runs a Brainfuck program that subtracts 12 and 25. There is also a Turing machine, a Forth stack, a Befunge grid, an S/K combinator reducer, and Rule 110 wired up as logic gates. *#29 "proves it's Christmas without ever using a number, only functions that have strong opinions about how many times to call other functions."* It is also the slowest algorithm in the building, at 19 microseconds a vote.

**Machine Learning Cosplay (13).** Models with no training, baked weights, and delusions of grandeur. A hardcoded perceptron. A "random forest" that is five stumps outvoting each other into a calendar lookup. A toy self-attention head with real dot products. *#45 "answers a yes-or-no question by consulting a 366-document vector database, which is roughly the engineering equivalent of hiring a librarian to confirm your own birthday."*

**Stringly Typed (11).** Everything is a string. Slice the ISO timestamp, match a regex against it, split on hyphens, compare `"1225"`. *#48 "never learns that December is month twelve; it just trusts that the two characters after the first dash will say so."*

**Number-Base Maximalists (13).** The date is correct, if you agree to read it in a stranger base. Binary, octal, hexadecimal (Christmas is the 19th of month C, and it is technically right about that), balanced ternary, Babylonian sexagesimal, Roman numerals, Morse code, Zeckendorf's Fibonacci representation. *#62, the Roman numeral one, is "the kind of date format that was already obsolete by the time anyone wrote down the date of the first Christmas."*

**Recursion & Functional (10).** No loops allowed. A Y-combinator carries the recursion; a trampoline keeps the stack from overflowing. *#73 passes the answer through continuations and "just keeps passing the buck until someone has to answer for December."*

**Lookup & Memoization (9).** Precompute every Christmas from here to the year 2400 and check the guest list. These are the fastest votes on the page, tens of nanoseconds each. *#79, a hash map, "precomputed every Christmas it will ever need and now just checks the guest list at the door."*

**Intl & Locale (10).** The grown-up cohort. One formats the date in German (25.12.), one in Japanese kanji, one counts the sleeps until Christmas and only believes it has arrived when there are none left. This cohort holds the single honest algorithm, *#86: "the boring, correct way to do this, which is presumably why the other 120 algorithms exist."*

**Physics & Astronomy Cosplay (8).** Astronomers' machinery aimed at the wrong target: Julian Date from a noon in 4713 BC, days since the J2000.0 epoch, a sidereal clock. *#100 "runs the star clock to look impressive, notices the stars are 3 minutes 56 seconds ahead of the calendar, and quietly uses the calendar anyway."*

**Cursed & Over-Engineered (12).** The cohort that understood the assignment. A seven-microservice pipeline for one boolean. A dependency-injection container wiring up a `CalendarService`. A spreadsheet engine. A single-node private blockchain that mines up to 366 blocks. *#110 "keeps both Christmas and not-Christmas alive until you look, at which point it admits it was just an if statement wearing a lab coat."*

## What the agents actually did

The work ran as two waves of a multi-agent workflow, with me orchestrating and a node script acting as the final judge.

**Wave one: 121 authors.** Each agent got one cohort assignment, the input contract, and one rule above all others: your code must pass the gate. Each wrote its algorithm, ran the test, read the failures, fixed the code, and ran it again, looping on its own until the gate printed PASS.

So when I say all 121 passed, hold the applause: they passed *by construction*. An agent could not report success until the gate said so, which makes the final pass rate a property of the loop, not a miracle of the model. The number worth reporting is how often the gate caught a real bug mid-loop. 115 of the 121 passed on their first submission. Six needed a second pass. The best of those was the Rata Die algorithm, which used 719163 as its Unix-to-Rata-Die offset when the correct constant is 719162. That off-by-one put about 20,000 of the test samples one day early, all of them clustered around midnight in the far-eastern timezones, exactly where a one-day error hides until you test the boundary. The gate tests the boundary. It was fixed in the second pass.

<aside class="pull-quote"><p>When I say all 121 passed, hold the applause: they passed by construction.</p></aside>

**Wave two: 363 reviewers.** Every shipped algorithm was read by three more agents working different angles. An auditor checked that the code does what its description claims. A second hunted for the algorithm's weakest assumption. A third wrote the one-liner you have been reading throughout this post. The auditors flagged nine algorithms for honesty. I read all nine. Every one was a reviewer holding an "extract" algorithm, which is permitted to read the date with a getter, to the stricter standard meant for the from-scratch cohort. Nothing was actually misrepresenting itself, which is the result I wanted and did not assume. The weakest-assumption reviewers were more sobering: 120 of the 121 are correct only inside their tested range. Push them past the year 2200, or before 1970 into negative timestamps, and some quietly break. No one loading a website in those years will notice, but it is the real footnote on the word "correct."

## The gate is the whole game

A language model should not be the final authority on arithmetic, so it isn't. The judge is a plain node script that runs each algorithm against 148,488 distinct timezone-and-moment samples and compares every answer to ground truth. The samples cover 1970 to 2200 and every populated UTC offset from −12 to +14, including the half-hour and 45-minute zones. They include the hourly window around Christmas across a dozen years, full-year daily sweeps that catch leap-year and day-of-year bugs, and 8,000 random instants. The central run alone is about 18 million evaluations. During authoring, the agents ran it many times more than that.

The gate also polices method. Fifty-nine algorithms were assigned to derive the date from the raw integer with arithmetic only, no `Date`, no `Intl`, no string parsing. To keep that claim true, the gate scans their source and fails any that reach for a shortcut. The "from scratch" label is enforced, not trusted.

There is one thing the gate itself trusts: its ground truth comes from the platform's own internationalization tables, the same machinery every browser uses to format a date. If that is wrong, so is my gate, and so is everyone's calendar. I decided I could live with that.

## The receipts

<div class="iic-receipts" markdown="1">

| | |
|---|---|
| Algorithms shipped | **121** |
| AI agents | **484** (121 authors, 363 reviewers) |
| Tokens | **~15.9 million** |
| Rough API cost | **a few hundred dollars**, to render a word your OS already knows |
| Lines of JavaScript | **5,724** |
| Correctness samples per algorithm | **148,488** |
| Passed the gate on first submission | **115 / 121** |
| Algorithms that shipped without passing the gate | **0** |
| Fastest cohort | **Lookup & Memoization**, tens of nanoseconds a vote |
| Slowest vote | **#29 Church Numeral Equality**, ~19 microseconds |
| Full 121-algorithm parliament | about **0.1 milliseconds** of compute |
| Bundle shipped to every visitor | **419 KB** |
| Model | **Claude Opus 4.8**, via Claude Code workflows |

</div>

Every visitor downloads 419 KB of JavaScript, five orders of magnitude more than the answer needs, and their browser runs all 121 algorithms before painting a single word. The whole parliament reaches a verdict in about a tenth of a millisecond. You will never watch it happen, because the work is the joke and the joke runs faster than a screen refresh.

## Is any of this real?

More than it has any right to be. The answer on the page is the genuine consensus of 121 algorithms that genuinely run in your browser and genuinely agree about nothing, because every one of them passed the same test. The Brainfuck interpreter is a real Brainfuck interpreter. The Church numerals reduce. The blockchain mines. The 5,724 lines exist and do what they say.

What is not real is the need for any of it. One line of JavaScript answers this question correctly, and I shipped 5,724. The marginal 5,723 buy nothing but the bit, and that is the part worth being honest about, because the lesson here is not that AI agents can write a calendar algorithm. Date arithmetic is easy; a single agent would have done it in one try. The lesson is that I could stand up a fleet of them, point them at a hard pass/fail test, and trust the result precisely because I never trusted the agents. The gate did. The agents were cheap, fast, and occasionally wrong, and none of that mattered, because nothing shipped that the test had not certified. That workflow is the actual product. Is It Christmas is just the most ridiculous thing I could aim it at.

## Credit

The idea, the design, and more than a decade of upkeep belong to [Eric Mill](https://bsky.app/profile/konklone.com). [isitchristmas.com](https://isitchristmas.com) is a small perfect thing, and the right response to a small perfect thing is to respect it, which I have done by building a deranged tribute that produces the identical output through five orders of magnitude more effort. Go read his version. Then open the console on [mine](/isitchristmas), and watch 121 algorithms agree on the obvious.
