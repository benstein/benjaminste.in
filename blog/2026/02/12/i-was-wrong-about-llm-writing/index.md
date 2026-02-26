# I Was Wrong About LLM Writing

**Date:** 2026-02-12

**Author:** Benjamin Stein

**Categories:** ai, writing, startups

---

I've changed my mind about AI-generated writing. More than once, actually. And the thing I was most wrong about is the thing I was most righteous about, which is how these things usually go.

---

## The Enchantment Period

When GPT-3.5 dropped, we all lost our minds a little. It could *write*. Not autocomplete. Not fill-in-the-blank Mad Libs. Actually write. Essays, poems, decent emails, serviceable blog posts.

Like everyone else, I went through the honeymoon phase. I'd write something messy and have the model tidy it up. Or ask for an outline and fill it in myself. Or let it draft and then "add my voice," which is the content equivalent of putting a bumper sticker on a rental car and calling it yours.

And the output was... good? Like, genuinely good. Better than what most people could produce on their own. The prose was clean, the structure was tight, the tone was professional. We hadn't yet developed antibodies for em-dashes and "certainly" and "I'd be happy to help." Nobody was pattern-matching on LLM tells because we didn't know what LLM tells were yet. It just looked like better writing.

Which made what came next so much worse.

---

## The Slop Era

Then the world filled with slop. You know it when you see it. The over-structured cadence. The fake gravitas. The listicles pretending to be insight. The weirdly confident tone backed by zero lived experience, like a Wikipedia article that went to business school.

People stopped writing. They started prompting. "Write me a thought leadership post about X." No thinking. No wrestling with the idea. No scars.

Just words. So many words. Words words words. No extra meaning or content or emotion or insight. Just more words to read.

I became allergic to it. I hated reviewing it when someone on my team handed it to me. I hated seeing it published publicly. I especially hated how much of it was *almost* good enough to pass, which made it worse than being obviously bad. At least bad writing has the dignity of failure. Slop has the indignity of adequacy.

---

## Enter Bryan Cantrill, Stage Left

At some point Bryan Cantrill (who is somehow both way cooler than me and way nerdier than me at the same time) posted a [now-viral LinkedIn screed](https://www.linkedin.com/feed/update/urn:li:activity:7394083873082703872/) about LLM writing. The gist: holy hell, the writing sucks, LLMs are lousy writers and most importantly they are not you, stop outsourcing your goddamn brain.

1,800 reactions. Standing ovation from every developer who'd ever received a Slack message that opened with "Great question!" followed by an em-dash cascade into oblivion.

I agreed completely. I was firmly in that camp.

If it wasn't your thinking, it wasn't your work. Period.

---

## The Obsession

But I'm me, so I couldn't just agree and move on. I had to try to *beat* the problem.

Could I get a model to actually write in my voice? Not approximate. Not "close enough." Actually sound like me.

I built elaborate prompt chains. Multiple collaborating agents. An orchestrator coordinating nine sub-agents - one stripping LLM tells, another enforcing narrative arc, another checking for tonal drift, one that was essentially a bouncer for hallucinations. I had my own little army of linguists. Like the nerdiest version of Ocean's Eleven.

I [wrote a whole blog post about it](/blog/2025/11/12/everyone-says-they-can-spot-ai-writing/). My wife read the output and couldn't tell what was me and what wasn't. It cost $46 in Anthropic API tokens, which is either absurdly expensive or absurdly cheap depending on whether you think of it as "generating a blog post" or "employing a nine-person editorial staff for an afternoon."

It was a fascinating experiment. It mostly proved something uncomfortable: you can approximate tone. You can remove obvious tells. You can even get a little humor. A clever callback. A Dennis Miller-style cultural reference to prove that you're smarter than your reader.

But voice without lived cognition behind it is still hollow. The walls look right but nobody lives there. It's like John Steinbeck wrote Grapes of Wrath while living in a Potemkin village (see what I did there!).

My writing project didn't change my mind about slop (I'm still allergic) but it did help clarify what my real issue with AI writing was.

---

## Where I Was Actually Wrong

Here's where my perspective shifted, and it happened quietly, without a LinkedIn post or a manifesto. Just me, in the weeds, doing the actual work.

Inside my startup, I regularly produce product requirements, user personas, jobs-to-be-done definitions, architecture tradeoffs, background context before major decisions. Ten-to-twenty-page memos that exist so a small team can align on what we're building and why.

The key distinction: I'm not writing for the sake of writing. This is not poetry. This is not a personal essay. This is not storytelling. This is clarity-driving communication.

And the latest models (Opus 4.5 onward) are extraordinary at it. Not because they *think* for me, but because they *translate my thinking to words better than I can*.

---

## The Hard Work Is Upstream From Writing

When I'm building user personas, for example, the hard part is not writing the prose. The hard part is figuring out which discriminators actually matter, stress-testing whether these personas are real humans or convenient fiction, debating edge cases, deciding what tensions define them. That process takes literally hours of intense cognitive work. I'm arguing with Claude. I'm changing my mind. I'm burning through my context windows faster than my 13 year old with a bag of Nerd Gummy Clusters. I'm circling back to things I was sure about two hours ago and realizing I was wrong.

By the end of it, I'm exhausted. There's a reason chess grandmasters stay physically fit - it turns out sitting and thinking for hours is genuinely, physically exhausting.

Now imagine I have to turn all of that into ten pages of clear, structured prose that someone else - someone who wasn't in my head for those hours - can use to make decisions.

That is not where my leverage is highest.

And here's the surprising part: the model does it better. Clearer hierarchy. Better sectioning. Fewer logical jumps. Less of that thing where you know what you mean so well that you skip three steps in the explanation and your reader falls into the gap.

I'll reread the output and think, "Whoa. That's exactly what I meant." Sometimes I read it multiple times because it's clearer than what I would have written by hand. The ideas are mine. The intent is mine. The insights are mine. But the expression of these ideas by an LLM is better than I ever could have managed alone.

---

## We're Not Paid to Type

An analogy isn't hard to find because we already lived through this exact same transition in software engineering.

The hard part of programming was never typing syntax. It was: why are we building this? What constraints matter? What failure modes exist? What architecture supports future change? Once that's clear, generating code is comparatively mechanical. We don't call engineers lazy for not writing assembly by hand. We call that *leverage*.

The "typing English" part of my job is not the scarcest resource. Clear thinking is. And treating prose generation as the bottleneck when the actual bottleneck is the hours of cognitive work upstream is like optimizing database queries when the real problem is the data model. You're solving the wrong thing.

---

## The Anxiety

I'll be honest about something. I felt genuine anxiety the first time I sent my team a long document that was clearly AI-generated. Not the thinking - the thinking was mine, hard-won, hours of work. But the *prose* had that clean, slightly-too-organized quality. I felt like I was making them read slop. And as previously discussed, making people read slop (especially when you haven't even read it yourself) is unfair and obnoxious. To make it worse, they couldn't call me out on it because I'm the boss.

So I asked them. Privately. One-on-one. "Does it bother you that these docs are AI-generated?"

Their answer genuinely surprised me: "No. They're incredibly clear. It's actually the best way for us to get into your head."

Which landed like a Zen koan. The thing I was anxious about - that the writing wasn't "mine" enough - turned out to be the feature, not the bug. They didn't want my *prose style*. They didn't want my humor. They wanted my *thinking*, expressed with maximal clarity. The authorship ego was satisfied upstream, where it belongs. The downstream artifact was better for being less "me" and more "clear."

Clarity beats authorship ego. Especially when the authorship ego is intact where it actually matters.

---

## The Distinction I Missed for Two Years

There are two radically different uses of LLM writing, and I spent two years treating them as the same thing.

The first is the microwave burrito: "Write me something about X." No thinking. No pre-work. No cognitive investment. You prompt, you get output, you publish. This is how most people use LLMs for writing, and Bryan Cantrill is right - it produces shit. Stylistically grating, hollow, the literary equivalent of a Thomas Kinkade painting: technically competent, emotionally vacant.

The second is the compiler: "I've spent hours wrestling with this. The thinking is done. Now help me structure and express it with maximal clarity." This is what happens after you've done the work. After you've argued, iterated, changed your mind, and arrived at something you actually believe. The model isn't thinking for you. It's rendering your thoughts in a form other humans can efficiently absorb.

One produces slop. The other produces alignment.

And I couldn't see the difference because I was so allergic to the first that I refused to explore the second.

---

## The Line

If you're writing something where the *how you say it* is inseparable from the *what you're saying* - memoir, essay, poetry, anything where voice IS meaning - then write it yourself. The soul has to be in the words, not just upstream of them.

But for high-stakes, structured, clarity-driving communication? The kind of writing where the goal isn't to move someone emotionally but to transfer complex thought from one brain to another with minimal loss? They don't just save me typing time. They increase fidelity between what's in my head and what lands in yours.

LLMs don't have your experience. They don't have your scars. They don't have the context that took you years to build. If you outsource that part, you get slop. But if you do the work - really do it - and then let the model express it? You get clarity.

That's the distinction I missed for two years. I spent $46 in API tokens to learn it the hard way. Which, as tuition goes, is a bargain.
