# We Used to Know When to Stop

**Date:** 2026-04-08

**Author:** Benjamin Stein

**Categories:** startups, ai, superduper

---

The night owl engineer is a myth. You know the one. The 2am hero commit. The "I cranked on it all night and shipped by morning." If you've ever PR reviewed code you wrote past 9pm, you already know. Most of it comes back the next morning as cleanup work. We know this, and we do it anyway, because pushing through feels good.

<aside class="pull-quote"><p>The night owl engineer is a myth.</p></aside>

Engineer code quality across a day looks roughly like this:

<p style="text-align: center;">
  <img src="/assets/images/code-quality-decline.jpg" alt="Hand-drawn line graph showing a human engineer's code quality over the course of a day. Flat through the afternoon, a slow decline in early evening, then a cliff at 9pm. Two vertical dashed lines annotate where we 'should stop' and where we 'actually stop'." />
</p>

Flat through the afternoon, cliff around 9pm. One line marks where we *should* stop. Another marks where we actually stop, which is always a bit later because we're stubborn.

(Morning people: flip the graph. Same shape, mirrored. Your 4am is someone else's 10pm.)

Now picture the Claude Code version.

Claude doesn't get tired. 11pm Claude is as good as 11am Claude. Arguably better, since Claude's calendar has fewer meetings left in the day. Its raw output holds flat.

There's still a dip, but it's a gentle slope, not a cliff:

<p style="text-align: center;">
  <img src="/assets/images/claude-code-quality.jpg" alt="Hand-drawn line graph showing Claude Code's output quality over the course of a day. Almost completely flat, with only a very subtle dip late in the evening. No cliff." />
</p>

And the dip isn't on Claude's side. It's on mine. At 10am I read every response carefully and push back on the bits that are wrong. I rewrite prompts. I catch subtle mistakes. By 11pm I'm skimming. By midnight it's "looks good, ship it." Claude is still doing about the same quality work. I'm just approving more of the rough edges and catching fewer of the bugs.

<aside class="pull-quote"><p>11pm Claude is as good as 11am Claude. Arguably better, since Claude's calendar has fewer meetings left in the day.</p></aside>

Here's where the whole model of "working late" falls apart.

In the old world, the 9pm cliff forced me to stop. I'd produce shit code, wake up to a cleanup job, and slowly (badly) learn to stop earlier. The mechanism was pain. The reward for stopping was quality.

In the Claude Code world, my midnight output is still roughly 90% as good as my 2pm output. And my 2pm wasn't perfect either. So where's the signal that says stop?

It isn't there.

An 80% drop in my own code quality after 9pm is a red flag my brain notices. A 5% drop in Claude's output? My brain goes "fine, next prompt." And the next prompt is easy. And the one after that. And it's 11:53pm and I can barely read the screen as I type this, but I know when I wake up there'll be a B+ blog post waiting.

*(Sorry Claude --- you'll do A+ work.)*

The shape of the incentive has flipped. "Keep going past your limit" used to be punished by the next morning. Now it's rewarded. Idea in bed? Prompt it. Flicker of curiosity at 1am? Prompt it. Brushing your teeth and something crosses your mind? Prompt it. Wake up, review, ship.

It's fun. I won't pretend it isn't. It's also a dopamine loop, and dopamine is a terrible manager. Write prompt, wait, read output, write prompt, wait, read output. The loop used to have a natural off switch called "exhausted human producing garbage." That switch is gone.

<aside class="pull-quote"><p>The loop used to have a natural off switch called "exhausted human producing garbage." That switch is gone.</p></aside>

I don't have a conclusion. I have three tabs running. One of them just finished.

Next prompt.
