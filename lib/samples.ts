// Sample proof photos for demo mode (judges are at a desk, not at the rental).
// The files are the learner's own photos, cleaned of metadata, in public/samples/.

export interface SamplePhoto {
  file: string;
  caption: string;
  /** Words that suggest which checklist item this photo is for. */
  keywords: RegExp;
}

export const PASS_PHOTOS: SamplePhoto[] = [
  { file: "pass-running.jpg", caption: "Tap running", keywords: /run|flow|turn(ed)? on|working|water (is )?(flowing|running)/i },
  { file: "pass-off.jpg", caption: "Tap off, no drip", keywords: /\boff\b|drip|spout|closed|no (water|leak)/i },
  { file: "pass-under-sink.jpg", caption: "Under the sink", keywords: /under|cabinet|cupboard|supply|pipe|connection|dry|valve/i },
];

export const PROBLEM_PHOTO: SamplePhoto = { file: "problem.jpg", caption: "Blurry, wrong angle", keywords: /$^/ };

/** Also used as proof on the seeded "paid" sample job, so using it again is caught as reuse. */
export const REUSED_PHOTO: SamplePhoto = { file: "seed-tap.jpg", caption: "Photo from an earlier job", keywords: /$^/ };

export const SAMPLE_SETS = {
  pass: "Set A: passes",
  problem: "Set B: one problem photo",
  reused: "Set C: one reused photo",
} as const;
export type SampleSet = keyof typeof SAMPLE_SETS;

const ALL_FILES = new Set([...PASS_PHOTOS, PROBLEM_PHOTO, REUSED_PHOTO].map((p) => p.file));
export const isSampleFile = (file: string) => ALL_FILES.has(file);

/** Picks a sample photo for each checklist item: the best keyword match, then whatever is left. */
export function assignSamples(items: { id: string; text: string }[], set: SampleSet): Record<string, SamplePhoto> {
  const unused = [...PASS_PHOTOS];
  const result: Record<string, SamplePhoto> = {};
  for (const item of items) {
    const i = unused.findIndex((p) => p.keywords.test(item.text));
    result[item.id] = unused.splice(i >= 0 ? i : 0, 1)[0] ?? PASS_PHOTOS[0];
  }
  if (items.length && set === "problem") result[items[0].id] = PROBLEM_PHOTO;
  if (items.length && set === "reused") result[items[0].id] = REUSED_PHOTO;
  return result;
}
