import { mkdtemp, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeJsonAtomic } from "../skill/creating-explainer-videos/runtime/json.mjs";
import { auditMedia, muxAudio, renderCover, renderVideo } from "../skill/creating-explainer-videos/runtime/media.mjs";
import { runChecked } from "../skill/creating-explainer-videos/runtime/process.mjs";
import { createProject } from "../skill/creating-explainer-videos/runtime/project.mjs";
import { buildCover, buildRenderer } from "../skill/creating-explainer-videos/runtime/renderer.mjs";

const DURATION = 1.2;

async function requireNonEmpty(filePath) {
  const information = await stat(filePath);
  if (!information.isFile() || information.size === 0) throw new Error(`empty real-render artifact: ${filePath}`);
  return information.size;
}

export async function createRealRenderFixture(projectRoot) {
  const root = path.resolve(projectRoot);
  await createProject({
    destination: root,
    title: "真实渲染验证",
    topic: "输入经过机制产生输出",
    template: "paper-theatre",
    preset: "general-mechanism",
  });
  await writeJsonAtomic(path.join(root, "project.json"), {
    schemaVersion: 2,
    slug: "real-render-smoke",
    title: "真实渲染验证",
    topic: "输入经过机制产生输出",
    preset: "general-mechanism",
    template: "paper-theatre",
    language: "zh-CN",
    platform: "short-video",
    frame: { width: 1920, height: 1080, fps: 12 },
  });
  await writeJsonAtomic(path.join(root, "script", "narration.json"), {
    schemaVersion: 1,
    canonicalText: [{ id: "C01", text: "输入经过机制，产生输出。" }],
    complete: true,
  });
  await writeJsonAtomic(path.join(root, "script", "cues.json"), {
    schemaVersion: 1,
    timingSource: "measured-audio",
    complete: true,
    cues: [{
      id: "C01",
      sceneId: "S01",
      start: 0,
      duration: DURATION,
      caption: "输入经过机制，产生输出。",
      tts: "输入经过机制，产生输出。",
      focus: "mechanism",
      visualEvent: "signal-traverses-system",
    }],
  });
  await writeJsonAtomic(path.join(root, "scene-spec.json"), {
    schemaVersion: 1,
    template: "paper-theatre",
    complete: true,
    scenes: [{
      id: "S01",
      title: "真实渲染链路",
      purpose: "验证浏览器逐帧渲染、音频合成和媒体质检",
      cueIds: ["C01"],
    }],
  });
  await writeJsonAtomic(path.join(root, "visual-program.json"), {
    schemaVersion: 1,
    template: "paper-theatre",
    complete: true,
    scenes: [{
      id: "S01",
      layout: "flow",
      cueIds: ["C01"],
      elements: [
        { id: "request", type: "node", role: "input", label: "请求进入规则引擎", frame: { x: .08, y: .33, width: .28, height: .24 } },
        { id: "result", type: "node", role: "output", label: "规则匹配后输出结果", frame: { x: .64, y: .33, width: .28, height: .24 } },
        { id: "match", type: "connector", role: "mechanism", from: "request", to: "result", route: "curve" },
      ],
      actions: [
        { cueId: "C01", target: "request", kind: "appear", at: 0, duration: .2 },
        { cueId: "C01", target: "match", kind: "draw", at: .2, duration: .35 },
        { cueId: "C01", target: "result", kind: "appear", at: .55, duration: .25 },
        { cueId: "C01", target: "result", kind: "focus", at: .8, duration: .2 },
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
