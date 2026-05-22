import rss from "@astrojs/rss";
import { getPublishedPosts } from "../lib/posts";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

/**
 * RSS 2.0 feed of published posts. An empty `items` array is valid,
 * so the feed builds cleanly even before the first post exists.
 */
export async function GET(context) {
  const posts = await getPublishedPosts();

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}
