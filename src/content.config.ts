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
  loader: glob({ pattern: "**/*.{yaml,yml}", base: "./src/content/library" }),
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

export const collections = { posts, library };
