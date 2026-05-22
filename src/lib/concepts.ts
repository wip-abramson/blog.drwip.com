import { getPublishedPosts, type Post } from "./posts";
import { getLibrary, type LibraryEntry } from "./library";

/**
 * Concepts are the `tags` shared by posts and library entries, surfaced
 * as browsable pages so a body of related work can accrete over time.
 * The frontmatter field is still called `tags`; "concept" is the
 * reader-facing name, and `#tag` is its inline wayfinding form.
 */
export interface Concept {
  /** Display name, exactly as written in frontmatter, e.g. "identity systems". */
  name: string;
  /** URL-safe form, e.g. "identity-systems". */
  slug: string;
  /** Total items carrying this concept (posts + books). */
  count: number;
  /** Posts carrying this concept, newest first. */
  posts: Post[];
  /** Library entries carrying this concept. */
  books: LibraryEntry[];
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
 * Every concept across all published posts and library entries, sorted
 * by frequency (then name). Posts within each concept stay newest-first.
 */
export async function getAllConcepts(): Promise<Concept[]> {
  const posts = await getPublishedPosts(); // newest first
  const books = await getLibrary();
  const bySlug = new Map<string, Concept>();

  /** Find or create the concept for a raw tag string. */
  const ensure = (raw: string): Concept | undefined => {
    const name = raw.trim();
    if (!name) return undefined;
    const slug = conceptSlug(name);
    if (!slug) return undefined;

    let concept = bySlug.get(slug);
    if (!concept) {
      concept = { name, slug, count: 0, posts: [], books: [] };
      bySlug.set(slug, concept);
    }
    return concept;
  };

  for (const post of posts) {
    for (const raw of post.data.tags) {
      ensure(raw)?.posts.push(post);
    }
  }
  for (const book of books) {
    for (const raw of book.data.tags) {
      ensure(raw)?.books.push(book);
    }
  }

  for (const concept of bySlug.values()) {
    concept.count = concept.posts.length + concept.books.length;
  }

  return [...bySlug.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

/** Look up a single concept by its slug. */
export async function getConcept(slug: string): Promise<Concept | undefined> {
  return (await getAllConcepts()).find((c) => c.slug === slug);
}
