import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { GetItemCommand, ScanCommand, type AttributeValue, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { jsonResponse } from "./http";

type SubmissionListItem = {
  submissionId: string;
  submittedAt: string;
  updatedAt: string;
  status: string;
  name: string;
  email: string;
  title: string;
  hasFile: boolean;
};

type SubmissionDetail = SubmissionListItem & {
  abstract: string;
  videoUrl: string;
  date: string;
  file: {
    filename: string;
    contentType: string;
    size: number;
  } | null;
};

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});
const sessionCookieName = "dc_admin_session";
const sessionTtlSeconds = Number(process.env.SUBMISSIONS_ADMIN_SESSION_TTL_SECONDS || 60 * 60 * 8);
const signedUrlTtlSeconds = Number(process.env.SUBMISSION_DOWNLOAD_URL_TTL_SECONDS || 60 * 5);

function noStoreHeaders(extra: Record<string, string> = {}) {
  return { "cache-control": "no-store", ...extra };
}

function adminConfig() {
  return {
    username: process.env.SUBMISSIONS_ADMIN_USERNAME,
    passwordHash: process.env.SUBMISSIONS_ADMIN_PASSWORD_HASH,
    sessionSecret: process.env.SUBMISSIONS_ADMIN_SESSION_SECRET,
    tableName: process.env.SUBMISSIONS_TABLE_NAME,
  };
}

function assertAdminConfig() {
  const config = adminConfig();
  if (!config.username || !config.passwordHash || !config.sessionSecret || !config.tableName) {
    throw new Error("Admin submissions configuration is missing");
  }
  return config as {
    username: string;
    passwordHash: string;
    sessionSecret: string;
    tableName: string;
  };
}

function text(value: AttributeValue | undefined): string {
  return value && "S" in value ? value.S ?? "" : "";
}

function number(value: AttributeValue | undefined): number {
  return value && "N" in value ? Number(value.N ?? 0) : 0;
}

function fileMetadata(item: Record<string, AttributeValue> | undefined) {
  const file = item?.file;
  if (!file || !("M" in file) || !file.M) return null;

  return {
    bucket: text(file.M.bucket),
    key: text(file.M.key),
    filename: text(file.M.filename),
    contentType: text(file.M.contentType),
    size: number(file.M.size),
  };
}

function listItem(item: Record<string, AttributeValue>): SubmissionListItem {
  const file = fileMetadata(item);
  return {
    submissionId: text(item.submissionId),
    submittedAt: text(item.submittedAt),
    updatedAt: text(item.updatedAt),
    status: text(item.status),
    name: text(item.name),
    email: text(item.email),
    title: text(item.title),
    hasFile: Boolean(file?.key),
  };
}

function detailItem(item: Record<string, AttributeValue>): SubmissionDetail {
  const file = fileMetadata(item);
  return {
    ...listItem(item),
    abstract: text(item.abstract),
    videoUrl: text(item.videoUrl),
    date: text(item.date),
    file: file ? {
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
    } : null,
  };
}

function base64url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function sessionCookie(token: string, maxAgeSeconds: number) {
  const secure = process.env.SUBMISSIONS_ADMIN_COOKIE_SECURE === "false" ? "" : "; Secure";
  return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAgeSeconds}`;
}

function hashPassword(password: string) {
  return `sha256:${createHash("sha256").update(password).digest("hex")}`;
}

function timingSafeTextEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function validCredentials(username: string, password: string) {
  const config = assertAdminConfig();
  return timingSafeTextEqual(username, config.username) &&
    timingSafeTextEqual(hashPassword(password), config.passwordHash);
}

function createSessionToken() {
  const config = assertAdminConfig();
  const payload = base64url(JSON.stringify({
    sub: config.username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds,
  }));
  return `${payload}.${sign(payload, config.sessionSecret)}`;
}

function cookieValue(event: APIGatewayProxyEventV2, name: string) {
  const cookies = event.cookies ?? event.headers.cookie?.split(/;\s*/) ?? event.headers.Cookie?.split(/;\s*/) ?? [];
  const match = cookies.find((entry) => entry.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

function isAuthorized(event: APIGatewayProxyEventV2) {
  const config = assertAdminConfig();
  const token = cookieValue(event, sessionCookieName);
  const [payload, signature] = token?.split(".") ?? [];

  if (!payload || !signature) return false;
  if (!timingSafeTextEqual(sign(payload, config.sessionSecret), signature)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    return parsed.sub === config.username && typeof parsed.exp === "number" && parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function unauthorized() {
  return jsonResponse(401, { error: "Unauthorized" }, noStoreHeaders());
}

function parseJsonBody(event: APIGatewayProxyEventV2) {
  if (!event.body) return {};
  const value = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  return JSON.parse(value);
}

export async function loginAdmin(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const body = parseJsonBody(event) as { username?: string; password?: string };

  if (!validCredentials(body.username ?? "", body.password ?? "")) {
    return unauthorized();
  }

  const token = createSessionToken();
  return {
    ...jsonResponse(200, { ok: true }, noStoreHeaders()),
    cookies: [sessionCookie(token, sessionTtlSeconds)],
  };
}

export function logoutAdmin(): APIGatewayProxyStructuredResultV2 {
  return {
    ...jsonResponse(200, { ok: true }, noStoreHeaders()),
    cookies: [sessionCookie("", 0)],
  };
}

export function requireAdmin(event: APIGatewayProxyEventV2) {
  return isAuthorized(event);
}

export async function listSubmissions(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  if (!requireAdmin(event)) return unauthorized();

  const config = assertAdminConfig();
  const result = await dynamo.send(new ScanCommand({
    TableName: config.tableName,
    Limit: 100,
  }));
  const submissions = (result.Items ?? [])
    .map(listItem)
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));

  return jsonResponse(200, { submissions }, noStoreHeaders());
}

async function getSubmission(submissionId: string) {
  const config = assertAdminConfig();
  const result = await dynamo.send(new GetItemCommand({
    TableName: config.tableName,
    Key: { submissionId: { S: submissionId } },
  }));
  return result.Item;
}

export async function getSubmissionDetail(event: APIGatewayProxyEventV2, submissionId: string): Promise<APIGatewayProxyStructuredResultV2> {
  if (!requireAdmin(event)) return unauthorized();

  const item = await getSubmission(submissionId);
  if (!item) return jsonResponse(404, { error: "Submission not found" }, noStoreHeaders());

  return jsonResponse(200, { submission: detailItem(item) }, noStoreHeaders());
}

export async function getSubmissionDownload(event: APIGatewayProxyEventV2, submissionId: string): Promise<APIGatewayProxyStructuredResultV2> {
  if (!requireAdmin(event)) return unauthorized();

  const item = await getSubmission(submissionId);
  if (!item) return jsonResponse(404, { error: "Submission not found" }, noStoreHeaders());

  const file = fileMetadata(item);
  if (!file?.bucket || !file.key) return jsonResponse(404, { error: "Submission has no file" }, noStoreHeaders());

  const url = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: file.bucket,
    Key: file.key,
    ResponseContentDisposition: `attachment; filename="${file.filename.replace(/"/g, "")}"`,
  }), { expiresIn: signedUrlTtlSeconds });

  return jsonResponse(200, { url, expiresIn: signedUrlTtlSeconds }, noStoreHeaders());
}
