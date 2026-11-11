// The tenant's report: text + one photo → a saved job → the agent plans it.

import { NextResponse } from "next/server";
import { currentDemo } from "@/lib/demo";
import { createJob } from "@/lib/jobs";
import { MAX_UPLOAD_BYTES, recordReportPhoto, savePhoto } from "@/lib/photos";
import { runPlanning } from "@/lib/planning";

export const maxDuration = 120;

export async function POST(request: Request) {
  const demo = await currentDemo();
  const form = await request.formData();
  const text = String(form.get("text") ?? "").trim();
  const photo = form.get("photo");

  if (text.length < 5) return NextResponse.json({ error: "Describe the problem in a sentence." }, { status: 400 });
  if (text.length > 1000) return NextResponse.json({ error: "Keep the description under 1,000 characters." }, { status: 400 });
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Add a photo of the problem." }, { status: 400 });
  }
  if (photo.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "That photo is too large (15 MB max)." }, { status: 400 });

  let saved: { name: string; fingerprint: string };
  try {
    saved = await savePhoto(Buffer.from(await photo.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "That file doesn't look like a photo. Try a JPG or PNG." }, { status: 400 });
  }

  const job = createJob(demo.id, text, saved.name);
  recordReportPhoto(job.id, saved.name, saved.fingerprint);
  const outcome = await runPlanning(job);
  return NextResponse.json({ jobId: job.id, planned: outcome.ok, message: outcome.ok ? undefined : outcome.message });
}
