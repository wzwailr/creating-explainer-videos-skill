import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { validateStageEvidence } from "../skill/creating-explainer-videos/runtime/gates.mjs";
import { writeJsonAtomic } from "../skill/creating-explainer-videos/runtime/json.mjs";

import {
  createProject,
  loadProject,
  validateProjectStage,
  writeEvidence,
} from "../skill/creating-explainer-videos/runtime/project.mjs";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

test("new creates a JSON-first runnable explainer project", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-project-"));
  const root = path.join(tempRoot, "credit-card-clearing");

  const result = await createProject({
    destination: root,
    title: "信用卡清算",
    topic: "清算为什么不是瞬间完成",
    template: "spatial-chamber",
    preset: "general-mechanism",
  });

  for (const file of [
    "project.json",
    "production-state.json",
    "toolchain.json",
    "extensions.lock.json",
    "brief.json",
    "brief.md",
    "evidence/evidence.json",
    "mechanism-map.json",
    "script/narration.json",
    "script/cues.json",
    "storyboard.json",
    "scene-spec.json",
    "visual-program.json",
    "renderer/index.html",
    "renderer/cover.html",
    "renderer/template/template.json",
    "renderer/template/scene.css",
    "renderer/template/motion.mjs",
    "renderer/template/cover.css",
  ]) {
    assert.equal(await exists(path.join(root, file)), true, file);
  }
  assert.equal(result.project.slug, "credit-card-clearing");
  assert.equal(result.project.template, "spatial-chamber");
  assert.equal(result.project.schemaVersion, 2);
  const visualProgram = JSON.parse(await readFile(path.join(root, "visual-program.json"), "utf8"));
  assert.equal(visualProgram.complete, false);
  assert.match(await readFile(path.join(root, "renderer", "index.html"), "utf8"), /window\.__explainer/);
  const lock = JSON.parse(await readFile(path.join(root, "extensions.lock.json"), "utf8"));
  assert.deepEqual(lock.selections, {
    visual: "spatial-chamber",
    voice: "neutral-technical-zh",
    research: "primary-source-research",
    qc: "strict-release-qc",
    publishing: "douyin-release",
  });
  assert.equal(lock.extensions.length, 5);
  assert.equal(lock.extensions.every((item) => /^[a-f0-9]{64}$/.test(item.manifestSha256)), true);
  assert.equal(await exists(path.join(root, "extensions", "spatial-chamber", "profile.json")), true);
});

test("new refuses a non-empty destination and force preserves unrelated files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "explainer-existing-"));
  const unrelated = path.join(root, "keep-me.txt");
  await writeFile(unrelated, "user data", "utf8");

  await assert.rejects(
    () => createProject({ destination: root, title: "Demo", topic: "Flow", template: "paper-theatre" }),
    /non-empty/i,
  );
  await createProject({ destination: root, title: "Demo", topic: "Flow", template: "paper-theatre", force: true });
  assert.equal(await readFile(unrelated, "utf8"), "user data");
});

test("stage validation rejects scaffold placeholders and advances only after complete evidence", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-stage-"));
  const root = path.join(tempRoot, "demo");
  await createProject({ destination: root, title: "Demo", topic: "Flow", template: "ink-explainer" });

  const evidence = await writeEvidence(root, "research-note", { claim: "verified" });
  assert.match(evidence.sha256, /^[a-f0-9]{64}$/);

  const incomplete = await validateProjectStage(root, "discovery");
  assert.equal(incomplete.valid, false);
  assert.match(incomplete.errors.join("\n"), /brief.*complete/i);

  const briefPath = path.join(root, "brief.json");
  const brief = JSON.parse(await readFile(briefPath, "utf8"));
  await writeFile(briefPath, `${JSON.stringify({
    ...brief,
    audience: "General audience",
    exactQuestion: "How does the state change?",
    promisedAnswer: "The input moves through three verified transitions.",
    scope: ["input", "state", "output"],
    constraints: ["teaching example"],
    complete: true,
  }, null, 2)}\n`, "utf8");

  const validation = await validateProjectStage(root, "discovery");
  assert.equal(validation.valid, true);
  assert.equal(validation.state.stage, "brief");

  const loaded = await loadProject(root);
  assert.equal(loaded.state.stage, "brief");
});

async function writeCompleteSceneDesign(root) {
  const scene = {
    id: "S01",
    title: "状态改变",
    purpose: "展示输入如何变为输出",
    knowledgePoint: "内部状态决定输出",
    input: "输入 A",
    transformation: "状态更新",
    output: "输出 B",
    compositionTask: "输入节点经过状态节点连接到输出节点",
    cueIds: ["C01"],
  };
  await writeJsonAtomic(path.join(root, "scene-spec.json"), { schemaVersion: 1, template: "ink-explainer", scenes: [scene], complete: true });
  await writeJsonAtomic(path.join(root, "storyboard.json"), { schemaVersion: 1, scenes: [scene], complete: true });
  await writeJsonAtomic(path.join(root, "script", "cues.json"), {
    schemaVersion: 1,
    timingSource: "measured",
    complete: true,
    cues: [{ id: "C01", sceneId: "S01", start: 0, duration: 2, caption: "输入改变状态。", tts: "输入改变状态。" }],
  });
}

test("v2.1 scene-design gate requires a complete valid visual program while v2.0 remains compatible", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-visual-gate-"));
  const root = path.join(tempRoot, "project");
  await createProject({ destination: root, title: "状态机", topic: "状态如何改变", template: "ink-explainer" });
  await writeCompleteSceneDesign(root);

  const incomplete = await validateStageEvidence(root, "real_audio_timing", { stage: "real_audio_timing" });
  assert.equal(incomplete.valid, false);
  assert.match(incomplete.errors.join("\n"), /visual-program\.json complete must be true/);

  await writeJsonAtomic(path.join(root, "visual-program.json"), {
    schemaVersion: 1,
    template: "ink-explainer",
    complete: true,
    scenes: [{
      id: "S01",
      cueIds: ["C01"],
      layout: "flow",
      elements: [
        { id: "input", type: "node", label: "输入 A", role: "input", frame: { x: .08, y: .35, width: .2, height: .2 } },
        { id: "state", type: "node", label: "状态更新", role: "state", frame: { x: .4, y: .35, width: .2, height: .2 } },
        { id: "flow", type: "connector", from: "input", to: "state", route: "curve", role: "cause" },
      ],
      actions: [{ cueId: "C01", target: "flow", kind: "draw", at: 0, duration: 1 }],
    }],
  });
  const valid = await validateStageEvidence(root, "real_audio_timing", { stage: "real_audio_timing" });
  assert.equal(valid.valid, true, valid.errors.join("\n"));

  const projectPath = path.join(root, "project.json");
  const project = JSON.parse(await readFile(projectPath, "utf8"));
  project.schemaVersion = 1;
  await writeJsonAtomic(projectPath, project);
  await rm(path.join(root, "visual-program.json"));
  const legacy = await validateStageEvidence(root, "real_audio_timing", { stage: "real_audio_timing" });
  assert.equal(legacy.valid, true, legacy.errors.join("\n"));
});

test("fixture narration cannot satisfy the real-audio stage gate", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-fixture-audio-gate-"));
  const root = path.join(tempRoot, "project");
  await createProject({ destination: root, title: "Fixture", topic: "Fixture audio", template: "paper-theatre" });
  await writeFile(path.join(root, ".publish", "narration.wav"), "fixture-audio", "utf8");
  await writeJsonAtomic(path.join(root, ".publish", "narration-timing.json"), {
    schemaVersion: 1,
    source: "measured",
    testOnly: true,
    adapter: "fixture-tts",
    duration: 1,
    cues: [{ id: "C01", start: 0, duration: 1 }],
  });
  await writeJsonAtomic(path.join(root, "script", "cues.json"), {
    schemaVersion: 1,
    timingSource: "measured",
    complete: true,
    duration: 1,
    cues: [{ id: "C01", sceneId: "S01", start: 0, duration: 1, caption: "测试", tts: "测试" }],
  });

  const gate = await validateStageEvidence(root, "narration_and_cues", { stage: "narration_and_cues" });
  assert.equal(gate.valid, false);
  assert.match(gate.errors.join("\n"), /test-only narration cannot satisfy real audio timing/);
});
