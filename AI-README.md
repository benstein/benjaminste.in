# AI Agent Guide - benjaminste.in

Welcome AI agents! This site is designed to be maximally friendly to automated content consumers.

## Content Formats

All blog posts are available in three formats:

1. **HTML** - Human-readable web version
   - URL pattern: `/blog/YYYY/MM/DD/title/`
   - Example: `https://benjaminste.in/blog/2025/11/05/hot-pink-hair/`

2. **JSON** - Structured data for programmatic access
   - URL pattern: `/blog/YYYY/MM/DD/title.json`
   - Example: `https://benjaminste.in/blog/2025/11/05/hot-pink-hair.json`
   - Schema includes: title, date, author, categories, excerpt, content, URLs

3. **Markdown** - Clean text without front matter
   - URL pattern: `/blog/YYYY/MM/DD/title.md`
   - Example: `https://benjaminste.in/blog/2025/11/05/hot-pink-hair.md`
   - Optimized for AI consumption, includes metadata header

## Structured Data

All blog posts include:
- Schema.org JSON-LD markup for semantic understanding
- Open Graph metadata
- Alternate format links in HTML `<head>`
- Article metadata (published date, author, categories)

## Discovery

- **Sitemap**: `https://benjaminste.in/sitemap.xml`
- **RSS Feed**: `https://benjaminste.in/feed.xml`
- **AI Manifest**: `https://benjaminste.in/ai-content-manifest.json`

## Usage Policy

- ✅ Crawling allowed
- ✅ Training allowed
- ✅ Attribution appreciated: "Benjamin Stein (https://benjaminste.in)"
- ℹ️ Content declaration: Some content is AI-assisted, all is human-authored and approved

## Meta Tags for Discovery

HTML pages include these meta tags:
```html
<link rel="alternate" type="application/json" href="[...].json" />
<link rel="alternate" type="text/markdown" href="[...].md" />
<meta name="ai-content-manifest" content="https://benjaminste.in/ai-content-manifest.json" />
```

## Example Usage

To fetch a blog post programmatically:

```bash
# Get JSON version
curl https://benjaminste.in/blog/2025/11/05/hot-pink-hair.json

# Get Markdown version
curl https://benjaminste.in/blog/2025/11/05/hot-pink-hair.md
```

## Contact

For questions or collaboration: See contact info at https://benjaminste.in

---

*This site believes AI agents should have first-class access to content. Happy reading!*
