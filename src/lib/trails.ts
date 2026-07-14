import { getCollection, getEntry, type CollectionEntry } from "astro:content";

/**
 * Trails — the site's one edge primitive, resolved.
 *
 * Every collection carries a `trails` array in its schema (see
 * `content.config.ts`). This module turns those references into links, in both
 * directions: `getTrails` walks *out* of an entry, `getTrailheads` finds every
 * entry anywhere on the site whose trails point *in* at it. Nobody authors a
 * link twice — the return path is derived.
 *
 * Later: the strength of a trail could be a function of how often it is walked
 * (playhtml.fun), which is why an edge is a first-class record here rather than
 * an inline link in prose.
 */

/** The four collections a trail can start from or point at. */
export type TrailCollection =
  | "posts"
  | "reflections"
  | "library"
  | "antilibrary";

export type TrailEntry =
  | CollectionEntry<"posts">
  | CollectionEntry<"reflections">
  | CollectionEntry<"library">
  | CollectionEntry<"antilibrary">;

/** How each part of the landscape names itself on a trail. */
const KIND_LABEL: Record<TrailCollection, string> = {
  posts: "Writing",
  reflections: "Thinking about",
  library: "Library",
  antilibrary: "Antilibrary",
};

/** One end of a trail: somewhere on this site, with a name and a way there. */
export interface TrailPlace {
  collection: TrailCollection;
  id: string;
  title: string;
  href: string;
  /** "Writing", "Thinking about", … — unless the trail relabels it. */
  kind: string;
}

/** A resolved, walkable edge. */
export interface Trail extends Omit<TrailPlace, "collection" | "id"> {
  collection?: TrailCollection;
  id?: string;
  /** What the connection is, in Dr Wip's words. */
  note?: string;
  /** True when the trail leaves the site — a one-way edge, by nature. */
  external?: boolean;
}

/** Where an entry lives and what it's called. */
export function trailPlace(
  collection: TrailCollection,
  entry: TrailEntry,
): TrailPlace {
  const href =
    collection === "posts"
      ? `/posts/${entry.id}/`
      : collection === "reflections"
        ? `/reflections/${entry.id}/`
        : collection === "library"
          ? `/library/${entry.id}/`
          : `/library/antilibrary/#${entry.id}`;

  return {
    collection,
    id: entry.id,
    title: entry.data.title,
    href,
    kind: KIND_LABEL[collection],
  };
}

/** A draft post is not part of the landscape in production. */
function isHidden(collection: TrailCollection, entry: TrailEntry): boolean {
  if (!import.meta.env.PROD) return false;
  return (
    (collection === "posts" || collection === "reflections") &&
    (entry.data as { draft?: boolean }).draft === true
  );
}

/** The destination named by one raw trail, whichever field carries it. */
function destinationOf(
  trail: TrailEntry["data"]["trails"][number],
): { collection: TrailCollection; id: string } | undefined {
  if (trail.post) return { collection: "posts", id: trail.post.id };
  if (trail.reflection)
    return { collection: "reflections", id: trail.reflection.id };
  if (trail.book) return { collection: "library", id: trail.book.id };
  if (trail.antibook)
    return { collection: "antilibrary", id: trail.antibook.id };
  return undefined; // unreachable — the schema requires exactly one
}

/** Every trail *out* of an entry, resolved to links. Drafts drop out in prod. */
export async function getTrails(entry: TrailEntry): Promise<Trail[]> {
  const resolved: Trail[] = [];

  for (const trail of entry.data.trails) {
    // Off-site: nothing to resolve, and nothing that can ever link back.
    if (trail.external) {
      resolved.push({
        title: trail.external.title,
        href: trail.external.url,
        kind: trail.rel ?? "Elsewhere",
        note: trail.note,
        external: true,
      });
      continue;
    }

    const dest = destinationOf(trail);
    if (!dest) continue;

    const target = await getEntry(dest.collection, dest.id);
    if (!target || isHidden(dest.collection, target)) continue;

    const place = trailPlace(dest.collection, target);
    resolved.push({
      ...place,
      kind: trail.rel ?? place.kind,
      note: trail.note,
    });
  }

  return resolved;
}

/**
 * The return path: every entry, anywhere on the site, whose trails point at
 * this one. Walking a trail backwards costs nothing to author — which is what
 * makes the landscape a landscape and not a set of one-way lists.
 */
export async function getTrailheads(
  collection: TrailCollection,
  id: string,
): Promise<Trail[]> {
  const sources: [TrailCollection, TrailEntry[]][] = [
    ["posts", await getCollection("posts")],
    ["reflections", await getCollection("reflections")],
    ["library", await getCollection("library")],
    ["antilibrary", await getCollection("antilibrary")],
  ];

  const trailheads: Trail[] = [];

  for (const [sourceCollection, entries] of sources) {
    for (const entry of entries) {
      if (isHidden(sourceCollection, entry)) continue;
      // Don't let an entry point at itself and appear in its own return path.
      if (sourceCollection === collection && entry.id === id) continue;

      for (const trail of entry.data.trails) {
        const dest = destinationOf(trail);
        if (dest?.collection !== collection || dest.id !== id) continue;

        const place = trailPlace(sourceCollection, entry);
        trailheads.push({
          ...place,
          kind: trail.rel ?? place.kind,
          note: trail.note,
        });
        break; // one entry, one appearance, even if it points here twice
      }
    }
  }

  return trailheads;
}
