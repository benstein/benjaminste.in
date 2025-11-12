---
layout: default
title: Home
---

# About Me

![Avatar](/assets/images/avatar.jpg){: width="150px" style="border-radius: 50%; display: block; margin: 0 auto 20px;"}

Hello! I'm Benjamin Stein, a [add your professional title/description here - e.g., software engineer, product manager, data scientist].

[Add a brief bio here - 2-3 sentences about your background, interests, and what you're passionate about.]

**Connect with me:**
- [LinkedIn]({{ site.linkedin_url }})
- [GitHub](https://github.com/{{ site.github_username }})

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
