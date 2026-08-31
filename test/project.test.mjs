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

test("narration must map the complete mechanism chain into spoken cues", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-mechanism-coverage-"));
  const root = path.join(tempRoot, "project");
  await createProject({ destination: root, title: "状态机", topic: "状态如何改变", template: "ink-explainer" });
  await writeJsonAtomic(path.join(root, "mechanism-map.json"), {
    schemaVersion: 1,
    complete: true,
    input: [{ id: "input-01", text: "请求" }],
    internalChanges: [{ id: "change-01", text: "规则匹配" }],
    output: [{ id: "output-01", text: "结果" }],
    boundaries: [{ id: "boundary-01", text: "无规则时拒绝" }],
    failures: [{ id: "failure-01", text: "规则冲突" }],
    workedExample: { id: "example-01", label: "一次请求", steps: ["进入", "匹配", "输出"] },
  });
  const narrationPath = path.join(root, "script", "narration.json");
  const baseCue = {
    id: "C01",
    sceneId: "S01",
    text: "请求经过规则匹配后得到结果，无规则时拒绝。",
    focus: "state-route",
    visualEvent: "请求穿过规则并得到结果",
  };
  await writeJsonAtomic(narrationPath, { schemaVersion: 1, canonicalText: [baseCue], complete: true });

  const missing = await validateStageEvidence(root, "mechanism_map", { stage: "mechanism_map" });
  assert.equal(missing.valid, false);
  assert.match(missing.errors.join("\n"), /mechanismRefs/);

  await writeJsonAtomic(narrationPath, {
    schemaVersion: 1,
    canonicalText: [{ ...baseCue, mechanismRefs: ["input-01", "change-01", "output-01", "boundary-01", "example-01"] }],
    complete: true,
  });
  const covered = await validateStageEvidence(root, "mechanism_map", { stage: "mechanism_map" });
  assert.equal(covered.valid, true, covered.errors.join("\n"));
});

test("real timing gate rejects caption and TTS drift", async () => {
  const root = path.join(await mkdtemp(path.join(os.tmpdir(), "explainer-caption-drift-")), "project");
  await createProject({ destination: root, title: "同步", topic: "字幕与旁白同步", template: "paper-theatre" });
  await writeFile(path.join(root, ".publish", "narration.wav"), "audio", "utf8");
  await writeJsonAtomic(path.join(root, ".publish", "narration-timing.json"), {
    schemaVersion: 1,
    source: "measured",
    duration: 2.5,
    cues: [{ id: "C01", start: 0, duration: 2.5 }],
  });
  await writeJsonAtomic(path.join(root, "script", "narration.json"), {
    schemaVersion: 1,
    complete: true,
    canonicalText: [{ id: "C01", sceneId: "S01", text: "旁白原文。", focus: "sync", visualEvent: "同步出现" }],
  });
  await writeJsonAtomic(path.join(root, "script", "cues.json"), {
    schemaVersion: 1,
    timingSource: "measured",
    complete: true,
    duration: 2.5,
    cues: [{ id: "C01", sceneId: "S01", start: 0, duration: 2.5, caption: "字幕改写。", tts: "旁白原文。" }],
  });

  const gate = await validateStageEvidence(root, "narration_and_cues", { stage: "narration_and_cues" });
  assert.equal(gate.valid, false);
  assert.match(gate.errors.join("\n"), /caption and TTS must equal canonical narration/);
});

test("real timing gate rejects an over-compressed scene cadence", async () => {
  const root = path.join(await mkdtemp(path.join(os.tmpdir(), "explainer-cue-density-")), "project");
  await createProject({ destination: root, title: "机制", topic: "五步机制", template: "spatial-chamber" });
  await writeFile(path.join(root, ".publish", "narration.wav"), "audio", "utf8");
  const cues = Array.from({ length: 5 }, (_, index) => ({
    id: `C0${index + 1}`,
    sceneId: `S0${index + 1}`,
    start: index * 1.8,
    duration: 1.8,
    caption: `第${index + 1}步。`,
    tts: `第${index + 1}步。`,
  }));
  await writeJsonAtomic(path.join(root, ".publish", "narration-timing.json"), {
    schemaVersion: 1,
    source: "measured",
    duration: 9,
    cues: cues.map(({ id, start, duration }) => ({ id, start, duration })),
  });
  await writeJsonAtomic(path.join(root, "script", "narration.json"), {
    schemaVersion: 1,
    complete: true,
    canonicalText: cues.map((cue) => ({ id: cue.id, sceneId: cue.sceneId, text: cue.tts, focus: cue.id, visualEvent: `展示${cue.id}` })),
  });
  await writeJsonAtomic(path.join(root, "script", "cues.json"), {
    schemaVersion: 1,
    timingSource: "measured",
    complete: true,
    duration: 9,
    cues,
  });

  const gate = await validateStageEvidence(root, "narration_and_cues", { stage: "narration_and_cues" });
  assert.equal(gate.valid, false);
  assert.match(gate.errors.join("\n"), /average cue duration/);
});
