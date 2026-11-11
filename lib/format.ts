// Plain-words labels and money formatting shared by every screen.

import type { JobStatus } from "./jobs";

export function money(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type Tone = "neutral" | "attention" | "ok" | "problem" | "brand";

/** What Linda sees: where her money is and whether she's needed. */
export const lindaStatus: Record<JobStatus, { label: string; tone: Tone }> = {
  reported: { label: "Agent is planning", tone: "neutral" },
  waiting_approval: { label: "Waiting for your approval", tone: "attention" },
  funded: { label: "Held on your PayPal, not charged yet", tone: "brand" },
  inspecting: { label: "Checking Marco's proof", tone: "brand" },
  needs_fix: { label: "Marco is fixing an item", tone: "brand" },
  needs_linda: { label: "Needs your decision", tone: "attention" },
  paying: { label: "Paying Marco", tone: "ok" },
  paid: { label: "Paid to Marco", tone: "ok" },
  declined: { label: "Declined, nothing held", tone: "neutral" },
  cancelled: { label: "Cancelled, hold released", tone: "neutral" },
};

/** What the tenant sees: just progress, ending in "Fixed and verified". */
export const tenantStatus: Record<JobStatus, { label: string; tone: Tone }> = {
  reported: { label: "Received", tone: "neutral" },
  waiting_approval: { label: "Sent to Linda", tone: "neutral" },
  funded: { label: "Approved, handyman booked", tone: "brand" },
  inspecting: { label: "Being fixed", tone: "brand" },
  needs_fix: { label: "Being fixed", tone: "brand" },
  needs_linda: { label: "Being checked", tone: "brand" },
  paying: { label: "Fixed and verified", tone: "ok" },
  paid: { label: "Fixed and verified", tone: "ok" },
  declined: { label: "Not going ahead", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function timeOf(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
