# thinking.drwip.com

A minimal writing and research-notebook site for **Will Abramson (Dr Wip)**.

Built with [Astro](https://astro.build), TypeScript, MDX, Astro content
collections, and Tailwind CSS. Static output — no client-side JavaScript
shipped beyond what Astro needs.

- **Live:** https://thinking.drwip.com
- **Main site:** https://drwip.com
- **Subscribe:** https://www.wordsfromwip.com/s/words-from-dr-wip

## Local development

Requires Node 20+ (Node 22 recommended).

```sh
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:4321
npm run build    # build the production site to ./dist
npm run preview  # preview the built site locally
npm run check    # type-check Astro + content collections
```

## Writing a post

Posts are MDX (or Markdown) files in `src/content/posts/`. The filename
becomes the URL slug — `src/content/posts/trust-infrastructure.mdx` is served
at `/posts/trust-infrastructure/`.

Create a file with frontmatter:

```mdx
---
title: "On trust infrastructure"
description: "A short summary used in listings, search, and the RSS feed."
date: 2026-05-22
tags: ["identity", "cryptography"]
draft: false
---

Write the post body here in Markdown / MDX.
```

### Frontmatter fields

| Field        | Required | Type        | Notes                                              |
| ------------ | -------- | ----------- | -------------------------------------------------- |
| `title`      | **yes**  | string      | Post title.                                        |
| `description`| **yes**  | string      | Used in listings, `<meta>`, and RSS.               |
| `date`       | **yes**  | date        | Publish date, e.g. `2026-05-22`.                   |
| `tags`       | **yes**  | string[]    | Drive the **Concepts** pages. May be empty (`[]`). |
| `draft`      | **yes**  | boolean     | `true` hides the post from the production build.   |
| `updated`    | no       | date        | Last-updated date, shown alongside the post date.  |
| `type`       | no       | string      | Free-form, for a future digital garden.            |
| `status`     | no       | string      | Free-form (e.g. `seedling`, `evergreen`).          |
| `projects`   | no       | string[]    | Related project slugs, for future linking.         |
| `source_url` | no       | URL         | If set, renders a "source" note on the post page.  |
| `featured`   | no       | boolean     | Reserved for future use.                           |

Drafts (`draft: true`) are hidden from the production build, the posts index,
the homepage, the Concepts pages, and the RSS feed — but are still visible
during `npm run dev` so you can preview them.

## Concepts

Each value in a post's `tags` array becomes a browsable **Concept**. No
configuration needed — tag a post and the concept pages update on the next
build:

- `/concepts` — every concept, with how many notes carry it.
- `/concepts/<concept>` — all notes filed under one concept.

Concept URLs are slugified (`identity systems` → `/concepts/identity-systems/`),
so a body of related notes accretes simply by tagging consistently. Posts and
listings link to concepts in their inline `#concept` form; the concept page
itself is titled by its plain name (`Identity`).

## Project structure

```
src/
  components/      Header, Footer, BaseHead, PostListItem, FormattedDate, ConceptTags
  content/posts/   Your posts (.md / .mdx) — add files here
  layouts/         BaseLayout — the shared page shell
  lib/              posts.ts (sorting + draft filtering), concepts.ts
  pages/           Routes: /, /posts, /posts/[slug], /concepts, /concepts/[concept], /about, /rss.xml
  styles/          global.css — design tokens + article typography
  consts.ts        Site metadata and external links
  content.config.ts  Posts collection schema
```

## Deployment (Netlify)

The site is a static build, so no Netlify adapter is needed.

`netlify.toml` is already configured:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 22

To deploy:

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. In Netlify, **Add new site → Import an existing project** and pick the repo.
3. Netlify reads `netlify.toml` automatically — accept the defaults and deploy.
4. Add the custom domain `thinking.drwip.com` under **Domain settings**. The
   former `blog.drwip.com` is deprecated — keep it live as a redirect to
   `thinking.drwip.com`.

Every push to the production branch triggers a rebuild and deploy.

## Notes

- `site` in `astro.config.mjs` is set to `https://thinking.drwip.com`; update it
  if the domain changes, since it drives canonical URLs, the sitemap, and RSS.
- A `sitemap-index.xml` is generated automatically by `@astrojs/sitemap`.
