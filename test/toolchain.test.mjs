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
});

test("doctor reports a render-ready configured project without exposing provider secrets", async () => {
  const result = await doctor({
    projectRoot: "D:/fixture-project",
    runner: fixtureRunner({ npm: "10.9.0", python: "Python 3.12", ffmpeg: "ffmpeg 7.1", ffprobe: "ffprobe 7.1", hyperframes: "0.8.15" }),
    browser: { path: "C:/browser.exe", version: "Browser 1" },
    exists: async (filePath) => /gsap\.min\.js|NotoSansSC|tts-adapter/.test(filePath),
  });

  assert.equal(result.readyFor.render, true);
  assert.equal(result.gsap.status, "available");
  assert.equal(result.tts.status, "configured");
  assert.doesNotMatch(JSON.stringify(result), /token|api[_-]?key|secret/i);
});

