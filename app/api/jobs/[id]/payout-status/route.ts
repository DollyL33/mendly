// Marco's panel asks this every few seconds while a payment is on its way.

import { NextResponse } from "next/server";
import { currentDemo } from "@/lib/demo";
import { getJob } from "@/lib/jobs";
import { refreshPayout } from "@/lib/payment";

export async function GET(_request: Request, ctx: RouteContext<"/api/jobs/[id]/payout-status">) {
  const { id } = await ctx.params;
  const demo = await currentDemo();
  const job = getJob(id, demo.id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const latest = job.is_sample ? job : await refreshPayout(job.id);
  return NextResponse.json({ status: latest.status, payoutStatus: latest.payout_status, paidAt: latest.paid_at });
}
