/**
 * Site-wide constants. Single source of truth for metadata and links.
 */

export const SITE_URL = "https://thinking.drwip.com";

export const SITE_TITLE = "Dr Wip · Landscape of Thought";

export const SITE_DESCRIPTION =
  "A landscape of thought by Will Abramson (Dr Wip) — thought seeds, reflections, and a living library, connected by trails and shared in the open to grow into whatever they become.";

export const AUTHOR = "Will Abramson";

/** Short identity statement used on the homepage. */
export const IDENTITY =
  "Unpolished thoughts, shared in the open to grow into whatever they become.";

/** External links surfaced across the site. */
export const LINKS = {
  main: "https://drwip.com",
  subscribe: "https://www.wordsfromwip.com/s/words-from-dr-wip",
  rss: "/rss.xml",
  blyg: "/blyg/",
} as const;

/**
 * Primary navigation — the terrain itself, and nothing else. Kept to five:
 * a header that lists everything stops being a way in.
 */
export const NAV_LINKS = [
  { href: "/posts", label: "Writing" },
  { href: "/reflections", label: "Thinking about" },
  { href: "/questions", label: "Questions" },
  { href: "/library", label: "Library" },
  { href: "/about", label: "About" },
] as const;

/**
 * Ways through the landscape rather than parts of it — carried in the footer.
 * `/concepts` is reached through the content anyway: every `#tag` on every
 * entry links into it, and each concept page links back to the index.
 */
export const FOOTER_LINKS = [{ href: "/concepts", label: "Concepts" }] as const;
