# Gabi is a Boy

**Date:** 2026-06-17

**Author:** Benjamin Stein

**Categories:** family, ai, superduper

---

SuperDuper sent me a push notification: the deadline to sign up my 15-year-old son Gabi for Scout camp was tonight. SUPER helpful. Except one thing… the AI-generated text said "the deadline to sign **her** up for camp."

Her. Gabi. My son. Wut.

[SuperDuper](https://superduperlabs.com)'s entire brand promise is that it intimately knows your family. The whole product has a touching, visceral feel to it. That was very intentional. It reads your private email and your calendar and turns a week of household chaos into something that feels like it was assembled by someone who deeply knows you, your kids, their nicknames, what they call you, your priorities, your pet peeves. So after all this, when it confidently called my kid the wrong thing, it stings way out of proportion. The one brand promise we make, broken, in the most personal way possible.

<aside class="pull-quote"><p>The one brand promise we make, broken, in the most personal way possible.</p></aside>

Gabi is short for Gabriel, and to a model trained on the whole internet, "Gabi" reads female more often than not. Fine. But this is true for a huge pile of names: Chris. Dana. Pat. Alex. Jordan. Sam... It's a coin flip. Guess gender from the name alone and you're wrong half the time. Every single family with a kid named something like that hits this. It's everywhere.

<aside class="pull-quote"><p>Guess gender from the name alone and you're wrong half the time.</p></aside>

The textbook fix is obvious: add a pronoun field on each kid. That's all it is. The word to use so the app writes "his camping trip" and moves on. Boring data quality. Same as knowing Soup is a chihuahua and not a hamster (nor a food, I guess).

Except that in 2026, a "pronoun" form field is a landmine.

I think our team discussed this WAY longer than any other feature we've shipped. The technical solution is trivial. The question was whether to add a "pronoun" field at all. Putting something labeled "pronoun" into a consumer app is, like it or not, a political statement. We talked about the parents who would open the app, see "pronoun" next to their kid's name, and knee-jerk read it as yet another West Coast tech company importing its politics into their kitchen. I'd love to tell you we laughed it off, but we didn't. We took it seriously, because the worry is real. And the last thing we want is for a parent to feel lectured or preached to, when all we're doing is trying to get their kid's name right!

TBH I don't have a tidy point or profound conclusion here. I was just sad that we've gotten so polarized that a one-word data accuracy fix can't just be a one-word data accuracy fix. The dumbest, most apolitical thing imaginable --- making sure software doesn't call Pat "him" when you don't want it to --- has been conscripted by politics.

I just want to get your kids' names right.

Sad panda.

(For the record, we didn't add the form field. We're allergic to form fields anyway, and to making parents do ANY unnecessary manual work. So instead, if misgendering happens, you just say "actually, Gabi is a boy" into SuperDuper and it'll remember. Debate avoided.)
