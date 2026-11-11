// Each visitor (each judge) gets a private demo ID in a cookie, so nobody overwrites anyone else.
// proxy.ts gives the browser the cookie; this file makes sure the demo exists.

import { cookies } from "next/headers";
import { db, now } from "./db";

export const DEMO_COOKIE = "mendly_demo";

export interface Demo {
  id: string;
  created_at: string;
  auto_pay_limit_cents: number;
  ai_calls_used: number;
}

export function ensureDemo(id: string): Demo {
  db().prepare("INSERT OR IGNORE INTO demos (id, created_at) VALUES (?, ?)").run(id, now());
  return db().prepare("SELECT * FROM demos WHERE id = ?").get(id) as Demo;
}

/** The current visitor's demo. Works in pages and API routes. */
export async function currentDemo(): Promise<Demo> {
  const id = (await cookies()).get(DEMO_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) throw new Error("No demo session. Reload the page.");
  return ensureDemo(id);
}

export function aiCallsPerVisitor(): number {
  const n = Number(process.env.AI_CALLS_PER_VISITOR);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

/** Counts one Claude call against this visitor's allowance. Returns false if they're out. */
export function useAiCall(demoId: string): boolean {
  const result = db()
    .prepare("UPDATE demos SET ai_calls_used = ai_calls_used + 1 WHERE id = ? AND ai_calls_used < ?")
    .run(demoId, aiCallsPerVisitor());
  return result.changes === 1;
}
