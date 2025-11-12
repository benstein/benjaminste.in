---
layout: default
title: Home
---

# About Me

Ayo! I'm Ben. I'm the CEO of [Teammates](https://teammates.work) and the President of [Piedmont Makers](https://piedmontmakers.org). I live in Oakland, CA with my illustrious [wife](http://thefloweringartichoke.com), two teenage boys, and a pup named [Soup](/assets/images/soup.jpg). I love birds, bridge, beer, bots, bears, beets, Battlestar Galactica. And losing at pub trivia. Electrify everything.

**Current Status:** reading Dikkens with two Ks, the well-known Dutch author

---

## Recent Blog Posts

{% if site.posts.size > 0 %}
<ul>
  {% for post in site.posts %}
  <li>
    <strong>{{ post.date | date: "%B %d, %Y" }}</strong> - <a href="{{ post.url }}">{{ post.title }}</a>
    <br/>
    <em>{{ post.excerpt | strip_html | truncatewords: 30 }}</em>
  </li>
  {% endfor %}
</ul>
{% else %}
<p>No blog posts yet. Check back soon!</p>
{% endif %}
