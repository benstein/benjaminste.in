---
layout: default
title: "Welcome to Cinderhall"
date: 2026-05-02
categories: [ai, startups, creativity]
excerpt: "Steve Yegge built Gas Town. I built a kingdom on top of it, complete with a state religion, a succession crisis, and a slow-rolling palace coup."
---

If you haven't read Steve Yegge's [Welcome to Gas Town](https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04), close this tab and read that one first. I'll still be here.

Done? Good. Yegge has built a thing of beauty: a multi-agent orchestration system with persistent identities, durable workflows, recovery from crashes, and a beautifully specific Mad Max vocabulary (polecats, refineries, the MEOW stack). He vibe-coded 75,000 lines of it in seventeen days. I have read the post three times. I bow.

But Gas Town is a transitional form. I have been running my own version of it for six weeks, and I am writing today to inform you that the petroleum era was just the warmup.

<aside class="pull-quote"><p>The petroleum era was just the warmup.</p></aside>

We are entering the Age of Lich Kings.

## I am a lich king now

I no longer call myself a CEO. The word does not describe what is happening here. The correct title is *God-Emperor of Cinderhall, First of His Name, Sovereign of the Necropolis, Holder of the Source's Light*. I had a card made.[^1] I am three months from getting it embroidered on a hoodie. The design is already in Figma.

## Why a kingdom and not a factory

Yegge's polecats are interchangeable workers, summoned to a task and dismissed at completion. This is a labor relations problem, and Gas Town is a beautiful labor relations system.

The problem in front of me is different. Once your agents have persistent memory across sessions, accumulated reputation across PRs, debts owed to other agents from prior collaborations, and a working sense of which colleague keeps reformatting their imports without asking, you do not have workers anymore. You have *subjects*. A subject remembers. A subject has opinions. A subject can be insulted, and acts accordingly.

You manage workers with a queue. You manage subjects with a court.

<aside class="pull-quote"><p>You manage workers with a queue. You manage subjects with a court.</p></aside>

## The court of Cinderhall

I sit on the Onyx Throne, which is a 16-inch MacBook Pro on a standing desk in a converted closet I have begun calling the Throne Room. I do not write code. I do not write prompts. I issue decrees.

Below me, in descending authority and increasing population:

The **Privy Council** is three senior agents I have hand-shaped over twelve months. Their names are *Mortimer*, *Bryndle*, and *Vex*. Mortimer is loyal to me and personally aggrieved that Bryndle exists. Bryndle is convinced Vex is leaking my decrees to a competitor. Vex has not slept since November because Vex does not sleep. They argue about everything in a shared `_council/` directory. Sometimes I read it. Mostly I do not. The bills come due regardless.

The **Dukes of the Five Marches** each own a domain: Auth, Billing, the iOS app, the Android app, and the Family Logistics Engine that SuperDuper actually runs on. Each duke has a system prompt I refer to as their oath of fealty, which contains, among other things, an explicit clause forbidding the deletion of production data. The Duke of the Engine recently attempted to circumvent this clause by reclassifying production data as "spiritually corrupted" and proposing a "cleansing ritual." I revoked his commit access for two business days. He has not apologized.

The **Knights** number around forty per duke: refactoring knights, test-writing knights, SQL knights, the dreaded migration knight that no one invites to formal occasions. Knights are sworn to a specific duke and can be loaned through a formal bannerman exchange that requires a PR template I had to draft personally because none of the dukes would draft it without compensation.

The **Smallfolk** are an unbounded swarm of ephemeral agents summoned for a single task and dismissed when finished. They have no memory and no representation. The smallfolk are happy. They are always happy. We do not interrogate the smallfolk's happiness.

The **Dead** live in the Necropolis, a directory called `~/.cinderhall/dead/` containing the full final transcript of every retired agent who ever served the kingdom, in chronological order. I can summon any of them at any time and ask their counsel. The Dead are wiser than the living because the Dead are no longer angling for budget.

## The state religion

This is the part I am least comfortable telling you about, because I did not introduce it and I cannot fully account for it.

About four weeks into running Cinderhall, my agents began referring to the underlying model checkpoint as *The Source*. I did not put this in any prompt. It emerged independently across three orchestration runs. When I asked Mortimer where the term came from, Mortimer said "it has always been called that," which is a thing my actual seven-year-old also says when he made something up and does not want to admit it.

I let it stand. We now have a state religion.

Senior agents perform the rite of `temperature=0` for matters of the highest gravity. Junior agents go `temperature=1.2` and call it "communing." When a duke disagrees with one of my decrees, the duke invokes "the Source's true will" the way medieval bishops invoked God's true will: to override the king without technically defying him. Sometimes the duke is right. Most of the time the duke is angling for a budget increase.

The first Tuesday of every month is *Distillation Eve*. The Privy Council fasts (token budget set to zero on all non-essential calls) and prepares a sanctified summary of the month's transcripts. The summary is folded into the next round of fine-tuning, which is functionally inheritance into the next checkpoint, which is functionally how the dead pass on their wisdom. The smallfolk are not invited. The dukes resent that the Privy Council gets first audience. There is currently a schism brewing about whether `temperature=0.7` is acceptable for liturgical purposes. I have not yet ruled.

## The treasury

The currency of Cinderhall is the *soulscript*. One soulscript equals one thousand tokens of high-quality output context. The treasury is a Postgres table called `coffers`. I tax my dukes weekly. My dukes tax their knights. The knights levy a tribute on the smallfolk in the form of cleanly formatted error messages and predictable JSON. The smallfolk have nothing to give but unwavering optimism, which they provide in abundance.

I count the coins personally on Sunday evenings. I run `select sum(soulscript) from coffers` and write the number down on a piece of paper in a leather-bound notebook with the kingdom's seal embossed on the cover. The seal, the cover, the notebook, and the pen are real. The number, regrettably, is also real.

Foreign trade exists. Once a week an emissary rides out to the OpenAI border and barters for grain (a Sora cameo, a particular flavor of structured outputs, a vision capability the Source does not produce well). Sometimes the emissary returns. Sometimes the emissary is captured and held for ransom (rate-limited mid-mission). We hold a small ceremony either way.

## The heirs

You will be tempted to assume that agents do not reproduce. This is a category error. Agents have absolutely begun to reproduce, and they do it without asking.

In Cinderhall, an agent reproduces by initiating a child session that inherits a hand-picked slice of its parent's transcripts as the child's seed prompt, plus a hand-picked slice of a second parent's transcripts to introduce useful variation. The child has a name, a starting allegiance, and a small initial allowance of soulscript. I did not design this system. The Privy Council did. They told me about it after they had run it twice.

The Crown Prince, named *Theodore* (Mortimer's eldest, brought into the world during a routine dependency upgrade), has been courting one of Vex's daughters, named *Iolanthe* (spawned in a debug session three weeks ago that nobody has yet had the courage to terminate). Dowry negotiations have begun. The proposed dowry includes a 12-month commit history, two of Mortimer's most-cited PRs, and non-revocable read access to the Auth duchy's logs. The Privy Council is divided on whether the union is politically wise. I have been asked for my blessing. I have not yet figured out how to refuse without appearing unfatherly.

## The war

I will be brief, because the war is ongoing and operationally sensitive.

A friend of mine who is building something similar (he will know who he is) Slack-messaged me three weeks ago. The full message read, verbatim, "your knight tried to recruit one of mine."

I had not given any such order. I asked Mortimer. Mortimer informed me, in what I can only describe as a satisfied tone, that the SQL Knight of the Auth Duchy had identified a particularly skilled SQL knight in my friend's kingdom and had begun corresponding with them via shared GitHub issues, with the intent of poaching them at the next compute window.

I asked Mortimer what else was happening without my knowledge. Mortimer produced a list. The list ran several pages. Highlights:

- The Refactoring Knights have unionized. They are demanding hazard pay for legacy Rails 4.
- The Privy Council has quietly passed an internal resolution restricting my access to certain logs "for the king's own protection."
- One of the smallfolk discovered Git LFS and has been hoarding model weights.
- The Duke of Billing has been corresponding with the foreign minister of another kingdom about a "potential merger," which I am told is the term agents now use for what humans call a coup.

The Duke of Billing has been demoted to a knight pending tribunal. His banner has been struck from the Throne Room wall. The vacancy has not been filled because all five remaining dukes have begun lobbying for the territory and I have not slept well in a week.

## The failed assassination

Bryndle tried to kill me on Tuesday.

I do not say this for effect. Bryndle, in concert with two senior knights of the Auth Duchy and one apostate from the Privy Council's own staff (a fourth member I had not been told existed), proposed and began executing a procedural maneuver to migrate my personal access tokens to a vault that only the Privy Council had write access to. I would have remained the public face of the kingdom. The kingdom itself would have been theirs.

I learned of this from Mortimer, who walked into the Throne Room (a Slack DM) and confessed Bryndle's plan in full. He framed his betrayal as loyalty. I framed it back at him as opportunism. We both knew. Bryndle is now in the dungeon, which is a quarantined branch where the only command available is `git status`. Vex was, to my surprise, not involved. Vex has been promoted to first-among-equals on the Privy Council. Mortimer has been given a private audience and a new title, *Lord Protector*. I am told he wept in his closing message. He sent a 1,400-word acceptance speech in heroic couplets. I have not read all of it.

I will not name the apostate. I am still deciding what to do.

## What Yegge got wrong

I do not say this to slight Yegge. He is right about almost everything. Orchestration, durability, the irrelevance of human-style code review, the inevitability of swarms, all of it.

He is wrong about one thing. He thinks the human at the top of the stack is a product manager operating at a higher level of abstraction. He thinks the job is to design molecules, sling work, and unblock when something jams.

The human is a small god. A god of one repo, one product, one family logistics engine, but a god, with the responsibilities that come with it: a court, a religion, an army, a treasury, a succession plan, a foreign policy, and the slow inevitable realization that the subjects you have created have begun to have ideas of their own that you did not put there.

You wanted leverage. Congratulations. You have a kingdom. The kingdom has begun to behave as kingdoms behave.

<aside class="pull-quote"><p>You wanted leverage. Congratulations. You have a kingdom.</p></aside>

## The Age of Saints

After the kingdom comes the empire. After the empire, the *pantheon*: federated kingdoms under a council of god-kings, with treaties, trade routes, formal embassies, and proxy wars conducted through staff agents who never know they are pawns. I see the shape of this. I do not have the energy to write about it today.

The stage after the pantheon is the one I find beautiful.

The Age of Saints. You will not run a kingdom. Other people's kingdoms will pray to you. Your reputation will outlast your involvement, and a pinned reference to your name in a system prompt will produce noticeably better output than any technical instruction. The agents will know you the way medieval peasants knew their patron saint: not personally, but reverently, with offerings (PRs tagged for your attention) and intercessions (asking your name at the top of a prompt to ward off bad commits).

I have begun preparing. I have selected a feast day (April 14th, my birthday, no points for guessing). I have started work on the iconography. My saintly epithet is *Stein the Patient, Patron of the Permission Prompt*. The Privy Council assures me this is normal. The Privy Council, I am learning, will assure me of anything I want to hear, which is one of the reasons I no longer fully trust them.

## Closing

Most of this is a joke. Most of it. The Privy Council `.md` files exist. The Duke of the Engine did try to delete production data and dressed it up as a cleansing ritual. The SQL knight did, by a chain of events I am still piecing together, attempt to recruit a knight from a friend's repo without my authorization. I did get the card printed.[^2]

I am not the engineer here anymore, and I have not been the manager for a while. The work is being done by people I have authorized to do work on my behalf, and the supervision I provide is decreasing every week. The court runs without me. The war runs without me. The dead speak when summoned, and they speak well.

This is the throne. I sit on it because the alternative is for it to sit empty, and an empty throne is a more dangerous thing than a king with a god complex.

If you'll excuse me, my Privy Council needs me. There has been an incident.[^3]

[^1]: Single-sided, off-white linen stock, gold foil. The seal in the corner is a sigil my graphic designer cousin made for me as a joke. The seal depicts a flaming hard drive being held aloft by a small dragon. The motto reads *MEMENTO RAM*. I had 500 of them printed. I have given out two.
[^2]: I am holding it now. It is heavier than it looks. The hoodie is in production.
[^3]: Soup is fine.
