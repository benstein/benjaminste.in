# How `/isitchristmas` was built

This directory is the orchestration behind **[benjaminste.in/isitchristmas](https://benjaminste.in/isitchristmas)** — a rebuild of Eric Mill's [isitchristmas.com](https://isitchristmas.com) where the one-word YES/NO answer is decided by a parliament of 121 independent algorithms voting in your browser.

Almost none of it was written by a human. It was built by **Claude Opus 4.8** driving **dynamic multi-agent workflows**: JavaScript scripts that fan work out across hundreds of disposable AI subagents and compose what they return. The full story is in the writeup: **[Building 'Is It Christmas' in 2026](https://benjaminste.in/building-isitchristmas)**.

The point was never the website. It was to learn what these workflows are good for. The files here are the answer.

## The flow

```
harness.js              the referee — deterministic, no AI. 148,488 test cases per algorithm.
   │                    Built and self-tested FIRST, before any algorithm existed.
   ▼
menu.js                 generates 121 distinct methodology assignments across 11 cohorts
   │                    (so no two agents build the same thing)
   ▼
author-workflow.js      WAVE 1: fan out 121 author agents in parallel. Each writes one
   │                    algorithm and loops against harness.js until it prints PASS.
   ▼
(central gate)          a human re-runs harness.js over all 121. Nothing ships uncertified.
   │                    Result: 121/121 pass, 0 repairs.
   ▼
review-workflow.js      WAVE 2: fan out 363 reviewers (121 algorithms × 3 lenses:
   │                    auditor / fragility / curator). Nested parallel().
   ▼
assemble.js             splice the 121 verified algorithms into ../algorithms.js
```

Separately, **`critique-workflow.js`** ran the writeup itself through four critics (style, accuracy, an HN skeptic, and a credit check) before it shipped. **`repair-workflow.js`** was staged to fix any algorithm that failed the central gate; it was never needed.

## The files

| File | What it is | Lines |
|------|-----------|-------|
| `harness.js` | The referee. Generates 148,488 (timezone, instant) test cases spanning 1970–2200 and every UTC offset from −12 to +14, derives ground truth from `Intl`, and runs each candidate algorithm against all of them. Also lints the 59 "from-scratch" algorithms to confirm they use no calendar library. | 347 |
| `menu.js` | The 121 methodology assignments, grouped into 11 cohorts (Calendrical Classics, Esolang Interpreters, Machine Learning Cosplay, Cursed & Over-Engineered, …). | 177 |
| `author-workflow.js` | Wave 1. `parallel()` over the menu; each agent self-verifies against `harness.js`. | — |
| `review-workflow.js` | Wave 2. `parallel()` over the algorithms, with a nested `parallel()` over three review lenses each. | — |
| `critique-workflow.js` | Four parallel critics on the writeup draft. | — |
| `repair-workflow.js` | Staged repair wave for gate failures (unused — 0 failures). | — |
| `assemble.js` | Concatenates the verified algorithms into the shipped bundle. | — |
| `manifest.json` | Metadata for all 121: id, cohort, derivation policy, a plain-English methodology, and the one-line description the reviewer wrote for each. | — |

The 121 algorithm source files themselves live in the shipped bundle next door: **[`../algorithms.js`](../algorithms.js)**.

## Two things worth knowing if you want to read the code

**Workflow scripts run with no filesystem.** A dynamic workflow executes in a sandbox without file access, so any data the script needs is injected at launch. That is why `author-workflow.js` has `const MENU = /*__MENU__*/ null;` and `review-workflow.js` has `const ALGOS = /*__ALGOS__*/ null;` — the orchestrator fills those placeholders with the contents of `menu.json` / `manifest.json` right before running. The scripts here are the readable templates; the data they consume sits beside them.

**Paths are preserved as-run.** These ran from a scratch directory at `/tmp/iic/`, and the paths in the prompts (`node /tmp/iic/harness.js …`) are left exactly as they were. This is an archive of what executed, not a turnkey rerun.

## The two primitives

Almost everything here is built from two calls the workflow runtime provides:

- `agent(prompt, { schema })` — spawn a fresh subagent, force its return value into a JSON shape, and get back a clean object.
- `parallel([ ...thunks ])` — run a batch of agents at once and wait for all of them. (There is also `pipeline()` for staged work.)

The whole approach in one sentence: **a language model should not be the final authority on whether code is correct, so it isn't — `harness.js` is.** The agents were cheap and occasionally wrong, and it never mattered, because nothing shipped that the referee had not certified.

## The receipts

- **484** AI agents (121 authors + 363 reviewers)
- **~16 million** tokens
- **148,488** correctness cases per algorithm
- **115 / 121** passed the gate on first submission; the other 6 self-fixed
- **0** repairs needed at the central gate
- **~850** lines of orchestration (this directory) to produce a site that displays **one word**

## Credit

The original [isitchristmas.com](https://isitchristmas.com) is Eric Mill's ([@konklone](https://bsky.app/profile/konklone.com)), and so is the tradition of using a deliberately silly single-purpose site as a place to try new technology. This is a tribute in that spirit.
