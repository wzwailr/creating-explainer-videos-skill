import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { doctorVoiceAdapter } from "./voice-adapters.mjs";

export const MINIMUM_NODE_MAJOR = 22;

async function defaultExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function defaultRunner(command, args) {
  return spawnSync(command, args, { encoding: "utf8", windowsHide: true });
}

function firstLine(value) {
  return String(value ?? "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || null;
}

export function parseNodeMajor(version) {
  const match = String(version ?? "").match(/v?(\d+)/);
  return match ? Number(match[1]) : null;
}

export function commandInfo(command, args = ["--version"], runner = defaultRunner) {
  let invoked = command;
  let result = runner(invoked, args, { encoding: "utf8", windowsHide: true });
  if (result?.status !== 0 && process.platform === "win32" && !path.extname(command)) {
    invoked = `${command}.cmd`;
    result = runner(invoked, args, { encoding: "utf8", windowsHide: true });
  }
  if (result?.status !== 0) return { status: "missing", command: invoked, version: null };
  return { status: "available", command: invoked, version: firstLine(result.stdout) || firstLine(result.stderr) };
}

export async function findBrowser(options = {}) {
  if (options.browser?.path) return { status: "available", ...options.browser };
  const exists = options.exists || defaultExists;
  const environment = options.env || process.env;
  const candidates = process.platform === "win32"
    ? [
        path.join(environment.PROGRAMFILES || "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(environment["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(environment.PROGRAMFILES || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
        path.join(environment.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
      ]
    : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  for (const candidate of candidates) {
    if (candidate && await exists(candidate)) return { status: "available", path: candidate, version: null };
  }
  return { status: "missing", path: null, version: null };
}

async function firstExisting(candidates, exists) {
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  return null;
}

export async function doctor(options = {}) {
  const runner = options.runner || defaultRunner;
  const exists = options.exists || defaultExists;
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const nodeVersion = options.nodeVersion || process.version;
  const nodeMajor = parseNodeMajor(nodeVersion);
  const node = {
    status: nodeMajor !== null && nodeMajor >= MINIMUM_NODE_MAJOR ? "available" : "incompatible",
    version: nodeVersion,
    major: nodeMajor,
    minimumMajor: MINIMUM_NODE_MAJOR,
  };
  const browser = await findBrowser({ browser: options.browser, exists, env: options.env });
  let npm = commandInfo("npm", ["--version"], runner);
  const bundledNpmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  if (npm.status === "missing" && await exists(bundledNpmCli)) {
    npm = commandInfo(process.execPath, [bundledNpmCli, "--version"], runner);
    npm.command = bundledNpmCli;
  }
  const python = commandInfo("python", ["--version"], runner);
  const ffmpeg = commandInfo("ffmpeg", ["-version"], runner);
  const ffprobe = commandInfo("ffprobe", ["-version"], runner);
  const installedHyperframes = commandInfo("hyperframes", ["--version"], runner);
  const npx = commandInfo("npx", ["--version"], runner);
  const hyperframes = installedHyperframes.status === "available"
    ? { ...installedHyperframes, package: "hyperframes@0.8.15", source: "installed", networkRequiredOnFirstRun: false }
    : npx.status === "available"
      ? {
          status: "on-demand",
          command: npx.command,
          version: "0.8.15",
          package: "hyperframes@0.8.15",
          source: "pinned-npx",
          networkRequiredOnFirstRun: true,
        }
      : {
          status: "missing",
          command: installedHyperframes.command,
          version: null,
          package: "hyperframes@0.8.15",
          source: null,
          networkRequiredOnFirstRun: true,
        };
  const gsapPath = await firstExisting([
    path.join(projectRoot, "renderer", "assets", "gsap.min.js"),
    path.join(projectRoot, "node_modules", "gsap", "dist", "gsap.min.js"),
  ], exists);
  const fontPath = await firstExisting([
    path.join(projectRoot, "assets", "fonts", "NotoSansSC-VF.ttf"),
    path.join(process.env.WINDIR || "C:\\Windows", "Fonts", "NotoSansSC-VF.ttf"),
    path.join(os.homedir(), "AppData", "Local", "Microsoft", "Windows", "Fonts", "DingTalk-JinBuTi.ttf"),
  ], exists);
  const ttsAdapter = await firstExisting([
    path.join(projectRoot, ".publish", "tts-adapter.json"),
    path.join(projectRoot, "toolchain", "tts-adapter.json"),
  ], exists);
  const voiceAdapters = await Promise.all([
    doctorVoiceAdapter(projectRoot, { adapter: "edge-tts", runner }),
    doctorVoiceAdapter(projectRoot, { adapter: "fixture-tts", runner }),
  ]);
  const gsap = gsapPath
    ? { status: "available", path: gsapPath, fallback: "template-core-controller" }
    : { status: "degraded", path: null, fallback: "template-core-controller" };
  const fonts = fontPath
    ? { status: "available", detectedPath: fontPath, fallback: ["Microsoft YaHei", "sans-serif"] }
    : { status: "degraded", detectedPath: null, fallback: ["Microsoft YaHei", "sans-serif"] };
  const edgeTts = voiceAdapters.find((adapter) => adapter.id === "edge-tts");
  const hostStatus = ttsAdapter
    ? { id: "host-command", status: "configured", adapterPath: ttsAdapter, invoked: false }
    : { id: "host-command", status: "missing", adapterPath: null, invoked: false };
  const tts = ttsAdapter
    ? { status: "configured", adapterPath: ttsAdapter, invoked: false, adapters: [...voiceAdapters, hostStatus] }
    : edgeTts?.status === "available"
      ? { status: "available", adapterPath: null, invoked: false, adapters: [...voiceAdapters, hostStatus] }
      : { status: "missing", adapterPath: null, invoked: false, adapters: [...voiceAdapters, hostStatus] };
  return {
    schemaVersion: 1,
    node,
    npm,
    python,
    browser,
    ffmpeg,
    ffprobe,
    hyperframes,
    gsap,
    fonts,
    tts,
    readyFor: {
      scaffold: true,
      deterministicPreview: true,
      realNarration: tts.status === "configured" || edgeTts?.status === "available",
      render: node.status === "available"
        && browser.status === "available"
        && ffmpeg.status === "available"
        && ffprobe.status === "available"
        && new Set(["available", "on-demand"]).has(hyperframes.status),
    },
    paidProviderCalled: false,
  };
}

export function resolveToolchain(config = {}) {
  return {
    hyperframesVersion: config.hyperframesVersion || "0.8.15",
    renderQuality: config.renderQuality || "high",
    renderWorkers: Number(config.renderWorkers || 4),
    browserPath: config.browserPath || null,
    ttsAdapterPath: config.ttsAdapterPath || null,
  };
}
