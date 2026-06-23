import { defineCollection, z, reference } from "astro:content";
import { glob } from "astro/loaders";

/**
 * The `posts` collection.
 *
 * Required frontmatter (today): title, description, date, tags, draft.
 * The remaining fields are optional and exist so the site can grow into a
 * fuller digital garden later without a schema migration.
 */
const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    // --- required -------------------------------------------------------
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),

    // --- optional: room to grow into a digital garden -------------------
    updated: z.coerce.date().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    projects: z.array(z.string()).default([]),
    source_url: z.string().url().optional(),
    featured: z.boolean().default(false),
    /** Reflections this post grew from / connects to — see the `reflections`
     * collection. Renders as "Thinking about" links on the post page. */
    reflections: z.array(reference("reflections")).default([]),
  }),
});

/**
 * The `library` collection — Dr Wip's living library.
 *
 * Each entry is a *record*, not an article: a book and the handwritten
 * annotation page that is the evidence of encounter. Entries are plain
 * YAML with no Markdown body — the page is a designed frame around the
 * annotation image, not flowed prose. `tags` feed the same `/concepts`
 * map as posts, so a book and the posts it seeded gather in one place.
 */
const library = defineCollection({
  // Each book lives in its own folder: `library/<slug>/book.yaml` plus
  // images. The folder name is the canonical slug — strip the filename
  // so the id stays a clean `<slug>` rather than `<slug>/book`.
  loader: glob({
    pattern: "**/book.{yaml,yml}",
    base: "./src/content/library",
    generateId: ({ entry }) => entry.replace(/\/book\.(yaml|yml)$/, ""),
  }),
  schema: ({ image }) =>
    z.object({
      // --- required -------------------------------------------------------
      title: z.string(),
      author: z.string(),

      // --- placement & timeline ------------------------------------------
      type: z.string().default("book"),
      status: z.enum(["reading", "read", "shelved"]).optional(),
      /** When it was read (YYYY-MM) — drives the library timeline. */
      read: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "read must be YYYY-MM")
        .optional(),
      /** Publication year — a minor fact, not what the shelf sorts by. */
      published: z.number().optional(),
      link: z.string().url().optional(), // the work, elsewhere
      tags: z.array(z.string()).default([]),
      featured: z.boolean().default(false),

      // --- the record -----------------------------------------------------
      /** One personal line: what this book did to your thinking. */
      influence: z.string().optional(),
      /** What the book argues — its core thesis. */
      summary: z.string().optional(),
      /** Posts this book genuinely seeded — curated heritage, not shared tags. */
      seeded: z.array(reference("posts")).default([]),
      /** Handwritten annotation pages — the substance of the entry. */
      annotations: z
        .array(
          z.object({
            image: image(),
            caption: z.string().optional(),
          }),
        )
        .default([]),
      cover: image().optional(),
    }),
});

/**
 * The `reflections` collection — "Thinking about".
 *
 * Short reflections in the margins of *other people's* writing: an essay, a
 * post, an argument worth turning over, paired with a link back to the source.
 * The reflection itself is the Markdown body; the frontmatter describes the
 * piece being responded to. Like posts and books, `tags` feed the `/concepts`
 * map, and each entry is deep-linkable (`/reflections#<slug>`) so posts can
 * connect to them via the `reflections` reference field above.
 */
const reflections = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/reflections" }),
  schema: z.object({
    // --- the piece being responded to ----------------------------------
    /** Title of the source piece. */
    title: z.string(),
    /** The piece itself — required; what the reflection links back to. */
    source_url: z.string().url(),
    /** Who wrote the source piece. */
    author: z.string().optional(),
    /** Publication / Substack name. Falls back to the URL host if omitted. */
    site: z.string().optional(),

    // --- placement ------------------------------------------------------
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, library, reflections };
