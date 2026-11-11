// Reading proof photos: the latest photo for each checklist item, and the full list for the record.

import { db } from "./db";

export interface ProofPhoto {
  id: string;
  job_id: string;
  item_id: string;
  path: string;
  attempt: number;
  verdict: "pass" | "fail" | null;
  reason: string | null;
  fix_instruction: string | null;
  reused_of_photo_id: string | null;
  created_at: string;
}

export function proofPhotos(jobId: string): ProofPhoto[] {
  return db()
    .prepare("SELECT * FROM photos WHERE job_id = ? AND item_id IS NOT NULL ORDER BY attempt, created_at")
    .all(jobId) as ProofPhoto[];
}

/** The newest photo for each checklist item, keyed by item ID. */
export function latestPhotos(jobId: string): Record<string, ProofPhoto> {
  const result: Record<string, ProofPhoto> = {};
  for (const p of proofPhotos(jobId)) result[p.item_id] = p;
  return result;
}
