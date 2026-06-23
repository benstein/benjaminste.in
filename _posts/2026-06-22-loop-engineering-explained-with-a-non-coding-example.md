---
layout: default
title: "Loop Engineering Explained With a Non-Coding Example"
date: 2026-06-22
categories: [ai, engineering, personal]
excerpt: "Learning loop engineering on a non-coding problem: two AI agents that don't share context, looping until they stop finding problems with my estate plan."
---

[Loop engineering](https://x.com/steipete/status/2063697162748260627) is the new AI hotness, spurred on by [@steipete's post](https://x.com/steipete/status/2063697162748260627): "You should be designing loops that prompt your agents."

OK, on the surface I get it: something prompts Claude Code over and over again until it's done. But as with many things, it's easy to understand _intellectually_ at 10,000 feet, but a bit harder to truly grok without being hands on. Like what system is actually running the while-loop? Is it inside Claude Code / Codex or external? How does it stop? How do you prevent infinite loops?

To try out loop engineering for the first time, I went with a non-coding example. It seemed more approachable as a way to explain it than "setup evals" or "code review agent". And as a bonus, I like inspiring people to use these tools for non-coding use cases that you maybe didn't think of.

My wife and I are currently working on our estate planning. Nothing exotic, just making sure we have our wills, power of attorney, healthcare directives, and a family trust all set up. Some documents are relatively boilerplate, while others have unique wishes for our family. There's a ton of statutes and case law out there, and the law changes. For example, there are changes to California estate law from, say, 2024 we'd need to know about and capture.

So I thought: what a great use case to learn about loop engineering!

I had prepared something earlier just using traditional agent prompting. Claude gathered our info, interviewed us about our wishes, and proceeded to draft over 100 pages in 15 PDF documents. Great! But now what? It would not be a trivial request to ask an estate planning attorney to review it all. It would be easier and cheaper for them to start from scratch! Especially since, even to my layman's eye, these documents had a lot of slop. Verbose LLM tells, explaining itself inline, hallucinated statutes (bad!), and more. Nothing unexpected, but not something I'd want to spend $thousands getting a lawyer to review.

So I asked Claude to review its work and come up with constructive feedback. It did, and it corrected a bunch of things. Great!

So I asked ChatGPT to review Claude's work and come up with constructive feedback. It did, and Claude agreed and corrected a bunch of things. Great!

So I asked Claude again to review its work and come up with constructive feedback. It did, and it corrected a bunch of things. Great!

Can you see where this is going?

As an aside, it genuinely felt like we were making demonstrable progress with each iteration. Yeah, each was slow. And after each I was like "Yo Clauderino! Why didn't you suggest that last time??" and it was all like "yeah my bad." But we were getting there, slowly but (I think) surely. It didn't feel bottomless, it just felt inefficient to have a human in the loop.

<aside class="pull-quote"><p>It didn't feel bottomless, it just felt inefficient to have a human in the loop.</p></aside>

## Enter loop engineering

OK so it looks like we have a good candidate for loop engineering… Now what?

(Note: this is a point-in-time blog post. It'll likely be obsolete tomorrow. There's also likely many ways to skin the cat here too. This is just one of them.)

Claude Code recently shipped with a `/goal` command. You can set a goal and it will work until the condition is met. That's our loop's control plane. But what are the conditions? Also, a contract review is not deterministic like code that you can write tests for. What's the "we're done" equivalent of "all tests passing" when evaluating a legal document?

<aside class="pull-quote"><p>What's the "we're done" equivalent of "all tests passing" when evaluating a legal document?</p></aside>

Here's my setup:

1. **Drafter Agent:** this is a subagent acting as a lawyer. It does the writing and legal research.
2. **Adversarial Reviewer Agent:** this subagent takes on a variety of personas to find problems with the contracts. For example, "act as an adversarial lawyer for one of the kids trying to invalidate the trust" and "act as a county clerk looking for inconsistencies in the filing that might cause the property to go to probate".

(Note: I don't know how to make subagents either. But Claude does. Just ask Claude to make them and it will write all the markdown files, register them itself, etc.)

So why 2 agents? This is important: the 2 agents do not share context. LLMs looking back at their own history will tend to be self-congratulatory and not nearly as critical as fresh eyes. This is why the reviewer is a separate judge without any shared chat history.

<aside class="pull-quote"><p>The 2 agents do not share context.</p></aside>

The adversarial reviewer doesn't know about the drafter. It just writes its findings to a TODO list. One or more items in every review round.

And the drafter agent doesn't know about the reviewer, it just knows it has a TODO list of potential things to verify and then, if deemed appropriate, fix. It can reject the suggestions, which is important because LLMs just LOVE to be helpful and make suggestions, even if trivial or incorrect.

Once the TODO list is empty and the reviewer has had two consecutive passes with no new feedback, we can call it a day!

Then to turn this conceptually into a proper loop:

```
/goal The estate review loop is finished. The goal is met when either of the following is true: 2 consecutive rounds with zero constructive feedback OR 8 total rounds are complete.
```

The agents get to work, adversarial agent going first.

It ran for about an hour on its own. I checked sporadically, just to make sure I didn't blow limits and get surprise charges (I didn't). And after 8 iterations, I got about 12 fixes. 1 critical, 3 high priority, 4 low priority, and the rest trivial, stylistic, or otherwise rejected. I ran it again. After 4 iterations, I got two "No constructive feedback" responses in a row. Goal met!

Different model providers would be better. Opus vs Opus is pretty f'in good, but they technically have the same priors. Another lab's model would give more heterogeneous feedback. Not easy to do with my current setup and the Claude Code harness being tightly coupled to the model. Could hack it, move the loop outside, or use an open harness. Maybe tomorrow.

Disclaimer: I am not a lawyer. Claude is not a lawyer. Use your own judgement if you need to get a lawyer.

What I DO find interesting is the question: do I need a lawyer to review this, or is it good enough? A year ago, 100% you'd need a lawyer. A couple years from now? Well, I'd be surprised if you needed a lawyer for anything but the most complex contracts (and even then…?). But in 2026, it's a tough call. What's the risk? How good is the contract? How good do you need the contract to be? So? Can you completely trust an agent to draft this contract? And possibly the most interesting question of all: when and how will we know???
