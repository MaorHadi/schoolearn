import { env } from "~/server/env.server";

/** Sentinel when no trustworthy IP is available. Never block this value. */
export const UNKNOWN_IP = "unknown";

interface ClientIpOptions {
  /** Number of reverse-proxy hops to trust. Defaults to env TRUSTED_PROXY_COUNT. */
  trustedProxyCount?: number;
  /** The TCP peer address, when the server exposes it. react-router-serve does not. */
  socketAddress?: string | null;
}

function normalize(ip: string): string {
  const trimmed = ip.trim();
  return trimmed.startsWith("::ffff:") ? trimmed.slice("::ffff:".length) : trimmed;
}

/**
 * Resolve the client IP.
 *
 * X-Forwarded-For is only consulted when trustedProxyCount > 0. We then take the entry
 * `trustedProxyCount` from the right, which is the address appended by the first trusted
 * proxy. Anything further left was supplied by the client and can be spoofed.
 */
export function getClientIp(request: Request, options: ClientIpOptions = {}): string {
  const trusted = options.trustedProxyCount ?? env.TRUSTED_PROXY_COUNT;
  const socket = options.socketAddress ? normalize(options.socketAddress) : null;
  if (trusted <= 0) return socket ?? UNKNOWN_IP;

  const header = request.headers.get("x-forwarded-for");
  if (!header) return socket ?? UNKNOWN_IP;

  const hops = header.split(",").map(normalize).filter(Boolean);
  if (hops.length === 0) return socket ?? UNKNOWN_IP;

  const index = Math.max(0, hops.length - trusted);
  return hops[index] ?? UNKNOWN_IP;
}
