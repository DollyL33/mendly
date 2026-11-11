// Linda clicked the PayPal button: create an order that will HOLD the job amount.

import { NextResponse } from "next/server";
import { currentDemo } from "@/lib/demo";
import { getJob } from "@/lib/jobs";
import { db } from "@/lib/db";
import { createAuthorizeOrder, describePayPalError } from "@/lib/paypal";

export async function POST(_request: Request, ctx: RouteContext<"/api/jobs/[id]/paypal/order">) {
  const { id } = await ctx.params;
  const demo = await currentDemo();
  const job = getJob(id, demo.id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (job.is_sample) return NextResponse.json({ error: "Sample jobs don't use PayPal." }, { status: 409 });
  if (job.status !== "waiting_approval" || !job.amount_cents) {
    return NextResponse.json({ error: "This job isn't waiting for approval." }, { status: 409 });
  }

  try {
    const order = await createAuthorizeOrder({
      amountCents: job.amount_cents,
      jobId: job.id,
      description: `Mendly job #${job.number}: ${job.title}`,
    });
    db().prepare("UPDATE jobs SET paypal_order_id = ? WHERE id = ?").run(order.orderId, job.id);
    return NextResponse.json({ orderId: order.orderId });
  } catch (err) {
    console.error("createAuthorizeOrder failed", describePayPalError(err));
    return NextResponse.json({ error: "PayPal couldn't start the payment. Try again." }, { status: 502 });
  }
}
