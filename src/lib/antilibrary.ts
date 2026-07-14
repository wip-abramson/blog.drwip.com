import { getCollection, getEntry, type CollectionEntry } from "astro:content";

export type Antibook = CollectionEntry<"antilibrary">;

/**
 * The antilibrary — books not yet read. Most recently added first; entries
 * without an `added` date fall to the bottom and sort by title.
 */
export async function getAntilibrary(): Promise<Antibook[]> {
  const entries = await getCollection("antilibrary");

  return entries.sort((a, b) => {
    const aa = a.data.added ?? "";
    const ba = b.data.added ?? "";
    if (aa && ba) return ba.localeCompare(aa); // YYYY-MM sorts lexically
    if (aa !== ba) return aa ? -1 : 1; // dated entries before undated
    return a.data.title.localeCompare(b.data.title);
  });
}

/** Provenance: "via Venkatesh Rao · a podcast ↗ — from On Freedom". */
export interface Provenance {
  /** The prose credit ("Venkatesh Rao · a podcast"), already assembled. */
  label: string;
  /** `via.url` — the recommendation itself, out on the web. The label links
   * here when it is set. */
  url?: string;
  /** A thread back into the site: the book or reflection it came from. Shown
   * alongside `url`, never instead of it — the two are different claims. */
  internal?: { href: string; title: string };
}

/**
 * Resolve an entry's `via` into a credit line, the outward link to the
 * recommendation (if any), and the inward link to whatever on this site it
 * came from (if any). Both can be present: a book recommended by name in a
 * podcast episode is credited to the episode *and* threaded back to the
 * podcast's own entry here.
 */
export async function getProvenance(
  entry: Antibook,
): Promise<Provenance | undefined> {
  const via = entry.data.via;
  if (!via) return undefined;

  const parts = [via.who, via.where].filter(Boolean) as string[];

  let internal: Provenance["internal"];
  if (via.book) {
    const book = await getEntry(via.book);
    if (book) internal = { href: `/library/${book.id}/`, title: book.data.title };
  } else if (via.reflection) {
    const reflection = await getEntry(via.reflection);
    if (reflection) {
      internal = {
        href: `/reflections/${reflection.id}/`,
        title: reflection.data.title,
      };
    }
  }

  // With nothing said in prose, let a link speak for itself: name the source
  // it points at rather than dropping the credit entirely.
  if (parts.length === 0) {
    if (internal) parts.push(internal.title);
    else if (via.url) parts.push(new URL(via.url).hostname.replace(/^www\./, ""));
    else return undefined;
  }

  return { label: parts.join(" · "), url: via.url, internal };
}

/**
 * Fisher-Yates, on a copy. The antilibrary has no true order — ranking unread
 * books would smuggle back the reading queue the shelf exists to deny — so the
 * order is shuffled rather than sorted.
 */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Format a `YYYY-MM` date as e.g. "July 2026". */
export function formatAddedDate(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
