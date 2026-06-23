import { getCollection, type CollectionEntry } from "astro:content";

export type Reflection = CollectionEntry<"reflections">;

/**
 * All published reflections, newest first.
 *
 * Mirrors `getPublishedPosts`: drafts (`draft: true`) are hidden in production
 * builds but kept visible during `astro dev` so they can be previewed.
 */
export async function getReflections(): Promise<Reflection[]> {
  const reflections = await getCollection("reflections", ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });

  return reflections.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}

/**
 * A small selection for the homepage: the latest `latest` reflections plus
 * `random` more drawn from the rest. The extra pick is randomised at build
 * time, so it rotates on each deploy. Pure — pass in `getReflections()`.
 * Returns at most `latest + random`, fewer if there aren't enough.
 */
export function pickHomeReflections(
  reflections: Reflection[],
  latest = 2,
  random = 1,
): Reflection[] {
  const head = reflections.slice(0, latest);
  const pool = reflections.slice(latest);
  const extra: Reflection[] = [];
  while (extra.length < random && pool.length > 0) {
    const [picked] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    extra.push(picked);
  }
  return [...head, ...extra];
}

/** The bare hostname of a source URL, e.g. "someone.substack.com". */
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
