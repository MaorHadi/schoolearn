import { describe, expect, it } from "vitest";
import { getClientIp, UNKNOWN_IP } from "~/lib/auth/client-ip.server";

const req = (xff?: string) =>
  new Request("http://x/", { headers: xff ? { "x-forwarded-for": xff } : {} });

describe("getClientIp", () => {
  it("with 0 trusted proxies ignores X-Forwarded-For entirely", () => {
    expect(getClientIp(req("1.1.1.1"), { trustedProxyCount: 0, socketAddress: "9.9.9.9" })).toBe(
      "9.9.9.9",
    );
    expect(getClientIp(req("1.1.1.1"), { trustedProxyCount: 0, socketAddress: null })).toBe(
      UNKNOWN_IP,
    );
  });

  it("with 1 trusted proxy takes the right-most entry", () => {
    expect(getClientIp(req("1.1.1.1, 2.2.2.2, 3.3.3.3"), { trustedProxyCount: 1 })).toBe("3.3.3.3");
  });

  it("with 2 trusted proxies takes the second from the right", () => {
    expect(getClientIp(req("1.1.1.1, 2.2.2.2, 3.3.3.3"), { trustedProxyCount: 2 })).toBe("2.2.2.2");
  });

  it("when fewer hops than trusted, uses the left-most available", () => {
    expect(getClientIp(req("5.5.5.5"), { trustedProxyCount: 3 })).toBe("5.5.5.5");
  });

  it("falls back to socket when header missing", () => {
    expect(getClientIp(req(), { trustedProxyCount: 1, socketAddress: "7.7.7.7" })).toBe("7.7.7.7");
    expect(getClientIp(req(), { trustedProxyCount: 1 })).toBe(UNKNOWN_IP);
  });

  it("normalizes IPv4-mapped IPv6 and trims whitespace", () => {
    expect(getClientIp(req(" ::ffff:8.8.8.8 "), { trustedProxyCount: 1 })).toBe("8.8.8.8");
  });

  it("ignores empty entries in the header", () => {
    expect(getClientIp(req("1.1.1.1, , "), { trustedProxyCount: 1 })).toBe("1.1.1.1");
  });
});
