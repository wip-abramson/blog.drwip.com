import type { APIRoute } from "astro";
import { AUTHOR, SITE_DESCRIPTION, SITE_TITLE } from "../../consts";
import {
  BLYG_NAMESPACE,
  BLYG_ORIGIN,
  getBlygItems,
  getPublishEvents,
} from "../../lib/blyg";

/**
 * The blyg feed (spec §7) — a valid RSS 2.0 feed, but of publish events, not
 * posts: an edit resurfaces as a new entry with a per-version guid, and every
 * entry carries the item's *latest* HTML so no unpinned history leaks out.
 *
 * Hand-written rather than via `@astrojs/rss`, which derives a permalink guid
 * from each link — exactly what per-version guids must not be.
 */
const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const cdata = (html: string) => `<![CDATA[${html.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

/** RSS dates are RFC 822; the `blyg:*` elements keep ISO 8601. */
const rfc822 = (iso: string) => new Date(iso).toUTCString();

export const GET: APIRoute = async () => {
  const items = await getBlygItems();

  const entries = getPublishEvents(items).map(({ item, event }) => {
    const { doc } = item;
    const withdrawn = event.withdrawn === true;
    const title = withdrawn
      ? "withdrawn"
      : event.note
        ? `${event.note} — ${item.label}`
        : item.label;

    return [
      "    <item>",
      `      <guid isPermaLink="false">blyg:${doc.id}:v${event.version}</guid>`,
      item.permalink ? `      <link>${escape(item.permalink)}</link>` : "",
      `      <title>${escape(title)}</title>`,
      `      <description>${withdrawn ? "" : cdata(doc.content_html)}</description>`,
      `      <pubDate>${rfc822(event.at)}</pubDate>`,
      `      <dc:creator>${escape(AUTHOR)}</dc:creator>`,
      `      <blyg:id>${doc.id}</blyg:id>`,
      `      <blyg:kind>${doc.kind}</blyg:kind>`,
      `      <blyg:version>${event.version}</blyg:version>`,
      `      <blyg:created>${doc.created}</blyg:created>`,
      `      <blyg:item>${BLYG_ORIGIN}items/${doc.id}.json</blyg:item>`,
      "    </item>",
    ]
      .filter(Boolean)
      .join("\n");
  });

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:blyg="${BLYG_NAMESPACE}" xmlns:dc="http://purl.org/dc/elements/1.1/">`,
    "  <channel>",
    `    <title>${escape(SITE_TITLE)}</title>`,
    `    <link>${BLYG_ORIGIN}</link>`,
    `    <description>${escape(SITE_DESCRIPTION)}</description>`,
    `    <lastBuildDate>${rfc822(items[0].doc.updated)}</lastBuildDate>`,
    "    <blyg:level>1</blyg:level>",
    `    <blyg:manifest>${BLYG_ORIGIN}blyg.json</blyg:manifest>`,
    ...entries,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
