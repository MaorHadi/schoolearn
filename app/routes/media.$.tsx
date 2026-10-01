import type { Route } from "./+types/media.$";
import { getStorage } from "~/server/storage/index.server";

/** Streams a stored asset. Public (see config/public-routes.ts). Served under /media so it never collides with the build's /assets bundle directory. */
export async function loader({ params }: Route.LoaderArgs) {
  const key = params["*"];
  if (!key) throw new Response("Not found", { status: 404 });

  const stored = await getStorage().get(key);
  if (!stored) throw new Response("Not found", { status: 404 });

  return new Response(stored.body, {
    headers: {
      "Content-Type": stored.mimeType,
      "Content-Length": String(stored.byteSize),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
