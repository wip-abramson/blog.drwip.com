# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`thinking.drwip.com` — Will Abramson's (Dr Wip) "Thought Seeds": a static Astro
site of writing and a living library, built as a slow-growing digital garden.
Static output, no client JS beyond what Astro emits. Deployed on Netlify.

> **Canonical domain is `thinking.drwip.com`.** The space was renamed from the
> now-deprecated `blog.drwip.com` (kept live only as a redirect). The domain is
> set in two places that must stay in sync: `site` in `astro.config.mjs` and
> `SITE_URL` in `src/consts.ts` — together they drive canonical URLs, the
> sitemap, RSS, and structured data.

## Commands

```sh
npm run dev      # dev server at http://localhost:4321 (drafts visible here)
npm run build    # production build to ./dist (drafts excluded)
npm run preview  # serve the built ./dist locally
npm run check    # astro check — type-check + validate content collection schemas
```

Requires Node 20+ (Netlify builds on Node 22). There is no test suite; `npm run
check` is the verification step — run it after touching schemas, `lib/`, or
frontmatter.

## Architecture

Astro content collections (`src/content.config.ts`) define two collections;
everything else derives from them.

- **`posts`** — `.md`/`.mdx` in `src/content/posts/`. Filename is the URL slug.
  Required frontmatter: `title`, `description`, `date`, `tags`, `draft`. Many
  optional fields (`updated`, `status`, `type`, `projects`, `source_url`,
  `featured`) exist deliberately so the garden can grow without a schema
  migration — don't remove them.
- **`library`** — folder-per-book under `src/content/library/<slug>/book.yaml`
  plus images. The folder name is the canonical slug (the loader strips
  `/book.yaml`). Entries are YAML *records* with no Markdown body: a book plus
  handwritten annotation images. `seeded` is a typed `reference("posts")` array
  linking a book to the posts it actually seeded.

**Concepts are the cross-cutting spine.** `src/lib/concepts.ts` aggregates the
`tags` from *both* posts and library entries into browsable `/concepts` pages.
There is no concept registry — tagging consistently is the only input, and slugs
are derived (`"identity systems"` → `/concepts/identity-systems/`). When adding
content that should join the map, match existing tag spelling exactly.

**Draft handling lives in one place.** `src/lib/posts.ts#getPublishedPosts`
filters `draft: true` only when `import.meta.env.PROD`, so drafts are visible in
`dev` but excluded from the build, the index, the homepage, concepts, and RSS.
Any new page listing posts should source them through this helper, not call
`getCollection("posts")` directly, or drafts will leak into production.

### Layout of `src/`

- `lib/` — data layer: `posts.ts`, `library.ts`, `concepts.ts`,
  `structuredData.ts` (JSON-LD for SEO). Pages should pull data from here.
- `consts.ts` — single source of truth for site metadata, nav, and external
  links. Add nav items here, not in components.
- `pages/` — file-based routes, including `[...slug].astro` for posts/library,
  `[concept].astro`, and `rss.xml.js`.
- `components/`, `layouts/` (`BaseLayout`), `styles/global.css` (design tokens +
  article typography; Tailwind v4 via `@tailwindcss/vite`, no config file).

## Deployment

Push to the production branch → Netlify rebuilds (`netlify.toml`: build
`npm run build`, publish `dist`). Static build, no adapter. `/_astro/*` assets
are served immutable/long-cache, so never hand-edit fingerprinted output.
