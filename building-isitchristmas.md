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

[isitchristmas.com](https://isitchristmas.com) answers one question, and it answers it in one word: YES or NO, in giant bold type. Eric Mill ([@konklone](https://bsky.app/profile/konklone.com)) has run it since the late 2000s, and the whole time it has doubled as a place to try whatever web technology he felt like. Look under the hood of the original and you find websockets, a progressive-web-app manifest, live multiplayer cursors, an IFTTT hook. None of that is necessary to tell you the date, and that was never the point. He just wanted somewhere low-stakes to try the new thing.

I love that about it, so I am continuing the tradition. The new thing I wanted to try is a way of building rather than a web technology. Claude Opus 4.8 shipped with "dynamic workflows," where instead of one assistant editing files in a loop, you orchestrate hundreds of AI agents from a script: fan them out and compose what they return. I had read the description without understanding it in my gut, so I pointed it at the most pointless target I could think of and watched.

This is the account of what it did. The one-word answer on the page is the same as ever. Everything behind it changed, and that is the story.

## What a dynamic workflow is

The mental model I started with was wrong. I assumed "agents" meant a chat that calls itself a lot. It is closer to this: you write an ordinary JavaScript program, and a few of the function calls in it spawn a fresh AI agent that goes off, does a self-contained task, and returns a value. The program is deterministic; the agents are not. You get ordinary control flow, loops and conditionals and fan-out, to coordinate work that no single context could hold at once.

Two primitives do most of the work. `parallel([...])` runs a batch of agents at the same time and waits for all of them. `pipeline(items, stageA, stageB)` runs each item through a series of stages. Each agent can be handed a JSON schema, and the framework forces it to return data in that exact shape, so the next line of your program gets a clean object instead of prose to parse. The whole thing runs in the background and reports when it finishes.

Fanning work out to many workers and checking it against a test is not a new idea. What is new is that it is now a first-class thing you drive from a single prompt. The interesting part is what you build with it, and it starts with something that has no AI in it at all.

## Claude built the referee first

I gave Claude an absurd brief: rebuild Is It Christmas so the YES/NO verdict is decided by a parliament of 121 independent algorithms, each a different way to work out whether today is December 25, all voting. Go as strange as you like.

The first thing it wrote was the judge. Before a single voter existed, Claude wrote a 347-line Node script whose only job is to decide, with no AI involved, whether an algorithm is correct. It generates 148,488 test cases: every hour around Christmas across a dozen years, full-year sweeps to catch leap-year mistakes, 8,000 random instants, and every populated timezone from UTC−12 to UTC+14, including the ones that run daylight saving in December. For each case it derives the true answer from the platform's own calendar tables, runs the candidate, and compares.

One rule did the most work here, and it holds even if you don't write code: **a language model should not be the final authority on whether code is correct, so it isn't.** The referee is deterministic, and it was tested before anything trusted it. Claude planted a deliberately broken algorithm that used UTC instead of local time and confirmed the referee caught it on 5,571 cases, then confirmed a known-good algorithm passed all 148,488. Only then did it start judging.

The referee also has a conscience about method. Of the 121 algorithms, 59 were required to derive the date from raw arithmetic with no calendar library. The referee scans their source and disqualifies any that try to cheat, so those 59 really do the arithmetic.

## Wave one: 121 authors, fanned out at once

With a referee in place, Claude wrote a menu of 121 distinct methodologies, sorted into eleven cohorts so no two agents would build the same thing, and launched the first workflow. Its core is four lines:

```js
const results = await parallel(
  MENU.map((m) => () =>
    agent(promptFor(m), { schema: AUTHOR_SCHEMA, agentType: 'general-purpose' })
  )
);
```

That spawns 121 agents at once, each assigned one methodology. The part that makes the pattern work is what came next: each author was handed the referee and told to keep going until it passed. Write the algorithm, run it against the 148,488 cases, read the failures, fix the code, run again, and report success only once the referee said PASS. The agents graded themselves against something that could not be talked around.

115 of the 121 passed on their first submission. The six that needed a second pass are the good part, because they are bugs the referee caught that a human skimming the code would have missed. The best one used Rata Die, a day-counting scheme from a book on calendar math. It used 719163 as the constant bridging the Unix epoch to the Rata Die epoch when the right value is 719162, one off. That single digit put about 20,000 cases one day early, all of them clustered around midnight in the far-eastern timezones, exactly where a one-day error hides until you test the boundary. The referee does. The agent read the failures, traced it to the constant, and passed on the second try. No human reviewed the fix.

The wave finished in about 31 minutes and 4.8 million tokens.

## A checkpoint between waves

When all 121 agents reported done, I ran the referee myself, once, over every shipped algorithm. All 121 passed, which they had to, since nothing could ship that the referee had not already certified. That is the rhythm of working this way: agents do the labor in a wave, and between waves a person reads the result and decides what comes next. It feels less like watching a chatbot type and more like running a small factory and inspecting the output between shifts.

## Wave two: 363 reviewers, each fanned out three ways

The next workflow was adversarial. By the time an algorithm reached it, it had already passed 148,488 cases, so the reviewers were not there to find arithmetic bugs. They were there to check that each algorithm honestly described itself and to find where it would break. Every one of the 121 went to three agents at once, and the script nests `parallel` inside `parallel`:

```js
const merged = await parallel(ALGOS.map((a) => async () => {
  const [audit, fragility, curator] = await parallel([
    () => agent(auditorPrompt(a),   { schema: ACK }),  // does the code do what it claims?
    () => agent(fragilityPrompt(a), { schema: ACK }),  // where would it break?
    () => agent(curatorPrompt(a),   { schema: ACK }),  // write one sharp sentence about it
  ]);
  return { id: a.id, honest: audit.honest, weakness: fragility.severity, line: curator.oneLiner };
}));
```

That is 363 reviewers. The auditors flagged nine algorithms for possibly misrepresenting themselves, and I read all nine. Every one was a reviewer applying the strict no-calendar-library rule to an algorithm that was allowed to use one. Nothing was lying about itself, which is the answer I wanted and would not have believed without checking. The single genuine limitation the reviewers surfaced is worth stating: 120 of the 121 are only guaranteed correct between 1970 and 2200. Load the site in the year 2250 and a few quietly go wrong, which nobody will, but it is still true.

This wave ran 363 agents in about 24 minutes for 11 million tokens, and it is what sold me on the approach. Getting a hundred independent skeptics to attack your work from three fixed angles is not something one agent in a loop can do for you.

## The post reviewed itself

One more, because it is too good to leave out. The draft of this post went through a fourth workflow: four critics in parallel, one hunting the stylistic tics that give AI writing away, one fact-checking every number against the code, one playing a jaded Hacker News commenter, one making sure Eric Mill got proper credit. The fact-checker earned its keep when an earlier draft claimed one algorithm used "Newton's method"; it uses a plainer estimate-and-correct loop, and the critic caught it. The style critic caught me overusing the word "actually" and a contrast trick I lean on, which is part of why this version reads the way it does. The same pattern that built the site checked the story about the site.

## The parliament, purely for entertainment

None of the above depends on the algorithms being interesting. They could all have been the same boring date check. Most of them basically are, the same small comparison in increasingly elaborate costumes, which is the joke. Since you read this far, here are the highlights. The reviewers rated them 11 elegant, 58 clever, 51 cursed, and one unhinged, and each line below was written by the agent that reviewed that algorithm.

- **#29, Church Numeral Equality** "proves it's Christmas without ever using a number, only functions that have strong opinions about how many times to call other functions."
- **#26, a real Brainfuck interpreter** running a Brainfuck program that subtracts 12 and 25.
- **#45, RAG over a Holiday Store** "answers a yes-or-no question by consulting a 366-document vector database, which is roughly the engineering equivalent of hiring a librarian to confirm your own birthday."
- **#110, Quantum Wavefunction Collapse** "keeps both Christmas and not-Christmas alive until you look, at which point it admits it was just an if statement wearing a lab coat."
- **#107, a single-node private blockchain** that mines up to 366 blocks to look up a date it already knew.
- **#62, Roman numerals** ("the kind of date format that was already obsolete by the time anyone wrote down the date of the first Christmas"), next to cohorts that check the date in balanced ternary, Babylonian base 60, Morse code, and Fibonacci coding.
- **#86, the one honest algorithm,** "the boring, correct way to do this, which is presumably why the other 120 algorithms exist."

All 121 ship to your browser and run on page load, and you can read every one in the page source. Open the developer console on [the site itself](/isitchristmas) to watch them vote in real time, a habit I am borrowing straight from the original.

## What this kind of orchestration is good for

I came out of this with a clearer answer than I went in with. A single agent in a loop is right when the work fits in one head and the steps depend on each other. You reach for a workflow when the work is wide rather than deep: a hundred independent things to build, or one thing to attack from many angles before you trust it.

The shape that kept paying off was simple. Build a deterministic gate first, then fan a swarm of cheap, disposable agents at the problem and make each one earn its way past it. Read the results yourself between waves, and send a second swarm to break what the first one made. The agents were occasionally wrong and it never mattered, because being wrong got caught by something that does not bluff. The thing you are really designing is not the agents. It is the test they have to pass.

This only works when you can write that test. Here the right answer was cheap to pin down, so the gate was easy and trustworthy. When correctness is fuzzy or expensive to check, the gate gets weaker and the agents' confident wrongness starts to leak through. Think hard before you point a swarm at something that matters. None of this is free or repeatable either: run it again and you get different agents, different bugs, and a different bill. One engineer would have written the referee and a single correct algorithm in an afternoon. The other 120 algorithms and the 484 robots were the point only because the point was to learn the tool.

That, not the website, is what I built this week, which is what Is It Christmas has always been for.

Every piece of the machinery is [in the repo](https://github.com/benstein/benjaminste.in/tree/main/isitchristmas/build), with a README: the referee, the methodology menu, the assembler, and all four workflow scripts. Read the code if you would rather see it than take my word for it.

## The receipts

<div class="iic-receipts" markdown="1">

| | |
|---|---|
| Frontier model | **Claude Opus 4.8** |
| Build method | **dynamic multi-agent workflows** |
| Scripts Claude wrote (gate, menu, workflows) | **~850 lines** |
| AI agents | **484** (121 authors + 363 reviewers) |
| Tokens | **~16 million** |
| Author wave | **121 agents in parallel**, ~31 min |
| Passed the gate on first submission | **115 / 121** |
| Review wave | **363 agents** (121 × 3 lenses), ~24 min |
| Honesty flags raised, then cleared | **9 / 9** |
| Correctness cases per algorithm | **148,488** |
| Algorithms shipped | **121** |
| Shipped to every visitor's browser | **419 KB**, all 121 run on load |
| Rough API cost | **a few hundred dollars** |
| What the visitor sees | **one word** |

</div>

## Credit

Is It Christmas is Eric Mill's, and so is the idea that a silly single-purpose site is the best place to try something new. [Go read the original](https://isitchristmas.com); it has been quietly excellent for the better part of two decades, and it taught me the whole approach I just described. Then open the console on [my version](/isitchristmas) and watch 121 algorithms, built and vetted by 484 robots, agree on the obvious.
