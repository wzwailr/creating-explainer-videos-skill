import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildExample } from "../scripts/build-examples.mjs";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

for (const fixture of ["credit-card-clearing", "quantum-tunneling"]) {
  test(`${fixture} builds without a domain-specific preset`, async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-e2e-"));
    const result = await buildExample(fixture, path.join(tempRoot, fixture));

    assert.equal(result.project.preset, "general-mechanism");
    assert.doesNotMatch(JSON.stringify(result.project), /AI 底层原理图解/);
    assert.equal(result.qc.releaseDecision, "release_candidate_pending_human_listen");
    assert.equal(result.qc.publishable, false);
    assert.equal(await exists(result.paths.renderer), true);
    assert.equal(await exists(result.paths.cover), true);
    assert.equal(await exists(result.paths.cues), true);
    assert.match(await readFile(result.paths.renderer, "utf8"), /window\.__explainer/);
  });
}

test("the two non-AI examples exercise different visual structures", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-templates-"));
  const spatial = await buildExample("credit-card-clearing", path.join(tempRoot, "spatial"));
  const ink = await buildExample("quantum-tunneling", path.join(tempRoot, "ink"));
  const spatialHtml = await readFile(spatial.paths.renderer, "utf8");
  const inkHtml = await readFile(ink.paths.renderer, "utf8");

  assert.match(spatialHtml, /chamber-stage/);
  assert.match(inkHtml, /derivation-board/);
  assert.notEqual(spatial.project.template, ink.project.template);
});
