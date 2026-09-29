import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { GetItemCommand, ScanCommand, type AttributeValue, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CognitoIdentityProviderClient, GetUserCommand, InitiateAuthCommand, RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { CognitoJwtVerifier } from "aws-jwt-verify";
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
const cognito = new CognitoIdentityProviderClient({});
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | undefined;
let verifierConfig = "";
const signedUrlTtlSeconds = Number(process.env.SUBMISSION_DOWNLOAD_URL_TTL_SECONDS || 60 * 5);

function noStoreHeaders(extra: Record<string, string> = {}) {
  return { "cache-control": "no-store", ...extra };
}

function assertAdminConfig() {
  const userPoolId = process.env.SUBMISSIONS_ADMIN_USER_POOL_ID;
  const clientId = process.env.SUBMISSIONS_ADMIN_CLIENT_ID;
  const tableName = process.env.SUBMISSIONS_TABLE_NAME;
  if (!userPoolId || !clientId || !tableName) {
    throw new Error("Admin submissions configuration is missing");
  }
  return { userPoolId, clientId, tableName };
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

function sessionCookie(token: string, maxAgeSeconds: number) {
  const secure = process.env.SUBMISSIONS_ADMIN_COOKIE_SECURE === "false" ? "" : "; Secure";
  return `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAgeSeconds}`;
}

function cookieValue(event: APIGatewayProxyEventV2, name: string) {
  const cookies = event.cookies ?? event.headers.cookie?.split(/;\s*/) ?? event.headers.Cookie?.split(/;\s*/) ?? [];
  const match = cookies.find((entry) => entry.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

export async function requireAdmin(event: APIGatewayProxyEventV2) {
  const { userPoolId, clientId } = assertAdminConfig();
  const token = cookieValue(event, sessionCookieName);
  if (!token) return false;
  const configKey = `${userPoolId}:${clientId}`;
  if (!verifier || verifierConfig !== configKey) {
    verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "access" });
    verifierConfig = configKey;
  }
  try {
    await verifier.verify(token);
  } catch {
    return false;
  }
  // Cognito checks revocation and disabled accounts, beyond local JWT validation.
  try {
    await cognito.send(new GetUserCommand({ AccessToken: token }));
    return true;
  } catch (error) {
    if (error instanceof Error && ["NotAuthorizedException", "UserNotFoundException"].includes(error.name)) return false;
    throw error;
  }
}

function unauthorized() {
  return jsonResponse(401, { error: "Sign in to access submissions." }, noStoreHeaders());
}

function validJsonRequest(event: APIGatewayProxyEventV2) {
  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  // JSON forces a CORS preflight; Fetch Metadata also rejects cross-site browser posts.
  return contentType.split(";")[0].trim().toLowerCase() === "application/json" &&
    event.headers["sec-fetch-site"] !== "cross-site";
}

export async function loginAdmin(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  if (!validJsonRequest(event)) return jsonResponse(400, { error: "Invalid login request." }, noStoreHeaders());
  const { clientId } = assertAdminConfig();
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
    body = parsed;
  } catch {
    return jsonResponse(400, { error: "Invalid login request." }, noStoreHeaders());
  }
  const { username, password, session, newPassword } = body;
  if (typeof username !== "string" || !username || username.length > 128 ||
      (session === undefined ? typeof password !== "string" || !password || password.length > 256 :
        typeof session !== "string" || !session || session.length > 4096 || typeof newPassword !== "string" || !newPassword || newPassword.length > 256)) {
    return jsonResponse(400, { error: "Enter a username and password." }, noStoreHeaders());
  }
  try {
    const result = session === undefined
      ? await cognito.send(new InitiateAuthCommand({
        ClientId: clientId, AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: { USERNAME: username, PASSWORD: password as string },
      }))
      : await cognito.send(new RespondToAuthChallengeCommand({
        ClientId: clientId, ChallengeName: "NEW_PASSWORD_REQUIRED", Session: session as string,
        ChallengeResponses: { USERNAME: username, NEW_PASSWORD: newPassword as string },
      }));
    if (result.ChallengeName === "NEW_PASSWORD_REQUIRED" && result.Session) {
      return jsonResponse(200, {
        challenge: "NEW_PASSWORD_REQUIRED", session: result.Session,
        username: result.ChallengeParameters?.USER_ID_FOR_SRP || username,
      }, noStoreHeaders());
    }
    const auth = result.AuthenticationResult;
    if (!auth?.AccessToken || !auth.ExpiresIn) {
      return jsonResponse(409, { error: "This account requires additional setup. Contact the site maintainer." }, noStoreHeaders());
    }
    return {
      ...jsonResponse(200, { ok: true }, noStoreHeaders()),
      cookies: [sessionCookie(auth.AccessToken, Math.min(auth.ExpiresIn, 3600))],
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (["NotAuthorizedException", "UserNotFoundException", "UserNotConfirmedException", "PasswordResetRequiredException", "CodeMismatchException", "ExpiredCodeException"].includes(name)) {
      return jsonResponse(401, { error: "Unable to sign in. Check your credentials or contact the site maintainer." }, noStoreHeaders());
    }
    if (["InvalidPasswordException", "InvalidParameterException"].includes(name)) {
      return jsonResponse(400, { error: "Password must have at least 12 characters, uppercase and lowercase letters, a number and a symbol. Restart sign-in if your setup session expired." }, noStoreHeaders());
    }
    if (name === "TooManyRequestsException") return jsonResponse(429, { error: "Too many attempts. Try again shortly." }, noStoreHeaders());
    throw error;
  }
}

export function logoutAdmin(event: APIGatewayProxyEventV2): APIGatewayProxyStructuredResultV2 {
  if (!validJsonRequest(event)) return jsonResponse(400, { error: "Invalid logout request." }, noStoreHeaders());
  return {
    ...jsonResponse(200, { ok: true }, noStoreHeaders()),
    cookies: [sessionCookie("", 0)],
  };
}

export async function listSubmissions(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  if (!await requireAdmin(event)) return unauthorized();

  const config = assertAdminConfig();
  const query = (event.queryStringParameters?.q || "").trim().toLowerCase();
  const cursor = event.queryStringParameters?.cursor;
  if (query.length > 200) return jsonResponse(400, { error: "Search must be at most 200 characters." }, noStoreHeaders());
  let startKey: Record<string, AttributeValue> | undefined;
  if (cursor) {
    try {
      if (cursor.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error("Invalid cursor");
      const id: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
      if (typeof id !== "string" || !id || Buffer.byteLength(id) > 2048) throw new Error("Invalid cursor");
      startKey = { submissionId: { S: id } };
    } catch {
      return jsonResponse(400, { error: "Invalid continuation cursor." }, noStoreHeaders());
    }
  }
  const result = await dynamo.send(new ScanCommand({
    TableName: config.tableName,
    Limit: 100,
    ExclusiveStartKey: startKey,
  }));
  const submissions = (result.Items ?? [])
    .filter((item) => !query || [item.name, item.email, item.title, item.abstract].some((value) => text(value).toLowerCase().includes(query)))
    .map(listItem)
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  const lastId = text(result.LastEvaluatedKey?.submissionId);
  const nextCursor = lastId ? Buffer.from(JSON.stringify(lastId)).toString("base64url") : null;
  return jsonResponse(200, { submissions, nextCursor }, noStoreHeaders());
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
  if (!await requireAdmin(event)) return unauthorized();

  const item = await getSubmission(submissionId);
  if (!item) return jsonResponse(404, { error: "Submission not found" }, noStoreHeaders());

  return jsonResponse(200, { submission: detailItem(item) }, noStoreHeaders());
}

export async function getSubmissionDownload(event: APIGatewayProxyEventV2, submissionId: string): Promise<APIGatewayProxyStructuredResultV2> {
  if (!await requireAdmin(event)) return unauthorized();

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
