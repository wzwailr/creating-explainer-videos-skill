import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createRealRenderFixture } from "../scripts/real-render-smoke.mjs";

test("real render fixture exercises semantic states, native template motion, and a topic cover", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "explainer-real-render-fixture-"));
  const root = path.join(temporary, "project");

  const fixture = await createRealRenderFixture(root);
  const project = JSON.parse(await readFile(path.join(root, "project.json"), "utf8"));
  const cues = JSON.parse(await readFile(path.join(root, "script", "cues.json"), "utf8"));
  const scenes = JSON.parse(await readFile(path.join(root, "scene-spec.json"), "utf8"));
  const visualProgram = JSON.parse(await readFile(path.join(root, "visual-program.json"), "utf8"));
  const renderer = await readFile(path.join(root, "renderer", "index.html"), "utf8");

  assert.equal(fixture.duration, 3.6);
  assert.equal(project.schemaVersion, 2);
  assert.equal(project.template, "spatial-chamber");
  assert.deepEqual(project.frame, { width: 1920, height: 1080, fps: 12 });
  assert.equal(cues.timingSource, "measured-audio");
  assert.equal(cues.complete, true);
  assert.deepEqual(cues.cues.map((cue) => [cue.id, cue.sceneId, cue.start, cue.duration]), [["C01", "S01", 0, 1.8], ["C02", "S01", 1.8, 1.8]]);
  assert.deepEqual(scenes.scenes.map((scene) => [scene.id, scene.cueIds]), [["S01", ["C01", "C02"]]]);
  assert.equal(visualProgram.complete, true);
  assert.deepEqual(visualProgram.scenes.map((scene) => [scene.id, scene.layout]), [["S01", "network"]]);
  assert.match(renderer, /权限请求/);
  assert.match(renderer, /规则引擎/);
  assert.match(renderer, /允许/);
  assert.match(renderer, /拒绝/);
  assert.match(renderer, /data-template-fingerprint="perspective-chamber-tunnel-and-depth-lanes"/);
  assert.match(renderer, /data-signal-path/);
  assert.match(renderer, /data-marker-end="url\(#arrow-request-engine\)"/);
  assert.match(renderer, /target\.style\.opacity=progress>0\?'1':'0'/);
  assert.match(renderer, /tone-success/);
  assert.match(renderer, /tone-danger/);
  assert.match(await readFile(path.join(root, "renderer", "cover.html"), "utf8"), /data-cover-source="visual-program"/);
  await access(path.join(root, "renderer", "index.html"));
});
