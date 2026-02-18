---
layout: default
title: Home
---

<div class="homepage-hero">
  <img src="{{ site.logo | relative_url }}" alt="Benjamin Stein" class="homepage-hero-avatar" />
  <div>
    <h1>Benjamin Stein</h1>
    <p>CEO of <a href="https://superduperlabs.com">SuperDuper</a>. President of <a href="https://piedmontmakers.org">Piedmont Makers</a>. Oakland, CA.</p>
  </div>
</div>

<p class="homepage-bio">Ayo! I'm Ben. I live in Oakland, CA with my illustrious <a href="http://thefloweringartichoke.com">wife</a>, two teenage boys, and a pup named <a href="/assets/images/soup.jpg">Soup</a>. I love birds, bridge, beer, bots, bears, beets, Battlestar Galactica. And losing at pub trivia. Electrify everything.</p>

<p class="homepage-status">
<em>Current Status:</em> Reading Dikkens with two Ks, the well-known Dutch author<br>
<em>Previously:</em> Memorizing jokes from Cap'n Billy's Whiz Bang
</p>

---

## Writing

<div class="post-list">
  {% for post in site.posts %}
  <a href="{{ post.url }}" class="post-card">
    <h3 class="post-card-title">{{ post.title }}</h3>
    <p class="post-card-excerpt">{{ post.excerpt | strip_html | truncatewords: 30 }}</p>
    <span class="post-card-date">{{ post.date | date: "%B %-d, %Y" }}</span>
  </a>
  {% endfor %}
</div>
