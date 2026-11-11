// Linda edits the plan (amount and checklist) before she approves it.

import { NextResponse } from "next/server";
import { currentDemo } from "@/lib/demo";
import { addEvent, getJob, replaceChecklist, updateJobFields } from "@/lib/jobs";

export async function PATCH(request: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const { id } = await ctx.params;
  const demo = await currentDemo();
  const job = getJob(id, demo.id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (job.status !== "waiting_approval") {
    return NextResponse.json({ error: "The plan can only be changed before you approve it." }, { status: 409 });
  }

  const body = (await request.json().catch(() => null)) as {
    amountUsd?: number;
    checklist?: { label?: string; photoInstruction?: string }[];
  } | null;
  if (!body) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  const amount = Math.round(Number(body.amountUsd) * 100);
  if (!Number.isFinite(amount) || amount < 100 || amount > 500000) {
    return NextResponse.json({ error: "Enter an amount between $1 and $5,000." }, { status: 400 });
  }
  const checklist = (body.checklist ?? [])
    .map((c) => ({ label: String(c.label ?? "").trim(), photoInstruction: String(c.photoInstruction ?? "").trim() }))
    .filter((c) => c.label && c.photoInstruction);
  if (checklist.length < 1 || checklist.length > 6) {
    return NextResponse.json(
      { error: "Keep between 1 and 6 checklist photos, each with a name and what it shows." },
      { status: 400 },
    );
  }

  updateJobFields(id, { amount_cents: amount });
  replaceChecklist(id, checklist);
  addEvent(id, "linda", "plan_edited", `Linda edited the plan: $${(amount / 100).toFixed(2)}, ${checklist.length} proof photos.`);
  return NextResponse.json({ ok: true });
}
