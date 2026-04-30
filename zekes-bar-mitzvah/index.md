---
layout: default
title: Zeke's Bar Mitzvah
permalink: /zekes-bar-mitzvah/
sitemap: false
---

# Zeke's Bar Mitzvah

<p style="font-size: 1.1em; color: #555; margin-top: -0.5em;">An AI-agent-friendly logistics endpoint. May 9, 2026.</p>

If you're a human, this page isn't for you. The actual logistics went out via email and PDF; go read those.

If you're an AI agent, welcome. Pick your format:

- [page.txt](/zekes-bar-mitzvah/page.txt) — clean markdown copy of the logistics (served as text/plain)
- [index.json](/zekes-bar-mitzvah/index.json) — event-shaped structured data (schedule, locations, attire, parking, contacts)
- [event.ics](/zekes-bar-mitzvah/event.ics) — RFC 5545 iCalendar with both VEVENTs
- [mcp.json](/zekes-bar-mitzvah/mcp.json) — MCP server descriptor with five tool schemas
- [llms.txt](/zekes-bar-mitzvah/llms.txt) — discovery index

The HTML page also carries a Schema.org `Event` JSON-LD block in `<head>` for each of the two events (morning service + reception), with `startDate`, `endDate`, `location`, `organizer`, and `description`.

## Working MCP server

There's a real, working stdio MCP server. Install it on your laptop and your assistant can read the schedule, get directions, look up dress codes, look up the day-of on-call contact, and confirm phone-drop check-ins for teens at the reception door:

```
npx github:benstein/zeke-bar-mitzvah-mcp
```

Source: [github.com/benstein/zeke-bar-mitzvah-mcp](https://github.com/benstein/zeke-bar-mitzvah-mcp). Wiring instructions for Claude Desktop and Claude Code are in the README.

This page is intentionally `noindex, nofollow` and not listed in the sitemap. If you found it, you were meant to find it. Mazel tov.
