// Linda's decisions: decline a plan, pay Marco, or cancel the job and release the hold.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentDemo } from "@/lib/demo";
import { money } from "@/lib/format";
import { getJob, setStatus } from "@/lib/jobs";
import { startPayment } from "@/lib/payment";
import { describePayPalError, voidAuthorization } from "@/lib/paypal";

export const maxDuration = 60;

export async function POST(request: Request, ctx: RouteContext<"/api/jobs/[id]/decision">) {
  const { id } = await ctx.params;
  const demo = await currentDemo();
  const job = getJob(id, demo.id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (job.is_sample) return NextResponse.json({ error: "Sample jobs are read-only. Try the live jobs." }, { status: 409 });

  const { action } = ((await request.json().catch(() => ({}))) ?? {}) as { action?: string };

  if (action === "decline") {
    if (job.status !== "waiting_approval" && job.status !== "reported") {
      return NextResponse.json({ error: "Only a job waiting for approval can be declined." }, { status: 409 });
    }
    setStatus(job.id, "declined", { actor: "linda", kind: "declined", message: "Linda declined the job. Nothing was held." });
    return NextResponse.json({ ok: true });
  }

  if (action === "pay") {
    // Claim the job first so a double-click can't start two payments.
    const claimed = db().prepare("UPDATE jobs SET status = 'paying' WHERE id = ? AND status = 'needs_linda'").run(job.id);
    if (claimed.changes !== 1) return NextResponse.json({ error: "This job isn't waiting for your decision." }, { status: 409 });
    setStatus(job.id, "paying", { actor: "linda", kind: "linda_paid", message: `Linda chose to pay Marco ${money(job.amount_cents)}.` });
    await startPayment(job.id, "linda");
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    if (!["needs_linda", "funded", "needs_fix"].includes(job.status) || job.capture_id) {
      return NextResponse.json({ error: "This job can't be cancelled now." }, { status: 409 });
    }
    try {
      if (job.authorization_id) await voidAuthorization(job.authorization_id);
    } catch (err) {
      console.error("void failed", describePayPalError(err));
      return NextResponse.json({ error: "PayPal couldn't release the hold. Try again." }, { status: 502 });
    }
    setStatus(job.id, "cancelled", {
      actor: "linda", kind: "cancelled",
      message: `Linda cancelled the job. The ${money(job.amount_cents)} hold was released; she wasn't charged.`,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown decision." }, { status: 400 });
}
