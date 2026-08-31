import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createRealRenderFixture } from "../scripts/real-render-smoke.mjs";

test("real render fixture uses a measured short cue and generated production renderer", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "explainer-real-render-fixture-"));
  const root = path.join(temporary, "project");

  const fixture = await createRealRenderFixture(root);
  const project = JSON.parse(await readFile(path.join(root, "project.json"), "utf8"));
  const cues = JSON.parse(await readFile(path.join(root, "script", "cues.json"), "utf8"));
  const scenes = JSON.parse(await readFile(path.join(root, "scene-spec.json"), "utf8"));
  const visualProgram = JSON.parse(await readFile(path.join(root, "visual-program.json"), "utf8"));
  const renderer = await readFile(path.join(root, "renderer", "index.html"), "utf8");

  assert.equal(fixture.duration, 1.2);
  assert.equal(project.schemaVersion, 2);
  assert.equal(project.template, "paper-theatre");
  assert.deepEqual(project.frame, { width: 1920, height: 1080, fps: 12 });
  assert.equal(cues.timingSource, "measured-audio");
  assert.equal(cues.complete, true);
  assert.deepEqual(cues.cues.map((cue) => [cue.id, cue.sceneId, cue.start, cue.duration]), [["C01", "S01", 0, 1.2]]);
  assert.deepEqual(scenes.scenes.map((scene) => [scene.id, scene.cueIds]), [["S01", ["C01"]]]);
  assert.equal(visualProgram.complete, true);
  assert.deepEqual(visualProgram.scenes.map((scene) => [scene.id, scene.layout]), [["S01", "flow"]]);
  assert.match(renderer, /请求进入规则引擎/);
  assert.match(renderer, /规则匹配后输出结果/);
  await access(path.join(root, "renderer", "index.html"));
});
