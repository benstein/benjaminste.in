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

A few of the voters, in the words of the agents that reviewed them: **Church Numeral Equality** "proves it's Christmas without ever using a number." **RAG over a Holiday Store** "consults a 366-document vector database, which is roughly the engineering equivalent of hiring a librarian to confirm your own birthday." **Quantum Wavefunction Collapse** "keeps both Christmas and not-Christmas alive until you look, then admits it was an if statement wearing a lab coat."

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
