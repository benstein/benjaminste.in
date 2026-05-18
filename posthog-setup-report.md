<wizard-report>
# PostHog post-wizard report

The wizard has completed a PostHog integration for this Jekyll blog. The `publish_post.rb` script now captures a `post_published` event each time you run it to publish a new post. The gem loads gracefully — if `posthog-ruby` or `dotenv` are not installed, the script continues working without analytics rather than failing.

| Event | Description | File |
|-------|-------------|------|
| `post_published` | Fired when `publish_post.rb` successfully generates alt-format files and updates `sitemap.xml` and `feed.xml` | `publish_post.rb` |

Properties captured with each event: `slug`, `title`, `categories`, `post_url`, `year`, `month`, `day`.

## Next steps

We've built some insights and a dashboard to track publishing activity:

- [Analytics basics dashboard](/dashboard/1554828)
- [Posts published over time](/insights/Hc3XdQyI) — weekly line chart of publish events
- [Total posts published](/insights/lIgSfXtH) — single number, last 365 days
- [Posts by category](/insights/N7AcwlOT) — bar chart broken down by category tag

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-ruby/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
