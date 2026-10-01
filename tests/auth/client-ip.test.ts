import { describe, expect, it } from "vitest";
import { getClientIp, UNKNOWN_IP } from "~/server/auth/client-ip.server";

const requestWithForwardedFor = (forwardedFor?: string) =>
  new Request("http://x/", { headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {} });

describe("getClientIp", () => {
  it("with 0 trusted proxies ignores X-Forwarded-For entirely", () => {
    expect(
      getClientIp(requestWithForwardedFor("1.1.1.1"), {
        trustedProxyCount: 0,
        socketAddress: "9.9.9.9",
      }),
    ).toBe("9.9.9.9");
    expect(
      getClientIp(requestWithForwardedFor("1.1.1.1"), {
        trustedProxyCount: 0,
        socketAddress: null,
      }),
    ).toBe(UNKNOWN_IP);
  });

  it("with 1 trusted proxy takes the right-most entry", () => {
    expect(
      getClientIp(requestWithForwardedFor("1.1.1.1, 2.2.2.2, 3.3.3.3"), { trustedProxyCount: 1 }),
    ).toBe("3.3.3.3");
  });

  it("with 2 trusted proxies takes the second from the right", () => {
    expect(
      getClientIp(requestWithForwardedFor("1.1.1.1, 2.2.2.2, 3.3.3.3"), { trustedProxyCount: 2 }),
    ).toBe("2.2.2.2");
  });

  it("when fewer hops than trusted, uses the left-most available", () => {
    expect(getClientIp(requestWithForwardedFor("5.5.5.5"), { trustedProxyCount: 3 })).toBe(
      "5.5.5.5",
    );
  });

  it("falls back to socket when header missing", () => {
    expect(
      getClientIp(requestWithForwardedFor(), { trustedProxyCount: 1, socketAddress: "7.7.7.7" }),
    ).toBe("7.7.7.7");
    expect(getClientIp(requestWithForwardedFor(), { trustedProxyCount: 1 })).toBe(UNKNOWN_IP);
  });

  it("normalizes IPv4-mapped IPv6 and trims whitespace", () => {
    expect(getClientIp(requestWithForwardedFor(" ::ffff:8.8.8.8 "), { trustedProxyCount: 1 })).toBe(
      "8.8.8.8",
    );
  });

  it("ignores empty entries in the header", () => {
    expect(getClientIp(requestWithForwardedFor("1.1.1.1, , "), { trustedProxyCount: 1 })).toBe(
      "1.1.1.1",
    );
  });
});
