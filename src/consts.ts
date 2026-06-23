/**
 * Site-wide constants. Single source of truth for metadata and links.
 */

export const SITE_URL = "https://thinking.drwip.com";

export const SITE_TITLE = "Dr Wip · Thought Seeds";

export const SITE_DESCRIPTION =
  "Thought seeds by Will Abramson (Dr Wip) — unpolished thoughts, shared in the open to grow into whatever they become.";

export const AUTHOR = "Will Abramson";

/** Short identity statement used on the homepage. */
export const IDENTITY =
  "Unpolished thoughts, shared in the open to grow into whatever they become.";

/** External links surfaced across the site. */
export const LINKS = {
  main: "https://drwip.com",
  subscribe: "https://www.wordsfromwip.com/s/words-from-dr-wip",
  rss: "/rss.xml",
} as const;

/** Primary navigation. */
export const NAV_LINKS = [
  { href: "/posts", label: "Writing" },
  { href: "/reflections", label: "Thinking about" },
  { href: "/concepts", label: "Concepts" },
  { href: "/library", label: "Library" },
  { href: "/about", label: "About" },
] as const;
