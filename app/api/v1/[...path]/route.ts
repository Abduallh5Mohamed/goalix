import * as http from "node:http";
import * as https from "node:https";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { NextRequest } from "next/server";

type ApiRouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

type ProxyGlobals = typeof globalThis & {
  goalixHttpAgents?: http.Agent[];
  goalixHttpsAgents?: https.Agent[];
};

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "expect",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const MAX_UPSTREAM_SOCKETS = Math.max(
  16,
  Number(process.env.GOALIX_API_PROXY_MAX_SOCKETS || 1024),
);
const MAX_FREE_UPSTREAM_SOCKETS = Math.max(
  8,
  Math.min(
    MAX_UPSTREAM_SOCKETS,
    Number(process.env.GOALIX_API_PROXY_MAX_FREE_SOCKETS || 128),
  ),
);
const UPSTREAM_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.GOALIX_API_PROXY_TIMEOUT_MS || 90_000),
);
const MAX_PROXY_BODY_BYTES = Math.max(
  1024 * 1024,
  Number(process.env.GOALIX_API_PROXY_MAX_BODY_BYTES || 26 * 1024 * 1024),
);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class PayloadTooLargeError extends Error {}
const UPSTREAM_LOCAL_ADDRESSES = (
  process.env.GOALIX_API_PROXY_LOCAL_ADDRESSES || ""
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const AGENT_LOCAL_ADDRESSES =
  UPSTREAM_LOCAL_ADDRESSES.length > 0
    ? UPSTREAM_LOCAL_ADDRESSES
    : [undefined];
const SOCKETS_PER_AGENT = Math.max(
  16,
  Math.ceil(MAX_UPSTREAM_SOCKETS / AGENT_LOCAL_ADDRESSES.length),
);
const FREE_SOCKETS_PER_AGENT = Math.max(
  8,
  Math.ceil(MAX_FREE_UPSTREAM_SOCKETS / AGENT_LOCAL_ADDRESSES.length),
);

const proxyGlobals = globalThis as ProxyGlobals;

function createAgentOptions(localAddress?: string) {
  return {
    keepAlive: true,
    keepAliveMsecs: 1_000,
    maxSockets: SOCKETS_PER_AGENT,
    maxTotalSockets: SOCKETS_PER_AGENT,
    maxFreeSockets: Math.min(SOCKETS_PER_AGENT, FREE_SOCKETS_PER_AGENT),
    ...(localAddress ? { localAddress } : {}),
    scheduling: "fifo" as const,
  };
}

const httpAgents =
  proxyGlobals.goalixHttpAgents ??
  AGENT_LOCAL_ADDRESSES.map((localAddress) =>
    new http.Agent(createAgentOptions(localAddress)),
  );
const httpsAgents =
  proxyGlobals.goalixHttpsAgents ??
  AGENT_LOCAL_ADDRESSES.map((localAddress) =>
    new https.Agent(createAgentOptions(localAddress)),
  );

proxyGlobals.goalixHttpAgents = httpAgents;
proxyGlobals.goalixHttpsAgents = httpsAgents;

let upstreamAgentCursor = 0;

function pickAgent(agents: http.Agent[] | https.Agent[]) {
  const agent = agents[upstreamAgentCursor % agents.length];
  upstreamAgentCursor =
    (upstreamAgentCursor + 1) % Number.MAX_SAFE_INTEGER;
  return agent;
}

function getApiUrl() {
  return (
    process.env.GOALIX_INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
}

function copyRequestHeaders(
  request: NextRequest,
  target: URL,
  requestId: string,
): http.OutgoingHttpHeaders {
  const headers: http.OutgoingHttpHeaders = {};
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  headers.host = target.host;
  headers["x-request-id"] = requestId;
  headers["x-forwarded-host"] = request.headers.get("host") || "";
  headers["x-forwarded-proto"] = request.nextUrl.protocol.replace(":", "");
  return headers;
}

function copyResponseHeaders(upstream: http.IncomingMessage) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(upstream.headers)) {
    if (
      value === undefined ||
      HOP_BY_HOP_HEADERS.has(key.toLowerCase())
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
    } else {
      headers.set(key, String(value));
    }
  }

  return headers;
}

function requestUpstream(
  target: URL,
  request: NextRequest,
  body: ReadableStream<Uint8Array> | null,
  requestId: string,
) {
  const transport = target.protocol === "https:" ? https : http;
  const agent =
    target.protocol === "https:"
      ? pickAgent(httpsAgents)
      : pickAgent(httpAgents);

  return new Promise<Response>((resolve, reject) => {
    const upstreamRequest = transport.request(
      target,
      {
        method: request.method,
        headers: copyRequestHeaders(request, target, requestId),
        agent,
      },
      (upstreamResponse) => {
        const responseBody =
          request.method === "HEAD"
            ? null
            : (Readable.toWeb(
                upstreamResponse,
              ) as ReadableStream<Uint8Array>);

        resolve(
          new Response(responseBody, {
            status: upstreamResponse.statusCode || 502,
            statusText: upstreamResponse.statusMessage,
            headers: copyResponseHeaders(upstreamResponse),
          }),
        );
      },
    );

    upstreamRequest.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      upstreamRequest.destroy(
        new Error(`Goalix upstream timed out after ${UPSTREAM_TIMEOUT_MS}ms`),
      );
    });
    upstreamRequest.once("error", reject);
    request.signal.addEventListener(
      "abort",
      () => upstreamRequest.destroy(new Error("Client request aborted")),
      { once: true },
    );

    if (!body) {
      upstreamRequest.end();
      return;
    }

    let receivedBytes = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_PROXY_BODY_BYTES) {
          callback(new PayloadTooLargeError("Request body is too large"));
          return;
        }
        callback(null, chunk);
      },
    });
    limiter.once("error", (error) => upstreamRequest.destroy(error));
    Readable.fromWeb(
      body as unknown as NodeReadableStream<Uint8Array>,
    ).pipe(limiter).pipe(upstreamRequest);
  });
}

let proxyFailureCount = 0;

function requestIdFor(request: NextRequest) {
  const supplied = request.headers.get("x-request-id")?.trim() || "";
  return UUID_PATTERN.test(supplied) ? supplied : randomUUID();
}

function encodedPathSegment(value: string) {
  const decoded = decodeURIComponent(value);
  if (
    !decoded ||
    decoded === "." ||
    decoded === ".." ||
    decoded.includes("/") ||
    decoded.includes("\\") ||
    decoded.includes("\0")
  ) {
    throw new Error("Invalid API path");
  }
  return encodeURIComponent(decoded);
}

async function proxyApiRequest(
  request: NextRequest,
  context: ApiRouteContext,
) {
  const requestId = requestIdFor(request);
  const params = await context.params;
  let path: string[];
  try {
    const fallbackPath = request.nextUrl.pathname
      .replace(/^\/api\/v1\/?/, "")
      .split("/")
      .filter(Boolean);
    path = (params.path?.length ? params.path : fallbackPath).map(
      encodedPathSegment,
    );
  } catch {
    return Response.json(
      {
        success: false,
        error: {
          code: "INVALID_API_PATH",
          message: "The requested API path is invalid.",
          details: [],
        },
        meta: { requestId, timestamp: new Date().toISOString() },
      },
      {
        status: 400,
        headers: { "cache-control": "no-store", "x-request-id": requestId },
      },
    );
  }
  const target = new URL(
    `/api/v1/${path.join("/")}${request.nextUrl.search}`,
    getApiUrl(),
  );
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_PROXY_BODY_BYTES) {
    return Response.json(
      {
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "The request body is too large.",
          details: [],
        },
        meta: { requestId, timestamp: new Date().toISOString() },
      },
      {
        status: 413,
        headers: { "cache-control": "no-store", "x-request-id": requestId },
      },
    );
  }

  try {
    return await requestUpstream(
      target,
      request,
      hasBody ? request.body : null,
      requestId,
    );
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return Response.json(
        {
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "The request body is too large.",
            details: [],
          },
          meta: { requestId, timestamp: new Date().toISOString() },
        },
        {
          status: 413,
          headers: { "cache-control": "no-store", "x-request-id": requestId },
        },
      );
    }
    proxyFailureCount += 1;
    if (proxyFailureCount === 1 || proxyFailureCount % 100 === 0) {
      console.error("Goalix API proxy connection failed", {
        target: target.origin,
        method,
        failures: proxyFailureCount,
        cause: error instanceof Error ? error.message : String(error),
      });
    }

    return Response.json(
      {
        success: false,
        error: {
          code: "BACKEND_UNAVAILABLE",
          message:
            "The Goalix server is restarting or temporarily unavailable. Please try again.",
          details: [],
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
          "retry-after": "2",
          "x-request-id": requestId,
        },
      },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = proxyApiRequest;
export const HEAD = proxyApiRequest;
export const POST = proxyApiRequest;
export const PUT = proxyApiRequest;
export const PATCH = proxyApiRequest;
export const DELETE = proxyApiRequest;
export const OPTIONS = proxyApiRequest;
