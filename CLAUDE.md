# CLAUDE.md — Notes for AI agents working in this repo

This is Ben's personal site (Jekyll, deployed via GitHub Pages).

## Publishing a new blog post

Do **not** try to run the Jekyll plugin in `_plugins/alternate_formats.rb` to generate the JSON/MD alt-formats. It never runs during deploy: the `github-pages` gem forces Jekyll into safe mode, which skips custom plugins. The committed files under `blog/YYYY/MM/DD/slug/` are what actually get served.

The complete workflow for a new post:

1. **Write the post** at `_posts/YYYY-MM-DD-slug.md` with YAML front matter matching other posts (`layout: default`, `title`, `date`, `categories`, `excerpt`).
2. **Drop any images** into `assets/images/` and reference them as `/assets/images/...`.
3. **Run the publish script**, which does the rest:
   ```
   ruby publish_post.rb _posts/YYYY-MM-DD-slug.md
   ```
   This creates `blog/YYYY/MM/DD/slug/index.json` and `index.md`, inserts a new `<url>` in `sitemap.xml`, and prepends a new `<entry>` in `feed.xml` (also bumping the feed-level `<updated>` timestamp). It is idempotent.
4. **Preview locally** with `bundle exec jekyll serve` (post lives at `http://127.0.0.1:4000/blog/YYYY/MM/DD/slug/`). Remember the plugin won't run, so the alt-formats you're about to commit come from step 3, not from Jekyll.
5. **Commit and push.** The homepage (`index.md`) auto-iterates `site.posts`, so no manual edit needed there. `ai-content-manifest.json` is pattern-based, also no edit.

Files that always change on a new post: the post, any new images, `blog/YYYY/MM/DD/slug/index.json`, `blog/YYYY/MM/DD/slug/index.md`, `feed.xml`, `sitemap.xml`.

## Voice and style

Ben's global `~/.claude/CLAUDE.md` has the canonical writing-style rules (AI tells to avoid, em-dash restraint, no "it's not X, it's Y" as default, no tricolons for rhythm, etc.). Apply those to any prose you generate for this site.

Good recent posts to match voice against when drafting: `_posts/2026-04-08-we-used-to-know-when-to-stop.md`, `_posts/2026-04-03-the-saaspocalypse-already-happened-to-us.md`, `_posts/2026-02-24-should-you-major-in-cs.md`.

## Post conventions worth matching

- **Excerpt:** one punchy line, often a compressed version of the thesis. It renders on the homepage card and in Atom `<summary>`.
- **Pull quotes:** `<aside class="pull-quote"><p>...</p></aside>`. Place immediately *after* the body line they echo, not before. Two or three per post is typical.
- **Images:** centered via `<p style="text-align: center;"><img ... /></p>`. For side-by-side pairs, set `display: inline-block; max-width: 32%; vertical-align: top; margin: 0 0.5%;` on each `<img>` inside one centered paragraph.
- **Links:** inline markdown links, no reference-style.
- **Categories:** usually 3, pulled from `[personal, family, ai, startups, superduper, creativity, education, engineering]`.

## Things that are NOT manually maintained

- Post listings on the homepage (liquid iterates `site.posts`).
- `ai-content-manifest.json` (describes patterns, not individual posts).
- `_site/` (gitignored; `bundle exec jekyll build` regenerates it).

## Images and icons

No emojis in rendered output (see Ben's global CLAUDE.md). If an icon is needed, use inline SVG from Heroicons or Lucide.
