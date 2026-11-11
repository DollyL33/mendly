// Runs before every page and API request. Gives a first-time visitor their private demo ID.

import { NextResponse, type NextRequest } from "next/server";

const DEMO_COOKIE = "mendly_demo";

export function proxy(request: NextRequest) {
  if (request.cookies.get(DEMO_COOKIE)) return NextResponse.next();

  const id = crypto.randomUUID();
  // Make the cookie visible to this same request, and tell the browser to keep it.
  request.cookies.set(DEMO_COOKIE, id);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(DEMO_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|samples/).*)"],
};
