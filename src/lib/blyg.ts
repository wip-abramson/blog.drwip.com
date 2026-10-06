import { getCollection } from "astro:content";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import ledgerJson from "../content/blyg-ledger.json";
import { AUTHOR, SITE_URL } from "../consts";
import {
  FRAGMENT_CAP,
  KINDS,
  LEDGER_PATH,
  contentHash,
  contentMd,
} from "./blyg-content.mjs";
import { questionLabel } from "./questions";
import pkg from "../../package.json";

/**
 * The blyg — the landscape served as a Blygger v0.3 Level 2 publication at
 * `/blyg/` (https://blygger.org/spec/0.3/). Posts are threads; reflections and
 * questions are fragments; the library stays off the wire, being records
 * rather than writing.
 *
 * Level 2 asks nothing of a blyg that never quotes, stubs, or forks another
 * origin beyond a `page` per item (spec §5.8). Webmention is optional and
 * needs a server, so a static blyg advertises no endpoint (§15.7).
 *
 * Content is the writing itself; identity and history come from the ledger
 * that `npm run blyg:publish` keeps. This module joins the two and refuses to
 * build when they disagree, so nothing reaches the blyg without a version.
 */

export const BLYG_ORIGIN = `${SITE_URL}/blyg/`;
export const BLYG_VERSION = "0.3";
export const BLYG_LEVEL = 2;
/** Who made the blyg, as `name/version` (spec §3.2) — a census, never a capability. */
export const BLYG_GENERATOR = `thinking.drwip.com/${pkg.version}`;
export const BLYG_GENERATOR_URL = "https://github.com/wip-abramson/blog.drwip.com";
/** Permanent wire token — the `0.1` is spelling, not a version claim. */
export const BLYG_NAMESPACE = "https://blygger.org/ns/0.1";

interface ChangelogEntry {
  version: number;
  at: string;
  note: string | null;
  /** Ledger-only: this version is a withdrawal endcap. */
  withdrawn?: boolean;
}

interface LedgerEntry {
  id: string;
  kind: "thread" | "fragment";
  hash: string;
  changelog: ChangelogEntry[];
}

const ledger = ledgerJson as Record<string, LedgerEntry>;

/** An item document, exactly as served at `items/{id}.json` (spec §5). */
export interface ItemDocument {
  blyg: string;
  id: string;
  kind: "thread" | "fragment" | "withdrawn";
  origin: string;
  /** Origin-relative permalink (spec §5.8); kept through withdrawal. */
  page: string;
  author: { name: string };
  created: string;
  updated: string;
  version: number;
  content_md: string;
  content_html: string;
  content_hash: string;
  media: { url: string; mime: string; alt?: string }[];
  transclusions?: { id: string; version: number }[];
  changelog: Omit<ChangelogEntry, "withdrawn">[];
}

export interface BlygItem {
  doc: ItemDocument;
  /** The ledger's changelog, withdrawal flags intact — the feed needs them. */
  changelog: ChangelogEntry[];
  /** How the item names itself in a feed title. */
  label: string;
  /** Where it lives on the site; a withdrawn item has nowhere. */
  permalink?: string;
}

/** A published entry before it meets the ledger. */
interface Source {
  key: string;
  kind: LedgerEntry["kind"];
  md: string;
  label: string;
  permalink: string;
}

/**
 * Every published entry. Drafts are excluded in dev too — unlike the site's
 * own listings — because a never-published draft must not exist on the blyg,
 * and has no ledger entry to be checked against.
 */
async function getSources(): Promise<Source[]> {
  const notDraft = ({ data }: { data: { draft?: boolean } }) => data.draft !== true;
  const [posts, reflections, questions] = await Promise.all([
    getCollection("posts", notDraft),
    getCollection("reflections", notDraft),
    getCollection("questions", notDraft),
  ]);

  return [
    ...posts.map((post) => ({
      key: `posts/${post.id}`,
      kind: KINDS.posts,
      md: contentMd.posts({ title: post.data.title, body: post.body ?? "" }),
      label: post.data.title,
      permalink: `${SITE_URL}/posts/${post.id}/`,
    })),
    ...reflections.map((reflection) => ({
      key: `reflections/${reflection.id}`,
      kind: KINDS.reflections,
      md: contentMd.reflections({ ...reflection.data, body: reflection.body ?? "" }),
      label: reflection.data.title,
      permalink: `${SITE_URL}/reflections/${reflection.id}/`,
    })),
    ...questions.map((question) => ({
      key: `questions/${question.id}`,
      kind: KINDS.questions,
      md: contentMd.questions(question.data),
      label: questionLabel(question),
      permalink: `${SITE_URL}/questions/#${question.id}`,
    })),
  ];
}

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

/**
 * `content_html` must stand alone (spec §5.2): it travels into feeds and other
 * people's stores with nothing to resolve against, so every URL in it is made
 * absolute against the item's page on the site — footnote anchors included.
 * Images are listed as the item's media; they live under `public/`, so their
 * URLs never change — the immutability the spec asks of media.
 */
function standalone(html: string, base: string) {
  const content_html = html.replace(/\b(src|href)="([^"]*)"/g, (attr, name, url) =>
    /^[a-z][a-z\d+.-]*:/i.test(url) ? attr : `${name}="${new URL(url, base).href}"`,
  );
  const media = [...content_html.matchAll(/<img\b[^>]*>/g)].map(([tag]) => {
    const url = tag.match(/\bsrc="([^"]*)"/)?.[1] ?? "";
    const alt = tag.match(/\balt="([^"]*)"/)?.[1];
    const ext = url.split(".").pop()?.toLowerCase() ?? "";
    return { url, mime: MIME[ext] ?? "application/octet-stream", ...(alt ? { alt } : {}) };
  });
  return { content_html, media };
}

/**
 * The permalink a reader builds links from (spec §5.8), on the reference
 * client's `t/{id}/` and `f/{id}/` convention. It names the id, not the slug,
 * so it stays stable for the life of the item however the site moves; the
 * page itself (`src/pages/blyg/[prefix]/[id].astro`) forwards to the writing.
 */
export const pagePath = (kind: LedgerEntry["kind"], id: string) =>
  `${kind === "thread" ? "t" : "f"}/${id}/`;

/**
 * `![[id]]` and `[[id]]` (spec §10.1) outside code: a grammar this blyg doesn't
 * resolve, so publishing one would put a promise on the wire it can't keep.
 */
function citesItems(md: string) {
  const prose = md.replace(/^(```|~~~)[\s\S]*?^\1/gm, "").replace(/`[^`\n]*`/g, "");
  return /\[\[[0-9a-z]{26}(@v\d+)?\]\]/.test(prose);
}

async function loadItems(): Promise<BlygItem[]> {
  const processor = await createMarkdownProcessor();
  const problems: string[] = [];
  const items: BlygItem[] = [];
  const seen = new Set<string>();

  const document = (
    entry: LedgerEntry,
    kind: ItemDocument["kind"],
    body: Pick<ItemDocument, "content_md" | "content_html" | "media">,
  ): ItemDocument => {
    const latest = entry.changelog.at(-1)!;
    return {
      blyg: BLYG_VERSION,
      id: entry.id,
      kind,
      origin: BLYG_ORIGIN,
      page: pagePath(entry.kind, entry.id),
      author: { name: AUTHOR },
      created: entry.changelog[0].at,
      updated: latest.at,
      version: latest.version,
      ...body,
      content_hash: contentHash(body.content_md),
      // Threads always carry transclusions (spec §10.3) — none yet.
      ...(entry.kind === "thread" ? { transclusions: [] } : {}),
      changelog: entry.changelog.map(({ version, at, note }) => ({ version, at, note })),
    };
  };

  for (const source of await getSources()) {
    seen.add(source.key);
    const entry = ledger[source.key];
    if (!entry) {
      problems.push(`${source.key} has never been published`);
      continue;
    }
    if (entry.changelog.at(-1)!.withdrawn) {
      problems.push(`${source.key} is back after withdrawal, without a new version`);
      continue;
    }
    if (entry.hash !== contentHash(source.md)) {
      problems.push(`${source.key} changed since v${entry.changelog.at(-1)!.version}`);
      continue;
    }
    if (citesItems(source.md)) {
      throw new Error(`${source.key} uses [[id]] or ![[id]], which the blyg can't resolve yet`);
    }
    if (source.kind === "fragment" && source.md.length > FRAGMENT_CAP) {
      console.warn(
        `[blyg] ${source.key} is ${source.md.length} characters; fragments should stay under ${FRAGMENT_CAP}`,
      );
    }

    const { code } = await processor.render(source.md);
    items.push({
      doc: document(entry, source.kind, {
        content_md: source.md,
        ...standalone(code, source.permalink),
      }),
      changelog: entry.changelog,
      label: source.label,
      permalink: source.permalink,
    });
  }

  for (const [key, entry] of Object.entries(ledger)) {
    if (seen.has(key)) continue;
    if (!entry.changelog.at(-1)!.withdrawn) {
      problems.push(`${key} was published but its source is gone`);
      continue;
    }
    // A withdrawal endcap: the item document stays 200 forever, emptied.
    items.push({
      doc: document(entry, "withdrawn", { content_md: "", content_html: "", media: [] }),
      changelog: entry.changelog,
      label: "withdrawn",
    });
  }

  if (problems.length > 0) {
    throw new Error(
      `The blyg ledger (${LEDGER_PATH}) is out of step with the content:\n` +
        problems.map((p) => `  - ${p}`).join("\n") +
        `\nRun \`npm run blyg:publish\` to record these as publish events.`,
    );
  }

  return items.sort((a, b) => b.doc.updated.localeCompare(a.doc.updated));
}

let cached: Promise<BlygItem[]> | undefined;

/** Every item ever published, withdrawn ones included, newest activity first. */
export function getBlygItems(): Promise<BlygItem[]> {
  return (cached ??= loadItems());
}

/** One publish event: a version of an item, as the feed announces it. */
export interface PublishEvent {
  item: BlygItem;
  event: ChangelogEntry;
}

/**
 * The feed's window (spec §7): one entry per publish event, newest first. A
 * withdrawn item contributes only its withdrawal; an item that came back
 * drops its old endcap, which would otherwise render as live content.
 */
export function getPublishEvents(items: BlygItem[], window = 50): PublishEvent[] {
  return items
    .flatMap((item) =>
      item.doc.kind === "withdrawn"
        ? [{ item, event: item.changelog.at(-1)! }]
        : item.changelog.filter((e) => !e.withdrawn).map((event) => ({ item, event })),
    )
    .sort(
      (a, b) =>
        b.event.at.localeCompare(a.event.at) || b.event.version - a.event.version,
    )
    .slice(0, window);
}

/** A JSON response for the blyg's static surfaces. */
export function blygJson(body: unknown): Response {
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
