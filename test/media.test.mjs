import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProject } from "../skill/creating-explainer-videos/runtime/project.mjs";
import {
  auditMedia,
  contactSheetFilter,
  createPublishingPackage,
  hyperframesRenderCommand,
  muxAudio,
  representativeFramePlan,
  renderCover,
  renderVideo,
} from "../skill/creating-explainer-videos/runtime/media.mjs";

function probeFixture() {
  return JSON.stringify({
    format: { duration: "8.000", format_name: "mov,mp4,m4a,3gp,3g2,mj2" },
    streams: [
      { codec_type: "video", codec_name: "h264", width: 1920, height: 1080, pix_fmt: "yuv420p", avg_frame_rate: "30/1" },
      { codec_type: "audio", codec_name: "aac", sample_rate: "48000", channels: 2 },
    ],
  });
}

test("render command pins HyperFrames and emits an explicit output", () => {
  const command = hyperframesRenderCommand({ version: "0.8.15", fps: 30, output: "renders/visual.mp4", workers: 4, quality: "high" });

  assert.deepEqual(command.slice(0, 4), ["npx", "--yes", "hyperframes@0.8.15", "render"]);
  assert.ok(command.includes("renders/visual.mp4"));
  assert.ok(command.includes("30"));
});

test("contact sheet filter emits a frame for short videos and a tiled overview for longer videos", () => {
  assert.match(contactSheetFilter(1.2), /tile=3x2:nb_frames=6/);
  assert.match(contactSheetFilter(9.874), /tile=4x3:nb_frames=12/);
  assert.match(contactSheetFilter(30), /tile=4x3:nb_frames=12/);
  assert.doesNotMatch(contactSheetFilter(9.874), /fps=1\/5/);
});

test("representative frame planning preserves every narration cue", () => {
  const cues = Array.from({ length: 13 }, (_, index) => ({
    id: `C${String(index + 1).padStart(2, "0")}`,
    start: index * 2.5,
    duration: 2.5,
  }));

  const plan = representativeFramePlan({ cues }, 32.5);

  assert.equal(plan.length, 13);
  assert.deepEqual(plan.map((item) => item.id), cues.map((cue) => cue.id));
});

test("render invokes an argument-array adapter from the renderer directory", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-media-render-"));
  const root = path.join(tempRoot, "demo");
  await createProject({ destination: root, title: "Demo", topic: "Flow", template: "paper-theatre" });
  const legacyProject = JSON.parse(await readFile(path.join(root, "project.json"), "utf8"));
  legacyProject.schemaVersion = 1;
  await writeFile(path.join(root, "project.json"), `${JSON.stringify(legacyProject, null, 2)}\n`, "utf8");
  await rm(path.join(root, "visual-program.json"));
  const calls = [];
  const result = await renderVideo(root, {
    runner: async (command, args, options) => {
      calls.push({ command, args, cwd: options.cwd });
      return { status: 0, stdout: "rendered", stderr: "" };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "npx");
  assert.equal(calls[0].cwd, path.join(root, "renderer"));
  assert.equal(result.output, path.join(root, "renders", "visual.mp4"));
});

test("audio mux applies a short-video loudness target before AAC encoding", async () => {
  const root = path.join(await mkdtemp(path.join(os.tmpdir(), "explainer-audio-mux-")), "demo");
  await createProject({ destination: root, title: "Demo", topic: "Flow", template: "paper-theatre" });
  await writeFile(path.join(root, "renders", "visual.mp4"), "video", "utf8");
  await writeFile(path.join(root, ".publish", "narration.wav"), "audio", "utf8");
  let invocation;

  await muxAudio(root, { runner: async (command, args) => {
    invocation = { command, args };
    return { status: 0, stdout: "", stderr: "" };
  } });

  assert.equal(invocation.command, "ffmpeg");
  assert.ok(invocation.args.includes("-af"));
  assert.match(invocation.args[invocation.args.indexOf("-af") + 1], /loudnorm=I=-16:LRA=7:TP=-1\.5/);
});

test("cover render waits until an asynchronously flushed screenshot is non-empty", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-cover-flush-"));
  const root = path.join(tempRoot, "demo");
  await createProject({ destination: root, title: "Demo", topic: "Flow", template: "paper-theatre" });
  const output = path.join(root, "renders", "cover.png");
  await writeFile(output, "stale-screenshot", "utf8");

  const result = await renderCover(root, {
    browserPath: "C:/browser.exe",
    screenshotTimeout: 1_000,
    screenshotPollInterval: 10,
    runner: async () => {
      setTimeout(() => writeFile(output, "real-screenshot", "utf8"), 40);
      return { status: 0, stdout: "", stderr: "" };
    },
  });

  assert.equal(result.output, output);
  assert.equal(await readFile(output, "utf8"), "real-screenshot");
  await assert.rejects(() => access(path.join(root, ".publish", "cover-browser-profile")));
});

test("automated audit records candidate status only and publishing package hashes artifacts", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-media-audit-"));
  const root = path.join(tempRoot, "demo");
  await createProject({ destination: root, title: "Demo", topic: "Flow", template: "ink-explainer" });
  await mkdir(path.join(root, "renders"), { recursive: true });
  await writeFile(path.join(root, "renders", "candidate.mp4"), "fixture-video", "utf8");
  await writeFile(path.join(root, "renders", "cover.png"), "fixture-cover", "utf8");
  const report = await auditMedia(root, {
    contactSheetTimeout: 20,
    contactSheetPollInterval: 5,
    runner: async (command) => command === "ffprobe"
      ? { status: 0, stdout: probeFixture(), stderr: "" }
      : { status: 0, stdout: "", stderr: "" },
  });
  const publishing = await createPublishingPackage(root);

  assert.equal(report.releaseDecision, "release_candidate_pending_human_listen");
  assert.notEqual(report.releaseDecision, "passed");
  assert.equal(report.media.video.codec, "h264");
  assert.equal(report.checks.find((item) => item.name === "contact-sheet").status, "failed");
  assert.match(publishing.artifacts.video.sha256, /^[a-f0-9]{64}$/);
  assert.match(publishing.artifacts.cover.sha256, /^[a-f0-9]{64}$/);
  assert.equal(
    JSON.parse(await readFile(path.join(root, "qc", "media.json"), "utf8")).releaseDecision,
    "release_candidate_pending_human_listen",
  );
});

test("audit treats detected black intervals as a failed automated check", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-media-black-"));
  const root = path.join(tempRoot, "demo");
  await createProject({ destination: root, title: "Demo", topic: "Flow", template: "spatial-chamber" });
  await writeFile(path.join(root, "renders", "candidate.mp4"), "fixture-video", "utf8");
  await writeFile(path.join(root, "renders", "cover.png"), "fixture-cover", "utf8");
  const report = await auditMedia(root, {
    contactSheetTimeout: 20,
    contactSheetPollInterval: 5,
    runner: async (command, args) => {
      if (command === "ffprobe") return { status: 0, stdout: probeFixture(), stderr: "" };
      if (args.includes("blackdetect=d=0.5:pix_th=0.02:pic_th=0.995")) return { status: 0, stdout: "", stderr: "black_start:1 black_end:2" };
      return { status: 0, stdout: "", stderr: "" };
    },
  });

  assert.equal(report.automatedPassed, false);
  assert.equal(report.checks.find((item) => item.name === "black-frames").status, "failed");
  assert.equal(report.releaseDecision, "release_candidate_pending_human_listen");
});

test("audit rejects a selected template that rendered without its native structure", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-media-template-"));
  const root = path.join(tempRoot, "demo");
  await createProject({ destination: root, title: "Demo", topic: "Flow", template: "spatial-chamber" });
  await writeFile(path.join(root, "renders", "candidate.mp4"), "fixture-video", "utf8");
  await writeFile(path.join(root, "renders", "cover.png"), "fixture-cover", "utf8");
  await writeFile(path.join(root, "renderer", "index.html"), '<body class="spatial-chamber"><div class="visual-node">Flow</div></body>', "utf8");
  const report = await auditMedia(root, {
    contactSheetTimeout: 100,
    contactSheetPollInterval: 5,
    runner: async (command, args) => {
      if (command === "ffprobe") return { status: 0, stdout: probeFixture(), stderr: "" };
      const output = args.at(-1);
      if (typeof output === "string" && output.endsWith(".png")) {
        await mkdir(path.dirname(output), { recursive: true });
        await writeFile(output, "frame", "utf8");
      }
      return { status: 0, stdout: "", stderr: "" };
    },
  });

  assert.equal(report.automatedPassed, false);
  assert.equal(report.checks.find((item) => item.name === "template-structure").status, "failed");
});
