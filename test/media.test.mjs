import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createProject } from "../skill/creating-explainer-videos/runtime/project.mjs";
import {
  auditMedia,
  contactSheetFilter,
  createPublishingPackage,
  hyperframesRenderCommand,
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
  assert.equal(contactSheetFilter(1.2), "thumbnail,scale=480:-1");
  assert.equal(contactSheetFilter(30), "fps=1/5,scale=480:-1,tile=4x3");
});

test("render invokes an argument-array adapter from the renderer directory", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-media-render-"));
  const root = path.join(tempRoot, "demo");
  await createProject({ destination: root, title: "Demo", topic: "Flow", template: "paper-theatre" });
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
      if (args.includes("blackdetect=d=0.5:pix_th=0.1")) return { status: 0, stdout: "", stderr: "black_start:1 black_end:2" };
      return { status: 0, stdout: "", stderr: "" };
    },
  });

  assert.equal(report.automatedPassed, false);
  assert.equal(report.checks.find((item) => item.name === "black-frames").status, "failed");
  assert.equal(report.releaseDecision, "release_candidate_pending_human_listen");
});
