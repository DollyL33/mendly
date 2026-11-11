// Linda's auto-pay limit. New rule checks use the new limit.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentDemo } from "@/lib/demo";

export async function POST(request: Request) {
  const demo = await currentDemo();
  const { limitUsd } = ((await request.json().catch(() => ({}))) ?? {}) as { limitUsd?: number };
  const cents = Math.round(Number(limitUsd) * 100);
  if (!Number.isFinite(cents) || cents < 0 || cents > 100000) {
    return NextResponse.json({ error: "Enter a limit between $0 and $1,000." }, { status: 400 });
  }
  db().prepare("UPDATE demos SET auto_pay_limit_cents = ? WHERE id = ?").run(cents, demo.id);
  return NextResponse.json({ ok: true });
}
