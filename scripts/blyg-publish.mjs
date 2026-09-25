#!/usr/bin/env node
/**
 * Record publish events in the blyg ledger.
 *
 *   npm run blyg:publish
 *
 * The blyg (served at /blyg/, see `src/lib/blyg.ts`) needs three things the
 * content itself doesn't carry: a permanent random id per item, a version
 * number that rises by exactly one per publish, and a changelog of when each
 * version went out. They live in `src/content/blyg-ledger.json`, and this
 * script is the only thing that should write it.
 *
 * It compares every published post, reflection and question against the
 * ledger's last recorded hash and:
 *   - gives a new item an id and v1, dated when the thinking was first
 *     published (a post's or reflection's `date`; a question's first commit);
 *   - bumps the version of anything whose text changed, asking for a note;
 *   - brings a withdrawn item back as a new version if its source reappears;
 *   - asks before withdrawing an item whose source has gone. Published items
 *     are never deleted — the protocol's only exit is a withdrawal endcap.
 *
 * The build fails if content changes without passing through here, because a
 * change without a version bump is what the spec calls a stealth edit.
 */
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import {
  FRAGMENT_CAP,
  KINDS,
  LEDGER_PATH,
  contentHash,
  contentMd,
  newId,
} from "../src/lib/blyg-content.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUESTIONS_FILE = "src/content/questions.yaml";

/** ISO 8601 UTC to the second, the form every protocol timestamp takes. */
const iso = (date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * Every published entry as `{ key, kind, md, firstAt }`. Drafts are skipped:
 * a never-published draft must stay invisible to the blyg.
 */
async function publishedSources() {
  const sources = [];

  for (const collection of ["posts", "reflections"]) {
    const dir = path.join(ROOT, "src/content", collection);
    for (const name of await readdir(dir)) {
      if (!/\.mdx?$/.test(name)) continue;
      const file = await readFile(path.join(dir, name), "utf8");
      const { frontmatter, content } = parseFrontmatter(file, { frontmatter: "remove" });
      if (frontmatter.draft === true) continue;
      sources.push({
        key: `${collection}/${name.replace(/\.mdx?$/, "")}`,
        kind: KINDS[collection],
        md: contentMd[collection]({ ...frontmatter, body: content }),
        firstAt: () => iso(new Date(frontmatter.date)),
      });
    }
  }

  const questions = yaml.load(await readFile(path.join(ROOT, QUESTIONS_FILE), "utf8"));
  for (const question of questions) {
    if (question.draft === true) continue;
    sources.push({
      key: `questions/${question.id}`,
      kind: KINDS.questions,
      md: contentMd.questions(question),
      firstAt: () => questionFirstCommitted(question.id),
    });
  }

  return sources;
}

/** When a question first appeared in git history, or now if it's uncommitted. */
function questionFirstCommitted(id) {
  const log = execFileSync(
    "git",
    ["log", "--reverse", "--format=%aI", `-S- id: ${id}`, "--", QUESTIONS_FILE],
    { cwd: ROOT, encoding: "utf8" },
  );
  const first = log.split("\n")[0];
  return iso(first ? new Date(first) : new Date());
}

async function main() {
  const ledgerFile = path.join(ROOT, LEDGER_PATH);
  const ledger = existsSync(ledgerFile)
    ? JSON.parse(await readFile(ledgerFile, "utf8"))
    : {};
  const sources = await publishedSources();
  const now = iso(new Date());

  // Lines are read through a buffered iterator rather than `rl.question`,
  // which drops answers that arrive before their prompt (piped input).
  let rl, lines;
  const ask = async (prompt) => {
    stdout.write(prompt);
    rl ??= createInterface({ input: stdin });
    lines ??= rl[Symbol.asyncIterator]();
    const { value = "" } = await lines.next();
    return value.trim();
  };
  const bump = (entry, fields) => {
    const version = entry.changelog.at(-1).version + 1;
    entry.changelog.push({ version, at: now, ...fields });
    return version;
  };

  const report = [];
  const seen = new Set();

  for (const { key, kind, md, firstAt } of sources) {
    seen.add(key);
    const hash = contentHash(md);
    const entry = ledger[key];

    if (!entry) {
      const at = firstAt();
      ledger[key] = { id: newId(), kind, hash, changelog: [{ version: 1, at, note: null }] };
      report.push(`  new       ${key} → v1 (${at})`);
    } else if (entry.changelog.at(-1).withdrawn) {
      const note = (await ask(`${key} is back after withdrawal. Note (enter to skip): `)) || null;
      entry.hash = hash;
      report.push(`  returned  ${key} → v${bump(entry, { note })}`);
    } else if (entry.hash !== hash) {
      const note = (await ask(`${key} changed. Note (enter to skip): `)) || null;
      entry.hash = hash;
      report.push(`  changed   ${key} → v${bump(entry, { note })}`);
    } else {
      continue;
    }

    if (kind === "fragment" && md.length > FRAGMENT_CAP) {
      report.push(`  ⚠ ${key} is ${md.length} characters; fragments should stay under ${FRAGMENT_CAP}`);
    }
  }

  for (const [key, entry] of Object.entries(ledger)) {
    if (seen.has(key) || entry.changelog.at(-1).withdrawn) continue;
    const answer = await ask(
      `${key} was published but its source is gone (deleted, renamed, or back to draft).\n` +
        `Withdraw it? This publishes a permanent endcap. [y/N] `,
    );
    if (answer.toLowerCase() !== "y") {
      rl?.close();
      console.error(
        `\nNothing written. Restore ${key}, or if it was renamed, rename its key in ${LEDGER_PATH} by hand.`,
      );
      process.exit(1);
    }
    const note = (await ask("Withdrawal note (enter to skip): ")) || null;
    entry.hash = contentHash("");
    report.push(`  withdrawn ${key} → v${bump(entry, { note, withdrawn: true })}`);
  }

  rl?.close();

  if (report.length === 0) {
    console.log("Nothing to publish — the ledger matches the content.");
    return;
  }

  const sorted = Object.fromEntries(
    Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(ledgerFile, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Recorded in ${LEDGER_PATH}:\n${report.join("\n")}`);
}

await main();
