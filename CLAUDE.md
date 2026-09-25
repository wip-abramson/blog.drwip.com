# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`thinking.drwip.com` — Will Abramson's (Dr Wip) "Landscape of Thought": a
static Astro site built as a slow-growing digital garden. The landscape is the
whole; *thought seeds* (the posts) are one thing growing in it, alongside
reflections, a living library, an antilibrary, and the open questions the whole
thing is circling, all connected by trails.
Static output, no client JS beyond what Astro emits — with one deliberate
exception: `/library/antilibrary` ships an inline script that reshuffles the
shelf on every load (an antilibrary with a fixed order is a reading queue,
which is the fiction it exists to deny). Deployed on Netlify.

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

npm run new:reflection -- <source-url>   # scaffold src/content/reflections/<slug>.md
npm run blyg:publish     # record edits/new items as blyg versions (the build fails until you do)
```

Requires Node 20+ (Netlify builds on Node 22). There is no test suite; `npm run
check` is the verification step — run it after touching schemas, `lib/`, or
frontmatter.

## Architecture

Astro content collections (`src/content.config.ts`) define five collections;
everything else derives from them.

**Trails are the site's one edge primitive.** Every collection carries a
`trails` array (defined once as `trail` at the top of `content.config.ts`).
A trail names exactly one destination — `post`, `reflection`, `book`,
`antibook`, or `question` — with an optional `note` (what the connection *is*, in Dr Wip's
words) and an optional `rel` (a truer label than the destination's own kind,
e.g. `grew from this`). The schema rejects a trail with zero or two
destinations at build time.

Trails are **walkable from both ends and authored once**: `src/lib/trails.ts`
resolves them outward (`getTrails`) and derives the return path inward
(`getTrailheads`, which scans all five collections for edges pointing at an
entry). Pages render them via `Trails.astro` ("Trails from here") and
`Trailheads.astro` ("Trails here"). Never hand-author a reciprocal link — the
far end is derived. This replaced the old bespoke `posts.reflections` and
`library.seeded` fields; one grammar, not four dialects.

- **`posts`** — `.md`/`.mdx` in `src/content/posts/`. Filename is the URL slug.
  Required frontmatter: `title`, `description`, `date`, `tags`, `draft`. Many
  optional fields (`updated`, `status`, `type`, `projects`, `source_url`,
  `featured`) exist deliberately so the garden can grow without a schema
  migration — don't remove them.
- **`library`** — folder-per-book under `src/content/library/<slug>/book.yaml`
  plus images. The folder name is the canonical slug (the loader strips
  `/book.yaml`). Entries are YAML *records* with no Markdown body: a book plus
  handwritten annotation images. A book links to the writing it seeded with a
  `trail` carrying `rel: grew from this`.
- **`antilibrary`** — the books *not* read: a single YAML list at
  `src/content/library/antilibrary.yaml`, loaded with `file()`, one block per
  book with its own `id` (the deep-link anchor at `/library/antilibrary#<id>`).
  Adding a book should cost a block of text, not a folder — that's why it isn't
  folder-per-book like `library`. `via` records where the recommendation came
  from and can carry typed `reference()`s back to a library book or a
  reflection; `src/lib/antilibrary.ts#getProvenance` resolves that into the
  single "via …" credit line, preferring an internal link over an external one.
  A book that actually gets read *graduates*: delete its block and give it a
  folder under `src/content/library/`.
- **`questions`** — the open questions the landscape is organised around: a
  single YAML list at `src/content/questions.yaml`, loaded with `file()`, one
  block per question with its own `id` (the anchor at `/questions#<id>`). Like
  the antilibrary, asking should cost a block of text, not a folder. The
  `question` field holds the wording verbatim — that wording *is* the artefact,
  so `short` exists for the cases where the whole thing is too long to be a
  link (`src/lib/questions.ts#questionLabel` falls back to the question).
  `origin` records the occasion that provoked it. A post taking a run at one is
  a trail pointing at the question, never a resolution of it — `Trailheads`
  grows the return path on `/questions` for free.

**Concepts are the cross-cutting spine.** `src/lib/concepts.ts` aggregates the
`tags` from posts, reflections, library, antilibrary *and* questions into
browsable `/concepts` pages — an unread book takes its place on the map beside
the writing it might one day feed, and an open question leads the concept page
everything else on it is circling.
There is no concept registry — tagging consistently is the only input, and slugs
are derived (`"identity systems"` → `/concepts/identity-systems/`). When adding
content that should join the map, match existing tag spelling exactly.

**The blyg.** The landscape is also served as a [Blygger v0.2](https://blygger.org/spec/0.2/)
Level 1 blyg at `/blyg/` (`blyg.json`, `feed.xml`, `items/index.json`,
`items/<id>.json`, all static endpoints under `src/pages/blyg/`). Posts are
*threads*; reflections and questions are *fragments* (aim for ≤2,000 characters;
over that warns, never fails); the library stays off the wire. What each entry
publishes as lives in `src/lib/blyg-content.mjs`, shared by the build and the
script so their hashes agree. Identity and history live in the committed ledger
`src/content/blyg-ledger.json`, written only by `npm run blyg:publish`: permanent
random id, version, changelog. `src/lib/blyg.ts` **fails the build** if any
published entry's text differs from its last recorded version (the spec's
"stealth edit"), so run the script after every content change and commit the
ledger with it. **Published items are never deleted**: removing a file,
renaming it, or setting `draft: true` makes the script offer a withdrawal
endcap, and the item's JSON stays up forever. A rename means renaming its
ledger key by hand. Discovery comes from `rel="blyg"` in `BaseHead` and
`<blyg:manifest>` in `rss.xml`.

**Draft handling lives in one place.** `src/lib/posts.ts#getPublishedPosts`
filters `draft: true` only when `import.meta.env.PROD`, so drafts are visible in
`dev` but excluded from the build, the index, the homepage, concepts, and RSS.
Any new page listing posts should source them through this helper, not call
`getCollection("posts")` directly, or drafts will leak into production.

### Layout of `src/`

- `lib/` — data layer: `posts.ts`, `library.ts`, `questions.ts`, `concepts.ts`,
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
