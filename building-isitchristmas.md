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

[isitchristmas.com](https://isitchristmas.com) has done one thing for fifteen years: tell you, in one giant word, whether it's Christmas. The answer is almost always NO. Eric Mill ([@konklone](https://bsky.app/profile/konklone.com)) built it, and the whole time it's doubled as his excuse to mess with new web tech. Crack open the original and you'll find a websocket, a layer of live multiplayer cursors, a phone-app manifest, an IFTTT hook, none of which a calendar needs. That's the tradition: grab the dumbest site on the internet and use it as a lab.

I run an AI startup. We build with Claude every day, and I've been shipping agents for a year. So when Claude Code dropped a feature I couldn't get a feel for, I knew exactly where to take it.

The feature is [dynamic workflows](https://code.claude.com/docs/en/workflows), which shipped last week with [Claude Opus 4.8](https://www.anthropic.com/news/claude-opus-4-8). I'd read the docs. I understood what it did. What I didn't have was any instinct for *when you'd reach for it* instead of just letting one agent grind through a job. The only way to get that instinct is to use it on something real, so I pointed it at the stupidest target I could find and watched.

What came out looks exactly like the original. One word. The difference is that about 500 AI agents built it, on my laptop, in an hour, and I came out the other side understanding the feature. Here's what they did.

## One agent, or five hundred

If you've used Claude Code, you know the normal loop: one agent, reading your files, making edits, running tests, turn by turn. One worker, one train of thought. That's perfect right up until the job is too big to fit in one head.

A dynamic workflow is the other gear. Claude writes a small JavaScript program whose only job is to spin up a crowd of throwaway Claude agents and boss them around. Two moves do most of the work. `parallel` fires off a batch of agents at once. `pipeline` runs them down an assembly line. Each agent does one small thing and hands back a clean answer. You can run up to a thousand of them, sixteen at a time. You turn the whole thing on by literally typing the word "workflow," which tells you how new it still is.

There's a catch nobody mentions. A thousand agents will confidently hand you a thousand answers, and a chunk of them will be wrong. Fan-out multiplies your output and it multiplies your mistakes at the exact same rate. So a workflow is only ever as good as your ability to check what comes back. Hold onto that. It turns out to be the whole game.

## Why 121 ways to check a calendar

To get a feel for fan-out, I needed work that splits into a lot of independent pieces. "Is it Christmas" is the opposite of that. It's one line of code: is the month December and the day the 25th? You do not need five hundred agents for that. You need about four seconds.

So I made up a job that fits. Instead of checking the date once, I'd check it 121 times, with 121 completely different programs, and then have them vote. A hash table that memorized every Christmas through the year 2400. A tiny neural network with hand-picked weights. A Brainfuck interpreter. A fake blockchain. The date in Roman numerals, in Morse code, in base 60 like the Babylonians.

None of this is necessary. That is the point. I manufactured 121 chunks of independent work so I'd have something worth fanning out, the way you'd write a pointless 500-file repo to test a migration tool. The ridiculous algorithms aren't the project. They're the load.

## Build the referee first

Back to the catch. 121 agents writing 121 date algorithms is 121 chances to be subtly, invisibly wrong. And I was not going to read 121 hand-rolled calendar algorithms to find out which ones.

So the first thing Claude built wasn't an algorithm. It was a referee: a plain Node script, no AI anywhere in it, that takes any algorithm and rules on whether it's correct.

This works because "what's the date" is a question with a cheap, knowable answer. You don't have to be clever about testing it. You can just brute-force the entire space. The referee throws 148,488 different moments at each algorithm: every hour around Christmas across a dozen years, every timezone on earth, the weird 45-minute ones, leap years, the day the clocks change. For each moment it works out the real answer the boring correct way, then checks whether the algorithm agrees. Miss one and you fail.

That number isn't a brag, it's the trick. When the truth is cheap to generate, you stop trusting the model's say-so and let a dumb deterministic program be the judge instead. The big number just means "exhaustively, no exceptions."

Two things I want to be clear about, because they matter. This referee runs on my laptop while I'm building. It is not in the website, and nothing your browser does ever touches it. And Claude tested the referee before trusting it: it slipped in a deliberately broken algorithm to confirm the referee caught it, then confirmed a known-good one passed all 148,488. A judge you haven't tested is just a confident guess.

## Swarm one: 121 agents write the code

Now the fan-out. Claude wrote a workflow script, ran it on my machine, and it launched 121 agents at once, one per algorithm:

```js
// one agent per algorithm, all running at the same time
await parallel(
  menu.map((spec) => () => agent(writePrompt(spec), { schema: RESULT }))
);
```

There are two populations here and they're easy to mix up, so let me keep them straight. There are the **121 agents**: temporary workers Claude hired for a few minutes to write code. And there are the **121 algorithms** they produce: the things that ship. The agents are scaffolding. They evaporate when the job is done. Only their output lives on.

The move that makes the swarm trustworthy is what each agent was told: don't come back until the referee passes you. Write your algorithm, run it through all 148,488 checks, read whatever failed, fix it, run it again. Every agent graded its own homework against a teacher that can't be charmed.

115 of the 121 passed on the first try. Six needed a second pass, and those six are my favorite part, because they're exactly the kind of bug a human skim sails right past.

The best one used something called Rata Die, an old scheme for counting days as one big number, no months or years, straight back to a January in year one that nobody was around for. The agent got a single constant off by one: it wrote 719163 where the right value is 719162. That one digit shoved about 20,000 of the test dates a day early, and every single one was bunched up around midnight in the far-eastern timezones, which is precisely where a one-day slip hides unless you happen to be looking at midnight in New Zealand. The referee looks at midnight in New Zealand. It flagged the failures, the agent traced it to the constant, fixed it, and passed on the second try. I didn't review the fix. I didn't even know it had happened until I read the logs.

The whole swarm took 31 minutes and 4.8 million tokens.

## Swarm two: 363 agents try to break it

When the agents reported done, I reran the referee myself, once, over all 121. Clean. That's the rhythm of this thing: a swarm does a wave of work, then a human looks at the pile and decides what happens next. It feels less like babysitting a chatbot and more like running a shift and inspecting the output between them.

Then I sent a second swarm, and this one was out for blood. Every algorithm went to three more agents at once, 363 in all, each with a different angle:

```js
// for each algorithm, three reviewers at once
await parallel(algorithms.map((a) => async () => {
  const [matches, breaks, blurb] = await parallel([
    () => agent("does this code do what it claims?"),
    () => agent("where would this break?"),
    () => agent("describe it in one sharp line"),
  ]);
  return { id: a.id, matches, breaks, blurb };
}));
```

The referee had already settled correctness, so this swarm wasn't hunting bugs. It was for the stuff a deterministic test can't judge: is the code honest about what it does, where is it fragile, and, purely for this writeup, what's the one funny thing about it. Three hundred independent opinions, gathered in parallel, is something a single agent grinding in a loop just can't give you. That's the case for fan-out in one sentence.

It flagged nine algorithms as maybe fibbing about themselves. I read all nine; every one was a reviewer being too strict, not an algorithm lying. The only real limitation it surfaced is an honest one: 120 of the 121 only work between 1970 and 2200. Load the site in the year 2250 and a few quietly break. Nobody will, but it's true.

## What ships to your browser

All of that, the referee and both swarms and the 484 agents, happened on my laptop while building. None of it ships.

What ships is small and dumb: the 121 finished algorithms in one file, plus a few lines that run them and count the votes. You load the page, your own browser runs all 121, they vote, and you get one word. The whole election takes about a tenth of a millisecond. Open your developer console to watch them argue in real time, a habit I'm stealing straight from the original, whose source code has been telling people to open the console for fifteen years.

## The parliament (this part is just for fun)

Since you made it this far, here are a few of the 121, described by the agents that reviewed them:

- **Church Numeral Equality** "proves it's Christmas without ever using a number, only functions that have strong opinions about how many times to call other functions."
- **RAG over a Holiday Store** "answers a yes-or-no question by consulting a 366-document vector database, which is roughly the engineering equivalent of hiring a librarian to confirm your own birthday."
- **Quantum Wavefunction Collapse** "keeps both Christmas and not-Christmas alive until you look, at which point it admits it was just an if statement wearing a lab coat."
- And the one honest one, plain `Intl`: "the boring, correct way to do this, which is presumably why the other 120 algorithms exist."

They all pass, and most of them are the same one-line date check in increasingly elaborate costumes, which is the joke. Every one is in the page source if you want to read them.

## So when would you use this?

Here is what a couple hundred dollars of tokens bought me, which is the part I was after.

Reach for a workflow when the work is wide, not deep: a hundred independent things to build, a hundred files to review, one decision you want attacked from a dozen angles before you commit. A single agent in a loop is still the right tool when the steps depend on each other and the whole thing fits in one context. Fan-out is for when it doesn't.

But a swarm is only as good as its referee. Mine worked because "what's the date" has a cheap, knowable right answer, so I could trust 121 algorithms without reading a line of any of them. The moment the right answer gets fuzzy or expensive to check, that safety net is gone, and five hundred confidently-wrong agents is a far worse place to be than one careful one. Before you point a swarm at something, ask whether you can write the test that catches it lying. If you can't, don't.

And none of it is free or repeatable. Run the same thing tomorrow and you get different agents, different bugs, a different bill. A decent engineer would have written my referee and one correct algorithm in an afternoon. The other 120 algorithms and the 484 robots bought me nothing I needed, except a real feel for the tool, which was the whole point.

If you take one thing from this: the skill isn't writing the agents. It's writing the test that decides whether to trust them.

## Receipts

<div class="iic-receipts" markdown="1">

| | |
|---|---|
| Feature I was learning | **[dynamic workflows](https://code.claude.com/docs/en/workflows)** (Claude Opus 4.8) |
| Agents that built it | **484** (121 wrote algorithms, 363 reviewed them) |
| Algorithms they produced | **121** |
| Tokens | **~16 million** |
| Rough cost | **a couple hundred dollars** |
| The referee | **a Node script with no AI in it**, run on my laptop |
| Cases the referee checks per algorithm | **148,488** |
| Passed on the first try | **115 / 121** |
| What ships to your browser | **121 algorithms + a vote counter** (~420 KB) |
| What the visitor sees | **one word** |

</div>

## Credit

Is It Christmas is Eric Mill's, and so is the idea that a stupid little site is the best place to learn something new. [Go read the original](https://isitchristmas.com); it's been quietly great for fifteen years and it taught me the whole move. The machinery behind mine, the referee and all four workflow scripts, is [in the repo](https://github.com/benstein/benjaminste.in/tree/main/isitchristmas/build) with a README. Then open the console on [my version](/isitchristmas) and watch 121 algorithms, built and vetted by 484 robots, agree on the obvious.
