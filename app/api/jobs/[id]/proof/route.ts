// Marco's proof: save each photo, catch reused ones (code), inspect (Claude), then apply the rules (code).

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { inspectProof, type Verdict } from "@/lib/ai";
import { db, now } from "@/lib/db";
import { currentDemo, useAiCall } from "@/lib/demo";
import { addEvent, getChecklist, getJob, setStatus } from "@/lib/jobs";
import { findReuse, MAX_UPLOAD_BYTES, savePhoto, type ReuseMatch } from "@/lib/photos";
import { decide } from "@/lib/rules";
import { isSampleFile, REUSED_PHOTO } from "@/lib/samples";
import { latestPhotos } from "@/lib/proof";
import { startPayment } from "@/lib/payment";

export const maxDuration = 180;

export async function POST(request: Request, ctx: RouteContext<"/api/jobs/[id]/proof">) {
  const { id } = await ctx.params;
  const demo = await currentDemo();
  const job = getJob(id, demo.id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (job.is_sample) return NextResponse.json({ error: "Sample jobs can't take new proof." }, { status: 409 });
  if (job.status !== "funded" && job.status !== "needs_fix") {
    return NextResponse.json({ error: "This job isn't waiting for proof." }, { status: 409 });
  }

  // Which items need a photo now: all of them the first time, only the failed ones after that.
  const checklist = getChecklist(job.id);
  const latest = latestPhotos(job.id);
  const required = checklist.filter((item) => job.status === "funded" || latest[item.id]?.verdict !== "pass");

  // Read the photos first, so a missing one doesn't leave the job half-changed.
  const form = await request.formData();
  const inputs: { itemId: string; data: Buffer; sample?: string }[] = [];
  for (const item of required) {
    const file = form.get(`photo:${item.id}`);
    const sample = form.get(`sample:${item.id}`);
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "A photo is too large (15 MB max)." }, { status: 400 });
      inputs.push({ itemId: item.id, data: Buffer.from(await file.arrayBuffer()) });
    } else if (typeof sample === "string" && isSampleFile(sample)) {
      inputs.push({ itemId: item.id, data: await fs.readFile(path.join(process.cwd(), "public", "samples", sample)), sample });
    } else {
      return NextResponse.json({ error: `Add a photo for "${item.label}" before sending.` }, { status: 400 });
    }
  }

  // Claim the job so a double-click can't inspect (or pay) twice.
  const claimed = db()
    .prepare("UPDATE jobs SET status = 'inspecting', proof_submitted_at = ? WHERE id = ? AND status = ?")
    .run(now(), job.id, job.status);
  if (claimed.changes !== 1) return NextResponse.json({ error: "Already checking these photos." }, { status: 409 });
  const attempt = job.failed_attempts + 1;
  addEvent(job.id, "marco", "proof_sent", `Marco sent ${inputs.length} proof photo${inputs.length > 1 ? "s" : ""}${attempt > 1 ? " (retake)" : ""}.`);

  // Save, fingerprint, and look for reuse (pure code).
  const saved: { photoId: string; itemId: string; name: string; reuse: ReuseMatch | null }[] = [];
  try {
    for (const input of inputs) {
      const { name, fingerprint } = await savePhoto(input.data);
      // Demo sample sets A and B are props a judge may use on any number of jobs. Set C's
      // "earlier job" photo, and every camera shot or uploaded file, is always checked.
      const isDemoProp = input.sample !== undefined && input.sample !== REUSED_PHOTO.file;
      const reuse = isDemoProp ? null : findReuse(demo.id, job.id, fingerprint);
      const photoId = randomUUID();
      db()
        .prepare(
          "INSERT INTO photos (id, job_id, item_id, path, fingerprint, attempt, reused_of_photo_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(photoId, job.id, input.itemId, name, fingerprint, attempt, reuse?.photoId ?? null, now());
      saved.push({ photoId, itemId: input.itemId, name, reuse });
    }
  } catch {
    setStatus(job.id, job.status, { actor: "rules", kind: "proof_rejected", message: "A file wasn't a readable photo. Nothing was checked." });
    return NextResponse.json({ error: "One of those files isn't a readable photo." }, { status: 400 });
  }

  // Ask Claude for a verdict on each photo.
  let verdicts: Verdict[] = [];
  let aiSucceeded = false;
  if (useAiCall(demo.id)) {
    try {
      verdicts = await inspectProof(
        job.summary ?? job.title,
        saved.map((s) => {
          const item = checklist.find((c) => c.id === s.itemId)!;
          return { itemId: item.id, label: item.label, photoInstruction: item.photo_instruction, photoName: s.name };
        }),
      );
      aiSucceeded = true;
    } catch (err) {
      console.error("inspectProof failed", err);
    }
  }

  // Record results. A reused photo fails no matter what the AI said.
  const update = db().prepare("UPDATE photos SET verdict = ?, reason = ?, fix_instruction = ? WHERE id = ?");
  for (const s of saved) {
    const item = checklist.find((c) => c.id === s.itemId)!;
    const v = verdicts.find((x) => x.itemId === s.itemId);
    if (s.reuse) {
      const where = s.reuse.isReportPhoto ? `the tenant's report photo on job #${s.reuse.jobNumber}` : `proof from job #${s.reuse.jobNumber} (${s.reuse.jobTitle})`;
      update.run("fail", `This photo matches ${where}, so it wasn't taken for this job.`, "Take a new photo on site now.", s.photoId);
      addEvent(job.id, "rules", "reuse_caught", `Reused photo caught on "${item.label}": it matches ${where}.`);
    } else if (v) {
      update.run(v.verdict, v.reason, v.fixInstruction || null, s.photoId);
      addEvent(job.id, "agent", v.verdict === "pass" ? "verified" : "problem", `${v.verdict === "pass" ? "Verified" : "Problem"}: ${item.label}. ${v.reason}`);
    } else {
      update.run(null, "Couldn't check this right now.", null, s.photoId);
    }
  }

  // The rules decide. The AI never does.
  const after = latestPhotos(job.id);
  const decision = decide({
    verdicts: checklist.map((c) => (after[c.id]?.verdict === "pass" ? "pass" : "fail")),
    previousFailures: job.failed_attempts,
    amountCents: job.amount_cents ?? 0,
    limitCents: demo.auto_pay_limit_cents,
    aiSucceeded,
  });

  if (decision.action === "needs_fix") {
    setStatus(job.id, "needs_fix", { actor: "rules", kind: "needs_fix", message: `Sent back to Marco: ${decision.reason}` }, { failed_attempts: attempt });
  } else if (decision.action === "needs_linda") {
    setStatus(job.id, "needs_linda", { actor: "rules", kind: "needs_linda", message: `Needs Linda: ${decision.reason}` }, { needs_linda_reason: decision.reason });
  } else {
    setStatus(job.id, "paying", { actor: "rules", kind: "auto_pay", message: `Auto-pay: ${decision.reason}` });
    await startPayment(job.id, "rules");
  }

  return NextResponse.json({ decision: decision.action, reason: decision.reason });
}
