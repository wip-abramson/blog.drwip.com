/**
 * JSON-LD structured data builders.
 *
 * The `Person` carries the same `@id` as the one on drwip.com
 * (`https://drwip.com/#person`) so search engines treat both sites as
 * describing one entity. drwip.com is the canonical home of the person.
 */
import { SITE_URL } from "../consts";
import type { Post } from "./posts";

/** Will Abramson — used on the homepage and About page. */
export const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://drwip.com/#person",
  name: "Will Abramson",
  alternateName: "Dr Wip",
  url: "https://drwip.com",
  image: "https://drwip.com/will-abramson.jpg",
  jobTitle: "Senior Engineer",
  description:
    "Researcher and engineer building cryptographic systems for identity, coordination, and trust.",
  knowsAbout: [
    "Decentralized identity",
    "Verifiable credentials",
    "Decentralized identifiers",
    "Cryptography",
    "Trust infrastructure",
    "Privacy",
  ],
  sameAs: [
    "https://drwip.com",
    "https://github.com/wip-abramson",
    "https://www.linkedin.com/in/wip-abramson/",
    "https://scholar.google.com/citations?user=KBU1owsAAAAJ&hl=en",
    "https://www.w3.org/groups/wg/did/",
  ],
};

/** The blog itself. Used on the homepage. */
export const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": `${SITE_URL}/#blog`,
  name: "Dr Wip · Thought Seeds",
  url: SITE_URL,
  description:
    "Unpolished thoughts by Will Abramson (Dr Wip), shared in the open to grow into whatever they become.",
  inLanguage: "en",
  author: { "@id": "https://drwip.com/#person" },
};

/** One `BlogPosting` per post. */
export function blogPostingSchema(post: Post) {
  const url = `${SITE_URL}/posts/${post.id}/`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.data.title,
    description: post.data.description,
    datePublished: post.data.date.toISOString(),
    dateModified: (post.data.updated ?? post.data.date).toISOString(),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: `${SITE_URL}/og-image.png`,
    keywords: post.data.tags.join(", "),
    inLanguage: "en",
    isPartOf: { "@id": `${SITE_URL}/#blog` },
    author: {
      "@type": "Person",
      "@id": "https://drwip.com/#person",
      name: "Will Abramson",
      url: "https://drwip.com",
    },
    publisher: {
      "@type": "Person",
      "@id": "https://drwip.com/#person",
      name: "Will Abramson",
    },
  };
}
