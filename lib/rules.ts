// Payment rules. Pure code, no AI: the AI gives verdicts, these rules decide what happens.
// This is the only place an automatic payment can start.

import { money } from "./format";

export interface RuleInput {
  /** Latest verdict for every checklist item (after this submission). */
  verdicts: ("pass" | "fail")[];
  /** How many times this job has already gone back to Marco for a fix. */
  previousFailures: number;
  amountCents: number;
  limitCents: number;
  /** False if the AI check couldn't run, was refused, or returned something unusable. */
  aiSucceeded: boolean;
}

export type RuleDecision =
  | { action: "pay"; reason: string }
  | { action: "needs_fix"; reason: string }
  | { action: "needs_linda"; reason: string };

export function decide(input: RuleInput): RuleDecision {
  if (!input.aiSucceeded) {
    return { action: "needs_linda", reason: "The AI check couldn't run, so nothing was paid automatically." };
  }
  const failed = input.verdicts.filter((v) => v === "fail").length;
  if (failed > 0 && input.previousFailures >= 1) {
    return { action: "needs_linda", reason: `Proof failed a second time (${failed} item${failed > 1 ? "s" : ""}).` };
  }
  if (failed > 0) {
    return { action: "needs_fix", reason: `${failed} item${failed > 1 ? "s" : ""} need${failed > 1 ? "" : "s"} a new photo.` };
  }
  if (input.amountCents > input.limitCents) {
    return {
      action: "needs_linda",
      reason: `Every photo verified, but ${money(input.amountCents)} is over your ${money(input.limitCents)} auto-pay limit.`,
    };
  }
  return {
    action: "pay",
    reason: `Every photo verified and ${money(input.amountCents)} is within the ${money(input.limitCents)} auto-pay limit.`,
  };
}
