// Linda approved in PayPal: place the hold. The job is now funded; nothing is charged yet.

import { NextResponse } from "next/server";
import { currentDemo } from "@/lib/demo";
import { money } from "@/lib/format";
import { getJob, setStatus } from "@/lib/jobs";
import { authorizeOrder, describePayPalError } from "@/lib/paypal";

export async function POST(request: Request, ctx: RouteContext<"/api/jobs/[id]/paypal/approve">) {
  const { id } = await ctx.params;
  const demo = await currentDemo();
  const job = getJob(id, demo.id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const { orderId } = ((await request.json().catch(() => ({}))) ?? {}) as { orderId?: string };
  if (job.status === "funded" && job.authorization_id) return NextResponse.json({ ok: true }); // already done
  if (job.status !== "waiting_approval") {
    return NextResponse.json({ error: "This job isn't waiting for approval." }, { status: 409 });
  }
  if (!orderId || orderId !== job.paypal_order_id) {
    return NextResponse.json({ error: "That PayPal order doesn't belong to this job." }, { status: 400 });
  }

  try {
    const auth = await authorizeOrder(orderId);
    setStatus(
      job.id,
      "funded",
      {
        actor: "paypal",
        kind: "funded",
        message: `Linda approved in PayPal. ${money(job.amount_cents)} held on her PayPal, not charged yet.`,
      },
      { authorization_id: auth.authorizationId },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = describePayPalError(err);
    console.error("authorizeOrder failed", detail);
    // The payment method itself was declined: Linda can approve again with a different one.
    if (detail.includes("INSTRUMENT_DECLINED")) {
      return NextResponse.json(
        {
          error:
            "PayPal declined that payment method. Nothing was charged. Click the PayPal button again and choose a different card or bank account.",
        },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: "PayPal couldn't place the hold. Nothing was charged. Try approving again." },
      { status: 502 },
    );
  }
}
