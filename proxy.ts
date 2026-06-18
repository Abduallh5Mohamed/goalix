import { NextRequest, NextResponse } from "next/server";

function securityHeaders(nonce: string, requestHost?: string) {
  const isDev = process.env.NODE_ENV === "development";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  let apiHttpOrigin = "http://localhost:3000";
  let apiWsOrigin = "ws://localhost:3000";

  try {
    const parsedApiUrl = new URL(apiUrl);
    apiHttpOrigin = parsedApiUrl.origin;
    apiWsOrigin = `${parsedApiUrl.protocol === "https:" ? "wss:" : "ws:"}//${parsedApiUrl.host}`;
  } catch {
    // Keep local defaults when the env var is not a valid URL.
  }

  const httpConnectSources = [
    apiHttpOrigin,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ];
  const wsConnectSources = [
    apiWsOrigin,
    "ws://localhost:3000",
    "ws://127.0.0.1:3000",
    "ws://localhost:3001",
    "ws://127.0.0.1:3001",
  ];

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
  const requestHost = request.headers.get("host")?.split(":")[0] || request.nextUrl.hostname;
  const headers = securityHeaders(nonce, requestHost);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
