// /demo/linda, /demo/marco, /demo/tenant: open a view directly (for the README and Devpost links).

import { NextResponse } from "next/server";

const ROLES = new Set(["linda", "marco", "tenant"]);

export async function GET(request: Request, ctx: RouteContext<"/demo/[role]">) {
  const { role } = await ctx.params;
  return NextResponse.redirect(new URL(ROLES.has(role) ? `/${role}` : "/", request.url));
}
