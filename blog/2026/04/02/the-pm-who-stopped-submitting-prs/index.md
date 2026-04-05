# The PM Who Stopped Submitting PRs

**Date:** 2026-04-02

**Author:** Benjamin Stein

**Categories:** startups, ai, superduper

---

There's a seductive new workflow in startups right now. PM gets frustrated waiting for engineering. PM opens Claude Code. PM ships a fix. PM submits a PR. Engineering reviews it. Engineering rewrites half of it. Engineering adds the tests the PM didn't know were needed. Engineering spends more time cleaning up the PR than they would have spent just doing it themselves.

People call this empowerment and velocity but it's actually a detractor and net negative for the team.

I know because I was that PM. I'm the CEO of a startup called SuperDuper that helps parents manage all their family logistics, I'm reasonably technical, and Claude Code makes me feel like I can do anything. That feeling is a trap. The code is often surprisingly good! And it still doesn't belong in your codebase. "This runs" and "this is maintainable, tested, and consistent with how we build things" are separated by a canyon, and your engineering team lives at the bottom of it.

<aside class="pull-quote"><p>"This runs" and "this is maintainable, tested, and consistent with how we build things" are separated by a canyon, and your engineering team lives at the bottom of it.</p></aside>

So we had a problem. We wanted to take full advantage of all the AI tools at our disposal and actually be the AI-native startup we claim to be, without the collateral damage so many orgs are facing in 2026. My co-founder (our CTO) wanted me out of the codebase (I can't believe it took this long) but appreciated my ability to dig into issues. And our engineers wanted bug reports that actually said something useful, not "I got a red banner."

We found a workflow that solved all three. And it didn't involve me writing a single line of production code.

## The worst bug report ever written

Here's what a typical bug report looks like at a startup. A user emails: "Something went wrong when I tried to add my kid's soccer schedule." Or I'm poking around the app and I see a flash of red. An error banner appears and disappears. I file a Linear ticket that says something like: "Red error banner when adding a calendar event. Seemed intermittent. Not sure what triggered it."

This is basically a crime scene report that says "something bad happened somewhere around here, good luck."

Engineering now has to do a bunch of forensic work before they can even begin fixing anything. Reproduce the issue. Check the logs. Search Sentry for exceptions. Look at the relevant code paths. Figure out if this is a data problem, a race condition, a frontend rendering issue, or just a stale cache. Half the time, the actual investigation takes longer than the fix. And half the time, the PM (me) is pestering them with "any update on that bug?" while they're still trying to figure out what the bug actually *is*.

## What if the investigation wasn't engineering's job?

The insight was simple. Most of bug investigation is just legwork. You're grepping logs. You're searching error tracking. You're reading stack traces. You're querying the database to check if the data looks right. You're tracing code paths to understand what *should* happen. All of this requires access, patience, and the ability to read code without panicking. Deep architectural knowledge? Not so much.

Claude Code has all of those qualities. And unlike me, it won't create merge conflicts in main. Again.

So we built a Claude Code slash command called `/investigate`. You give it a Linear ticket ID. It reads the ticket, reads the comments, and then dispatches a swarm of parallel agents to go investigate the issue across every data source we have. One agent greps the codebase, tracing the relevant code paths and checking recent git history for suspicious changes. Another searches production logs around the time of the report. Another hits Sentry looking for matching exceptions. Another checks PostHog for frontend errors and user impact data. If the ticket involves a data integrity issue, another agent runs read-only queries against the production database to verify the actual state of the records.

These agents run in parallel. They come back with findings. Claude synthesizes everything into a structured comment that gets posted directly to the Linear ticket.

The comment includes: a status (confirmed bug, can't reproduce, needs more info), a plain-English explanation of what's happening, a root cause analysis referencing specific code paths, all the evidence from logs and error tracking, a recommended fix with file paths and line numbers, and the relevant code locations so another agent (or a human) can pick up the work immediately.

I type `/investigate SD-347`. I go make coffee. I come back and the Linear ticket has a comment that's better than most bug reports I've ever written in my career.

## What this actually looks like in practice

A user reports that their weekly schedule view is showing events on the wrong day. I file the ticket with what I know, which isn't much. I run `/investigate`. Five minutes later, the Linear ticket has a detailed comment explaining that there's a timezone conversion bug in the calendar sync logic, that it only affects users in Pacific time zones who have events created from forwarded emails, that the root cause is a missing UTC offset in a specific parsing function, that Sentry shows 47 instances of this error in the last week affecting 12 users, and that the fix is a two-line change in `app/services/calendar_sync.rb` at line 234.

Our engineering team opens that ticket, reads it, and either fixes it in ten minutes or hands it to Claude Code to implement the fix. Either way, the total engineering time went from "45 minutes of investigation plus 10 minutes of fixing" to "10 minutes of fixing." I did useful work without touching the codebase. Engineering got a ticket that was pre-investigated, pre-analyzed, and ready to act on. Nobody reviewed a messy PR. Nobody rewrote my code. Nobody bit their tongue in a code review comment.

## Why this works and PRs from PMs don't

The failure mode of PMs writing code is the downstream tax on engineering's attention. Every PR from a non-engineer has to be reviewed, understood in context, tested, and probably rewritten. The PM is glowing because they shipped a feature. Engineering is quietly thinking about all the edge cases that weren't considered, the test coverage that's missing, the patterns that don't match the rest of the codebase, the monitoring that wasn't added. Now they have to ship it *properly*. Everyone smiles in standup. Nobody's actually happy.

<aside class="pull-quote"><p>The PM is glowing because they shipped a feature. Engineering is quietly thinking about all the edge cases that weren't considered. Everyone smiles in standup. Nobody's actually happy.</p></aside>

The investigation workflow reverses the whole dynamic. Instead of producing code that needs review, it produces *knowledge* that accelerates engineering's existing workflow. The PM gathers context and triages. The tool searches, reads, correlates, and summarizes. Engineering decides how to fix it and makes sure the fix is right. Everyone stays in their lane and the lanes actually make sense.

## The parallel agents are doing the heavy lifting

One thing I didn't expect to matter this much: the parallel agent dispatch. The investigation command doesn't search each data source sequentially. It launches multiple sub-agents simultaneously, each with specific instructions for their data source and all the context from the ticket. This is important because a sequential investigation would take forever, and because different data sources tell you different parts of the story. The codebase agent finds the relevant code paths. The log agent finds the runtime errors. The error tracking agent finds the frequency and impact. The analytics agent finds the user behavior patterns. The database agent finds the actual data state.

None of these agents alone gives you the full picture. But when Claude synthesizes all five streams of evidence into a single coherent narrative, the output is better than what most humans produce. Humans get bored. Humans take shortcuts. Humans don't have the patience to cross-reference a stack trace against a git log against a database query at 11pm on a Tuesday. Claude does all of it without complaining.

## What we got right

A few design decisions that made this work:

**Read-only everything.** The investigation agent can look at anything but can't change anything. No writes to the database. No commits to the codebase. No deploys. The only mutation is posting a comment to Linear. This means there's zero risk of the tool making things worse, which means I can run it without engineering approval, which means engineering gets investigated tickets without being involved at all until they're ready to fix something.

**Structured output for both humans and agents.** The comment format works for a human engineer scanning it over coffee AND for a coding agent that might be handed the ticket to implement the fix. File paths with line numbers. Specific function names. Concrete evidence. Whatever picks up this ticket next, human or AI, has everything it needs to start working.

**Graceful degradation.** Not every data source is always available. Maybe your Sentry MCP isn't connected. Maybe you don't have a read-only database user set up yet. The tool notes what it couldn't access and moves on with what it has. A codebase-only investigation is still way better than "I got a red banner."

**No PII anywhere.** This one matters a lot for us because we handle sensitive family data. All PII in our system is encrypted at the application layer, and the read-only database user that Claude queries has no access to decrypted PII. The data is simply not there. We did the security work upstream so I don't have to think about it downstream. I can run this investigation tool at 2am from my laptop and there is zero chance of customer PII ending up in my terminal, in a Linear comment, or in a prompt to an LLM.

## How to build this for your team

You don't need our exact stack to make this work. The pattern is:

Start with your issue tracker. Linear, Jira, GitHub Issues, whatever. You need API access to read tickets and post comments.

Connect your observability tools. Error tracking (Sentry, Bugsnag), logging (Betterstack, Datadog), analytics (PostHog, Amplitude). Each one becomes a data source your investigation agent can query.

Set up read-only database access. This is optional but powerful. Create a Postgres user (or equivalent) with SELECT-only permissions. Now the agent can verify data state without any risk of mutation.

Ask Claude to write the skill for you. Seriously. Describe the workflow you want in plain English: "I want a slash command that reads a Linear ticket, investigates the issue across our codebase, logs, and error tracking, then posts a structured comment with findings." Claude Code will generate the slash command definition, including the parallel agent dispatch and the output format. You'll iterate on it, but the first draft will be surprisingly close to what you need. The craft is in being specific about what each sub-agent should look for and how to present findings, and Claude is annoyingly good at that.

Give it to your PM. Or your customer support lead. Or your CEO with a god complex about being technical. Anyone who encounters bugs and has opinions about them but shouldn't be committing code.

## The meta-point

There's a broader lesson here about how non-engineers should use AI coding tools in an organization. Everyone's instinct is to use them to *write code*. Obviously. But the highest-leverage use might be to *understand code*. To investigate. To analyze. To build context. To do the 80% of work that precedes the creative act of designing a solution: the grinding prerequisite of understanding the problem.

<aside class="pull-quote"><p>Everyone's instinct is to use AI coding tools to write code. But the highest-leverage use might be to understand code.</p></aside>

PMs, support leads, founders: you don't need to submit PRs to be useful in the codebase. Help engineering spend less time on the stuff that precedes engineering. Build investigation tools. Build analysis tools. Build context-gathering tools. Build anything that produces *understanding* rather than *code*.

Your engineering team doesn't want your PRs. They want to open a ticket and find that someone already figured out what's wrong.

---

*I'm Ben Stein, co-founder and CEO of [SuperDuper](https://superduperlabs.com), helping underwater parents manage all their family logistics.*
*I live in Oakland with my Keeper wife Arin, our two overprogrammed teenage boys, and a dog named Soup who contributes nothing helpful to the family logistics and arguably makes them harder, but he's really cute. If you want to follow along: [superduperlabs.com](https://superduperlabs.com) · [benjaminste.in](https://benjaminste.in) · [LinkedIn](https://www.linkedin.com/in/benjaminstein/) · [Substack](https://benjaminstein.substack.com/)*
