# The medium is the motherfucking message

**Date:** 2026-04-29

**Author:** Benjamin Stein

**Categories:** superduper, ai, startups

---

Marshall McLuhan's most famous line gets quoted constantly, almost always by people who have it backwards. He wasn't saying content doesn't matter. He was saying the form of a medium changes how people live and think and coordinate, regardless of what's running through it. The printing press didn't show up and politely deliver more information; it cooked up a few centuries of individualism along the way. Television didn't just hand us the news, it changed what news even was. The medium is the message because the medium is the part that actually does the work on you.

For two years now the loudest idea in consumer AI has been *just talk to it.* No app. No buttons. No structure. You type, the agent figures it out, off you go. It's a very compelling pitch. We believed it enough to spend a year shipping a company on top of it.

## The pitch

"Just chat with it" feels inevitable in the same way electricity feels inevitable. There's no learning curve, no UI to design, no friction, you just say what you want and it happens. You can see this thesis everywhere: AI chiefs of staff, SMS assistants, Slack bots you "just tell things to," every demo at every YC batch in 2024. The cleanest version is OpenClaw, the breakout open-source agent of the year. Your assistant lives in WhatsApp or Telegram or Discord, runs on your own hardware, and you talk to it like a coworker. Genuinely cool project. Real community. People love it.

Every one of these products is making the same bet, which is that the interface should disappear. The bet is wrong, because your life isn't a chat thread.

## The thing about real life

Real life shows up as a pile of overlapping crap, all happening at once. Your kid's basketball schedule. A school email three threads deep that says practice moved. A calendar invite that conflicts with the dentist. A PDF with the wrong date on it. A pickup at 4pm in a place you've never been. None of that is "type a message" shaped, and even if you could type your way through it, you don't actually want answers, you want to *see what's going on.* What's happening today, what changed, what's about to fall over, what the system actually did for you when you weren't looking. A chat reply gives you a paragraph, which is a long way from a world you can scan.

<aside class="pull-quote"><p>Real life shows up as a pile of overlapping crap, all happening at once.</p></aside>

## Nobody trusts a black box

Here's the thing that breaks the chat-only model the second a real user touches it: nobody trusts a system they can't see. Once everything happens behind a prompt, you can't tell what it knows about you, why it did what it did, or what'll happen if you phrase the next thing slightly differently. Suddenly even tiny actions feel risky. If I thumbs-down a basketball game, am I telling it I hate basketball forever? (This one is surprisingly real. People are *terrified* of hitting thumbs down.) Did I just delete something? Should I have phrased that differently?

That's how you get a product people tiptoe around instead of using.

## We already shipped this and watched it die

Before SuperDuper we built Teammates, which was virtual AI employees you talked to in Slack and Google Docs. Same exact bet: skip the software, give people agents, let chat be the surface. In theory it was infinitely flexible. In practice it was infinitely hard to use, because the only instruction we could give people was "you can use it for anything," which turns out to be roughly the worst onboarding sentence in the English language.

There was nowhere to go. Nothing to poke at. No way to figure out what the thing did without sitting down and *imagining* what to ask. The tech was great, the model in people's heads never showed up, and the whole thing required too much from the user. Nobody wakes up thinking "how can I use an AI agent today." They wake up thinking "I have fourteen things that might break by 5pm."

## What we actually figured out

Nobody *really* wants an agent. They want their shit handled, which sounds dumb when you write it down but cuts against half the product design happening in this industry right now. An agent-first product hands every bit of work back to the user. *You* have to remember the agent exists. *You* have to figure out when to use it. *You* have to phrase it right. *You* have to read the response and decide if it did what you wanted. It's a lot of homework dressed up as automation.

<aside class="pull-quote"><p>Nobody really wants an agent. They want their shit handled.</p></aside>

## So we built an app. On purpose. Like it's 2018.

Of course we can build agents. We've built plenty. We just know where they fall apart. So we built an iPhone and Android app, with screens and tabs and tiles, like Philistines.

The app gives us a thing chat physically cannot give us, which is *a place.* Information lives somewhere. You can scan it in five seconds. Maps look like maps. Schedules look like schedules. A conflict between two events looks different than a reminder about a permission slip, because they *are* different. Trying to flatten all of that into a chat reply is like trying to put a city map into a paragraph. Sure, you can. But why would you do that to people.

<p style="text-align: center;"><img src="/assets/images/sd-foryou.png" alt="SuperDuper For You screen with overdue task and week ahead" style="display: inline-block; max-width: 32%; vertical-align: top; margin: 0 0.5%;" /><img src="/assets/images/sd-upcoming.png" alt="SuperDuper upcoming event detail with map, schedule, and to-do list" style="display: inline-block; max-width: 32%; vertical-align: top; margin: 0 0.5%;" /></p>

## And it's a multiplayer game

Family logistics is not a single-player problem. There are two parents, three kids, a babysitter, a coach who only texts, a school that only emails, and a dog who only cares about dinner. What you actually need is alignment, where everyone can see the same picture: what's on, who's on it, what changed since yesterday.

You can't share an agent. You can't point at it. Two people can't both look at it together. Every working family-logistics tool in human history has been something you can stare at together: the calendar on the fridge, the whiteboard in the kitchen, the shared Google Doc, the printed-out schedule taped to the wall. The thing you can look at *is* the tool. McLuhan's revenge.

## The ironic part

SuperDuper is, under the hood, the most agent-heavy thing we've ever built. There are agents reading email, agents pulling structure out of PDFs, agents reconciling conflicts, agents building a personal timeline of your life. It's agents all the way down.[^1]

Almost none of it shows up to you as "talk to an agent," because that isn't the job. The job is taking the chaos and turning it into something a perplexed parent can check from the soccer complex to figure out which field her kid is on for Game 2.

## The pendulum swings

The smartest people in this industry are currently building deeper and deeper into chat. I get it. I've felt the pull. I still think the pendulum swings back, and probably soon.

We have fifty years of UX (windows, lists, maps, cards, calendars, timelines, badges, swipes, the little red dot that I can never clear from the Slack icon) and these things aren't junk drawer leftovers. People know how to read them in milliseconds. ChatGPT did not repeal the iPhone. Cursor did not repeal the IDE. The "everything is a chat" moment is going to age the way "everything is a chatbot" aged in 2017, which is: badly, fast, and with a lot of pivot decks. The products that survive are going to be the ones using AI to make actual interfaces better, and the ones using AI as an excuse to ship no interface at all are going to have a rough year.

If you're an AI-native startup, here's the part you might not want to hear: your users may not want an AI-native product. They want their problem solved, and they'd really love to be able to *see it*.

Which is McLuhan, again. The medium is not a wrapper around the model, it's the part that decides what the model gets to be in your life. A surface that's visible and shareable and teachable and pokeable changes whether the AI ever gets used at all, whether two parents can coordinate around it, whether a kid can glance at it and know she has basketball in twenty minutes. The chat-only crowd is shipping a model and calling it a medium, and they are about to find out those are different things.

The best products of this era are going to be mullets. Business up front, where the human lives: a real interface, dense and scannable and shareable, that you can hand to your spouse or glance at from a parking lot. Party in the back, where nobody has to look at it: a swarm of agents reading email, reconciling calendars, untangling PDFs, doing things that were not technically possible eighteen months ago. The front is the part you sell, and it only exists because the back is doing all the gross work nobody wants to see.

Not everything should feel like ChatGPT. Some things should feel like opening an app, seeing your week at a glance, closing the app, and going outside to play with your kids.

[^1]: Okay fine, full disclosure: of *course* there's an agentic chat inside SuperDuper. And with all the context the app has already pulled together about your life, it's honestly mind-blowing. You can @superduper and tell it you're not going to the school dance, ask if there's a dog park near the baseball field, or figure out where to park during Friday's field trip, and it just *knows*. It's some of the most magical software I've ever used. But it's secondary. The primary thing real parents need is a beautiful, information-dense surface they can scan in five seconds. The chat is the bonus track. Also, leading with this would have undermined the whole post, so I'm shoving it down here in 8pt type where polemics traditionally hide their inconvenient caveats.
