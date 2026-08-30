import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
