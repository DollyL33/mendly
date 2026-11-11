// What Marco sees. He only sees jobs once Linda has approved and the money is held.

import type { Tone } from "./format";
import type { JobStatus } from "./jobs";

export const MARCO_VISIBLE = new Set<JobStatus>([
  "funded",
  "inspecting",
  "needs_fix",
  "needs_linda",
  "paying",
  "paid",
  "cancelled",
]);

export const marcoStatus: Record<JobStatus, { label: string; tone: Tone }> = {
  reported: { label: "Not approved yet", tone: "neutral" },
  waiting_approval: { label: "Not approved yet", tone: "neutral" },
  funded: { label: "Money is held for this job", tone: "brand" },
  inspecting: { label: "Checking your photos", tone: "brand" },
  needs_fix: { label: "Retake a photo", tone: "attention" },
  needs_linda: { label: "Linda is reviewing", tone: "attention" },
  paying: { label: "Payment on its way", tone: "ok" },
  paid: { label: "Paid", tone: "ok" },
  declined: { label: "Declined", tone: "neutral" },
  cancelled: { label: "Cancelled by Linda", tone: "neutral" },
};
