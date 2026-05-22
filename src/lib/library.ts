import { getCollection, type CollectionEntry } from "astro:content";

export type LibraryEntry = CollectionEntry<"library">;

/**
 * Every library entry as a reading timeline — most recently read first.
 * Entries without a `read` date (anticipated, or not yet dated) sort last.
 */
export async function getLibrary(): Promise<LibraryEntry[]> {
  const entries = await getCollection("library");

  return entries.sort((a, b) => {
    const ar = a.data.read ?? "";
    const br = b.data.read ?? "";
    if (ar && br) return br.localeCompare(ar); // YYYY-MM sorts lexically
    if (ar !== br) return ar ? -1 : 1; // dated entries before undated
    return a.data.title.localeCompare(b.data.title);
  });
}

/** Format a `YYYY-MM` reading date as e.g. "April 2026". */
export function formatReadDate(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
