import { mkdtemp, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeJsonAtomic } from "../skill/creating-explainer-videos/runtime/json.mjs";
import { auditMedia, muxAudio, renderCover, renderVideo } from "../skill/creating-explainer-videos/runtime/media.mjs";
import { runChecked } from "../skill/creating-explainer-videos/runtime/process.mjs";
import { createProject } from "../skill/creating-explainer-videos/runtime/project.mjs";
import { buildCover, buildRenderer } from "../skill/creating-explainer-videos/runtime/renderer.mjs";

const DURATION = 3.6;

async function requireNonEmpty(filePath) {
  const information = await stat(filePath);
  if (!information.isFile() || information.size === 0) throw new Error(`empty real-render artifact: ${filePath}`);
  return information.size;
}

export async function createRealRenderFixture(projectRoot) {
  const root = path.resolve(projectRoot);
  await createProject({
    destination: root,
    title: "权限请求如何被判定？",
    topic: "权限请求经过规则引擎后进入允许或拒绝状态",
    template: "spatial-chamber",
    preset: "general-mechanism",
  });
  await writeJsonAtomic(path.join(root, "project.json"), {
    schemaVersion: 2,
    slug: "real-render-smoke",
    title: "权限请求如何被判定？",
    topic: "权限请求经过规则引擎后进入允许或拒绝状态",
    preset: "general-mechanism",
    template: "spatial-chamber",
    language: "zh-CN",
    platform: "short-video",
    frame: { width: 1920, height: 1080, fps: 12 },
  });
  await writeJsonAtomic(path.join(root, "script", "narration.json"), {
    schemaVersion: 1,
    canonicalText: [
      { id: "C01", sceneId: "S01", text: "权限请求先进入规则引擎。", focus: "policy-engine", visualEvent: "请求沿路径进入规则引擎" },
      { id: "C02", sceneId: "S01", text: "匹配结果决定允许还是拒绝。", focus: "decision-branches", visualEvent: "规则引擎分流到允许与拒绝状态" },
    ],
    complete: true,
  });
  await writeJsonAtomic(path.join(root, "script", "cues.json"), {
    schemaVersion: 1,
    timingSource: "measured-audio",
    complete: true,
    cues: [
      {
        id: "C01",
        sceneId: "S01",
        start: 0,
        duration: 1.8,
        caption: "权限请求先进入规则引擎。",
        tts: "权限请求先进入规则引擎。",
        focus: "policy-engine",
        visualEvent: "请求沿路径进入规则引擎",
      },
      {
        id: "C02",
        sceneId: "S01",
        start: 1.8,
        duration: 1.8,
        caption: "匹配结果决定允许还是拒绝。",
        tts: "匹配结果决定允许还是拒绝。",
        focus: "decision-branches",
        visualEvent: "规则引擎分流到允许与拒绝状态",
      },
    ],
  });
  await writeJsonAtomic(path.join(root, "scene-spec.json"), {
    schemaVersion: 1,
    template: "spatial-chamber",
    complete: true,
    scenes: [{
      id: "S01",
      title: "规则引擎的分支判定",
      purpose: "验证语义状态、空间路径、主题封面、逐帧渲染和媒体质检",
      cueIds: ["C01", "C02"],
    }],
  });
  await writeJsonAtomic(path.join(root, "visual-program.json"), {
    schemaVersion: 1,
    template: "spatial-chamber",
    complete: true,
    scenes: [{
      id: "S01",
      layout: "network",
      cueIds: ["C01", "C02"],
      elements: [
        { id: "request", type: "node", role: "input-request", label: "权限请求", frame: { x: .06, y: .34, width: .2, height: .18 } },
        { id: "engine", type: "node", role: "controller", label: "规则引擎", frame: { x: .38, y: .27, width: .24, height: .3 } },
        { id: "allowed", type: "node", role: "success", label: "允许", frame: { x: .72, y: .16, width: .2, height: .18 } },
        { id: "denied", type: "node", role: "danger", label: "拒绝", frame: { x: .72, y: .56, width: .2, height: .18 } },
        { id: "request-engine", type: "connector", role: "request-route", from: "request", to: "engine", route: "curve" },
        { id: "engine-allowed", type: "connector", role: "success-route", from: "engine", to: "allowed", route: "curve" },
        { id: "engine-denied", type: "connector", role: "danger-route", from: "engine", to: "denied", route: "curve" },
      ],
      actions: [
        { cueId: "C01", target: "request", kind: "appear", at: 0, duration: .2 },
        { cueId: "C01", target: "request-engine", kind: "draw", at: .2, duration: .3 },
        { cueId: "C01", target: "engine", kind: "appear", at: .5, duration: .25 },
        { cueId: "C01", target: "engine", kind: "focus", at: .75, duration: .25 },
        { cueId: "C02", target: "engine-allowed", kind: "draw", at: 0, duration: .2 },
        { cueId: "C02", target: "allowed", kind: "appear", at: .2, duration: .25 },
        { cueId: "C02", target: "engine-denied", kind: "draw", at: .45, duration: .2 },
        { cueId: "C02", target: "denied", kind: "appear", at: .65, duration: .25 },
        { cueId: "C02", target: "engine", kind: "pulse", at: .9, duration: .1 },
      ],
    }],
  });
  await buildRenderer(root);
  await buildCover(root);
  return { root, duration: DURATION };
}

export async function runRealRenderSmoke(options = {}) {
  const temporary = options.root
    ? path.resolve(options.root)
    : await mkdtemp(path.join(os.tmpdir(), "explainer-real-render-"));
  const root = options.root ? temporary : path.join(temporary, "project");
  await createRealRenderFixture(root);

  await runChecked("npx", ["--yes", "hyperframes@0.8.15", "lint", path.join(root, "renderer")], {
    cwd: root,
    label: "HyperFrames lint",
  });
  const visual = await renderVideo(root, { quality: "draft", workers: 1, timeout: 600_000 });
  const cover = await renderCover(root, { browserPath: options.browserPath });
  const audio = path.join(root, ".publish", "narration.wav");
  await runChecked("ffmpeg", [
    "-y",
    "-v", "error",
    "-f", "lavfi",
    "-i", `sine=frequency=440:sample_rate=48000:duration=${DURATION}`,
    "-c:a", "pcm_s16le",
    audio,
  ], { cwd: root, label: "synthetic narration" });
  const muxed = await muxAudio(root, { visual: visual.output, audio });
  const audit = await auditMedia(root, { video: muxed.output, cover: cover.output });

  const artifacts = {
    visual: { path: visual.output, bytes: await requireNonEmpty(visual.output) },
    cover: { path: cover.output, bytes: await requireNonEmpty(cover.output) },
    audio: { path: audio, bytes: await requireNonEmpty(audio) },
    candidate: { path: muxed.output, bytes: await requireNonEmpty(muxed.output) },
    contactSheet: {
      path: path.join(root, "qc", "contact-sheet.png"),
      bytes: await requireNonEmpty(path.join(root, "qc", "contact-sheet.png")),
    },
  };
  if (!audit.automatedPassed) {
    const failures = audit.checks.filter((check) => check.status !== "passed").map((check) => check.name);
    throw new Error(`real media audit failed: ${failures.join(", ")}`);
  }
  if (audit.releaseDecision !== "release_candidate_pending_human_listen") {
    throw new Error(`real media smoke crossed the human-release boundary: ${audit.releaseDecision}`);
  }
  return { valid: true, root, artifacts, media: audit.media, checks: audit.checks, releaseDecision: audit.releaseDecision };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  runRealRenderSmoke()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(`ERROR ${error.message}`);
      process.exitCode = 1;
    });
}
