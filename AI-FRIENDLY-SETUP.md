# AI-Friendly Blog Setup - Complete Guide

Your blog is now maximally friendly to AI agents! Here's everything that was added:

## What Was Done

### 1. Alternate Format Generation
Every blog post is now available in three formats:

- **HTML**: `https://benjaminste.in/blog/YYYY/MM/DD/title/` (human-readable)
- **JSON**: `https://benjaminste.in/blog/YYYY/MM/DD/title/index.json` (structured data)
- **Markdown**: `https://benjaminste.in/blog/YYYY/MM/DD/title/index.md` (clean text)

Example:
- https://benjaminste.in/blog/2025/11/05/hot-pink-hair/
- https://benjaminste.in/blog/2025/11/05/hot-pink-hair/index.json
- https://benjaminste.in/blog/2025/11/05/hot-pink-hair/index.md

### 2. Enhanced HTML Meta Tags
Every blog post HTML now includes:

```html
<!-- Alternate format links -->
<link rel="alternate" type="application/json" href="[...]/index.json" />
<link rel="alternate" type="text/markdown" href="[...]/index.md" />

<!-- Structured data (Schema.org JSON-LD) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "...",
  "author": {...},
  "datePublished": "...",
  "articleBody": "..."
}
</script>

<!-- AI-friendly meta tags -->
<meta name="robots" content="index, follow" />
<meta name="ai-content-declaration" content="partial" />
<meta name="ai-content-manifest" content="https://benjaminste.in/ai-content-manifest.json" />
```

### 3. AI-Friendly robots.txt
Created `/robots.txt` that explicitly allows all AI crawlers:
- GPTBot (OpenAI)
- ChatGPT-User
- CCBot (Common Crawl)
- anthropic-ai (Anthropic)
- Claude-Web
- Google-Extended

### 4. AI Content Manifest
Created `/ai-content-manifest.json` that describes:
- Content structure and format patterns
- JSON schema for blog posts
- Usage policy (crawling allowed, training allowed, attribution requested)
- Discovery endpoints (sitemap, RSS, alternate formats)

### 5. AI Agent README
Created `/AI-README.md` with:
- Guide for AI agents on how to consume content
- Example curl commands
- Format specifications
- Usage policy

## How It Works

### For New Blog Posts

When you add a new blog post:

1. Create the post in `_posts/YYYY-MM-DD-title.md` as usual
2. Run: `ruby generate_alternate_formats.rb`
3. Commit and push all files

The script will automatically generate JSON and Markdown versions in the `blog/` directory.

### Manual Generation Command

```bash
ruby generate_alternate_formats.rb
```

This will:
- Parse all posts in `_posts/`
- Generate JSON and MD versions
- Place them in `blog/YYYY/MM/DD/title/`
- Preserve all metadata (title, date, author, categories, excerpt)

## What AI Agents Can Do

### 1. Discover Content
AI agents can:
- Find the AI manifest at `/ai-content-manifest.json`
- Read the AI README at `/AI-README.md`
- Check `robots.txt` for crawler permissions
- Use the sitemap at `/sitemap.xml`

### 2. Fetch Posts
AI agents can programmatically fetch posts:

```bash
# Get structured JSON data
curl https://benjaminste.in/blog/2025/11/05/hot-pink-hair/index.json

# Get clean markdown
curl https://benjaminste.in/blog/2025/11/05/hot-pink-hair/index.md
```

### 3. Parse Structured Data
Every HTML page includes Schema.org JSON-LD with:
- Full article text
- Publication date
- Author information
- Categories/keywords
- Article excerpt

## Files Added

```
.github/workflows/generate-alternate-formats.yml  # GitHub Action (backup)
AI-README.md                                       # Guide for AI agents
ai-content-manifest.json                          # Content structure descriptor
robots.txt                                        # AI crawler permissions
generate_alternate_formats.rb                     # Generation script
_plugins/alternate_formats.rb                     # Jekyll plugin (for future)
blog/YYYY/MM/DD/title/index.json                 # JSON versions
blog/YYYY/MM/DD/title/index.md                   # Markdown versions
```

## Files Modified

```
_config.yml          # Added site URL, plugins, include blog/
_layouts/default.html # Added meta tags and structured data
```

## Usage Policy

As declared in the manifest and meta tags:

- ✅ **Crawling**: Allowed
- ✅ **Training**: Allowed
- ✅ **Attribution**: Requested (Benjamin Stein - https://benjaminste.in)
- ℹ️ **Content Declaration**: Partial (some AI-assisted, all human-authored)

## Future Enhancements

Potential additions:
- RSS feed for JSON format
- API endpoint listing all posts
- Version history for posts
- Changelog feed
- Semantic tags for topics

## Testing

Verify everything works:

```bash
# Build the site
bundle exec jekyll build

# Check JSON exists
curl https://benjaminste.in/blog/2025/11/05/hot-pink-hair/index.json

# Check MD exists
curl https://benjaminste.in/blog/2025/11/05/hot-pink-hair/index.md

# Check meta tags in HTML
curl https://benjaminste.in/blog/2025/11/05/hot-pink-hair/ | grep "alternate"
```

---

Your blog is now one of the most AI-agent-friendly blogs on the internet! 🤖✨
