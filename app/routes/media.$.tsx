import type { Route } from "./+types/media.$";
import { getStorage } from "~/server/storage/index.server";

/** Streams a stored asset. Public (see config/public-routes.ts). Served under /media so it never collides with the build's /assets bundle directory. */
export async function loader({ params }: Route.LoaderArgs) {
  const key = params["*"];
  if (!key) throw new Response("Not found", { status: 404 });

  const stored = await getStorage().get(key);
  if (!stored) throw new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": stored.mimeType,
    "Content-Length": String(stored.byteSize),
    "Cache-Control": "public, max-age=31536000, immutable",
    // Never let the browser second-guess the declared type.
    "X-Content-Type-Options": "nosniff",
  });
  // SVG can carry scripts; downloading instead of rendering keeps them out of the site origin.
  // <img> tags still display attachment responses, so lesson images are unaffected.
  if (stored.mimeType === "image/svg+xml") headers.set("Content-Disposition", "attachment");

  return new Response(stored.body, { headers });
}
