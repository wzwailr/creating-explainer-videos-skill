import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const genericSkillRoot = path.join(packageRoot, "skill", "creating-explainer-videos");

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

test("package exposes the generic primary command and legacy alias", async () => {
  const pkg = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));

  assert.equal(pkg.name, "creating-explainer-videos-skill");
  assert.equal(pkg.version, "2.2.0");
  assert.equal(pkg.engines.node, ">=22");
  assert.equal(pkg.private, false);
  assert.equal(pkg.bin["explainer-video-skill"], "./bin/explainer-video-skill.mjs");
  assert.equal(pkg.bin["ai-principle-video-skill"], "./bin/ai-principle-video-skill.mjs");
});

test("generic skill is the primary packaged skill", async () => {
  const skillFile = path.join(genericSkillRoot, "SKILL.md");

  assert.equal(await exists(skillFile), true);
  const text = await readFile(skillFile, "utf8");
  assert.match(text, /^---[\s\S]*?name:\s*creating-explainer-videos\s*$/m);
});

test("SKILL routes agents through executable state and the complete template collection", async () => {
  const text = await readFile(path.join(genericSkillRoot, "SKILL.md"), "utf8");
  for (const term of [
    "status --json",
    "next --json",
    "validate",
    "paper-theatre",
    "spatial-chamber",
    "ink-explainer",
    "human_listen",
    "Node.js 22+",
    "visual validate",
    "narration synthesize",
    "visual-program-dsl.md",
    "voice-adapter-protocol.md",
    "smoke:render",
  ]) {
    assert.match(text, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.ok(text.length < 12000);
});
