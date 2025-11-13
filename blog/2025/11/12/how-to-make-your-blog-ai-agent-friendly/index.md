# How to Make Your Blog AI Agent-Friendly (And Why You Should)

**Date:** 2025-11-12

**Author:** Benjamin Stein

**Categories:** ai, web, automation, agents

---

# How to Make Your Blog AI Agent-Friendly (And Why You Should)

I just spent an afternoon making my blog maximally friendly to AI agents. Not because I'm trying to optimize for some dystopian AI-first future, but because I think we're thinking about this backwards.

The question isn't "should websites accommodate AI agents?" The question is "why are we still making humans parse HTML when machines could do it for them?"

Let me explain what I built, and why it matters more than you think.

## What I Did: Three Formats, One Source

Every blog post on this site is now available in three formats:

1. **HTML** - The human-readable version you're reading now
2. **JSON** - Structured data with full metadata
3. **Markdown** - Clean text without formatting cruft

Try it yourself. This post exists at:
- `https://benjaminste.in/blog/2025/11/12/how-to-make-your-blog-ai-agent-friendly/` (HTML)
- `https://benjaminste.in/blog/2025/11/12/how-to-make-your-blog-ai-agent-friendly/index.json` (JSON)
- `https://benjaminste.in/blog/2025/11/12/how-to-make-your-blog-ai-agent-friendly/index.md` (Markdown)

The JSON version includes everything an AI agent needs:

```json
{
  "title": "How to Make Your Blog AI Agent-Friendly",
  "date": "2025-11-12",
  "author": "Benjamin Stein",
  "categories": ["ai", "web", "automation", "agents"],
  "excerpt": "I just spent an afternoon...",
  "content": "Full markdown text...",
  "html_url": "https://benjaminste.in/blog/...",
  "json_url": "https://benjaminste.in/blog/.../index.json",
  "markdown_url": "https://benjaminste.in/blog/.../index.md"
}
```

The Markdown version is the full post text without any front matter or HTML, optimized for AI consumption while remaining perfectly readable by humans.

## The Technical Implementation

I added several layers of AI-friendly infrastructure:

**1. Alternate Format Links in HTML**

Every blog post HTML page includes meta tags pointing to the other formats:

```html
<link rel="alternate" type="application/json"
      href="[...]/index.json" title="JSON version" />
<link rel="alternate" type="text/markdown"
      href="[...]/index.md" title="Markdown version" />
```

This is similar to how RSS feeds work - discoverable alternate representations of the same content.

**2. Schema.org Structured Data**

Every post includes JSON-LD markup so AI agents (and search engines) can understand the content semantically:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "...",
  "author": {"@type": "Person", "name": "Benjamin Stein"},
  "datePublished": "2025-11-12",
  "articleBody": "Full post text..."
}
</script>
```

**3. AI-Friendly robots.txt**

I explicitly allow all major AI crawlers:

```
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: CCBot
Allow: /

Allow: /*.json
Allow: /*.md
```

Most sites either block AI crawlers or make them guess. I'm rolling out the welcome mat.

**4. AI Content Manifest**

I created `/ai-content-manifest.json` that describes the site structure, content patterns, and usage policy:

```json
{
  "site": {
    "name": "Benjamin Stein's Blog",
    "url": "https://benjaminste.in",
    "content_types": [...]
  },
  "ai_usage_policy": {
    "crawling_allowed": true,
    "training_allowed": true,
    "attribution_requested": true,
    "content_declaration": "partial"
  }
}
```

**5. Human-Readable Documentation**

I added `/AI-README.md` explaining how AI agents should interact with the site, with example curl commands and format specifications.

## Why This Matters (And It's Not What You Think)

The standard narrative is: "AI agents are going to consume all web content, so we need to make it machine-readable." That's backwards.

The real story is about improving human access to information.

Here's the thing: I don't use AI agents to read my own blog. But I do use AI agents to research other people's content. When I'm working on a project and need to understand what someone wrote about a topic, I don't want to:

1. Open my browser
2. Navigate to their site
3. Scroll through their post
4. Copy-paste the relevant parts
5. Switch back to my AI tool
6. Paste it in
7. Ask my question

I want to type: "What does Benjamin Stein say about AI-friendly blogs?" and have my AI agent fetch the structured data, parse it, and answer my question.

**The AI agent is just a better browser.** It's not replacing human reading; it's making human reading more efficient.

## How You Should Interact With AI-Friendly Content

If you're building AI agents or using AI tools, here's how to take advantage of AI-friendly sites:

**1. Check for the Manifest**

Look for `/ai-content-manifest.json`. If it exists, it tells you:
- What content formats are available
- URL patterns for different content types
- Usage policies (crawling, training, attribution)
- Data schemas

**2. Use Alternate Formats**

Instead of scraping HTML, fetch the JSON or Markdown version:

```bash
# Get structured data
curl https://benjaminste.in/blog/2025/11/12/how-to-make-your-blog-ai-agent-friendly/index.json

# Get clean markdown
curl https://benjaminste.in/blog/2025/11/12/how-to-make-your-blog-ai-agent-friendly/index.md
```

**3. Parse the Structured Data**

HTML pages include Schema.org JSON-LD. Parse it directly instead of extracting text from HTML:

```javascript
// Find the JSON-LD script tag
const jsonLd = document.querySelector('script[type="application/ld+json"]');
const data = JSON.parse(jsonLd.textContent);
// Now you have: title, author, date, full article text
```

**4. Respect the Usage Policy**

The manifest declares the site's AI usage policy. Mine says:
- Crawling: ✅ Allowed
- Training: ✅ Allowed
- Attribution: Requested

If a site declares they don't want to be used for training, respect it. The point of machine-readable policies is that machines can read them.

**5. Use the Right Format for the Task**

- **Need metadata?** Fetch the JSON
- **Need clean text for LLM context?** Fetch the Markdown
- **Need the full presentation?** Fetch the HTML

## The Broader Point: The Web Should Be For Machines Too

We've spent 30 years optimizing websites for human eyes. Beautiful typography, responsive layouts, smooth animations. And that's great! But we're now in a world where most web content is initially consumed by machines on behalf of humans.

Your AI assistant reads the web for you. Your research tool scans documentation. Your personal agent monitors sites for updates. These aren't weird edge cases anymore - they're how people actually work.

Making content AI-friendly isn't about deprioritizing humans. It's about recognizing that machines are now legitimate readers, and they're reading on our behalf.

The resistance to this is similar to the resistance to RSS feeds in the 2000s. "Why would people want to read my content outside my beautiful website?" Because it's more convenient. Because they're using tools that aggregate information. Because access patterns evolve.

AI-friendly content is the RSS of the 2020s.

## What If Everyone Did This?

Imagine a web where:

- Every blog post came with clean JSON and Markdown versions
- Every site published an AI content manifest declaring their policies
- AI agents could efficiently fetch exactly what they need
- Humans could use AI tools to research and synthesize information without manual copy-pasting

This isn't some far-off future. It's a 60-line Ruby script and some meta tags. I did it in an afternoon.

The hard part isn't the technology. The hard part is the mental model shift: recognizing that optimizing for AI agents optimizes for humans too, because the agents work for us.

## How to Make Your Own Site AI-Friendly

If you want to do this for your blog, here's the minimal version:

**1. Generate alternate formats**

For each blog post, create:
- `post.json` - JSON with title, date, author, content
- `post.md` - Clean markdown without front matter

**2. Add meta tags**

```html
<link rel="alternate" type="application/json" href="post.json" />
<link rel="alternate" type="text/markdown" href="post.md" />
```

**3. Add Schema.org markup**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Your Title",
  "articleBody": "Full text..."
}
</script>
```

**4. Update robots.txt**

```
User-agent: *
Allow: /
Allow: /*.json
Allow: /*.md
```

**5. Create an AI manifest**

Declare your policies, content structure, and how agents should interact with your site.

That's it. You're now AI-agent-friendly.

All the code for my implementation is [open source on GitHub](https://github.com/benstein/benjaminste.in). The generation script, the manifest format, the meta tag structure - take it all.

## The Future Is Already Here

AI agents aren't coming. They're already here. They're reading your blog posts, analyzing your documentation, researching your portfolio. The question isn't whether to accommodate them - they're already accessing your content through HTML scraping and LLM context windows.

The question is whether you make it easy or hard.

I choose easy. Because when information is easier for machines to parse, it's easier for humans to use. When content is well-structured, everyone wins - the human readers, the AI agents, and the humans using the AI agents.

That's not an AI-first web. That's just a better web.

---

*Check out the [AI-README.md](https://benjaminste.in/AI-README.md) and [ai-content-manifest.json](https://benjaminste.in/ai-content-manifest.json) on this site to see the full implementation. Or just curl the JSON version of this post to see it in action.*

*All implementation code is available at [github.com/benstein/benjaminste.in](https://github.com/benstein/benjaminste.in)*