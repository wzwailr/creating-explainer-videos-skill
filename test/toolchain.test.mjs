import test from "node:test";
import assert from "node:assert/strict";

import { doctor } from "../skill/creating-explainer-videos/runtime/toolchain.mjs";

function fixtureRunner(versions) {
  return (command) => {
    if (!(command in versions)) return { status: 1, stdout: "", stderr: "not found" };
    return { status: 0, stdout: `${versions[command]}\n`, stderr: "" };
  };
}

test("doctor distinguishes available, missing, optional, and degraded tools", async () => {
  const result = await doctor({
    runner: fixtureRunner({ npm: "10.9.0", python: "Python 3.12", ffmpeg: "ffmpeg 7.1", ffprobe: "ffprobe 7.1" }),
    browser: { path: "C:/Program Files/Microsoft/Edge/Application/msedge.exe", version: "Edge 140" },
    exists: async () => false,
  });

  assert.equal(result.ffmpeg.status, "available");
  assert.equal(result.browser.status, "available");
  assert.equal(result.hyperframes.status, "missing");
  assert.equal(result.gsap.status, "degraded");
  assert.equal(result.readyFor.scaffold, true);
  assert.equal(result.readyFor.render, false);
  assert.equal(result.paidProviderCalled, false);
  assert.equal(result.tts.adapters.some((adapter) => adapter.id === "edge-tts"), true);
  assert.equal(result.tts.adapters.every((adapter) => adapter.invoked === false), true);
});

test("doctor reports a render-ready configured project without exposing provider secrets", async () => {
  const result = await doctor({
    projectRoot: "D:/fixture-project",
    nodeVersion: "v22.10.0",
    runner: fixtureRunner({ npm: "10.9.0", npx: "10.9.0", python: "Python 3.12", ffmpeg: "ffmpeg 7.1", ffprobe: "ffprobe 7.1" }),
    browser: { path: "C:/browser.exe", version: "Browser 1" },
    exists: async (filePath) => /gsap\.min\.js|NotoSansSC|tts-adapter/.test(filePath),
  });

  assert.equal(result.readyFor.render, true);
  assert.equal(result.node.minimumMajor, 22);
  assert.equal(result.hyperframes.status, "on-demand");
  assert.equal(result.hyperframes.package, "hyperframes@0.8.15");
  assert.equal(result.hyperframes.networkRequiredOnFirstRun, true);
  assert.equal(result.gsap.status, "available");
  assert.equal(result.tts.status, "configured");
  assert.equal(result.readyFor.realNarration, true);
  assert.doesNotMatch(JSON.stringify(result), /token|api[_-]?key|secret/i);
});

test("doctor rejects render below Node 22 even when every media tool is installed", async () => {
  const result = await doctor({
    nodeVersion: "v21.7.3",
    runner: fixtureRunner({ npm: "10.9.0", npx: "10.9.0", python: "Python 3.12", ffmpeg: "ffmpeg 7.1", ffprobe: "ffprobe 7.1", hyperframes: "0.8.15" }),
    browser: { path: "C:/browser.exe", version: "Browser 1" },
    exists: async () => false,
  });

  assert.equal(result.node.status, "incompatible");
  assert.equal(result.node.major, 21);
  assert.equal(result.node.minimumMajor, 22);
  assert.equal(result.hyperframes.status, "available");
  assert.equal(result.readyFor.render, false);
});
