// "Try again" when planning failed.

import { NextResponse } from "next/server";
import { currentDemo } from "@/lib/demo";
import { getJob } from "@/lib/jobs";
import { runPlanning } from "@/lib/planning";

export const maxDuration = 120;

export async function POST(_request: Request, ctx: RouteContext<"/api/jobs/[id]/plan">) {
  const { id } = await ctx.params;
  const demo = await currentDemo();
  const job = getJob(id, demo.id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (job.status !== "reported") return NextResponse.json({ error: "This job is already planned." }, { status: 409 });
  const outcome = await runPlanning(job);
  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 503 });
}
