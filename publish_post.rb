#!/usr/bin/env ruby
# Run after writing a new post in _posts/YYYY-MM-DD-slug.md.
# Generates blog/YYYY/MM/DD/slug/index.{json,md} and updates feed.xml + sitemap.xml.
#
# Usage:
#   ruby publish_post.rb _posts/2026-04-14-ai-image-gen-i-could-do-that.md
#
# The Jekyll plugin at _plugins/alternate_formats.rb would do this automatically,
# but the github-pages gem runs Jekyll in safe mode, which skips custom plugins.
# So we generate the alt-format files here and commit them to blog/ directly.

require 'json'
require 'yaml'
require 'cgi'
require 'fileutils'
require 'date'

SITE_URL = 'https://benjaminste.in'
AUTHOR   = 'Benjamin Stein'

post_path = ARGV[0]
abort "Usage: ruby publish_post.rb _posts/YYYY-MM-DD-slug.md" unless post_path && File.exist?(post_path)

raw = File.read(post_path)
fm_match = raw.match(/\A---\s*\n(.*?)\n---\s*\n(.*)\z/m)
abort "No YAML front matter in #{post_path}" unless fm_match
fm   = YAML.safe_load(fm_match[1], permitted_classes: [Date])
body = fm_match[2].strip

basename = File.basename(post_path, '.md')
m = basename.match(/\A(\d{4})-(\d{2})-(\d{2})-(.*)\z/)
abort "Post filename must be YYYY-MM-DD-slug.md" unless m
year, month, day, slug = m[1], m[2], m[3], m[4]

post_url     = "/blog/#{year}/#{month}/#{day}/#{slug}/"
full_url     = "#{SITE_URL}#{post_url}"
iso_date     = "#{year}-#{month}-#{day}"
iso_datetime = "#{iso_date}T00:00:00Z"

# ---- 1. blog/YYYY/MM/DD/slug/index.{json,md} ----
target_dir = "blog/#{year}/#{month}/#{day}/#{slug}"
FileUtils.mkdir_p(target_dir)

json_payload = {
  "title"        => fm['title'],
  "date"         => iso_date,
  "author"       => AUTHOR,
  "categories"   => fm['categories'] || [],
  "excerpt"      => fm['excerpt'],
  "url"          => post_url,
  "content"      => body,
  "html_url"     => full_url,
  "json_url"     => "#{full_url}index.json",
  "markdown_url" => "#{full_url}index.md"
}
File.write("#{target_dir}/index.json", JSON.pretty_generate(json_payload) + "\n")

md = +"# #{fm['title']}\n\n"
md << "**Date:** #{iso_date}\n\n"
md << "**Author:** #{AUTHOR}\n\n"
if fm['categories'] && !fm['categories'].empty?
  md << "**Categories:** #{fm['categories'].join(', ')}\n\n"
end
md << "---\n\n"
md << body
md << "\n"
File.write("#{target_dir}/index.md", md)
puts "Wrote #{target_dir}/index.{json,md}"

# ---- 2. sitemap.xml ----
sitemap = File.read('sitemap.xml')
if sitemap.include?(post_url)
  puts "sitemap.xml already has entry for #{post_url}, skipping"
else
  new_entry = <<~XML
      <url>
        <loc>#{full_url}</loc>
        <lastmod>#{iso_date}</lastmod>
      </url>
  XML
  # Insert before the first <url> that points at a blog post (keeps newest-first order)
  sitemap = sitemap.sub(/(  <url>\s*\n\s*<loc>#{Regexp.escape(SITE_URL)}\/blog\/)/, new_entry.gsub(/^/, '') + '\1')
  File.write('sitemap.xml', sitemap)
  puts "Updated sitemap.xml"
end

# ---- 3. feed.xml ----
feed = File.read('feed.xml')
if feed.include?("<id>#{full_url}</id>")
  puts "feed.xml already has entry for #{full_url}, skipping"
else
  entry = <<~XML
      <entry>
        <title>#{CGI.escapeHTML(fm['title'])}</title>
        <link href="#{full_url}" rel="alternate" type="text/html"/>
        <id>#{full_url}</id>
        <published>#{iso_datetime}</published>
        <updated>#{iso_datetime}</updated>
        <summary>#{CGI.escapeHTML(fm['excerpt'] || '')}</summary>
        <content type="html">#{CGI.escapeHTML(body)}</content>
      </entry>
  XML
  # Bump the feed-level <updated>
  feed = feed.sub(/<updated>[^<]+<\/updated>/, "<updated>#{iso_datetime}</updated>")
  # Insert new entry before the first existing <entry>
  feed = feed.sub(/(  <entry>)/, entry.gsub(/^/, '') + '\1')
  File.write('feed.xml', feed)
  puts "Updated feed.xml"
end

puts "Done. Review the diff with: git diff --stat"
