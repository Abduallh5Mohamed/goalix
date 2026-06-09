import { NextRequest, NextResponse } from "next/server";

function securityHeaders() {
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
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' blob: data: ${apiHttpOrigin} http://localhost:3000 http://127.0.0.1:3000`,
    "font-src 'self' data: https://fonts.gstatic.com",
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
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };

  if (!isDev) {
    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
    headers["Content-Security-Policy"] = `${csp}; upgrade-insecure-requests`;
  }

  return headers;
}

export async function proxy(request: NextRequest) {
  const headers = securityHeaders();

  const requestHeaders = new Headers(request.headers);

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
