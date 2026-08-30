import { spawnSync } from "node:child_process";
import path from "node:path";

function resolveExecutable(command, args) {
  if (process.platform !== "win32") return { command, args };
  if (command === "npx" || command === "npm") {
    const cli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", command === "npx" ? "npx-cli.js" : "npm-cli.js");
    return { command: process.execPath, args: [cli, ...args] };
  }
  return { command, args };
}

export async function runProcess(command, args = [], options = {}) {
  const resolved = resolveExecutable(command, args);
  const result = spawnSync(resolved.command, resolved.args, {
    cwd: options.cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: options.timeout ?? 600_000,
    maxBuffer: options.maxBuffer ?? 16 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? result.error?.message ?? "",
    command,
    args,
    invokedCommand: resolved.command,
    invokedArgs: resolved.args,
  };
}

export async function runChecked(command, args, options = {}) {
  const runner = options.runner || runProcess;
  const result = await runner(command, args, options);
  if (result?.status !== 0) {
    throw new Error(`${options.label || command} failed: ${result?.stderr || result?.stdout || `exit ${result?.status}`}`);
  }
  return result;
}

