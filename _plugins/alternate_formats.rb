require 'json'

module Jekyll
  # Generator to create JSON versions of posts
  class PostJsonGenerator < Generator
    safe true
    priority :low

    def generate(site)
      site.posts.docs.each do |post|
        # Create JSON page
        site.pages << PostJsonPage.new(site, post)
        # Create Markdown page
        site.pages << PostMarkdownPage.new(site, post)
      end
    end
  end

  # Page class for JSON format
  class PostJsonPage < Page
    def initialize(site, post)
      @site = site
      @base = site.source
      @dir = post.url
      @name = 'index.json'

      self.process(@name)

      data = {
        "title" => post.data['title'],
        "date" => post.date.strftime('%Y-%m-%d'),
        "author" => site.config['author'] || 'Benjamin Stein',
        "categories" => post.data['categories'] || [],
        "excerpt" => post.data['excerpt'],
        "url" => post.url,
        "content" => post.content,
        "html_url" => "#{site.config['url']}#{post.url}",
        "json_url" => "#{site.config['url']}#{post.url}index.json",
        "markdown_url" => "#{site.config['url']}#{post.url}index.md"
      }

      self.content = JSON.pretty_generate(data)
      self.data = {}
    end
  end

  # Page class for Markdown format
  class PostMarkdownPage < Page
    def initialize(site, post)
      @site = site
      @base = site.source
      @dir = post.url
      @name = 'index.md'

      self.process(@name)

      content = "# #{post.data['title']}\n\n"
      content += "**Date:** #{post.date.strftime('%Y-%m-%d')}\n\n"
      content += "**Author:** #{site.config['author'] || 'Benjamin Stein'}\n\n"

      if post.data['categories'] && !post.data['categories'].empty?
        content += "**Categories:** #{post.data['categories'].join(', ')}\n\n"
      end

      content += "---\n\n"
      content += post.content

      self.content = content
      self.data = {}
    end
  end
end
