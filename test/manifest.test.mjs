import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createSkillManifest, verifySkillManifest } from "../lib/manifest.mjs";

test("manifest verifies the exact packaged skill and detects tampering", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-video-skill-manifest-"));
  const skillRoot = path.join(root, "skill", "creating-explainer-videos");
  await mkdir(path.join(skillRoot, "scripts"), { recursive: true });
  await writeFile(path.join(skillRoot, "SKILL.md"), "fixture\n", "utf8");
  await writeFile(path.join(skillRoot, "scripts", "check.py"), "print('ok')\n", "utf8");

  const manifest = await createSkillManifest({
    skillRoot,
    packageVersion: "2.1.0",
  });
  const manifestPath = path.join(root, "skill-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const valid = await verifySkillManifest({ skillRoot, manifestPath });
  assert.equal(valid.valid, true);
  assert.equal(valid.checkedFiles, 2);

  await writeFile(path.join(skillRoot, "scripts", "check.py"), "print('tampered')\n", "utf8");
  const tampered = await verifySkillManifest({ skillRoot, manifestPath });
  assert.equal(tampered.valid, false);
  assert.match(tampered.errors.join("\n"), /hash mismatch/i);
});
