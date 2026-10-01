import type { Route } from "./+types/assets.$";
import { getStorage } from "~/server/storage/index.server";

/** Streams a stored asset. Public (see config/public-routes.ts); keys are random, not guessable. */
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
