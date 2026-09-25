import type { APIRoute } from "astro";
import { AUTHOR, IDENTITY, LINKS, SITE_TITLE, SITE_URL } from "../../consts";
import { BLYG_ORIGIN, BLYG_VERSION, blygJson, getBlygItems } from "../../lib/blyg";

/** The blyg manifest (spec §6.1) — what a reader resolves the landscape to. */
export const GET: APIRoute = async () => {
  const items = await getBlygItems();

  return blygJson({
    blyg: BLYG_VERSION,
    level: 1,
    generator: "thinking.drwip.com",
    site: BLYG_ORIGIN,
    title: SITE_TITLE,
    author: {
      name: AUTHOR,
      bio: IDENTITY,
      links: [
        { label: "Landscape of Thought", url: SITE_URL },
        { label: "Home", url: LINKS.main },
      ],
    },
    feed: "feed.xml",
    items: "items/index.json",
    updated: items[0].doc.updated,
  });
};
