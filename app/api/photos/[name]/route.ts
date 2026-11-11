// Serves stored photos. File names are random and unguessable.

import { readPhoto } from "@/lib/photos";

export async function GET(_request: Request, ctx: RouteContext<"/api/photos/[name]">) {
  const { name } = await ctx.params;
  const data = await readPhoto(name);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400, immutable" },
  });
}
