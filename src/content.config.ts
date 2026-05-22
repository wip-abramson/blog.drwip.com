import { defineCollection, z } from "astro:content";
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

export const collections = { posts };
