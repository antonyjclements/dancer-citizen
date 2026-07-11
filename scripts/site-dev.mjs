import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { EOL } from "node:os";
import { fileURLToPath } from "node:url";

const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  api: "\x1b[36m",
  react: "\x1b[35m",
  error: "\x1b[31m",
};

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const binDir = join(rootDir, "node_modules", ".bin");

const processes = [
  {
    name: "api",
    color: colors.api,
    command: join(binDir, "tsx"),
    args: ["apps/cms-api/src/dev-server.ts"],
    cwd: rootDir,
  },
  {
    name: "react",
    color: colors.react,
    command: join(binDir, "vite"),
    args: ["--host", "127.0.0.1"],
    cwd: join(rootDir, "apps", "react-site"),
  },
];

let isShuttingDown = false;
const children = new Set();

function prefixStream(stream, name, color, output) {
  let buffered = "";
  const prefix = `${color}${name.padEnd(5)}${colors.reset} ${colors.dim}|${colors.reset} `;

  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buffered += chunk;
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      output.write(`${prefix}${line}${EOL}`);
    }
  });

  stream.on("end", () => {
    if (buffered) {
      output.write(`${prefix}${buffered}${EOL}`);
    }
  });
}

function stopAll(signal = "SIGTERM") {
  if (isShuttingDown) return;
  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const processConfig of processes) {
  const child = spawn(processConfig.command, processConfig.args, {
    cwd: processConfig.cwd,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });

  children.add(child);
  prefixStream(child.stdout, processConfig.name, processConfig.color, process.stdout);
  prefixStream(child.stderr, processConfig.name, processConfig.color, process.stderr);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (!isShuttingDown && code !== 0) {
      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      process.stderr.write(`${colors.error}${processConfig.name} stopped with ${reason}${colors.reset}${EOL}`);
      stopAll();
      process.exitCode = code ?? 1;
    }

    if (children.size === 0) {
      process.exit();
    }
  });
}

process.on("SIGINT", () => stopAll("SIGINT"));
process.on("SIGTERM", () => stopAll("SIGTERM"));
