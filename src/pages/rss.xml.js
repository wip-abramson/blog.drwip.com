import rss from "@astrojs/rss";
import { getPublishedPosts } from "../lib/posts";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";
import { BLYG_NAMESPACE, BLYG_ORIGIN } from "../lib/blyg";

/**
 * RSS 2.0 feed of published posts. An empty `items` array is valid,
 * so the feed builds cleanly even before the first post exists.
 *
 * `<blyg:manifest>` is the upgrade hook: a blyg-aware reader handed this
 * feed resolves it to the full blyg at /blyg/ instead (spec §7).
 */
export async function GET(context) {
  const posts = await getPublishedPosts();

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    xmlns: { blyg: BLYG_NAMESPACE },
    customData: `<blyg:manifest>${BLYG_ORIGIN}blyg.json</blyg:manifest>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}
