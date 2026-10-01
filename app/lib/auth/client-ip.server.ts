import { env } from "~/config/env.server";

/** Sentinel when no trustworthy IP is available. Never block this value. */
export const UNKNOWN_IP = "unknown";

export interface ClientIpOptions {
  /** Number of reverse-proxy hops to trust. Defaults to env TRUSTED_PROXY_COUNT. */
  trustedProxyCount?: number;
  /** The TCP peer address, when the server exposes it. react-router-serve does not. */
  socketAddress?: string | null;
}

function normalize(ip: string): string {
  const t = ip.trim();
  return t.startsWith("::ffff:") ? t.slice("::ffff:".length) : t;
}

/**
 * Resolve the client IP.
 *
 * X-Forwarded-For is only consulted when trustedProxyCount > 0. We then take the entry
 * `trustedProxyCount` from the right, which is the address appended by the first trusted
 * proxy. Anything further left was supplied by the client and can be spoofed.
 */
export function getClientIp(request: Request, opts: ClientIpOptions = {}): string {
  const trusted = opts.trustedProxyCount ?? env.TRUSTED_PROXY_COUNT;
  const socket = opts.socketAddress ? normalize(opts.socketAddress) : null;
  if (trusted <= 0) return socket ?? UNKNOWN_IP;

  const header = request.headers.get("x-forwarded-for");
  if (!header) return socket ?? UNKNOWN_IP;

  const hops = header.split(",").map(normalize).filter(Boolean);
  if (hops.length === 0) return socket ?? UNKNOWN_IP;

  const idx = Math.max(0, hops.length - trusted);
  return hops[idx] ?? UNKNOWN_IP;
}
