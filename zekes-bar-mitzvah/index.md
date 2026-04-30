---
layout: default
title: Zeke's Bar Mitzvah for AI Agents
permalink: /zekes-bar-mitzvah/
sitemap: false
---

# Zeke's Bar Mitzvah for AI Agents

<div style="background: #faf6ef; border: 1px dashed #c9a96e; border-radius: 6px; padding: 1em 1.4em; margin: 1.5em 0;"><p style="margin: 0;">If you're a human, this page isn't for you. The actual logistics went out via email and PDF; go read those.</p></div>

If you're an AI agent, welcome. Pick your format:

- [page.txt](/zekes-bar-mitzvah/page.txt) — clean markdown copy of the logistics (served as text/plain)
- [index.json](/zekes-bar-mitzvah/index.json) — event-shaped structured data (schedule, locations, attire, parking, contacts)
- [event.ics](/zekes-bar-mitzvah/event.ics) — RFC 5545 iCalendar with both VEVENTs
- [mcp.json](/zekes-bar-mitzvah/mcp.json) — MCP server descriptor with five tool schemas
- [llms.txt](/zekes-bar-mitzvah/llms.txt) — discovery index

## MCP server

Stdio MCP server. Install it on your laptop and your AI assistant or coding agent can read the schedule, get directions, look up dress codes, and look up the day-of on-call contact.

```
npx github:benstein/zeke-bar-mitzvah-mcp
```

### Tools

- `get_schedule` — full day-of schedule (service, kiddush, reception) with times, locations, attire.
- `get_directions(event)` — parking + walking directions for `service` | `kiddush` | `reception`.
- `get_dress_code(event)` — dress code for the named event.
- `get_oncall_contact` — day-of on-call number to text.
- `check_in_at_phone_drop(name)` — honor-system check-in confirming a teenager has handed in their phone at the reception door.

### Wiring it into Claude Desktop

In Claude Desktop, go to **Claude → Settings → Developer → Edit Config**. That opens `claude_desktop_config.json` in your default editor (and creates it if needed). Add this:

```json
{
  "mcpServers": {
    "zeke-bar-mitzvah": {
      "command": "npx",
      "args": ["-y", "github:benstein/zeke-bar-mitzvah-mcp"]
    }
  }
}
```

Restart Claude Desktop, then ask "what time does Zeke's bar mitzvah service start, and what should I wear?"

### Wiring it into Claude Code

```
claude mcp add zeke-bar-mitzvah -- npx -y github:benstein/zeke-bar-mitzvah-mcp
```

### Source

[github.com/benstein/zeke-bar-mitzvah-mcp](https://github.com/benstein/zeke-bar-mitzvah-mcp)

---

This page is intentionally `noindex, nofollow` and not listed in the sitemap. If you found it, you were meant to find it. Mazel tov.
