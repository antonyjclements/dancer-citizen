import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export function jsonResponse(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": headers["cache-control"] ?? "public, max-age=60, stale-while-revalidate=300",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function htmlResponse(
  statusCode: number,
  body: string,
  headers: Record<string, string> = {},
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": headers["cache-control"] ?? "public, max-age=60, stale-while-revalidate=300",
      ...headers,
    },
    body,
  };
}

export function notFoundResponse() {
  return jsonResponse(404, { error: "Not found" }, { "cache-control": "no-store" });
}
