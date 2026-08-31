import { access, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { readJson, sha256File, writeJsonAtomic } from "./json.mjs";
import { runChecked } from "./process.mjs";
import { buildCover, buildRenderer } from "./renderer.mjs";
import { findBrowser, resolveToolchain } from "./toolchain.mjs";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function waitForNonEmptyFile(filePath, options = {}) {
  const timeout = Number(options.timeout ?? 10_000);
  const pollInterval = Number(options.pollInterval ?? 50);
  const deadline = Date.now() + timeout;
  while (true) {
    try {
      const information = await stat(filePath);
      if (information.isFile() && information.size > 0) return information;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (Date.now() >= deadline) throw new Error(`browser returned without producing a non-empty screenshot: ${filePath}`);
    await new Promise((resolve) => setTimeout(resolve, Math.min(pollInterval, Math.max(1, deadline - Date.now()))));
  }
}

export function hyperframesRenderCommand(options = {}) {
  const version = options.version || "0.8.15";
  return [
    "npx",
    "--yes",
    `hyperframes@${version}`,
    "render",
    "--quality",
    options.quality || "high",
    "--fps",
    String(options.fps || 30),
    "--workers",
    String(options.workers || 4),
    "--protocol-timeout",
    String(options.protocolTimeout || 600_000),
    "--output",
    options.output,
  ];
}

export async function renderVideo(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const renderer = await buildRenderer(root);
  const cover = await buildCover(root);
  const project = await readJson(path.join(root, "project.json"));
  const toolchainDocument = await readJson(path.join(root, "toolchain.json"));
  const toolchain = resolveToolchain({ ...toolchainDocument, ...options });
  const output = path.resolve(options.output || path.join(root, "renders", "visual.mp4"));
  await mkdir(path.dirname(output), { recursive: true });
  const logical = hyperframesRenderCommand({
    version: toolchain.hyperframesVersion,
    quality: options.quality || toolchain.renderQuality,
    workers: options.workers || toolchain.renderWorkers,
    fps: project.frame?.fps || 30,
    protocolTimeout: options.protocolTimeout,
    output,
  });
  const [command, ...args] = logical;
  const result = await runChecked(command, args, {
    cwd: path.join(root, "renderer"),
    runner: options.runner,
    timeout: options.timeout || 600_000,
    label: "HyperFrames render",
  });
  return { output, renderer: renderer.path, cover: cover.path, command: logical, result };
}

export async function renderCover(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const source = (await buildCover(root)).path;
  const output = path.resolve(options.output || path.join(root, "renders", "cover.png"));
  await mkdir(path.dirname(output), { recursive: true });
  const browser = options.browserPath
    ? { status: "available", path: options.browserPath }
    : await findBrowser({ browser: options.browser, exists: options.exists });
  if (browser.status !== "available") throw new Error("a working Chrome or Edge browser is required to render the cover");
  const profile = await mkdtemp(path.join(options.profileRoot || os.tmpdir(), "explainer-cover-profile-"));
  await rm(output, { force: true });
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1920,1080",
    `--user-data-dir=${profile}`,
    `--screenshot=${output}`,
    pathToFileURL(source).href,
  ];
  try {
    const result = await runChecked(browser.path, args, {
      cwd: path.join(root, "renderer"),
      runner: options.runner,
      timeout: options.timeout || 120_000,
      label: "cover render",
    });
    const screenshot = await waitForNonEmptyFile(output, {
      timeout: options.screenshotTimeout,
      pollInterval: options.screenshotPollInterval,
    });
    return { source, output, browser, result, bytes: screenshot.size };
  } finally {
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }).catch(() => {});
  }
}

export async function muxAudio(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const visual = path.resolve(options.visual || path.join(root, "renders", "visual.mp4"));
  const audio = path.resolve(options.audio || path.join(root, ".publish", "narration.wav"));
  const output = path.resolve(options.output || path.join(root, "renders", "candidate.mp4"));
  for (const filePath of [visual, audio]) if (!(await exists(filePath))) throw new Error(`missing mux input: ${filePath}`);
  const args = [
    "-y",
    "-v",
    "error",
    "-i",
    visual,
    "-i",
    audio,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-af",
    "loudnorm=I=-16:LRA=7:TP=-1.5",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-shortest",
    output,
  ];
  const result = await runChecked("ffmpeg", args, { runner: options.runner, cwd: root, label: "audio mux" });
  return { visual, audio, output, result };
}

async function chooseCandidate(root, explicit) {
  const candidates = [explicit, path.join(root, "renders", "candidate.mp4"), path.join(root, "renders", "final.mp4")].filter(Boolean);
  for (const candidate of candidates) if (await exists(candidate)) return path.resolve(candidate);
  throw new Error("missing renders/candidate.mp4 or renders/final.mp4");
}

function streamSummary(probe) {
  const streams = probe.streams || [];
  const video = streams.find((stream) => stream.codec_type === "video") || {};
  const audio = streams.find((stream) => stream.codec_type === "audio") || {};
  return {
    duration: Number(probe.format?.duration || 0),
    video: {
      codec: video.codec_name || null,
      width: Number(video.width || 0),
      height: Number(video.height || 0),
      pixelFormat: video.pix_fmt || null,
      frameRate: video.avg_frame_rate || null,
    },
    audio: {
      codec: audio.codec_name || null,
      sampleRate: Number(audio.sample_rate || 0),
      channels: Number(audio.channels || 0),
    },
  };
}

const TEMPLATE_STRUCTURE = Object.freeze({
  "paper-theatre": {
    fingerprint: "paper-stage-layer-stack-and-cutouts",
    motion: 'data-motion="paper"',
  },
  "spatial-chamber": {
    fingerprint: "perspective-chamber-tunnel-and-depth-lanes",
    motion: 'data-motion="depth"',
    connector: "data-signal-path",
  },
  "ink-explainer": {
    fingerprint: "ruled-board-rough-strokes-and-teacher-notes",
    motion: 'data-motion="note"',
    connector: 'data-motion="draw"',
  },
});

function templateStructureCheck(project, visualProgram, rendererHtml, coverHtml) {
  if (Number(project?.schemaVersion || 1) < 2) return { valid: true, legacy: true, missing: [] };
  const expected = TEMPLATE_STRUCTURE[project?.template];
  const missing = [];
  if (!visualProgram?.complete) missing.push("complete visual-program.json");
  if (!expected) missing.push(`known template adapter for ${project?.template}`);
  if (expected && !rendererHtml.includes(`data-template-fingerprint="${expected.fingerprint}"`)) missing.push(expected.fingerprint);
  if (expected && !rendererHtml.includes(expected.motion)) missing.push(expected.motion);
  const hasConnectors = (visualProgram?.scenes ?? []).some((scene) => (scene.elements ?? []).some((element) => element.type === "connector"));
  if (expected?.connector && hasConnectors && !rendererHtml.includes(expected.connector)) missing.push(expected.connector);
  if (visualProgram?.complete && !coverHtml.includes('data-cover-source="visual-program"')) missing.push("topic-derived cover visual");
  return { valid: missing.length === 0, legacy: false, missing };
}

export function representativeFramePlan(cueDocument, duration) {
  const rows = (cueDocument?.cues ?? []).filter((cue) => Number.isFinite(Number(cue.start)) && Number(cue.duration) > 0);
  const candidates = rows.length ? rows.map((cue) => ({
    id: String(cue.id || "cue").replace(/[^A-Za-z0-9-]+/g, "-") || "cue",
    time: Math.min(Math.max(.02, Number(cue.start) + Number(cue.duration) * .65), Math.max(.02, Number(duration) - .04)),
  })) : Array.from({ length: Math.min(6, Math.max(1, Math.ceil(Number(duration) || 1))) }, (_, index, all) => ({
    id: `timeline-${String(index + 1).padStart(2, "0")}`,
    time: Math.max(.02, (Number(duration) || 1) * (index + .5) / all.length),
  }));
  return candidates;
}

export function contactSheetFilter(duration) {
  const seconds = Math.max(.1, Number(duration) || .1);
  const short = seconds < 5;
  const sampleCount = short ? 6 : 12;
  const grid = short ? "3x2" : "4x3";
  const width = short ? 640 : 480;
  const fps = (sampleCount / seconds).toFixed(6);
  return `fps=${fps},scale=${width}:-1,tile=${grid}:nb_frames=${sampleCount}:padding=4:margin=4:color=0x111111`;
}

export async function auditMedia(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const candidate = await chooseCandidate(root, options.video);
  const cover = path.resolve(options.cover || path.join(root, "renders", "cover.png"));
  if (!(await exists(cover))) throw new Error(`missing cover artifact: ${cover}`);
  await mkdir(path.join(root, "qc", "frames"), { recursive: true });
  const probeResult = await runChecked("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", candidate], {
    runner: options.runner,
    cwd: root,
    label: "ffprobe",
  });
  let probe;
  try {
    probe = JSON.parse(probeResult.stdout);
  } catch (error) {
    throw new Error(`ffprobe returned invalid JSON: ${error.message}`);
  }
  const media = streamSummary(probe);
  const checks = [];
  try {
    const [project, visualProgram, rendererHtml, coverHtml] = await Promise.all([
      readJson(path.join(root, "project.json")),
      readJson(path.join(root, "visual-program.json")),
      readFile(path.join(root, "renderer", "index.html"), "utf8"),
      readFile(path.join(root, "renderer", "cover.html"), "utf8"),
    ]);
    const structure = templateStructureCheck(project, visualProgram, rendererHtml, coverHtml);
    checks.push({
      name: "template-structure",
      status: structure.valid ? "passed" : "failed",
      template: project.template,
      missing: structure.missing,
      legacy: structure.legacy,
    });
  } catch (error) {
    checks.push({ name: "template-structure", status: "failed", diagnostic: error.message });
  }
  const commands = [
    ["full-decode", ["-v", "error", "-i", candidate, "-f", "null", "-"]],
    ["black-frames", ["-hide_banner", "-i", candidate, "-vf", "blackdetect=d=0.5:pix_th=0.02:pic_th=0.995", "-an", "-f", "null", "-"]],
    ["frozen-frames", ["-hide_banner", "-i", candidate, "-vf", "freezedetect=n=0.003:d=1.5", "-an", "-f", "null", "-"]],
    ["unexpected-silence", ["-hide_banner", "-i", candidate, "-af", "silencedetect=n=-45dB:d=0.7", "-vn", "-f", "null", "-"]],
  ];
  for (const [name, args] of commands) {
    try {
      const result = await runChecked("ffmpeg", args, { runner: options.runner, cwd: root, label: name });
      const diagnostic = result.stderr || result.stdout || "";
      const detectionPattern = {
        "black-frames": /black_start:/i,
        "frozen-frames": /freeze_start:/i,
        "unexpected-silence": /silence_start:/i,
      }[name];
      checks.push({ name, status: detectionPattern?.test(diagnostic) ? "failed" : "passed", diagnostic });
    } catch (error) {
      checks.push({ name, status: "failed", diagnostic: error.message });
    }
  }
  try {
    const cueDocument = await readJson(path.join(root, "script", "cues.json"));
    const framePlan = representativeFramePlan(cueDocument, media.duration);
    const frames = [];
    const indexWidth = Math.max(2, String(framePlan.length).length);
    for (const [index, sample] of framePlan.entries()) {
      const output = path.join(root, "qc", "frames", `${String(index + 1).padStart(indexWidth, "0")}-${sample.id}.png`);
      await rm(output, { force: true });
      await runChecked("ffmpeg", [
        "-y", "-v", "error", "-ss", sample.time.toFixed(3), "-i", candidate,
        "-frames:v", "1", "-vf", "scale=960:-1", output,
      ], { runner: options.runner, cwd: root, label: `representative frame ${sample.id}` });
      const information = await waitForNonEmptyFile(output, {
        timeout: options.representativeFrameTimeout ?? 2_000,
        pollInterval: options.representativeFramePollInterval ?? 50,
      });
      frames.push({ path: path.relative(root, output).split(path.sep).join("/"), time: sample.time, bytes: information.size });
    }
    checks.push({ name: "representative-frames", status: frames.length ? "passed" : "failed", frames });
  } catch (error) {
    checks.push({ name: "representative-frames", status: "failed", diagnostic: error.message });
  }
  const contactSheet = path.join(root, "qc", "contact-sheet.png");
  try {
    await rm(contactSheet, { force: true });
    await runChecked("ffmpeg", ["-y", "-v", "error", "-i", candidate, "-vf", contactSheetFilter(media.duration), "-frames:v", "1", "-update", "1", contactSheet], {
      runner: options.runner,
      cwd: root,
      label: "contact sheet",
    });
    const sheet = await waitForNonEmptyFile(contactSheet, {
      timeout: options.contactSheetTimeout ?? 2_000,
      pollInterval: options.contactSheetPollInterval,
    });
    checks.push({ name: "contact-sheet", status: "passed", path: "qc/contact-sheet.png", bytes: sheet.size });
  } catch (error) {
    checks.push({ name: "contact-sheet", status: "failed", diagnostic: error.message });
  }
  const specificationPassed = media.video.codec === "h264"
    && media.video.width === 1920
    && media.video.height === 1080
    && media.video.pixelFormat === "yuv420p"
    && media.audio.codec === "aac"
    && media.audio.sampleRate === 48000;
  checks.push({ name: "delivery-specification", status: specificationPassed ? "passed" : "failed", media });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    releaseDecision: "release_candidate_pending_human_listen",
    candidate: { path: path.relative(root, candidate).split(path.sep).join("/"), sha256: await sha256File(candidate) },
    cover: { path: path.relative(root, cover).split(path.sep).join("/"), sha256: await sha256File(cover) },
    media,
    checks,
    automatedPassed: checks.every((check) => check.status === "passed"),
    humanListenRequired: true,
  };
  await writeJsonAtomic(path.join(root, "qc", "media.json"), report);
  const statePath = path.join(root, "production-state.json");
  if (await exists(statePath)) {
    const state = await readJson(statePath);
    await writeJsonAtomic(statePath, {
      ...state,
      releaseDecision: "release_candidate_pending_human_listen",
      updatedAt: report.generatedAt,
      evidence: [...(state.evidence || []), { type: "automated-qc", path: "qc/media.json", at: report.generatedAt }],
    });
  }
  return report;
}

export async function createPublishingPackage(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const project = await readJson(path.join(root, "project.json"));
  const video = await chooseCandidate(root, options.video);
  const cover = path.resolve(options.cover || path.join(root, "renders", "cover.png"));
  if (!(await exists(cover))) throw new Error(`missing cover artifact: ${cover}`);
  const record = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    releaseDecision: "release_candidate_pending_human_listen",
    title: `${project.title}：${project.topic}`,
    description: project.topic,
    topics: options.topics || ["知识图解", "原理讲解", "机制解释"],
    pinnedComment: `这一条解释的是：${project.topic}`,
    template: project.template,
    preset: project.preset,
    artifacts: {
      video: { path: path.relative(root, video).split(path.sep).join("/"), sha256: await sha256File(video) },
      cover: { path: path.relative(root, cover).split(path.sep).join("/"), sha256: await sha256File(cover) },
    },
    humanListenRequired: true,
  };
  await writeJsonAtomic(path.join(root, "publish", "publishing-package.json"), record);
  return record;
}
