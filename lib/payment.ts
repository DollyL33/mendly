// Paying Marco: take Linda's held money, then send it to Marco's PayPal.
// Only two callers can start this: the rules (auto-pay) and Linda's "Pay Marco" button.
// Every step is safe to retry: a capture or payout that already happened is never repeated.

import { db } from "./db";
import { money } from "./format";
import { addEvent, setStatus, type Job } from "./jobs";
import { captureAuthorization, createPayout, describePayPalError, getPayoutStatus } from "./paypal";

const FAILED_PAYOUT = new Set(["FAILED", "RETURNED", "REFUNDED", "REVERSED", "BLOCKED", "DENIED"]);

function load(jobId: string) {
  return db().prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as Job;
}

/** Runs capture then payout for a job in "paying". On failure, hands the job to Linda with the reason. */
export async function startPayment(jobId: string, approvedBy: "rules" | "linda"): Promise<void> {
  let job = load(jobId);
  if (job.status !== "paying" || !job.amount_cents) return;

  if (!job.capture_id) {
    try {
      const capture = await captureAuthorization(job.authorization_id!, job.id);
      db().prepare("UPDATE jobs SET capture_id = ? WHERE id = ?").run(capture.captureId, job.id);
      addEvent(job.id, "paypal", "captured", `Took ${money(job.amount_cents)} from the hold on Linda's PayPal.`);
    } catch (err) {
      console.error("capture failed", describePayPalError(err));
      setStatus(job.id, "needs_linda", {
        actor: "paypal", kind: "payment_failed", message: "PayPal couldn't take the held money. Nothing was paid.",
      }, { needs_linda_reason: "PayPal couldn't take the held money. Try Pay Marco again, or cancel." });
      return;
    }
    job = load(jobId);
  }

  if (!job.payout_batch_id) {
    try {
      const payout = await createPayout({
        // The job ID is the payout's unique ID: PayPal refuses a second payout with the same ID,
        // so Marco can never be paid twice for one job.
        senderBatchId: job.id,
        amountCents: job.amount_cents!,
        receiverEmail: process.env.MARCO_PAYPAL_EMAIL!,
        note: `Mendly job #${job.number}: ${job.title}. ${approvedBy === "rules" ? "Verified by Mendly." : "Approved by Linda."}`,
      });
      db().prepare("UPDATE jobs SET payout_batch_id = ?, payout_status = ? WHERE id = ?").run(payout.batchId, payout.batchStatus, job.id);
      addEvent(job.id, "paypal", "payout_sent", `Payout of ${money(job.amount_cents)} sent to Marco's PayPal.`);
    } catch (err) {
      console.error("payout failed", describePayPalError(err));
      setStatus(job.id, "needs_linda", {
        actor: "paypal", kind: "payment_failed",
        message: `Linda's ${money(job.amount_cents)} was taken, but the payout to Marco failed.`,
      }, { needs_linda_reason: "The payout to Marco failed after the money was taken. Press Pay Marco to retry the payout." });
    }
  }
}

/** Asks PayPal how Marco's payout is doing, and marks the job paid when it lands. */
export async function refreshPayout(jobId: string): Promise<Job> {
  const job = load(jobId);
  if (job.status !== "paying" || !job.payout_batch_id) return job;
  try {
    const s = await getPayoutStatus(job.payout_batch_id);
    const status = s.itemStatus ?? s.batchStatus;
    if (status === "SUCCESS") {
      const paidAt = new Date();
      const seconds = job.proof_submitted_at
        ? Math.max(1, Math.round((paidAt.getTime() - new Date(job.proof_submitted_at).getTime()) / 1000))
        : null;
      setStatus(job.id, "paid", {
        actor: "paypal", kind: "paid",
        message: `Paid to Marco, ${money(job.amount_cents)}${seconds ? `, ${seconds} seconds after proof` : ""}.`,
      }, { payout_status: status, paid_at: paidAt.toISOString() });
    } else if (FAILED_PAYOUT.has(status)) {
      setStatus(job.id, "needs_linda", {
        actor: "paypal", kind: "payment_failed", message: `PayPal reported the payout to Marco as ${status}.`,
      }, { payout_status: status, needs_linda_reason: `PayPal reported the payout to Marco as ${status}.` });
    } else if (status !== job.payout_status) {
      db().prepare("UPDATE jobs SET payout_status = ? WHERE id = ?").run(status, job.id);
    }
  } catch (err) {
    console.error("payout status check failed", describePayPalError(err));
  }
  return load(jobId);
}
