import type { APIRoute } from "astro";
import { blygJson, getBlygItems } from "../../../lib/blyg";

/**
 * The archive index (spec §6.2): every item ever published, withdrawn ones
 * included, with no window — the lossless surface a lagging reader rebuilds
 * from when the feed has scrolled past what it missed.
 */
export const GET: APIRoute = async () => {
  const items = await getBlygItems();

  return blygJson({
    updated: items[0].doc.updated,
    items: items.map(({ doc: { id, kind, created, updated, version } }) => ({
      id,
      kind,
      created,
      updated,
      version,
    })),
  });
};
