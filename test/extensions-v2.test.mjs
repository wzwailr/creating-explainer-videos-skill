import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  createExtensionLockEntry,
  discoverExtensions,
  loadExtension,
  loadPreset,
  resolveExtensionAlias,
} from "../lib/extensions.mjs";

const skillRoot = path.resolve("skill", "creating-explainer-videos");

test("AI preset is isolated and generic preset chooses no fixed template", async () => {
  const general = await loadPreset("general-mechanism", skillRoot);
  const ai = await loadPreset("ai-principle-series", skillRoot);

  assert.equal(general.template, null);
  assert.match(JSON.stringify(ai), /AI/);
  assert.doesNotMatch(JSON.stringify(general), /AI 底层原理图解/);
});

test("legacy research ID resolves to the generic primary-source extension", () => {
  assert.equal(resolveExtensionAlias("ai-primary-research"), "primary-source-research");
  assert.equal(resolveExtensionAlias("primary-source-research"), "primary-source-research");
});

test("extension collection exposes three named visual templates and declarative permissions", async () => {
  const extensions = await discoverExtensions(skillRoot);
  const visuals = extensions.filter((item) => item.type === "visual");

  assert.deepEqual(
    visuals.map((item) => item.id).sort(),
    ["ink-explainer", "paper-theatre", "spatial-chamber"],
  );
  assert.equal(extensions.every((item) => item.valid), true);
  assert.equal(extensions.every((item) => Array.isArray(item.permissions)), true);
  assert.doesNotMatch(visuals.map((item) => item.displayName).join("\n"), /(?:^|\s)[ABC]\s*[·：:]/);
});

test("generic extension directory and preset names are path safe", async () => {
  await assert.rejects(() => loadPreset("../outside", skillRoot), /preset id/i);
});

test("extension lock metadata carries declared permissions and immutable hashes", async () => {
  const extension = await loadExtension(skillRoot, "primary-source-research", "research");
  const lock = await createExtensionLockEntry(extension);

  assert.deepEqual(lock.permissions, ["network:read"]);
  assert.match(lock.manifestSha256, /^[a-f0-9]{64}$/);
  assert.match(lock.profileSha256, /^[a-f0-9]{64}$/);
});
