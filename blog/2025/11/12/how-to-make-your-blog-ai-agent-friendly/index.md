# How to Make Your Blog AI Agent-Friendly (And Why You Should)

**Date:** 2025-11-12

**Author:** Benjamin Stein

**Categories:** ai, web, automation, agents

---

# How to Make Your Blog AI Agent-Friendly (And Why You Should)

I added two lines to my blog's HTML header in October 2024.

```html
<link rel="alternate" type="application/json" href="/posts/example.json">
<link rel="alternate" type="text/markdown" href="/posts/example.md">
```

Those two lines enabled AI agents to read my blog posts directly—not just humans with browsers anymore. ChatGPT, Claude, and Perplexity now access my content, working on behalf of humans researching topics, synthesizing information, answering questions, connecting dots across thousands of sources. The web has become less "information superhighway" and more "information concierge service."

My argument: this isn't about machines. It's about the humans directing them.

## Core Concept

Content consumption changed.

People ask AI agents to research topics, summarize arguments, synthesize information from dozens of sources. Content that isn't accessible to these agents becomes invisible to everyone using them. It's the digital equivalent of having the world's best product review buried in a filing cabinet—technically exists, functionally doesn't. The agents require three formats: HTML for humans, JSON for structured data, Markdown for clean text.

My blog provides all three.

## Key Argument

My reframe: "The AI agent is just a better browser."

Machine-readable content doesn't deprioritize human readers. It serves humans who use AI tools for information access. RSS feeds faced identical resistance twenty years ago—content consumption patterns evolve, infrastructure follows. The people who said "nobody wants to read through a feed reader" eventually discovered that millions of people wanted exactly that, once Google Reader made it effortless.

"Making content AI-friendly isn't about deprioritizing humans. It's about recognizing that machines are now legitimate readers, and they're reading on our behalf."

Humans access content through intermediaries now—AI agents that search, filter, summarize, synthesize. These agents need clean, structured data the same way RSS readers needed XML feeds. The mechanism has a certain *déjà vu* quality: new technology, same infrastructure requirements, identical resistance from publishers who insist this time is different.

When an AI agent cleanly parses your blog post, the agent accurately represents your ideas when someone researches your topic. When the agent cannot parse it cleanly, your work doesn't exist to the growing number of people who research through AI. Schrödinger's blog post—simultaneously published and invisible.

The mechanism parallels RSS adoption. Publishers who provided RSS feeds became discoverable through feed readers. Publishers who didn't became invisible to that distribution channel. AI agents function as a new distribution channel with similar infrastructure requirements. The lesson from RSS adoption: the people who said "my readers don't use feed readers" were technically correct—their readers couldn't, because they hadn't provided feeds.

## Technical Implementation

Four layers make content discoverable and usable. It's not rocket surgery, but it does require intention.

**1. Alternate Format Links**

HTML meta tags point to JSON and Markdown versions. Same mechanism RSS feeds used. These links live in your document head, telling AI crawlers that alternative representations exist:

```html
<link rel="alternate" type="application/json" href="/posts/example.json">
<link rel="alternate" type="text/markdown" href="/posts/example.md">
```

RSS adoption demonstrated that when crawlers can find structured alternatives, they use them reliably. The web has operated on this principle since Tim Berners-Lee was writing specs: declare what you have, machines will find it.

**2. Schema.org Structured Data**

JSON-LD markup embedded in pages provides semantic understanding. Instead of machines guessing what they're looking at—a process with roughly the accuracy of reading tea leaves—you explicitly declare it:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Your Post Title",
  "author": {"@type": "Person", "name": "Your Name"},
  "datePublished": "2024-10-15",
  "articleBody": "Your content here..."
}
```

This markup specifies exactly what machines are reading: headline, author, publication date, body text, and relationships between them. Search engines and AI crawlers parse this reliably. Without it, they reverse-engineer meaning from HTML structure—error-prone and incomplete. The difference between giving someone your address versus making them deduce it from your utility bills.

**3. AI-Friendly robots.txt**

Explicitly permit AI crawlers and grant access to your machine-readable formats:

```
User-agent: GPTBot
Allow: /
Allow: *.json
Allow: *.md

User-agent: Claude-Web
Allow: /
Allow: *.json
Allow: *.md

User-agent: CCBot
Allow: /
```

This permission layer is critical. Many publishers block AI crawlers by default, then wonder why their content doesn't appear in AI-powered research. It's the digital equivalent of locking your storefront and complaining about foot traffic. Explicit permission signals intent and ensures content discoverability through the channels you specify.

**4. Content Manifest**

Create `/ai-content-manifest.json` to describe site structure comprehensively:

```json
{
  "site_name": "Your Blog",
  "content_types": ["blog_posts"],
  "formats": ["html", "json", "markdown"],
  "ai_crawling": {
    "allowed": true,
    "training": "permitted",
    "attribution": "required"
  },
  "usage_policies": "Cite author and source"
}
```

The manifest communicates your terms upfront. It specifies what the site is, what formats you provide, whether content can be used for training, and what attribution you require. This prevents misuse and establishes clear boundaries. The web has always functioned best when expectations are explicit—ambiguity is where lawyers make their living.

The architecture works because each layer builds on the previous one. Alternate format links enable discovery. Schema.org provides semantic understanding. Robots.txt grants explicit permission. The manifest communicates comprehensive terms. Four pieces, working together, transform a human-only website into one machines can read and respect. It's turtles all the way down, except the turtles are metadata and they actually support something useful.

## Practical Implementation

Most publishers could implement this in an afternoon. That's not marketing hyperbole—it's genuinely a few hours of focused work if your publishing infrastructure isn't held together with duct tape and optimism.

**Generation workflow**: Generate JSON and Markdown versions for each post. This can be automated—scripts that convert your HTML or Markdown source into these formats. Many existing static site generators support this natively. If you're writing in Markdown already, you're halfway done without realizing it.

**HTML updates**: Add meta tags to your HTML header. Two lines of code per post (or one global addition if your templates support it):

```html
<link rel="alternate" type="application/json" href="/posts/example.json">
<link rel="alternate" type="text/markdown" href="/posts/example.md">
```

This is the level of technical complexity that separates "I should do this" from "I did this." Two lines. The barrier to entry is roughly equivalent to learning a new keyboard shortcut.

**Metadata markup**: Include Schema.org structured data in your post template. JSON-LD is cleaner than inline microdata and doesn't bloat your HTML with attributes that make your markup look like it has *chutzpah*:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{{ post.title }}",
  "datePublished": "{{ post.date }}"
}
</script>
```

**Permissions**: Update your robots.txt file to explicitly allow AI crawlers. Create your manifest file describing your site's structure and policies. The whole robots.txt update takes five minutes unless you're running a site so complex that you've forgotten what's in your own directories.

This is additive infrastructure running alongside your current HTML output. You're not abandoning your publishing workflow or redesigning your site. You're extending what already exists. The digital equivalent of adding a ramp next to your stairs—same building, more ways in.

## Broader Philosophy: Why This Matters Beyond the Technical

Content visibility used to depend on direct traffic or search engine crawling. Both assumed readers came directly to your site. That model is shifting. Readers now come through AI intermediaries—agents that search, filter, summarize, and synthesize across thousands of sources. Visibility depends on being accessible through those intermediaries.

The person researching your field through Claude or ChatGPT is still your reader. The human directing that tool is your actual audience. They've chosen a research method. The technical requirement is ensuring your ideas are accessible within it. Complaining that they should come to your site directly is roughly as productive as insisting people should drive to the library instead of using Google—technically you're not wrong, practically you've lost the plot.

Publishers who provided RSS feeds became discoverable through feed readers. Publishers who didn't became invisible to that distribution channel. AI agents function as a new distribution channel with similar infrastructure requirements. The pattern repeats because the underlying dynamic hasn't changed: new consumption method emerges, infrastructure adapts, publishers who adapt remain visible.

My implementation code is open-source on GitHub. Most publishers could implement this in an afternoon. The code doesn't require a PhD in computer science or a FromSoftware-level difficulty tolerance. It requires recognizing that content accessibility has always been infrastructure, and infrastructure requires maintenance.

The technical question: do you want your work findable in the research workflows that define how people discover ideas now?

The practical answer: those two lines of HTML aren't just about machines. They're about the humans who send machines to do their reading.

---

*Check out the [AI-README.md](https://benjaminste.in/AI-README.md) and [ai-content-manifest.json](https://benjaminste.in/ai-content-manifest.json) on this site to see the full implementation. Or just curl the JSON version of this post to see it in action.*

*All implementation code is available at [github.com/benstein/benjaminste.in](https://github.com/benstein/benjaminste.in)*