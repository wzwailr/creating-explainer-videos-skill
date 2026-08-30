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
