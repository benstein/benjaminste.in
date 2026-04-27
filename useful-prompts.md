---
layout: default
title: Useful Prompts
permalink: /useful-prompts/
---

# Useful Prompts

This is a collection of useful prompts and prompt ideas that I like. These are patterns and techniques I've found effective when working with AI assistants like ChatGPT and Claude.

---

## Capture Your Favorite Conversational Style

Wait until you get a session with ChatGPT or Claude that you're really enjoying. Maybe you've been joking around, maybe the AI has gotten introspective and empathetic and you like that in a conversation partner. At that point, use this prompt:

> *"Summarize your own voice in this conversation—your tone, style, pacing, and rhetorical habits—so I can copy it into my Custom Instructions. Leave out any references to specific content. Just describe the stylistic traits I'd get if I wanted future chats to feel like this. Write it as if you're an introspective writer describing their own persona."*

Then copy-paste the results into your Custom Instructions (in Settings). Now you have an AI assistant that you LOVE to talk to.

---

## Tune Up Your Mac With Claude Code

Open Claude Code on your Mac and run this:

> *"Look in /var/log at my system logs and make suggestions on how to improve my Mac's performance. There's obviously a LOT of data in there, so use good judgment to get enough signal without processing everything — e.g. awk, head, tail, don't unarchive old logs."*

Then go make a coffee. Two minutes later you'll come back to a report.

When I ran this, it found an old version of MySQL crashing in a loop, SOC2 monitoring agents from past jobs still phoning home, out-of-date software, a network misconfiguration, and a bunch of other detritus my laptop had accumulated over the years. Plus remediation steps for each one.

This isn't a human-tractable problem. No sane person is grepping `/var/log` on a Saturday. But it's basically a unit test for Opus, and it really does breathe new life into a crufty laptop.

Let me know what you find, and whether it fixes your [running out of memory / slow wifi / fan won't stop / battery dies fast] problem.

*(Disclaimer: don't blindly run `sudo` commands that an LLM tells you to. I mean, I do. But you shouldn't. Or at least don't blame me.)*

---
