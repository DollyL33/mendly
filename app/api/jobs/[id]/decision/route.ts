// Linda's decisions. For now: decline a plan before approving it (nothing is held).

import { NextResponse } from "next/server";
import { currentDemo } from "@/lib/demo";
import { getJob, setStatus } from "@/lib/jobs";

export async function POST(request: Request, ctx: RouteContext<"/api/jobs/[id]/decision">) {
  const { id } = await ctx.params;
  const demo = await currentDemo();
  const job = getJob(id, demo.id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const { action } = ((await request.json().catch(() => ({}))) ?? {}) as { action?: string };

  if (action === "decline") {
    if (job.status !== "waiting_approval" && job.status !== "reported") {
      return NextResponse.json({ error: "Only a job waiting for approval can be declined." }, { status: 409 });
    }
    setStatus(job.id, "declined", { actor: "linda", kind: "declined", message: "Linda declined the job. Nothing was held." });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown decision." }, { status: 400 });
}
