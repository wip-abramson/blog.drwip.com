/**
 * What each piece of the landscape *is* on the blyg wire — shared by the
 * build (`src/lib/blyg.ts`) and the ledger script (`scripts/blyg-publish.mjs`).
 *
 * Plain JS rather than TS so the script can import it under bare Node. The two
 * sides must agree byte-for-byte on `content_md`, because the build refuses to
 * serve any item whose hash no longer matches the ledger: this module is that
 * agreement, written once.
 */
import { createHash, randomBytes } from "node:crypto";

/** Where the blyg's version history lives, relative to the repo root. */
export const LEDGER_PATH = "src/content/blyg-ledger.json";

/** Fragments SHOULD stay under this many characters (spec §5.3). */
export const FRAGMENT_CAP = 2000;

/** Blyg kind per collection: long-form writing threads, the rest fragments. */
export const KINDS = /** @type {const} */ ({
  posts: "thread",
  reflections: "fragment",
  questions: "fragment",
});

/** @typedef {keyof typeof KINDS} Collection */

/**
 * The markdown each entry publishes as. Titles become a heading so a thread or
 * fragment still reads as itself in a feed reader, which shows no frontmatter.
 */
export const contentMd = {
  /** @param {{ title: string, body: string }} post */
  posts: ({ title, body }) => `# ${title}\n\n${body.trim()}`,

  /**
   * A reflection is a response to someone else's piece, so the link back to
   * it travels with the fragment rather than being left behind on the site.
   * @param {{ title: string, source_url: string, source_title?: string, author?: string, body: string }} reflection
   */
  reflections: ({ title, source_url, source_title, author, body }) => {
    const source = source_title ?? new URL(source_url).hostname.replace(/^www\./, "");
    const by = author ? ` by ${author}` : "";
    return `# ${title}\n\nReflecting on [${source}](${source_url})${by}\n\n${body.trim()}`;
  },

  /**
   * The question verbatim — that wording is the artefact — then what turns on
   * the answer, when that has been written down.
   * @param {{ question: string, why?: string }} question
   */
  questions: ({ question, why }) =>
    why ? `${question.trim()}\n\n${why.trim()}` : question.trim(),
};

/** `"sha256:" + hex(SHA-256(content_md as UTF-8))` (spec §5.2). */
export function contentHash(md) {
  return `sha256:${createHash("sha256").update(md, "utf8").digest("hex")}`;
}

const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";

/** 128 random bits as 26 characters of lowercase Crockford base32 (spec §5.1). */
export function newId() {
  let bits = 0n;
  for (const byte of randomBytes(16)) bits = (bits << 8n) | BigInt(byte);
  let id = "";
  for (let i = 0; i < 26; i++) {
    id = CROCKFORD[Number(bits & 31n)] + id;
    bits >>= 5n;
  }
  return id;
}
