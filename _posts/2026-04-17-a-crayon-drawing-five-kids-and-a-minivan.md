---
layout: default
title: "A Crayon Drawing, Five Kids, and a Minivan"
date: 2026-04-17
categories: [family, ai, superduper]
excerpt: "No product survives first contact with real users."
---

This morning an email landed in my inbox from Zeke's teacher. Subject line was something like "5/6 field trip — car groups." I didn't open it. [SuperDuper](https://superduperlabs.com) did.

The attachment was a photograph. Of a piece of paper. With a crayon drawing on it. Of carpool groups. Plus a little smiley-face cartoon at the bottom because of course.

<p style="text-align: center;">
  <img src="/assets/images/chinatown-car-groups.png" alt="A hand-drawn list on notebook paper titled 'Chinatown Car Groups.' At the top: '5/6 Core 10:45am departure.' Below that, groups of first names arranged in columns, each group led by an asterisked name (the driver). A legend reads '* Parent Driver.' A small smiling stick-figure doodle sits under the title." />
</p>

Five minutes later I had a calendar event on my phone. *Chinatown field trip, 10:45am departure, driving Zeke + Miles, Elliott, Bezani, and Zain.* Every detail right. I didn't type anything. I didn't even read the email.

Humblebrags about my product aside, this absurd episode has me thinking about 3 things.

## 1. There's nothing like real-world users

You cannot make this up in a test suite.

I've worked on a lot of products. I've written a lot of test cases. Not once — not in a thousand years of synthetic data generation, not with the world's most creative QA team, not with a room full of PMs trying to break the system — would anyone have written the test case *"teacher sends carpool assignments as an iPhone photo of a piece of notebook paper covered in crayon."* It's not in the corpus. It's not in the edge case doc. It's not anywhere.

But it's real life. Real life is weirder than your test plan. It is always, always weirder than your test plan.

<aside class="pull-quote"><p>Real life is weirder than your test plan. It is always, always weirder than your test plan.</p></aside>

Every interesting bug I've ever seen in production has been some version of this.[^1] A thing a user did that nobody on the team imagined anyone would do, because the team spends its days thinking about the system and the user spends theirs thinking about lunch. For Zeke's teacher, this involved a sharpie, a piece of printer paper, and thirty seconds at his kitchen table. Why would he open a spreadsheet. He has a field trip to run.

You ship. Then you find out.

## 2. Multimodal models are bonkers

If you're not deep in tech, you probably don't appreciate where image understanding is right now.

A photograph. Of handwriting. In crayon. With four columns of names, some asterisks, some not, a title at the top, a legend at the bottom, and a smiling stick figure doodled in the margin for good measure. The model read all of it. Names, groupings, "Chinatown Car Groups," the fact that asterisks marked drivers. It correctly ignored the stick figure.

Five years ago we were excited about OCR that could handle a clean printed receipt. The killer app in Silicon Valley was Hot Dog / Not Hot Dog for a reason — that was peak image classification just a few years ago. Now a frontier model parses a first-grade-style crayon drawing as easily as it reads a Word doc.

If you haven't put a messy photo of something into a modern multimodal model recently, go try it. Bring the worst photo you've got. You will be surprised.

## 3. Context is King

Gemini can read the photo. Claude can read the photo. Any of them can. Reading the photo is *table stakes.* The magic isn't in the reading.

The magic is knowing:

- That "Chinatown" meant a field trip, not a restaurant recommendation.
- That "5/6 Core 10:45am departure" meant 5th/6th period core class and not a flight number.
- That the asterisks marked parent drivers.
- That I was chaperoning in the first place, because I emailed that form to the teacher last month.
- That I'm Zeke's dad — and my name isn't on this page at all. *It just says "Zeke."*
- That five kids in a car means I need to take the minivan, not the Tesla.

None of that is in the photo. All of that is *around* the photo. It lives in the accumulated understanding of who I am, which kid is which, and what I've already committed to. An LLM with no context looks at this image and sees a list of names. An LLM with context looks at this image and puts a minivan reminder on my calendar for Saturday morning.

The model is the least of it. Everyone has the model. Everyone can call the API. The difference between a toy and a product you use every day is whether the system knows enough about your life to make the output *useful.*

<aside class="pull-quote"><p>The difference between a toy and a product you use every day is whether the system knows enough about your life to make the output useful.</p></aside>

Knowledge without context is worthless. A list of five names means nothing. *"Drive the minivan to Chinatown on Saturday with Miles, Elliott, Bezani, and Zain"* is the entire game.

---

Anyway. The calendar event is on my phone. I wish my minivan was electric. Shout out to Zeke's teacher, and to every teacher out there spending their Saturdays driving other people's kids to Chinatown. You are raising our children. Thank you.

[^1]: I would also include the time an outage was caused by a corrupt ARP cache, but that's a story for another blog post.
