import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"posts">;

/**
 * All published posts, newest first.
 *
 * Drafts (`draft: true`) are hidden in production builds but kept visible
 * during `astro dev` so they can be previewed before publishing.
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection("posts", ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });

  return posts.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}
