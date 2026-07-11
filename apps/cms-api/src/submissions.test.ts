import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

const aws = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: vi.fn(() => ({ send: aws.send })),
  PutItemCommand: class {
    readonly commandName = "PutItemCommand";
    readonly input: any;

    constructor(input: any) {
      this.input = input;
    }
  },
  UpdateItemCommand: class {
    readonly commandName = "UpdateItemCommand";
    readonly input: any;

    constructor(input: any) {
      this.input = input;
    }
  },
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({ send: aws.send })),
  DeleteObjectCommand: class {
    readonly commandName = "DeleteObjectCommand";
    readonly input: any;

    constructor(input: any) {
      this.input = input;
    }
  },
  PutObjectCommand: class {
    readonly commandName = "PutObjectCommand";
    readonly input: any;

    constructor(input: any) {
      this.input = input;
    }
  },
}));

vi.mock("@aws-sdk/client-ses", () => ({
  SESClient: vi.fn(() => ({ send: aws.send })),
  SendEmailCommand: class {
    readonly commandName = "SendEmailCommand";
    readonly input: any;

    constructor(input: any) {
      this.input = input;
    }
  },
}));

import { createSubmission } from "./submissions";

type MultipartInput = {
  name: string;
  value: string | Buffer;
  filename?: string;
  contentType?: string;
};

const boundary = "----submission-test-boundary";
const clientSubmissionId = "11111111-1111-4111-8111-111111111111";

function multipartEvent(parts: MultipartInput[]): APIGatewayProxyEventV2 {
  const buffers: Buffer[] = [];

  for (const part of parts) {
    buffers.push(Buffer.from(`--${boundary}\r\n`));
    buffers.push(Buffer.from(`Content-Disposition: form-data; name="${part.name}"`));
    if (part.filename) buffers.push(Buffer.from(`; filename="${part.filename}"`));
    buffers.push(Buffer.from("\r\n"));
    if (part.contentType) buffers.push(Buffer.from(`Content-Type: ${part.contentType}\r\n`));
    buffers.push(Buffer.from("\r\n"));
    buffers.push(Buffer.isBuffer(part.value) ? part.value : Buffer.from(part.value));
    buffers.push(Buffer.from("\r\n"));
  }

  buffers.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    version: "2.0",
    routeKey: "POST /cms/submissions",
    rawPath: "/cms/submissions",
    rawQueryString: "",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat(buffers).toString("base64"),
    isBase64Encoded: true,
    requestContext: {
      accountId: "test",
      apiId: "test",
      domainName: "example.test",
      domainPrefix: "example",
      http: {
        method: "POST",
        path: "/cms/submissions",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "vitest",
      },
      requestId: "test-request",
      routeKey: "POST /cms/submissions",
      stage: "$default",
      time: "01/Jan/2026:00:00:00 +0000",
      timeEpoch: 1767225600000,
    },
  } as APIGatewayProxyEventV2;
}

function requiredParts(extra: MultipartInput[] = []): MultipartInput[] {
  return [
    { name: "clientSubmissionId", value: clientSubmissionId },
    { name: "recaptchaToken", value: "recaptcha-token" },
    { name: "name", value: "Ada Lovelace" },
    { name: "email", value: "ada@example.com" },
    { name: "title", value: "Dancing Systems" },
    { name: "certification", value: "true" },
    ...extra,
  ];
}

describe("createSubmission", () => {
  beforeEach(() => {
    aws.send.mockReset();
    aws.send.mockResolvedValue({});
    process.env.SUBMISSION_FILES_BUCKET = "submission-files";
    process.env.SUBMISSIONS_TABLE_NAME = "submissions";
    process.env.SUBMISSION_EMAIL_FROM = "info@dancercitizen.org";
    process.env.SUBMISSION_EMAIL_TO = "info@dancercitizen.org,editors@dancercitizen.org";
    process.env.SUBMISSION_RECAPTCHA_SECRET = "recaptcha-secret";
    process.env.SUBMISSION_RECAPTCHA_ACTION = "submission";
    process.env.SUBMISSION_RECAPTCHA_MIN_SCORE = "0.5";
    vi.stubGlobal("fetch", vi.fn(async () => ({
      json: async () => ({ success: true, score: 0.9, action: "submission", hostname: "example.test" }),
    })));
  });

  it("stores a valid submission, uploads the file, and sends notification email", async () => {
    const response = await createSubmission(multipartEvent(requiredParts([
      { name: "abstract", value: "A short abstract." },
      { name: "videoUrl", value: "https://example.com/video" },
      { name: "file", filename: "paper.pdf", contentType: "application/pdf", value: Buffer.from("%PDF-1.7\nbody") },
    ])));

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body || "{}").submissionId).toBe(clientSubmissionId);
    expect(aws.send.mock.calls.map(([command]) => command.commandName)).toEqual([
      "PutItemCommand",
      "PutObjectCommand",
      "UpdateItemCommand",
      "SendEmailCommand",
      "UpdateItemCommand",
    ]);
    expect(aws.send.mock.calls[1][0].input).toMatchObject({
      Bucket: "submission-files",
      Key: `submissions/${clientSubmissionId}/paper.pdf`,
      ContentType: "application/pdf",
    });
  });

  it("rejects honeypot submissions before calling AWS", async () => {
    const response = await createSubmission(multipartEvent(requiredParts([
      { name: "website", value: "https://spam.example" },
    ])));

    expect(response.statusCode).toBe(400);
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("rejects missing recaptcha tokens before calling AWS", async () => {
    const response = await createSubmission(multipartEvent(requiredParts([
      { name: "recaptchaToken", value: "" },
    ])));

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body || "{}").errors).toContain("Human verification is required.");
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("rejects failed recaptcha verification before calling AWS", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
    })));

    const response = await createSubmission(multipartEvent(requiredParts()));

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body || "{}").errors).toContain("Human verification failed.");
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("rejects low recaptcha scores before calling AWS", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      json: async () => ({ success: true, score: 0.1, action: "submission" }),
    })));

    const response = await createSubmission(multipartEvent(requiredParts()));

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body || "{}").errors).toContain("Human verification failed.");
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types before calling AWS", async () => {
    const response = await createSubmission(multipartEvent(requiredParts([
      { name: "file", filename: "payload.exe", contentType: "application/octet-stream", value: Buffer.from("MZ") },
    ])));

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body || "{}").errors).toContain("Attached file must be a PDF, DOC, DOCX, RTF, or TXT file.");
    expect(aws.send).not.toHaveBeenCalled();
  });

  it("records notification failures without failing the accepted submission", async () => {
    aws.send.mockImplementation(async (command: { commandName: string }) => {
      if (command.commandName === "SendEmailCommand") throw new Error("SES unavailable");
      return {};
    });

    const response = await createSubmission(multipartEvent(requiredParts()));

    expect(response.statusCode).toBe(201);
    expect(aws.send.mock.calls.map(([command]) => command.commandName)).toEqual([
      "PutItemCommand",
      "UpdateItemCommand",
      "SendEmailCommand",
      "UpdateItemCommand",
    ]);
    expect(aws.send.mock.calls[3][0].input.ExpressionAttributeValues[":status"].S).toBe("notification_failed");
  });
});
