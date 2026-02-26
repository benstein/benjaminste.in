# How to Make Your Blog AI Agent-Friendly (And Why You Should)

**Date:** 2025-11-12

**Author:** Benjamin Stein

**Categories:** ai, web, automation, agents

---

If I'm going to write so much about AI agents (or have my AI agents write about themselves, as the case may be), I thought it was only appropriate that my blog was as AI agent friendly as possible. I added a few lines of code to my blog. Some HTML meta tags, a JSON endpoint, a robots.txt update. Now AI agents can read my content as cleanly as humans do.

I'm not talking about "AI optimization" in some vague SEO sense. I mean direct access: ChatGPT, Claude, Perplexity can pull machine-readable versions of my posts. When someone asks Claude "What does Ben Stein think about AI agents?", it can pull my actual content, not a garbled web scrape.

The AI agent is just a better browser.

This isn't about deprioritizing humans or writing for machines. It's recognizing that humans increasingly research through AI intermediaries. Making content AI-friendly means recognizing that machines are now legitimate readers.

Publishers who resisted RSS feeds eventually discovered that millions of users preferred feed readers. The ones who embraced RSS early gained readership. The ones who resisted became invisible to an entire segment of their audience.

We're at that moment again. Except this time, AI agents don't just aggregate content—they synthesize it, answer questions with it, route research through it. If your content isn't accessible to these systems, you're invisible to everyone using them.

## Who This Is For

I write about AI, agents, and automation. My audience: developers building AI systems, founders thinking about agent strategy, technical leaders trying to understand where this technology is headed. Many of them use AI tools to research. When they ask Claude or ChatGPT about agent patterns, I want my writing to be part of that answer.

The web has always mediated between human intentions and machine capabilities. We write HTML because browsers need structure. We add alt text because screen readers need descriptions. We use semantic markup because search engines need context.

AI agents are the next reader in that progression. They need structure too. Different structure.

The technical implementation is surprisingly straightforward. Four components.

## The Implementation

**Alternate Format Links**

The foundation: give AI agents alternate representations of your content. On every blog post, I add HTML meta tags that point to JSON and Markdown versions:

```html
<link rel="alternate" type="application/json"
      href="https://benste.in/posts/ai-agent-friendly.json">
<link rel="alternate" type="text/markdown"
      href="https://benste.in/posts/ai-agent-friendly.md">
```

The JSON version contains structured data—title, author, date, content, categories. The Markdown version is clean prose without navigation chrome or site furniture. Both formats strip away everything except the actual post content.

When an AI agent encounters my blog post, it can request the JSON or Markdown version instead of parsing HTML. Cleaner, faster, more reliable than trying to extract content from complex page layouts.

My blog generates these alternate versions automatically on build. Simple script: reads source files, outputs three formats. HTML for humans, JSON for structured access, Markdown for clean text. The entire pipeline runs in seconds.

**Schema.org Structured Data**

Beyond alternate formats, I add semantic metadata using JSON-LD markup. This tells AI agents what type of content they're looking at and how it's organized:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "How to Make Your Blog AI Agent-Friendly",
  "author": {
    "@type": "Person",
    "name": "Benjamin Stein"
  },
  "datePublished": "2025-11-12",
  "articleBody": "..."
}
```

Schema.org markup has been around for years, primarily for search engine optimization. AI agents use it differently. They treat it as a semantic layer that clarifies relationships and content types. Instead of guessing whether a block of text is the main article or a sidebar, they read the structured data.

This isn't new technology—it's existing infrastructure being used for a new purpose. The same markup that helped Google understand your content now helps Claude.

**AI-Friendly robots.txt**

The robots.txt file controls which automated systems can access which parts of your site. For years, this meant telling search engine crawlers where they could go. Now it means explicitly permitting AI agents.

I added entries for known AI crawlers:

```
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: CCBot
Allow: /
```

The default behavior varies by agent. Some respect standard crawl permissions; others use proprietary identifiers. By explicitly allowing these bots, I signal that my content is available for AI systems to read and reference.

I also added a line pointing to my alternate formats:

```
# AI-friendly alternate formats available
# See /ai-content-manifest.json for details
```

This acts as a pointer for AI systems that know to look for machine-readable content.

**Content Manifest**

The final layer: a site-wide manifest file at `/ai-content-manifest.json`. This is my own convention—not a standard, just a pattern I implemented and documented.

The manifest describes my site's structure, lists all posts with their alternate format URLs, specifies attribution requirements, declares content policies:

```json
{
  "site": {
    "name": "Ben Stein's Blog",
    "url": "https://benste.in",
    "author": "Benjamin Stein"
  },
  "content_policy": {
    "ai_access": "permitted",
    "attribution_required": true,
    "commercial_use": "allowed_with_attribution"
  },
  "posts": [
    {
      "title": "How to Make Your Blog AI Agent-Friendly",
      "url": "https://benste.in/posts/ai-agent-friendly",
      "formats": {
        "html": "https://benste.in/posts/ai-agent-friendly",
        "json": "https://benste.in/posts/ai-agent-friendly.json",
        "markdown": "https://benste.in/posts/ai-agent-friendly.md"
      }
    }
  ]
}
```

This gives AI agents a single point of entry to understand everything available on my site. Rather than crawling page by page, they read the manifest and know exactly what content exists and how to access it.

I built this manifest as part of my static site generation process. Every time I publish a new post, the manifest updates automatically. Zero ongoing maintenance.

## Why You Should

I research through AI agents constantly now. When I'm learning about a new technology, I ask Claude to synthesize multiple sources. When I'm trying to understand someone's position on a topic, I ask for summaries of their writing. When I'm exploring a technical concept, I use AI to pull together relevant blog posts and documentation.

I'm not unique in this. The developers and founders I talk to use AI for research in similar ways. We're not replacing reading—we're routing our attention through systems that can surface, synthesize, and contextualize information faster than manual web browsing.

If your content isn't accessible to these systems, you're invisible to this entire workflow. Not because AI companies are gatekeeping, but because parsing HTML is messy and unreliable. Giving AI agents clean, structured access to your content is the difference between being included in synthesis and being skipped.

There's also a longer-term consideration. AI agents are getting better at following citations, attributing sources, and linking back to original content. When an AI system references my blog post and provides a direct link, that creates a path for readers to engage with my full argument in context. But only if the AI could read my content reliably in the first place.

This is the same dynamic that made RSS valuable. Feed readers didn't replace blogs—they multiplied reach. AI agents work similarly. They surface your ideas to people who might never have found them otherwise.

The philosophical objection—that we shouldn't optimize for machines—misses the point. We've always structured content for machines. HTML is machine structure. Semantic markup is machine structure. URLs are machine structure. The entire web is a negotiation between human expression and machine readability.

AI agents are just the next machine in that negotiation. Serving them doesn't mean serving them instead of humans. It means serving the humans who choose to read through them.

## What Happens Next

I don't know if AI content manifests will become a standard. Maybe someone will formalize this into a spec. Maybe site generators will build it in by default. Maybe AI companies will create better discovery mechanisms that make manual markup unnecessary.

But right now (late 2025), there's a window where making your content AI-friendly is both easy and advantageous. The people implementing this early will be the ones whose ideas show up in AI-mediated research.

I added those meta tags in October. I've already seen the results—AI systems citing my posts with clean attribution, developers finding my writing through Claude, researchers asking detailed questions about my arguments because the AI could surface teh right content.

That's not magic. It's infrastructure. The same infrastructure that's made the web accessible for decades, now extended to a new class of readers who happen to be machines serving humans.
