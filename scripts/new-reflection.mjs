#!/usr/bin/env node
/**
 * Scaffold a new entry in the `reflections` collection.
 *
 *   npm run new:reflection
 *   npm run new:reflection -- https://example.com/the-piece
 *
 * Prompts for the frontmatter that `src/content.config.ts` expects, derives the
 * slug (and therefore the `/reflections#<slug>` deep link) from the title, and
 * writes the file. Existing tags across posts and reflections are shown before
 * the tag prompt because tags are the only input to the `/concepts` map —
 * a near-miss spelling silently forks a concept page.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFLECTIONS_DIR = path.join(ROOT, "src/content/reflections");
const TAG_SOURCES = ["src/content/posts", "src/content/reflections"];

/** Collect the tags already in use so the prompt can warn on new spellings. */
async function existingTags() {
  const tags = new Set();
  for (const dir of TAG_SOURCES) {
    const entries = await readdir(path.join(ROOT, dir), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !/\.mdx?$/.test(entry.name)) continue;
      const body = await readFile(path.join(ROOT, dir, entry.name), "utf8");
      const line = body.split(/^---$/m)[1]?.match(/^tags:\s*(\[.*\])\s*$/m);
      if (!line) continue;
      try {
        for (const tag of JSON.parse(line[1])) tags.add(tag);
      } catch {
        // A hand-edited tags line we can't parse — not worth failing over.
      }
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

/**
 * Best-effort fetch of the source page's <title>, used only as a default the
 * user can overwrite. Networks fail; that must never block the scaffold.
 */
async function fetchSourceTitle(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return "";
    const title = (await res.text()).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!title) return "";
    return title[1]
      .replace(/\s+/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " ")
      .trim();
  } catch {
    return "";
  }
}

const slugify = (title) =>
  title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** YAML double-quoted scalar — the style every existing reflection uses. */
const quote = (value) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  // Iterate lines rather than calling `rl.question`: readline buffers lines for
  // the iterator, so a redirected stdin that reaches EOF while we're awaiting
  // the source-title fetch still answers the prompts that follow.
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (question, fallback = "") => {
    const suffix = fallback ? ` (${fallback})` : "";
    stdout.write(`${question}${suffix}: `);
    const { value, done } = await lines.next();
    if (done) throw new Error("Input ended before the reflection was complete.");
    return value.trim() || fallback;
  };

  try {
    const [urlArg] = process.argv.slice(2);

    let sourceUrl = urlArg ?? "";
    while (!URL.canParse(sourceUrl)) {
      if (sourceUrl) console.log("  ↳ that isn't a valid URL");
      sourceUrl = await ask("Source URL");
    }

    const fetched = await fetchSourceTitle(sourceUrl);
    const sourceTitle = await ask("Source title", fetched);
    const author = await ask("Source author");
    const site = await ask("Publication / site");

    let title = "";
    while (!title) title = await ask("Your reflection's title");

    let slug = await ask("Slug", slugify(title));
    while (existsSync(path.join(REFLECTIONS_DIR, `${slug}.md`))) {
      console.log(`  ↳ src/content/reflections/${slug}.md already exists`);
      slug = await ask("Slug");
    }

    const date = await ask("Date", today());

    const known = await existingTags();
    console.log(`\nExisting tags: ${known.join(", ")}\n`);
    const tags = (await ask("Tags (comma separated)"))
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const novel = tags.filter((tag) => !known.includes(tag));
    if (novel.length) {
      console.log(`\nNew concept${novel.length > 1 ? "s" : ""}: ${novel.join(", ")}`);
      const near = novel.flatMap((tag) =>
        known
          .filter((k) => k.toLowerCase() === tag.toLowerCase())
          .map((k) => `  ${tag} → did you mean "${k}"?`),
      );
      if (near.length) console.log(near.join("\n"));
      const ok = await ask("Create them? [y/N]", "n");
      if (!/^y/i.test(ok)) {
        console.log("Aborted — rerun and match the existing spelling.");
        return;
      }
    }

    const draft = /^y/i.test(await ask("Draft? [y/N]", "n"));

    const frontmatter = [
      "---",
      `title: ${quote(title)}`,
      `source_url: ${quote(sourceUrl)}`,
      ...(sourceTitle ? [`source_title: ${quote(sourceTitle)}`] : []),
      ...(author ? [`author: ${quote(author)}`] : []),
      ...(site ? [`site: ${quote(site)}`] : []),
      `date: ${date}`,
      `tags: [${tags.map(quote).join(", ")}]`,
      `draft: ${draft}`,
      "---",
      "",
      "",
    ].join("\n");

    const file = path.join(REFLECTIONS_DIR, `${slug}.md`);
    await writeFile(file, frontmatter, { flag: "wx" });
    console.log(`\nWrote ${path.relative(ROOT, file)}`);
    console.log(`Reads at /reflections#${slug} — \`npm run dev\` to see it.`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
