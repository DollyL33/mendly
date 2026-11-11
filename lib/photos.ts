// Photos: shrink them before saving (cheaper for the AI, faster to load) and store them in DATA_DIR.

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { UPLOAD_DIR } from "./db";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Resizes to at most 1000px, converts to JPEG, saves, and returns the stored file name. */
export async function savePhoto(input: Buffer): Promise<string> {
  const jpeg = await sharp(input)
    .rotate() // respect phone camera orientation
    .resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  const name = `${randomUUID()}.jpg`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), jpeg);
  return name;
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
