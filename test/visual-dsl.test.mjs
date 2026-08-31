import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { writeJsonAtomic } from "../skill/creating-explainer-videos/runtime/json.mjs";
import {
  compileVisualProgram,
  validateVisualProgram,
} from "../skill/creating-explainer-videos/runtime/visual-dsl.mjs";

function validProgram() {
  return {
    schemaVersion: 1,
    template: "spatial-chamber",
    complete: true,
    scenes: [{
      id: "S01",
      cueIds: ["C01", "C02"],
      layout: "network",
      elements: [
        { id: "query", type: "node", label: "查询 token", role: "token", frame: { x: .08, y: .3, width: .2, height: .18 } },
        { id: "key", type: "node", label: "键 token", role: "token", frame: { x: .64, y: .3, width: .2, height: .18 } },
        { id: "unsafe-label", type: "text", text: "<script>alert(1)</script>", role: "formula", frame: { x: .3, y: .08, width: .4, height: .1 } },
        { id: "attention", type: "connector", from: "query", to: "key", route: "curve", role: "attention" },
        { id: "weight", type: "annotation", text: "权重 0.72", target: "attention", role: "metric", frame: { x: .4, y: .44, width: .2, height: .08 } },
      ],
      actions: [
        { cueId: "C01", target: "query", kind: "appear", at: 0, duration: .25 },
        { cueId: "C02", target: "attention", kind: "draw", at: .25, duration: .5 },
        { cueId: "C02", target: "key", kind: "focus", at: .75, duration: .25 },
      ],
    }],
  };
}

function context(projectRoot = process.cwd()) {
  return {
    projectRoot,
    project: { template: "spatial-chamber" },
    sceneDocument: { template: "spatial-chamber", scenes: [{ id: "S01", cueIds: ["C01", "C02"] }] },
    cueDocument: {
      cues: [
        { id: "C01", sceneId: "S01", start: 0, duration: 2 },
        { id: "C02", sceneId: "S01", start: 2, duration: 2 },
      ],
    },
  };
}

async function createProgramProject(program = validProgram()) {
  const root = await mkdtemp(path.join(os.tmpdir(), "explainer-visual-dsl-"));
  await mkdir(path.join(root, "assets"), { recursive: true });
  await writeJsonAtomic(path.join(root, "project.json"), {
    schemaVersion: 1,
    title: "三个 Token 的自注意力",
    topic: "三个 token 如何互相路由信息",
    template: "spatial-chamber",
    frame: { width: 1920, height: 1080, fps: 30 },
  });
  await writeJsonAtomic(path.join(root, "scene-spec.json"), {
    schemaVersion: 1,
    template: "spatial-chamber",
    complete: true,
    scenes: [{ id: "S01", title: "注意力路由", cueIds: ["C01", "C02"] }],
  });
  await mkdir(path.join(root, "script"), { recursive: true });
  await writeJsonAtomic(path.join(root, "script", "cues.json"), context(root).cueDocument);
  await writeJsonAtomic(path.join(root, "visual-program.json"), program);
  return root;
}

test("a topic visual program compiles escaped semantic markup and measured cue actions", async () => {
  const root = await createProgramProject();
  const result = await compileVisualProgram(root);

  assert.equal(result.program.complete, true);
  assert.equal(result.scenes.length, 1);
  assert.match(result.markupByScene.S01, /查询 token/);
  assert.match(result.markupByScene.S01, /data-visual-element-id="attention"/);
  assert.match(result.markupByScene.S01, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(result.markupByScene.S01, /<script>alert/);
  assert.deepEqual(
    result.actionsByScene.S01.map(({ kind, start, duration }) => ({ kind, start, duration })),
    [
      { kind: "appear", start: 0, duration: .5 },
      { kind: "draw", start: 2.5, duration: 1 },
      { kind: "focus", start: 3.5, duration: .5 },
    ],
  );
});

test("visual validation rejects malformed geometry, references, paths, cues, and actions", () => {
  const cases = [
    {
      name: "duplicate element id",
      mutate(program) { program.scenes[0].elements[1].id = "query"; },
      code: "duplicate-element-id",
    },
    {
      name: "geometry outside normalized frame",
      mutate(program) { program.scenes[0].elements[0].frame.x = 1.1; },
      code: "invalid-geometry",
    },
    {
      name: "connector target missing",
      mutate(program) { program.scenes[0].elements[3].to = "missing"; },
      code: "missing-element-reference",
    },
    {
      name: "action cue outside scene",
      mutate(program) { program.scenes[0].actions[0].cueId = "C99"; },
      code: "missing-cue-reference",
    },
    {
      name: "action fraction outside cue",
      mutate(program) { program.scenes[0].actions[0].at = -.1; },
      code: "invalid-action-timing",
    },
    {
      name: "template mismatch",
      mutate(program) { program.template = "ink-explainer"; },
      code: "template-mismatch",
    },
    {
      name: "remote asset",
      mutate(program) { program.scenes[0].elements.push({ id: "remote", type: "asset", src: "https://example.com/a.png", alt: "remote", frame: { x: .1, y: .1, width: .2, height: .2 } }); },
      code: "unsafe-asset-path",
    },
    {
      name: "asset traversal",
      mutate(program) { program.scenes[0].elements.push({ id: "traversal", type: "asset", src: "../secret.png", alt: "secret", frame: { x: .1, y: .1, width: .2, height: .2 } }); },
      code: "unsafe-asset-path",
    },
    {
      name: "unsupported element",
      mutate(program) { program.scenes[0].elements[0].type = "raw-html"; },
      code: "unsupported-element-type",
    },
    {
      name: "unsupported action",
      mutate(program) { program.scenes[0].actions[0].kind = "run-script"; },
      code: "unsupported-action-kind",
    },
  ];

  for (const fixture of cases) {
    const program = structuredClone(validProgram());
    fixture.mutate(program);
    const result = validateVisualProgram(program, context());
    assert.equal(result.valid, false, fixture.name);
    assert.equal(result.errors.some((error) => error.code === fixture.code), true, `${fixture.name}: ${JSON.stringify(result.errors)}`);
  }
});

test("visual validation requires every scene specification to have a visual scene", () => {
  const projectContext = context();
  projectContext.sceneDocument.scenes.push({ id: "S02", cueIds: [] });

  const result = validateVisualProgram(validProgram(), projectContext);

  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.code === "missing-visual-scene" && error.path === "scenes.S02"), true);
});

test("visual validation rejects a scene made only from generic placeholder labels", () => {
  const program = validProgram();
  program.scenes[0].elements = [
    { id: "input", type: "node", label: "INPUT", role: "input", frame: { x: .05, y: .3, width: .2, height: .2 } },
    { id: "change", type: "node", label: "CHANGE", role: "process", frame: { x: .4, y: .3, width: .2, height: .2 } },
    { id: "output", type: "node", label: "OUTPUT", role: "output", frame: { x: .75, y: .3, width: .2, height: .2 } },
  ];
  program.scenes[0].actions = [
    { cueId: "C01", target: "input", kind: "appear", at: 0, duration: .25 },
    { cueId: "C02", target: "change", kind: "focus", at: 0, duration: .5 },
    { cueId: "C02", target: "output", kind: "appear", at: .5, duration: .5 },
  ];

  const result = validateVisualProgram(program, context());

  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.code === "generic-topic-visual"), true);
});
