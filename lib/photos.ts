// Photos: shrink them, strip hidden data (like GPS), fingerprint them, and catch reused ones.
// Reuse detection is plain code, not AI, so it can't be talked out of a match.

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db, now, UPLOAD_DIR } from "./db";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** Fingerprints this close (out of 64 bits) count as the same photo. */
const REUSE_DISTANCE = 6;

/**
 * Difference hash: shrink to 9×8 greyscale and record whether each pixel is brighter than its
 * right-hand neighbour. Re-saving, resizing or recompressing a photo barely changes it.
 */
export async function fingerprint(input: Buffer): Promise<string> {
  const pixels = await sharp(input).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = 0n;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = pixels[row * 9 + col];
      const right = pixels[row * 9 + col + 1];
      bits = (bits << 1n) | (left > right ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, "0");
}

export function distance(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (x) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

/** Resizes to at most 1000px, re-encodes as JPEG (dropping GPS and other metadata), saves it. */
export async function savePhoto(input: Buffer): Promise<{ name: string; fingerprint: string }> {
  const jpeg = await sharp(input)
    .rotate() // respect phone camera orientation
    .resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  const name = `${randomUUID()}.jpg`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), jpeg);
  return { name, fingerprint: await fingerprint(jpeg) };
}

/** Records the tenant's report photo so it can't later be passed off as proof. */
export function recordReportPhoto(jobId: string, name: string, fp: string) {
  db()
    .prepare("INSERT INTO photos (id, job_id, item_id, path, fingerprint, attempt, created_at) VALUES (?, ?, NULL, ?, ?, 0, ?)")
    .run(randomUUID(), jobId, name, fp, now());
}

export interface ReuseMatch {
  photoId: string;
  jobNumber: number;
  jobTitle: string;
  isReportPhoto: boolean;
}

/**
 * Looks for a near-identical photo anywhere in this visitor's jobs: proof from other jobs,
 * and any tenant report photo (including this job's own).
 */
export function findReuse(demoId: string, jobId: string, fp: string): ReuseMatch | null {
  const rows = db()
    .prepare(
      `SELECT p.id, p.fingerprint, p.item_id, p.job_id, j.number, j.title
         FROM photos p JOIN jobs j ON j.id = p.job_id
        WHERE j.demo_id = ? AND p.fingerprint IS NOT NULL AND (p.job_id != ? OR p.item_id IS NULL)`,
    )
    .all(demoId, jobId) as {
    id: string;
    fingerprint: string;
    item_id: string | null;
    job_id: string;
    number: number;
    title: string;
  }[];
  for (const row of rows) {
    if (distance(row.fingerprint, fp) <= REUSE_DISTANCE) {
      return { photoId: row.id, jobNumber: row.number, jobTitle: row.title, isReportPhoto: row.item_id === null };
    }
  }
  return null;
}

/** Reads a stored photo. Rejects anything that isn't a plain stored file name. */
export async function readPhoto(name: string): Promise<Buffer | null> {
  if (!/^[0-9a-f-]{36}\.jpg$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}

export const photoUrl = (name: string) => `/api/photos/${name}`;
