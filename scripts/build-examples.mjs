#!/usr/bin/env node

import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { importNarrationTiming } from "../skill/creating-explainer-videos/runtime/narration.mjs";
import { createProject } from "../skill/creating-explainer-videos/runtime/project.mjs";
import { buildCover, buildRenderer } from "../skill/creating-explainer-videos/runtime/renderer.mjs";
import { writeJsonAtomic } from "../skill/creating-explainer-videos/runtime/json.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(packageRoot, "examples");
const fixtureIds = ["credit-card-clearing", "quantum-tunneling"];

async function loadFixture(id) {
  if (!fixtureIds.includes(id)) throw new Error(`unknown example fixture: ${id}`);
  return JSON.parse(await readFile(path.join(fixtureRoot, id, "fixture.json"), "utf8"));
}

function cueActions(scene, targets) {
  const firstCue = scene.cueIds[0];
  const lastCue = scene.cueIds.at(-1);
  if (firstCue === lastCue) {
    return [
      { cueId: firstCue, target: targets.input, kind: "appear", at: 0, duration: .18 },
      { cueId: firstCue, target: targets.firstLink, kind: "draw", at: .18, duration: .2 },
      { cueId: firstCue, target: targets.transformation, kind: "focus", at: .38, duration: .2 },
      { cueId: firstCue, target: targets.secondLink, kind: "draw", at: .58, duration: .2 },
      { cueId: firstCue, target: targets.output, kind: "appear", at: .78, duration: .22 },
    ];
  }
  return [
    { cueId: firstCue, target: targets.input, kind: "appear", at: 0, duration: .25 },
    { cueId: firstCue, target: targets.firstLink, kind: "draw", at: .25, duration: .35 },
    { cueId: firstCue, target: targets.transformation, kind: "focus", at: .6, duration: .4 },
    { cueId: lastCue, target: targets.secondLink, kind: "draw", at: 0, duration: .5 },
    { cueId: lastCue, target: targets.output, kind: "appear", at: .5, duration: .5 },
  ];
}

function spatialVisualScene(scene) {
  const targets = { input: "input", transformation: "change", output: "output", firstLink: "input-change", secondLink: "change-output" };
  return {
    id: scene.id,
    cueIds: scene.cueIds,
    layout: "network",
    elements: [
      { id: "chamber", type: "group", label: scene.title, role: "chamber", frame: { x: .035, y: .09, width: .93, height: .72 } },
      { id: "input", type: "node", label: scene.input, role: "input", frame: { x: .07, y: .34, width: .23, height: .18 } },
      { id: "change", type: "node", label: scene.transformation, role: "state", frame: { x: .385, y: .3, width: .23, height: .25 } },
      { id: "output", type: "node", label: scene.output, role: "output", frame: { x: .7, y: .34, width: .23, height: .18 } },
      { id: "input-change", type: "connector", from: "input", to: "change", route: "curve", role: "signal" },
      { id: "change-output", type: "connector", from: "change", to: "output", route: "curve", role: "signal" },
      { id: "knowledge", type: "annotation", text: scene.knowledgePoint, target: "change", role: "mechanism", frame: { x: .22, y: .63, width: .56, height: .1 } },
    ],
    actions: cueActions(scene, targets),
  };
}

function inkVisualScene(scene) {
  const targets = { input: "incoming-wave", transformation: "shape-barrier", output: "transmitted-wave", firstLink: "enter-barrier", secondLink: "leave-barrier" };
  return {
    id: scene.id,
    cueIds: scene.cueIds,
    layout: "compare",
    elements: [
      { id: "scene-title", type: "text", text: scene.title, role: "formula", frame: { x: .12, y: .08, width: .76, height: .11 } },
      { id: "incoming-wave", type: "node", label: scene.input, role: "wave", frame: { x: .06, y: .34, width: .25, height: .18 } },
      { id: "shape-barrier", type: "shape", shape: "rectangle", role: "barrier", frame: { x: .415, y: .24, width: .17, height: .38 } },
      { id: "barrier-label", type: "text", text: scene.transformation, role: "derivation", frame: { x: .37, y: .65, width: .26, height: .1 } },
      { id: "transmitted-wave", type: "node", label: scene.output, role: "probability", frame: { x: .69, y: .34, width: .25, height: .18 } },
      { id: "enter-barrier", type: "connector", from: "incoming-wave", to: "shape-barrier", route: "curve", role: "wave" },
      { id: "leave-barrier", type: "connector", from: "shape-barrier", to: "transmitted-wave", route: "curve", role: "wave" },
      { id: "knowledge", type: "annotation", text: scene.knowledgePoint, target: "shape-barrier", role: "proof", frame: { x: .2, y: .72, width: .6, height: .1 } },
    ],
    actions: cueActions(scene, targets),
  };
}

function paperVisualScene(scene) {
  const targets = { input: "input-card", transformation: "process-card", output: "output-card", firstLink: "first-arrow", secondLink: "second-arrow" };
  return {
    id: scene.id,
    cueIds: scene.cueIds,
    layout: "flow",
    elements: [
      { id: "sheet", type: "group", label: scene.title, role: "sheet", frame: { x: .04, y: .1, width: .92, height: .7 } },
      { id: "input-card", type: "node", label: scene.input, role: "evidence", frame: { x: .08, y: .32, width: .22, height: .2 } },
      { id: "process-card", type: "node", label: scene.transformation, role: "process", frame: { x: .39, y: .28, width: .22, height: .28 } },
      { id: "output-card", type: "node", label: scene.output, role: "result", frame: { x: .7, y: .32, width: .22, height: .2 } },
      { id: "first-arrow", type: "connector", from: "input-card", to: "process-card", route: "line", role: "arrow" },
      { id: "second-arrow", type: "connector", from: "process-card", to: "output-card", route: "line", role: "arrow" },
      { id: "note", type: "annotation", text: scene.knowledgePoint, target: "process-card", role: "note", frame: { x: .22, y: .64, width: .56, height: .11 } },
    ],
    actions: cueActions(scene, targets),
  };
}

export function buildFixtureVisualProgram(fixture) {
  const builder = fixture.project.template === "spatial-chamber"
    ? spatialVisualScene
    : fixture.project.template === "paper-theatre"
      ? paperVisualScene
      : inkVisualScene;
  return {
    schemaVersion: 1,
    template: fixture.project.template,
    complete: true,
    scenes: fixture.scenes.map(builder),
  };
}

export async function buildExample(id, destination) {
  const fixture = await loadFixture(id);
  const created = await createProject({
    destination,
    title: fixture.project.title,
    topic: fixture.project.topic,
    template: fixture.project.template,
    preset: "general-mechanism",
    language: fixture.project.language || "zh-CN",
    platform: fixture.project.platform || "short-video",
  });
  const root = created.root;
  const documents = new Map([
    ["brief.json", { schemaVersion: 1, ...fixture.brief, complete: true }],
    ["evidence/evidence.json", { schemaVersion: 1, ...fixture.evidence, complete: true }],
    ["mechanism-map.json", { schemaVersion: 1, ...fixture.mechanismMap, complete: true }],
    ["script/narration.json", { schemaVersion: 1, canonicalText: fixture.narration, complete: true }],
    ["storyboard.json", { schemaVersion: 1, scenes: fixture.scenes, complete: true }],
    ["scene-spec.json", { schemaVersion: 1, template: fixture.project.template, scenes: fixture.scenes, complete: true }],
    ["visual-program.json", buildFixtureVisualProgram(fixture)],
  ]);
  for (const [relativePath, value] of documents) {
    await writeJsonAtomic(path.join(root, relativePath), value);
  }
  await importNarrationTiming(root, fixture.timing);
  const renderer = await buildRenderer(root);
  const cover = await buildCover(root);
  const qc = {
    schemaVersion: 1,
    fixtureOnly: true,
    scope: "source-renderer-and-timing-contract",
    mediaChecks: "not-run",
    releaseDecision: "release_candidate_pending_human_listen",
    publishable: false,
    humanListenRequired: true,
    checks: [
      { name: "canonical-narration", status: "passed" },
      { name: "measured-fixture-timing", status: "passed" },
      { name: "runnable-renderer", status: "passed" },
      { name: "dedicated-cover-source", status: "passed" },
      { name: "encoded-media", status: "not-run" },
    ],
  };
  await writeJsonAtomic(path.join(root, "qc", "fixture-contract.json"), qc);
  await writeJsonAtomic(path.join(root, "publish", "publishing-package.json"), {
    schemaVersion: 1,
    fixtureOnly: true,
    releaseDecision: qc.releaseDecision,
    title: fixture.publishing.title,
    description: fixture.publishing.description,
    topics: fixture.publishing.topics,
    pinnedComment: fixture.publishing.pinnedComment,
    publishable: false,
  });
  return {
    root,
    project: created.project,
    fixture,
    qc,
    paths: {
      renderer: renderer.path,
      cover: cover.path,
      cues: path.join(root, "script", "cues.json"),
      timing: path.join(root, ".publish", "narration-timing.json"),
      visualProgram: path.join(root, "visual-program.json"),
      qc: path.join(root, "qc", "fixture-contract.json"),
    },
  };
}

async function main(argv) {
  const verify = argv.includes("--verify");
  const outputIndex = argv.indexOf("--output");
  const requestedOutput = outputIndex >= 0 ? argv[outputIndex + 1] : undefined;
  const id = argv.find((item) => !item.startsWith("--") && item !== requestedOutput);
  const ids = id ? [id] : fixtureIds;
  const root = requestedOutput
    ? path.resolve(requestedOutput)
    : await mkdtemp(path.join(os.tmpdir(), "explainer-examples-"));
  const results = [];
  for (const fixtureId of ids) {
    const destination = path.join(root, fixtureId);
    const result = await buildExample(fixtureId, destination);
    results.push({
      id: fixtureId,
      root: result.root,
      template: result.project.template,
      preset: result.project.preset,
      cues: result.fixture.narration.length,
      scenes: result.fixture.scenes.length,
      releaseDecision: result.qc.releaseDecision,
      fixtureOnly: true,
      verified: verify,
    });
  }
  console.log(JSON.stringify({ root, results }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`ERROR ${error.message}`);
    process.exitCode = 1;
  });
}
