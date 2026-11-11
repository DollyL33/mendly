// Starting data for every new visitor, so a judge who only clicks around still sees every state.
// Sample jobs are labelled "Sample" and never call PayPal. The $180 wall patch is a live job.

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import { PROPERTY_ADDRESS } from "./jobs";
import { savePhoto } from "./photos";

const SAMPLES = path.join(process.cwd(), "public", "samples");
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

async function stored(file: string) {
  return savePhoto(await fs.readFile(path.join(SAMPLES, file)));
}

type SeedEvent = [minutesAgo: number, actor: string, kind: string, message: string];

function insertJob(job: Record<string, unknown>, items: [string, string][], events: SeedEvent[]) {
  const cols = Object.keys(job);
  db()
    .prepare(`INSERT INTO jobs (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`)
    .run(...cols.map((c) => job[c] as never));
  const itemIds = items.map(([label, instruction], i) => {
    const id = randomUUID();
    db()
      .prepare("INSERT INTO checklist_items (id, job_id, position, label, photo_instruction) VALUES (?, ?, ?, ?, ?)")
      .run(id, job.id, i + 1, label, instruction);
    return id;
  });
  const ev = db().prepare("INSERT INTO events (job_id, at, actor, kind, message) VALUES (?, ?, ?, ?, ?)");
  for (const [m, actor, kind, message] of events) ev.run(job.id, minutesAgo(m), actor, kind, message);
  return itemIds;
}

function insertPhoto(p: {
  jobId: string;
  itemId: string | null;
  photo: { name: string; fingerprint: string };
  attempt: number;
  verdict?: "pass" | "fail";
  reason?: string;
  fix?: string;
  reusedOf?: string;
  at: number;
}) {
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO photos (id, job_id, item_id, path, fingerprint, attempt, verdict, reason, fix_instruction, reused_of_photo_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, p.jobId, p.itemId, p.photo.name, p.photo.fingerprint, p.attempt, p.verdict ?? null, p.reason ?? null, p.fix ?? null, p.reusedOf ?? null, minutesAgo(p.at));
  return id;
}

export async function seedDemo(demoId: string) {
  const hasWall = await fs.access(path.join(SAMPLES, "seed-wall.jpg")).then(() => true, () => false);
  const [report, earlier, wall] = await Promise.all([
    stored("seed-report.jpg"),
    stored("seed-tap.jpg"),
    hasWall ? stored("seed-wall.jpg") : Promise.resolve(null),
  ]);

  // 1. A paid sample job from last week: its proof photo is the one a cheater might reuse later.
  const paidId = randomUUID();
  const [paidItem] = insertJob(
    {
      id: paidId, demo_id: demoId, number: 1038, is_sample: 1, title: "Clear slow kitchen drain", address: PROPERTY_ADDRESS,
      report_text: "The kitchen sink drains really slowly and smells.", report_photo: report.name,
      summary: "The kitchen sink drain is partly blocked. The handyman will clear the trap and drain line.",
      amount_cents: 9000, status: "paid", authorization_id: "SAMPLE", capture_id: "SAMPLE", payout_batch_id: "SAMPLE",
      payout_status: "SUCCESS", proof_submitted_at: minutesAgo(10_081), paid_at: minutesAgo(10_080), created_at: minutesAgo(10_300),
    },
    [["Water draining freely", "Sink with the tap running and water draining away, no standing water."]],
    [
      [10_300, "tenant", "reported", "Tenant reported the problem with a photo."],
      [10_299, "agent", "planned", "Agent planned the job: 1 proof photo, estimate $90."],
      [10_200, "paypal", "funded", "Linda approved in PayPal. $90.00 held on her PayPal, not charged yet."],
      [10_081, "marco", "proof_sent", "Marco sent 1 proof photo."],
      [10_081, "agent", "verified", "Verified: Water draining freely. Water runs from the tap and drains away with no standing water."],
      [10_081, "rules", "auto_pay", "Auto-pay: Every photo verified and $90.00 is within the $100.00 auto-pay limit."],
      [10_080, "paypal", "paid", "Paid to Marco, $90.00, 41 seconds after proof."],
    ],
  );
  insertPhoto({ jobId: paidId, itemId: null, photo: report, attempt: 0, at: 10_300 });
  const earlierPhotoId = insertPhoto({
    jobId: paidId, itemId: paidItem, photo: earlier, attempt: 1, verdict: "pass",
    reason: "Water runs from the tap and drains away with no standing water.", at: 10_081,
  });

  // 2. A sample job where the same old photo was sent twice, so it went to Linda.
  const flaggedId = randomUUID();
  const [flagItem] = insertJob(
    {
      id: flaggedId, demo_id: demoId, number: 1039, is_sample: 1, title: "Fix leaking sink drain", address: PROPERTY_ADDRESS,
      report_text: "There's water under the kitchen sink every morning.", report_photo: report.name,
      summary: "A slow leak at the sink drain connection. The handyman will reseal or replace the slip joint.",
      amount_cents: 9500, status: "needs_linda", authorization_id: "SAMPLE", failed_attempts: 1,
      needs_linda_reason: "Proof failed a second time (1 item). The same photo from job #1038 was sent twice.",
      proof_submitted_at: minutesAgo(180), created_at: minutesAgo(1_500),
    },
    [["Drain working", "Sink with the tap running and water draining away, no leaks."]],
    [
      [1_500, "tenant", "reported", "Tenant reported the problem with a photo."],
      [1_499, "agent", "planned", "Agent planned the job: 1 proof photo, estimate $95."],
      [1_440, "paypal", "funded", "Linda approved in PayPal. $95.00 held on her PayPal, not charged yet."],
      [240, "marco", "proof_sent", "Marco sent 1 proof photo."],
      [240, "rules", "reuse_caught", 'Reused photo caught on "Drain working": it matches proof from job #1038 (Clear slow kitchen drain).'],
      [240, "rules", "needs_fix", "Sent back to Marco: 1 item needs a new photo."],
      [180, "marco", "proof_sent", "Marco sent 1 proof photo (retake)."],
      [180, "rules", "reuse_caught", 'Reused photo caught on "Drain working": it matches proof from job #1038 (Clear slow kitchen drain).'],
      [180, "rules", "needs_linda", "Needs Linda: Proof failed a second time (1 item)."],
    ],
  );
  insertPhoto({ jobId: flaggedId, itemId: null, photo: report, attempt: 0, at: 1_500 });
  for (const [attempt, at] of [[1, 240], [2, 180]] as const) {
    insertPhoto({
      jobId: flaggedId, itemId: flagItem, photo: earlier, attempt, verdict: "fail", reusedOf: earlierPhotoId, at,
      reason: "This photo matches proof from job #1038 (Clear slow kitchen drain), so it wasn't taken for this job.",
      fix: "Take a new photo on site now.",
    });
  }

  // 3. A live job over the $100 limit, waiting for Linda's approval. Runs through real PayPal.
  const wallId = randomUUID();
  insertJob(
    {
      id: wallId, demo_id: demoId, number: 1040, is_sample: 0, title: "Patch hole in living room wall", address: PROPERTY_ADDRESS,
      report_text: "There's a fist-sized hole in the living room wall where the door handle hits it.", report_photo: wall?.name ?? null,
      summary: "A fist-sized hole in drywall behind the door. The handyman will patch it, sand, and paint to match, and fit a door stop.",
      amount_cents: 18000, status: "waiting_approval", created_at: minutesAgo(30),
    },
    [
      ["Hole patched and painted", "The wall where the hole was, patched, sanded and painted to match, seen from about 1 meter."],
      ["Door stop fitted", "The new door stop on the wall or floor, with the door handle resting against it."],
    ],
    [
      [30, "tenant", "reported", "Tenant reported the problem with a photo."],
      [29, "agent", "planned", "Agent planned the job: 2 proof photos, estimate $180."],
    ],
  );
  if (wall) insertPhoto({ jobId: wallId, itemId: null, photo: wall, attempt: 0, at: 30 });
}
