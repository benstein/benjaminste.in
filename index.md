---
layout: default
title: Home
---

# About Me

Ayo! I'm Ben. I'm the CEO of [Teammates](https://teammates.work) and the President of [Piedmont Makers](https://piedmontmakers.org). I live in Oakland, CA with my illustrious [wife](http://thefloweringartichoke.com), two teenage boys, and a pup named [Soup](/assets/images/soup.jpg). I love birds, bridge, beer, bots, bears, beets, Battlestar Galactica. And losing at pub trivia. Electrify everything.

**Current Status:** reading Dikkens with two Ks, the well-known Dutch author

---

## Select Writing

{% if site.posts.size > 0 %}
<ul style="list-style: none; padding-left: 0;">
  {% for post in site.posts %}
  <li style="margin-bottom: 30px;">
    <a href="{{ post.url }}" style="font-size: 1.2em; font-weight: 500;">{{ post.title }}</a>
    <br/>
    <span style="color: #666; font-size: 0.9em;">{{ post.date | date: "%B %d, %Y" }}</span>
    <br/>
    <em style="color: #555;">{{ post.excerpt | strip_html | truncatewords: 30 }}</em>
  </li>
  {% endfor %}
</ul>
{% else %}
<p>No blog posts yet. Check back soon!</p>
{% endif %}
