import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handler } from "./handler";

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";

function requestBody(request: IncomingMessage): Promise<Buffer | undefined> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    request.on("error", reject);
  });
}

function requestHeaders(request: IncomingMessage): Record<string, string> {
  return Object.fromEntries(
    Object.entries(request.headers).flatMap(([key, value]) => {
      if (Array.isArray(value)) return [[key, value.join(", ")]];
      return typeof value === "string" ? [[key, value]] : [];
    }),
  );
}

function queryParameters(url: URL): Record<string, string> | undefined {
  const entries = Array.from(url.searchParams.entries());
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function cookies(request: IncomingMessage): string[] | undefined {
  const value = request.headers.cookie;
  return typeof value === "string" ? value.split(/;\s*/) : undefined;
}

async function proxyRequest(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
  const body = await requestBody(request);
  const isMultipart = request.headers["content-type"]?.includes("multipart/form-data") ?? false;
  const result = await handler({
    version: "2.0",
    routeKey: "$default",
    rawPath: url.pathname,
    rawQueryString: url.searchParams.toString(),
    headers: requestHeaders(request),
    queryStringParameters: queryParameters(url),
    cookies: cookies(request),
    requestContext: {
      http: { method: request.method || "GET", path: url.pathname, protocol: "HTTP/1.1", sourceIp: "127.0.0.1", userAgent: request.headers["user-agent"] || "" },
    } as APIGatewayProxyEventV2["requestContext"],
    body: body ? (isMultipart ? body.toString("base64") : body.toString("utf8")) : undefined,
    isBase64Encoded: isMultipart,
  });

  for (const [key, value] of Object.entries(result.headers ?? {})) {
    response.setHeader(key, String(value));
  }

  if (result.cookies?.length) {
    response.setHeader("set-cookie", result.cookies);
  }

  response.statusCode = result.statusCode ?? 200;
  response.end(result.body ? (result.isBase64Encoded ? Buffer.from(result.body, "base64") : result.body) : "");
}

createServer((request, response) => {
  proxyRequest(request, response).catch((error) => {
    console.error(error);
    response.statusCode = 500;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: "Local CMS API dev server error" }));
  });
}).listen(port, host, () => {
  console.log(`CMS API dev server listening at http://${host}:${port}`);
});
