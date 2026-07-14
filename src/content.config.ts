import { defineCollection, z, reference } from "astro:content";
import { glob, file } from "astro/loaders";

/**
 * Trails — the site's one edge primitive.
 *
 * Every collection carries `trails`, so any piece of the landscape can be
 * connected to any other: a post to the reflection it argues with, a book to
 * the writing it seeded, an unread book to the post it would complicate. A
 * trail names exactly one destination and is walkable in both directions —
 * the destination page grows a "Trails here" section in return, without
 * anyone having to author the link twice.
 *
 * A fifth destination, `external`, points out of the site entirely — writing
 * of Dr Wip's that lives elsewhere, an essay worth standing beside. It lacks
 * *reciprocity*: nothing out there can link back, so it never appears in
 * anyone's "Trails here". It does not lack *traversal* — the click happens on
 * this side, so an external trail can still thicken with use like any other.
 * Only trails carry external destinations. `via` (provenance), `source_url`
 * (a reflection's subject) and `library.link` (where a work lives) are not
 * edges — they are history, subject, and locator — and stay as they are.
 *
 * `note` is where the connection actually lives: not *that* two things are
 * related but *how*. `rel` relabels the edge when the destination's own name
 * ("Writing", "Library") is less true than a phrase of your own ("grew from
 * this"). Both optional; a bare trail is still an edge.
 */
const trail = z
  .object({
    post: reference("posts").optional(),
    reflection: reference("reflections").optional(),
    book: reference("library").optional(),
    antibook: reference("antilibrary").optional(),
    /** Somewhere off-site. Needs its own title — nothing here knows its name. */
    external: z
      .object({
        url: z.string().url(),
        title: z.string(),
      })
      .optional(),
    /** What the connection is, in your words. */
    note: z.string().optional(),
    /** Overrides the destination's kind label on both ends of the trail. */
    rel: z.string().optional(),
  })
  .refine(
    (t) =>
      [t.post, t.reflection, t.book, t.antibook, t.external].filter(Boolean)
        .length === 1,
    {
      message:
        "each trail needs exactly one destination: post, reflection, book, antibook, or external",
    },
  );

/** `trails` as it appears on every collection. */
const trails = () => z.array(trail).default([]);

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

    /** Edges out of this post — see `trail` above. Replaces the old
     * `reflections` field: a reflection is now just one kind of destination. */
    trails: trails(),
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
      /** Edges out of this book — see `trail` above. Replaces the old `seeded`
       * field: heritage is a trail with `rel: grew from this`. */
      trails: trails(),
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
 * The `antilibrary` collection — books not yet read.
 *
 * The inverse of the library: no annotations, no evidence of encounter, just
 * the pull. Each entry records where the recommendation came from (`via`) and
 * why it caught (`why`), and carries `tags` so an unread book takes its place
 * on the `/concepts` map beside the writing it might one day feed. Entries are
 * a single YAML list — adding a book should cost one block of text, not a
 * folder — and each is addressable at `/library/antilibrary#<id>`.
 *
 * When a book is actually read it graduates: remove it here, give it a folder
 * in `library/<slug>/`.
 */
const antilibrary = defineCollection({
  loader: file("./src/content/library/antilibrary.yaml"),
  schema: z.object({
    // --- required -------------------------------------------------------
    title: z.string(),
    author: z.string(),

    // --- everything else: absent beats guessed ---------------------------

    // --- placement ------------------------------------------------------
    type: z.string().default("book"),
    /** wanted — merely coveted; owned — on the shelf, reproaching you;
     * started — opened, set down, still unread. */
    status: z.enum(["wanted", "owned", "started"]).default("wanted"),
    /** When it joined the antilibrary (YYYY-MM) — the shelf's only timeline. */
    added: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "added must be YYYY-MM")
      .optional(),
    published: z.number().optional(),
    link: z.string().url().optional(), // the work, elsewhere
    tags: z.array(z.string()).default([]),

    // --- the record -----------------------------------------------------
    /** Where the recommendation came from — the thread back to the world. */
    via: z
      .object({
        /** Who pointed at it. */
        who: z.string().optional(),
        /** The occasion, in your own words: a podcast, a footnote, a pub. */
        where: z.string().optional(),
        /** The recommendation itself, if it lives somewhere linkable. */
        url: z.string().url().optional(),
        /** If it came from a book already on the shelf, link it. */
        book: reference("library").optional(),
        /** If it came from a piece you reflected on, link that. */
        reflection: reference("reflections").optional(),
      })
      .optional(),
    /** One line: why it pulls at you — the reason it's here and not forgotten. */
    why: z.string().optional(),

    /** Edges out of this book — see `trail` above. Where `via` is provenance
     * (where the book came from), a trail is a claim about where it belongs. */
    trails: trails(),
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
    // --- the reflection ------------------------------------------------
    /** The reflection's own title (Dr Wip's), not the source piece's. */
    title: z.string(),

    // --- the piece being reflected on ----------------------------------
    /** The piece itself — required; what the reflection links back to. */
    source_url: z.string().url(),
    /** Title of the source piece. Rendered as "Reflecting on <source_title>";
     * falls back to the URL host if omitted. */
    source_title: z.string().optional(),
    /** Who wrote the source piece. */
    author: z.string().optional(),
    /** Publication / Substack name. Shown after the author if present. */
    site: z.string().optional(),

    // --- placement ------------------------------------------------------
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),

    /** Edges out of this reflection — see `trail` above. */
    trails: trails(),
  }),
});

export const collections = { posts, library, antilibrary, reflections };
