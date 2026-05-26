---
layout: default
title: Google Workspace Classic Favicons
permalink: /google-classic-favicons/
---

# Google Workspace Classic Favicons

A Chrome extension that restores the pre-2026 Google Workspace favicons across Gmail, Calendar, Drive, Docs, Sheets, Slides, and Meet.

<p style="text-align: center;"><img src="/assets/images/classic-favicons-strip.png" alt="The seven 2020-era Google Workspace favicons in a row: Gmail, Calendar, Drive, Docs, Sheets, Slides, Meet" style="max-width: 100%;" /></p>

Google rolled out a new set of Workspace favicons in May 2026. I do not like them. This extension puts the 2020-era rainbow-G versions back where they belong.

## Install

Not on the Chrome Web Store. Submitting an extension that ships Google's own product logos through Google's own review process tends to end poorly, so it lives on GitHub instead.

1. Download the repo from [github.com/benstein/google-classic-favicons](https://github.com/benstein/google-classic-favicons). Either grab the [zip](https://github.com/benstein/google-classic-favicons/archive/refs/heads/main.zip) and unzip it, or `git clone https://github.com/benstein/google-classic-favicons.git`.
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked** and pick the folder.
5. Reload any open Workspace tabs.

Your tabs should look correct again.

## How it works

A small content script runs on each Workspace domain at `document_start`. It strips any favicon link the page injects, replaces it with a bundled PNG of the 2020 logo, and keeps watch via a `MutationObserver` so the swap survives Google's continual re-injection (especially Gmail, which updates the favicon constantly to reflect unread count).

## Known trade-offs

- Gmail's live unread-count badge is gone. The tab always shows the classic Gmail M.
- Calendar's date number is gone. The tab always shows the classic "31."
- Only the seven core apps are covered. No Forms, Keep, Chat, Sites, Tasks, or Voice. Pull requests welcome.
- Chrome only, though it should work in Edge unchanged. Firefox would need a port.

## Source

[github.com/benstein/google-classic-favicons](https://github.com/benstein/google-classic-favicons) — MV3, ~50 lines of JavaScript, seven PNGs, MIT license.
