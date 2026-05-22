import { getPublishedPosts, type Post } from "./posts";

/**
 * Concepts are the `tags` on each post, surfaced as browsable pages so a
 * body of related notes can accrete over time. The frontmatter field is
 * still called `tags`; "concept" is the reader-facing name, and `#tag` is
 * its inline wayfinding form.
 */
export interface Concept {
  /** Display name, exactly as written in frontmatter, e.g. "identity systems". */
  name: string;
  /** URL-safe form, e.g. "identity-systems". */
  slug: string;
  /** Number of published posts carrying this concept. */
  count: number;
  /** Those posts, newest first. */
  posts: Post[];
}

/** Turn a concept name into a URL-safe slug. */
export function conceptSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Capitalise a concept name for display, e.g. "identity systems" -> "Identity Systems". */
export function conceptTitle(name: string): string {
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Every concept across all published posts, sorted by frequency (then name).
 * Posts within each concept stay newest-first.
 */
export async function getAllConcepts(): Promise<Concept[]> {
  const posts = await getPublishedPosts(); // newest first
  const bySlug = new Map<string, Concept>();

  for (const post of posts) {
    for (const raw of post.data.tags) {
      const name = raw.trim();
      if (!name) continue;
      const slug = conceptSlug(name);
      if (!slug) continue;

      let concept = bySlug.get(slug);
      if (!concept) {
        concept = { name, slug, count: 0, posts: [] };
        bySlug.set(slug, concept);
      }
      concept.count += 1;
      concept.posts.push(post);
    }
  }

  return [...bySlug.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

/** Look up a single concept by its slug. */
export async function getConcept(slug: string): Promise<Concept | undefined> {
  return (await getAllConcepts()).find((c) => c.slug === slug);
}
