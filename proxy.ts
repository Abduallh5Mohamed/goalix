import { NextRequest, NextResponse } from "next/server";

function getApiUrl() {
  return (
    process.env.GOALIX_INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
}

function getPublicApiOrigin() {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (!configured) return "";
  try {
    return new URL(configured).origin;
  } catch {
    return "";
  }
}

function securityHeaders(nonce: string, requestHost?: string) {
  const isDev = process.env.NODE_ENV === "development";
  const publicApiOrigin = getPublicApiOrigin();
  const apiWsOrigin = publicApiOrigin
    ? publicApiOrigin.replace(/^http:/, "ws:").replace(/^https:/, "wss:")
    : "";

  const httpConnectSources = [
    publicApiOrigin,
    ...(isDev ? ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"] : []),
  ].filter(Boolean);
  const wsConnectSources = [
    apiWsOrigin,
    ...(isDev ? ["ws://localhost:3000", "ws://127.0.0.1:3000", "ws://localhost:3001", "ws://127.0.0.1:3001"] : []),
  ].filter(Boolean);

  if (isDev && requestHost) {
    httpConnectSources.push(`http://${requestHost}:3000`, `http://${requestHost}:3001`);
    wsConnectSources.push(`ws://${requestHost}:3000`, `ws://${requestHost}:3001`);
  }

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${[...new Set(httpConnectSources)].join(" ")}`,
    "font-src 'self' data:",
    `connect-src 'self' ${[...new Set([...httpConnectSources, ...wsConnectSources])].join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const headers: Record<string, string> = {
    "Content-Security-Policy": csp,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
  };

  if (!isDev) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
    headers["Content-Security-Policy"] = `${csp}; upgrade-insecure-requests`;
    headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()";
  }

  return headers;
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const pathname = request.nextUrl.pathname;
  const requestHost = request.headers.get("host")?.split(":")[0] || request.nextUrl.hostname;
  const headers = securityHeaders(nonce, requestHost);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", headers["Content-Security-Policy"]);

  const isBackendRequest =
    pathname.startsWith("/uploads/");

  const response = isBackendRequest
    ? NextResponse.rewrite(
        new URL(`${pathname}${request.nextUrl.search}`, getApiUrl()),
        { request: { headers: requestHeaders } },
      )
    : NextResponse.next({ request: { headers: requestHeaders } });

  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: [
    "/uploads/:path*",
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
