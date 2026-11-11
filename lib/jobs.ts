// Jobs and their history. Every status change goes through setStatus(), which also
// writes an event, so each job keeps a full record of what happened and when.

import { randomUUID } from "node:crypto";
import { db, now } from "./db";

export type JobStatus =
  | "reported"
  | "waiting_approval"
  | "funded"
  | "inspecting"
  | "needs_fix"
  | "needs_linda"
  | "paying"
  | "paid"
  | "declined"
  | "cancelled";

export type Actor = "tenant" | "agent" | "linda" | "marco" | "paypal" | "rules";

export interface Job {
  id: string;
  demo_id: string;
  number: number;
  is_sample: number;
  title: string;
  address: string;
  report_text: string;
  report_photo: string | null;
  summary: string | null;
  uncertain_notes: string | null;
  amount_cents: number | null;
  status: JobStatus;
  needs_linda_reason: string | null;
  paypal_order_id: string | null;
  authorization_id: string | null;
  capture_id: string | null;
  payout_batch_id: string | null;
  payout_status: string | null;
  failed_attempts: number;
  proof_submitted_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  job_id: string;
  position: number;
  label: string;
  photo_instruction: string;
}

export interface JobEvent {
  id: number;
  job_id: string;
  at: string;
  actor: Actor;
  kind: string;
  message: string;
}

/** The one rental in the proof of concept. */
export const PROPERTY_ADDRESS = "14 Alder Street, Apt 2";

export function addEvent(jobId: string, actor: Actor, kind: string, message: string) {
  db().prepare("INSERT INTO events (job_id, at, actor, kind, message) VALUES (?, ?, ?, ?, ?)").run(
    jobId,
    now(),
    actor,
    kind,
    message,
  );
}

export function createJob(demoId: string, reportText: string, reportPhoto: string | null): Job {
  const id = randomUUID();
  const next = db().prepare("SELECT COALESCE(MAX(number), 1040) + 1 AS n FROM jobs WHERE demo_id = ?").get(demoId) as {
    n: number;
  };
  const title = reportText.length > 60 ? `${reportText.slice(0, 57).trimEnd()}…` : reportText;
  db()
    .prepare(
      `INSERT INTO jobs (id, demo_id, number, title, address, report_text, report_photo, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'reported', ?)`,
    )
    .run(id, demoId, next.n, title, PROPERTY_ADDRESS, reportText, reportPhoto, now());
  addEvent(id, "tenant", "reported", "Tenant reported the problem with a photo.");
  return getJob(id, demoId)!;
}

/** Reads a job, but only if it belongs to this visitor's demo. */
export function getJob(id: string, demoId: string): Job | undefined {
  return db().prepare("SELECT * FROM jobs WHERE id = ? AND demo_id = ?").get(id, demoId) as Job | undefined;
}

export function listJobs(demoId: string): Job[] {
  return db().prepare("SELECT * FROM jobs WHERE demo_id = ? ORDER BY created_at DESC").all(demoId) as Job[];
}

export function getChecklist(jobId: string): ChecklistItem[] {
  return db().prepare("SELECT * FROM checklist_items WHERE job_id = ? ORDER BY position").all(jobId) as ChecklistItem[];
}

export function getEvents(jobId: string): JobEvent[] {
  return db().prepare("SELECT * FROM events WHERE job_id = ? ORDER BY id").all(jobId) as JobEvent[];
}

/** Changes a job's status and records why. Extra fields are saved in the same step. */
export function setStatus(
  jobId: string,
  status: JobStatus,
  event: { actor: Actor; kind: string; message: string },
  fields: Partial<Omit<Job, "id" | "demo_id" | "status">> = {},
) {
  const tx = db().transaction(() => {
    const keys = Object.keys(fields);
    const sets = ["status = ?", ...keys.map((k) => `${k} = ?`)].join(", ");
    db()
      .prepare(`UPDATE jobs SET ${sets} WHERE id = ?`)
      .run(status, ...keys.map((k) => (fields as Record<string, unknown>)[k] ?? null), jobId);
    addEvent(jobId, event.actor, event.kind, event.message);
  });
  tx();
}

/** Replaces the checklist, e.g. after planning or when Linda edits it. */
export function replaceChecklist(jobId: string, items: { label: string; photoInstruction: string }[]) {
  const tx = db().transaction(() => {
    db().prepare("DELETE FROM checklist_items WHERE job_id = ?").run(jobId);
    const insert = db().prepare(
      "INSERT INTO checklist_items (id, job_id, position, label, photo_instruction) VALUES (?, ?, ?, ?, ?)",
    );
    items.forEach((item, i) => insert.run(randomUUID(), jobId, i + 1, item.label, item.photoInstruction));
  });
  tx();
}

export function updateJobFields(jobId: string, fields: Partial<Pick<Job, "amount_cents" | "summary">>) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  db()
    .prepare(`UPDATE jobs SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`)
    .run(...keys.map((k) => (fields as Record<string, unknown>)[k]), jobId);
}
