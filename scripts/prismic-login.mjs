import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const port = 5555;
const authFilePath = path.join(os.homedir(), ".prismic");
const loginUrl = `https://prismic.io/dashboard/cli/login?source=slice-machine&port=${port}`;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: "Missing request URL." });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/") {
    sendJson(res, 404, { error: "Not found." });
    return;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  try {
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const cookies = Array.isArray(payload.cookies) ? payload.cookies.join("; ") : "";

    if (!payload.email || !cookies) {
      sendJson(res, 400, { error: "Missing email or cookies." });
      return;
    }

    const authState = {
      base: "https://prismic.io",
      cookies,
    };

    await fs.writeFile(authFilePath, `${JSON.stringify(authState, null, 2)}\n`, "utf8");

    sendJson(res, 200, { ok: true });

    console.log(`Saved Prismic auth for ${payload.email} to ${authFilePath}`);
    console.log("You can now restart Slice Machine.");

    server.close(() => {
      process.exit(0);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Listening on http://127.0.0.1:${port}`);
  console.log("Open this URL in your browser to log into Prismic:");
  console.log(loginUrl);
});
