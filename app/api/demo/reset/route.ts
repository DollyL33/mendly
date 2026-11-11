// Reset: clear this visitor's jobs and bring back the starting jobs. Other visitors are untouched.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentDemo } from "@/lib/demo";
import { seedDemo } from "@/lib/seed";

export async function POST() {
  const demo = await currentDemo();
  db().transaction(() => {
    db().prepare("DELETE FROM jobs WHERE demo_id = ?").run(demo.id); // checklist, photos and events cascade
    db().prepare("UPDATE demos SET auto_pay_limit_cents = 10000, ai_calls_used = 0 WHERE id = ?").run(demo.id);
  })();
  await seedDemo(demo.id);
  return NextResponse.json({ ok: true });
}
