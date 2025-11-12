# benjaminste.in

Personal website and blog built with Jekyll and hosted on GitHub Pages.

## Quick Start

### Prerequisites

- Ruby 2.7 or higher
- Bundler gem

### Local Development

1. **Install dependencies:**
   ```bash
   bundle install
   ```

2. **Run the local server:**
   ```bash
   bundle exec jekyll serve
   ```

3. **View your site:**
   Open your browser to `http://localhost:4000`

   The site will automatically rebuild when you make changes to files.

### Building the site

To build the site without serving it:
```bash
bundle exec jekyll build
```

The generated site will be in the `_site/` directory.

## Deployment to GitHub Pages

### First-Time Setup

1. **Create a GitHub repository:**
   - Repository name: `benjaminste.in` or `<username>.github.io`
   - Make it public (required for free GitHub Pages)

2. **Initialize git and push:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Jekyll site setup"
   git branch -M main
   git remote add origin https://github.com/benstein/<repository-name>.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Under "Source", select "Deploy from a branch"
   - Select branch: `main` and folder: `/ (root)`
   - Click Save

4. **Configure custom domain (once DNS is ready):**
   - In Settings → Pages → Custom domain, enter: `benjaminste.in`
   - Check "Enforce HTTPS" after DNS propagates
   - Create a `CNAME` file in the repository root with content: `benjaminste.in`

### Deploying Updates

Once set up, deployment is super simple:

```bash
git add .
git commit -m "Your commit message"
git push
```

GitHub Pages will automatically rebuild and deploy your site within 1-2 minutes.

## Project Structure

```
benjaminste.in/
├── _config.yml          # Site configuration
├── _posts/              # Blog posts (YYYY-MM-DD-title.md format)
├── assets/
│   └── images/          # Images for the site
│       ├── avatar.jpg   # Your profile picture
│       └── posts/       # Blog post images
├── index.md             # Homepage
├── Gemfile              # Ruby dependencies
└── README.md            # This file
```

## Writing Blog Posts

1. Create a new file in `_posts/` with format: `YYYY-MM-DD-title.md`
2. Add front matter at the top:
   ```yaml
   ---
   layout: default
   title: "Your Post Title"
   date: YYYY-MM-DD
   categories: [category1, category2]
   ---
   ```
3. Write your content in Markdown
4. Test locally with `bundle exec jekyll serve`
5. Commit and push to deploy

## Adding Images

1. Add images to `assets/images/` or `assets/images/posts/`
2. Reference in Markdown:
   ```markdown
   ![Alt text](/assets/images/filename.jpg)
   ```

## Customizing

- **Site info:** Edit `_config.yml`
- **Homepage bio:** Edit `index.md`
- **Theme customization:** Create `assets/css/style.scss` (see Jekyll documentation)
- **Custom layouts:** Create `_layouts/default.html` to override theme defaults

## Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Minimal Theme](https://github.com/pages-themes/minimal)
- [Markdown Guide](https://www.markdownguide.org/)

## TODO

- [ ] Add avatar image to `assets/images/avatar.jpg`
- [ ] Complete bio in `index.md`
- [ ] Add sample images for first blog post
- [ ] Set up DNS for benjaminste.in domain
- [ ] Configure custom domain in GitHub Pages settings
