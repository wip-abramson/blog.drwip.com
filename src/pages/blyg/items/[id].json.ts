import type { APIRoute, GetStaticPaths } from "astro";
import { blygJson, getBlygItems, type ItemDocument } from "../../../lib/blyg";

/**
 * One canonical item document per id (spec §5). Once published an id answers
 * 200 forever — a withdrawn item serves its empty endcap, never a 404.
 */
export const getStaticPaths = (async () => {
  const items = await getBlygItems();
  return items.map(({ doc }) => ({ params: { id: doc.id }, props: { doc } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => blygJson((props as { doc: ItemDocument }).doc);
