import { getCollection, type CollectionEntry } from "astro:content";

export type Question = CollectionEntry<"questions">;

/**
 * The open questions, most recently asked first.
 *
 * Questions without an `origin.when` keep the order they were written in the
 * YAML file — a batch asked on the same occasion stays in the order it was
 * asked. Drafts (`draft: true`) are hidden in production builds but visible
 * during `astro dev`, mirroring `getPublishedPosts` and `getReflections`.
 */
export async function getQuestions(): Promise<Question[]> {
  const questions = await getCollection("questions", ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });

  // Stable sort: dated questions newest-first, undated ones after, each group
  // otherwise untouched so the authored order survives.
  return questions.sort((a, b) => {
    const aw = a.data.origin?.when ?? "";
    const bw = b.data.origin?.when ?? "";
    if (aw && bw) return bw.localeCompare(aw); // YYYY-MM sorts lexically
    if (aw !== bw) return aw ? -1 : 1;
    return 0;
  });
}

/**
 * How a question names itself in a link: its `short` handle if it has one,
 * else the question itself. Long, but a question truncated mid-clause stops
 * being the question.
 */
export function questionLabel(question: Question): string {
  return question.data.short ?? question.data.question;
}

/** The occasion a question came from: "Global Digital Collaboration, 2025 · July 2025". */
export function originLabel(question: Question): string | undefined {
  const origin = question.data.origin;
  if (!origin) return undefined;

  const when = origin.when ? formatWhen(origin.when) : undefined;
  const parts = [origin.where, when].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/** Format a `YYYY-MM` date as e.g. "July 2025". */
function formatWhen(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
