import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { randomUUID } from "node:crypto";
import { jsonResponse } from "./http";

type MultipartPart = {
  name: string;
  filename?: string;
  contentType?: string;
  body: Buffer;
};

type SubmissionFields = {
  name: string;
  dateMonth: string;
  dateDay: string;
  dateYear: string;
  email: string;
  title: string;
  abstract: string;
  videoUrl: string;
  certification: string;
  website: string;
  clientSubmissionId: string;
  recaptchaToken: string;
};

type StoredFile = {
  bucket: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
} | null;

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});
const ses = new SESClient({});

const maxFileBytes = Number(process.env.SUBMISSION_MAX_FILE_BYTES || 8 * 1024 * 1024);
const allowedExtensions = new Set([".doc", ".docx", ".pdf", ".rtf", ".txt"]);
const allowedContentTypes = new Set([
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

async function verifyRecaptcha(token: string, remoteIp: string | undefined): Promise<string | null> {
  if (process.env.SUBMISSION_RECAPTCHA_DISABLED === "true") return null;

  const secret = process.env.SUBMISSION_RECAPTCHA_SECRET;
  if (!secret) throw new Error("SUBMISSION_RECAPTCHA_SECRET is not configured");
  if (!token) return "Human verification is required.";

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json() as { success?: boolean; score?: number; action?: string; hostname?: string };
  const minimumScore = Number(process.env.SUBMISSION_RECAPTCHA_MIN_SCORE || 0.5);
  const expectedAction = process.env.SUBMISSION_RECAPTCHA_ACTION || "submission";

  if (!payload.success) return "Human verification failed.";
  if (payload.action && payload.action !== expectedAction) return "Human verification failed.";
  if (typeof payload.score === "number" && payload.score < minimumScore) return "Human verification failed.";

  return null;
}

function text(part: MultipartPart | undefined): string {
  return part?.body.toString("utf8").trim() ?? "";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    if (character === "\"") return "&quot;";
    return "&#39;";
  });
}

function safeFilename(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim() || "attachment";
}

function extensionFor(filename: string): string {
  const match = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "";
}

function looksLikeDeclaredFileType(file: MultipartPart): boolean {
  const extension = extensionFor(file.filename || "");
  const contentType = file.contentType?.toLowerCase();

  if (!allowedExtensions.has(extension)) return false;
  if (contentType && !allowedContentTypes.has(contentType)) return false;

  if (extension === ".pdf") return file.body.subarray(0, 4).toString("utf8") === "%PDF";
  if (extension === ".docx") return file.body.subarray(0, 2).toString("utf8") === "PK";
  if (extension === ".rtf") return file.body.subarray(0, 5).toString("utf8") === "{\\rtf";
  if (extension === ".doc") return file.body.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
  if (extension === ".txt") return !file.body.includes(0);

  return false;
}

function boundaryFromContentType(contentType: string | undefined): string | null {
  const match = contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match?.[1] || match?.[2]?.trim() || null;
}

function parseContentDisposition(value: string | undefined) {
  const result: { name?: string; filename?: string } = {};

  for (const part of value?.split(";") ?? []) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    const key = rawKey.toLowerCase();
    const parsed = rawValue.join("=").replace(/^"|"$/g, "");

    if (key === "name") result.name = parsed;
    if (key === "filename") result.filename = parsed;
  }

  return result;
}

function parseMultipart(body: Buffer, boundary: string): MultipartPart[] {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts: MultipartPart[] = [];
  let cursor = body.indexOf(delimiter);

  while (cursor !== -1) {
    cursor += delimiter.length;
    if (body.subarray(cursor, cursor + 2).toString() === "--") break;
    if (body.subarray(cursor, cursor + 2).toString() === "\r\n") cursor += 2;

    const next = body.indexOf(delimiter, cursor);
    if (next === -1) break;

    let part = body.subarray(cursor, next);
    if (part.subarray(part.length - 2).toString() === "\r\n") {
      part = part.subarray(0, part.length - 2);
    }

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd !== -1) {
      const headers = Object.fromEntries(
        part.subarray(0, headerEnd).toString("utf8").split("\r\n").flatMap((line) => {
          const separator = line.indexOf(":");
          if (separator === -1) return [];
          return [[line.slice(0, separator).toLowerCase(), line.slice(separator + 1).trim()]];
        }),
      );
      const disposition = parseContentDisposition(headers["content-disposition"]);

      if (disposition.name) {
        parts.push({
          name: disposition.name,
          filename: disposition.filename,
          contentType: headers["content-type"],
          body: part.subarray(headerEnd + 4),
        });
      }
    }

    cursor = next;
  }

  return parts;
}

function validate(fields: SubmissionFields, file: MultipartPart | undefined): string[] {
  const errors: string[] = [];

  if (!fields.name) errors.push("Name is required.");
  if (!fields.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.push("A valid email is required.");
  if (!fields.title) errors.push("Title of work is required.");
  if (fields.certification !== "true") errors.push("Certification is required.");
  if (fields.videoUrl && !/^https?:\/\/\S+$/i.test(fields.videoUrl)) errors.push("Link to video must be a URL.");
  if (file && file.body.length > maxFileBytes) errors.push(`Attached file must be smaller than ${Math.round(maxFileBytes / 1024 / 1024)} MB.`);
  if (file?.filename && file.body.length > 0 && !looksLikeDeclaredFileType(file)) {
    errors.push("Attached file must be a PDF, DOC, DOCX, RTF, or TXT file.");
  }

  return errors;
}

async function storeFile(submissionId: string, file: MultipartPart | undefined): Promise<StoredFile> {
  if (!file?.filename || file.body.length === 0) return null;

  const bucket = process.env.SUBMISSION_FILES_BUCKET;
  if (!bucket) throw new Error("SUBMISSION_FILES_BUCKET is not configured");

  const filename = safeFilename(file.filename);
  const key = `submissions/${submissionId}/${filename}`;
  const contentType = file.contentType || "application/octet-stream";

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.body,
    ContentType: contentType,
    Metadata: {
      "submission-id": submissionId,
    },
  }));

  return { bucket, key, filename, contentType, size: file.body.length };
}

async function storeRecord(submissionId: string, fields: SubmissionFields, submittedAt: string) {
  const table = process.env.SUBMISSIONS_TABLE_NAME;
  if (!table) throw new Error("SUBMISSIONS_TABLE_NAME is not configured");

  await dynamo.send(new PutItemCommand({
    TableName: table,
    Item: {
      submissionId: { S: submissionId },
      submittedAt: { S: submittedAt },
      status: { S: "received" },
      name: { S: fields.name },
      date: { S: [fields.dateYear, fields.dateMonth, fields.dateDay].filter(Boolean).join("-") },
      email: { S: fields.email },
      title: { S: fields.title },
      abstract: { S: fields.abstract },
      videoUrl: { S: fields.videoUrl },
      certification: { BOOL: fields.certification === "true" },
      file: { NULL: true },
    },
    ConditionExpression: "attribute_not_exists(submissionId)",
  }));
}

async function updateRecord(submissionId: string, file: StoredFile, status: "stored" | "notified" | "notification_failed" | "file_failed", error?: unknown) {
  const table = process.env.SUBMISSIONS_TABLE_NAME;
  if (!table) throw new Error("SUBMISSIONS_TABLE_NAME is not configured");

  const expressionAttributeNames: Record<string, string> = {
    "#status": "status",
    "#updatedAt": "updatedAt",
  };
  const expressionAttributeValues: Record<string, any> = {
    ":status": { S: status },
    ":updatedAt": { S: new Date().toISOString() },
  };
  const assignments = ["#status = :status", "#updatedAt = :updatedAt"];

  if (file) {
    expressionAttributeNames["#file"] = "file";
    expressionAttributeValues[":file"] = { M: {
      bucket: { S: file.bucket },
      key: { S: file.key },
      filename: { S: file.filename },
      contentType: { S: file.contentType },
      size: { N: String(file.size) },
    } };
    assignments.push("#file = :file");
  }

  if (error) {
    expressionAttributeNames["#error"] = "error";
    expressionAttributeValues[":error"] = { S: error instanceof Error ? error.message : String(error) };
    assignments.push("#error = :error");
  }

  await dynamo.send(new UpdateItemCommand({
    TableName: table,
    Key: { submissionId: { S: submissionId } },
    UpdateExpression: `SET ${assignments.join(", ")}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  }));
}

async function sendNotification(submissionId: string, fields: SubmissionFields, file: StoredFile, submittedAt: string) {
  const source = process.env.SUBMISSION_EMAIL_FROM || "info@dancercitizen.org";
  const destinations = (process.env.SUBMISSION_EMAIL_TO || "info@dancercitizen.org,editors@dancercitizen.org")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const fileLine = file ? `${file.filename} (${file.size} bytes) stored at s3://${file.bucket}/${file.key}` : "No file attached.";
  const body = [
    `A new Dancer-Citizen submission was received.`,
    "",
    `Submission ID: ${submissionId}`,
    `Submitted: ${submittedAt}`,
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    `Date: ${[fields.dateMonth, fields.dateDay, fields.dateYear].filter(Boolean).join("/")}`,
    `Title of Work: ${fields.title}`,
    `Link to Video: ${fields.videoUrl || "Not provided"}`,
    `File: ${fileLine}`,
    "",
    "Abstract:",
    fields.abstract || "Not provided",
  ].join("\n");

  await ses.send(new SendEmailCommand({
    Source: source,
    Destination: { ToAddresses: destinations },
    Message: {
      Subject: { Data: `New Issue 20 submission: ${fields.title}` },
      Body: {
        Text: { Data: body },
        Html: {
          Data: `<p>A new Dancer-Citizen submission was received.</p>
            <dl>
              <dt>Submission ID</dt><dd>${escapeHtml(submissionId)}</dd>
              <dt>Submitted</dt><dd>${escapeHtml(submittedAt)}</dd>
              <dt>Name</dt><dd>${escapeHtml(fields.name)}</dd>
              <dt>Email</dt><dd>${escapeHtml(fields.email)}</dd>
              <dt>Date</dt><dd>${escapeHtml([fields.dateMonth, fields.dateDay, fields.dateYear].filter(Boolean).join("/"))}</dd>
              <dt>Title of Work</dt><dd>${escapeHtml(fields.title)}</dd>
              <dt>Link to Video</dt><dd>${escapeHtml(fields.videoUrl || "Not provided")}</dd>
              <dt>File</dt><dd>${escapeHtml(fileLine)}</dd>
            </dl>
            <h2>Abstract</h2>
            <p>${escapeHtml(fields.abstract || "Not provided")}</p>`,
        },
      },
    },
  }));
}

export async function createSubmission(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const boundary = boundaryFromContentType(event.headers["content-type"] || event.headers["Content-Type"]);
  if (!boundary || !event.body) {
    return jsonResponse(400, { errors: ["Submission form data is required."] }, { "cache-control": "no-store" });
  }

  const body = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
  const parts = parseMultipart(body, boundary);
  const byName = new Map(parts.map((part) => [part.name, part]));
  const file = byName.get("file");
  const fields: SubmissionFields = {
    name: text(byName.get("name")),
    dateMonth: text(byName.get("dateMonth")),
    dateDay: text(byName.get("dateDay")),
    dateYear: text(byName.get("dateYear")),
    email: text(byName.get("email")),
    title: text(byName.get("title")),
    abstract: text(byName.get("abstract")),
    videoUrl: text(byName.get("videoUrl")),
    certification: text(byName.get("certification")),
    website: text(byName.get("website")),
    clientSubmissionId: text(byName.get("clientSubmissionId")),
    recaptchaToken: text(byName.get("recaptchaToken")),
  };

  if (fields.website) {
    return jsonResponse(400, { errors: ["Submission could not be accepted."] }, { "cache-control": "no-store" });
  }

  const recaptchaError = await verifyRecaptcha(fields.recaptchaToken, event.requestContext.http?.sourceIp);
  const errors = [
    ...(recaptchaError ? [recaptchaError] : []),
    ...validate(fields, file),
  ];

  if (errors.length) {
    return jsonResponse(400, { errors }, { "cache-control": "no-store" });
  }

  const submissionId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fields.clientSubmissionId)
    ? fields.clientSubmissionId
    : randomUUID();
  const submittedAt = new Date().toISOString();
  await storeRecord(submissionId, fields, submittedAt);

  let storedFile: StoredFile = null;
  try {
    storedFile = await storeFile(submissionId, file);
    try {
      await updateRecord(submissionId, storedFile, "stored");
    } catch (error) {
      if (storedFile) {
        await s3.send(new DeleteObjectCommand({ Bucket: storedFile.bucket, Key: storedFile.key })).catch(console.error);
      }
      await updateRecord(submissionId, null, "file_failed", error).catch(console.error);
      throw error;
    }
  } catch (error) {
    await updateRecord(submissionId, null, "file_failed", error).catch(console.error);
    throw error;
  }

  try {
    await sendNotification(submissionId, fields, storedFile, submittedAt);
    await updateRecord(submissionId, storedFile, "notified");
  } catch (error) {
    await updateRecord(submissionId, storedFile, "notification_failed", error);
  }

  return jsonResponse(201, { submissionId }, { "cache-control": "no-store" });
}
