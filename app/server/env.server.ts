import { parseEnv, type Env } from "../../env.schema";

export type { Env };

/** Validated environment, parsed once at startup. Schema lives in /env.schema.ts. */
export const env: Env = parseEnv(process.env);

if (env.NODE_ENV === "production" && env.TRUSTED_PROXY_COUNT === 0) {
  console.warn(
    "[security] TRUSTED_PROXY_COUNT=0 in production: client IPs resolve to 'unknown', so per-IP " +
      "blocking is inactive. Run behind a reverse proxy and set TRUSTED_PROXY_COUNT to the number of trusted hops.",
  );
}
