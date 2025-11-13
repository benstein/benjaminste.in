#!/usr/bin/env ruby
require 'json'
require 'yaml'
require 'fileutils'

# Load site config
config = YAML.load_file('_config.yml')
site_url = config['url'] || 'https://benjaminste.in'
author = config['author'] || 'Benjamin Stein'

puts "Generating alternate formats for blog posts..."

# Process each post
Dir.glob('_posts/*.md').sort.each do |post_file|
  content = File.read(post_file)

  # Parse front matter
  if content =~ /\A(---\s*\n.*?\n?)^(---\s*$\n?)/m
    front_matter = YAML.safe_load($1, permitted_classes: [Date, Time])
    post_content = $'

    # Extract date from filename
    basename = File.basename(post_file, '.md')
    date_match = basename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/)
    next unless date_match

    year, month, day, slug = date_match[1..4]

    # Build URLs
    post_url = "/blog/#{year}/#{month}/#{day}/#{slug}/"
    output_dir = "alternate_formats/blog/#{year}/#{month}/#{day}/#{slug}"

    # Ensure output directory exists
    FileUtils.mkdir_p(output_dir)

    # Create JSON version
    json_data = {
      "title" => front_matter['title'],
      "date" => "#{year}-#{month}-#{day}",
      "author" => author,
      "categories" => front_matter['categories'] || [],
      "excerpt" => front_matter['excerpt'],
      "url" => post_url,
      "content" => post_content.strip,
      "html_url" => "#{site_url}#{post_url}",
      "json_url" => "#{site_url}#{post_url}index.json",
      "markdown_url" => "#{site_url}#{post_url}index.md"
    }

    File.write("#{output_dir}/index.json", JSON.pretty_generate(json_data))

    # Create Markdown version
    md_content = "# #{front_matter['title']}\n\n"
    md_content += "**Date:** #{year}-#{month}-#{day}\n\n"
    md_content += "**Author:** #{author}\n\n"

    if front_matter['categories'] && !front_matter['categories'].empty?
      md_content += "**Categories:** #{front_matter['categories'].join(', ')}\n\n"
    end

    md_content += "---\n\n"
    md_content += post_content.strip

    File.write("#{output_dir}/index.md", md_content)

    puts "✓ Generated: #{front_matter['title']}"
  end
end

puts "\nDone! Generated files in alternate_formats/"
