import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  installSkill,
  installedSkillPath,
  rollbackSkill,
  resolveSkillsRoot,
  uninstallSkill,
  verifyInstalledSkill,
} from "../lib/installer.mjs";
import {
  discoverExtensions,
  validateExtension,
} from "../lib/extensions.mjs";

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFixtureSkill(root, marker = "v1") {
  const skillRoot = path.join(root, "creating-ai-principle-videos");
  await mkdir(path.join(skillRoot, "agents"), { recursive: true });
  await mkdir(path.join(skillRoot, "scripts"), { recursive: true });
  await mkdir(path.join(skillRoot, "references"), { recursive: true });
  await mkdir(path.join(skillRoot, "assets"), { recursive: true });
  await writeFile(
    path.join(skillRoot, "SKILL.md"),
    `---\nname: creating-ai-principle-videos\ndescription: Use when testing a packaged video skill.\n---\n\n# Fixture\n\n${marker}\n`,
    "utf8",
  );
  await writeFile(path.join(skillRoot, "agents", "openai.yaml"), "interface:\n  display_name: Fixture\n", "utf8");

  const extensionRoot = path.join(skillRoot, "extensions", "ink-explainer");
  await writeJson(path.join(extensionRoot, "extension.json"), {
    apiVersion: 1,
    id: "ink-explainer",
    type: "visual",
    version: "1.0.0",
    displayName: "Ink Explainer",
    description: "C-style hand-drawn explainer visual profile.",
    entrypoints: {
      reference: "reference.md",
      profile: "profile.json",
      assets: ["assets/style-tokens.css"],
    },
    capabilities: ["visual.tokens", "visual.motion", "cover.template"],
  });
  await writeFile(path.join(extensionRoot, "reference.md"), "# Ink Explainer\n", "utf8");
  await writeJson(path.join(extensionRoot, "profile.json"), { style: "ink" });
  await mkdir(path.join(extensionRoot, "assets"), { recursive: true });
  await writeFile(path.join(extensionRoot, "assets", "style-tokens.css"), ":root{}\n", "utf8");
  return skillRoot;
}

test("resolves both Codex and product-neutral skills roots", () => {
  const base = path.resolve("fixture-home");
  const generic = path.resolve("fixture-agent-skills");

  assert.equal(resolveSkillsRoot({ target: "codex", codexHome: base }), path.join(base, "skills"));
  assert.equal(resolveSkillsRoot({ destination: generic }), generic);
  assert.equal(
    installedSkillPath({ destination: generic }),
    path.join(generic, "creating-ai-principle-videos"),
  );
});

test("installs and verifies the skill in an isolated CODEX_HOME", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ai-video-skill-install-"));
  const source = await createFixtureSkill(path.join(tempRoot, "source"));
  const codexHome = path.join(tempRoot, "codex-home");

  const result = await installSkill({ source, codexHome });
  const verification = await verifyInstalledSkill({ codexHome });

  assert.equal(result.action, "installed");
  assert.equal(verification.valid, true);
  assert.deepEqual(verification.extensions.map((item) => item.id), ["ink-explainer"]);
  assert.match(
    await readFile(path.join(codexHome, "skills", "creating-ai-principle-videos", "SKILL.md"), "utf8"),
    /v1/,
  );
});

test("upgrades with a recoverable backup", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ai-video-skill-upgrade-"));
  const sourceV1 = await createFixtureSkill(path.join(tempRoot, "source-v1"), "v1");
  const sourceV2 = await createFixtureSkill(path.join(tempRoot, "source-v2"), "v2");
  const codexHome = path.join(tempRoot, "codex-home");

  await installSkill({ source: sourceV1, codexHome });
  const result = await installSkill({ source: sourceV2, codexHome });

  assert.equal(result.action, "updated");
  assert.ok(result.backupPath);
  assert.match(await readFile(path.join(result.backupPath, "SKILL.md"), "utf8"), /v1/);
  assert.match(
    await readFile(path.join(codexHome, "skills", "creating-ai-principle-videos", "SKILL.md"), "utf8"),
    /v2/,
  );
});

test("rolls back to the most recent recoverable backup", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ai-video-skill-explicit-rollback-"));
  const sourceV1 = await createFixtureSkill(path.join(tempRoot, "source-v1"), "v1");
  const sourceV2 = await createFixtureSkill(path.join(tempRoot, "source-v2"), "v2");
  const destination = path.join(tempRoot, "generic-agent", "skills");

  await installSkill({ source: sourceV1, destination });
  await installSkill({ source: sourceV2, destination });
  const result = await rollbackSkill({ destination });

  assert.equal(result.action, "rolled_back");
  assert.match(
    await readFile(path.join(destination, "creating-ai-principle-videos", "SKILL.md"), "utf8"),
    /v1/,
  );
  assert.ok(result.displacedTo);
});

test("rejects an invalid source without disturbing the installed skill", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ai-video-skill-rollback-"));
  const validSource = await createFixtureSkill(path.join(tempRoot, "valid"), "keep-me");
  const invalidSource = path.join(tempRoot, "invalid", "creating-ai-principle-videos");
  const codexHome = path.join(tempRoot, "codex-home");
  await mkdir(invalidSource, { recursive: true });
  await writeFile(path.join(invalidSource, "SKILL.md"), "broken\n", "utf8");

  await installSkill({ source: validSource, codexHome });
  await assert.rejects(() => installSkill({ source: invalidSource, codexHome }), /invalid skill source/i);
  assert.match(
    await readFile(path.join(codexHome, "skills", "creating-ai-principle-videos", "SKILL.md"), "utf8"),
    /keep-me/,
  );
});

test("uninstall moves the exact skill into a recoverable backup", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ai-video-skill-uninstall-"));
  const source = await createFixtureSkill(path.join(tempRoot, "source"));
  const codexHome = path.join(tempRoot, "codex-home");
  await installSkill({ source, codexHome });

  const result = await uninstallSkill({ codexHome });

  assert.equal(result.action, "uninstalled");
  assert.ok(result.backupPath);
  assert.match(await readFile(path.join(result.backupPath, "SKILL.md"), "utf8"), /Fixture/);
  const verification = await verifyInstalledSkill({ codexHome });
  assert.equal(verification.valid, false);
});

test("extension discovery validates manifests and referenced files", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ai-video-skill-extensions-"));
  const skillRoot = await createFixtureSkill(path.join(tempRoot, "source"));

  const extensions = await discoverExtensions(skillRoot);

  assert.equal(extensions.length, 1);
  assert.equal(extensions[0].id, "ink-explainer");
  assert.equal(extensions[0].valid, true);
});

test("extension validation rejects traversal and missing entrypoints", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ai-video-skill-invalid-extension-"));
  const extensionRoot = path.join(tempRoot, "bad-extension");
  await writeJson(path.join(extensionRoot, "extension.json"), {
    apiVersion: 1,
    id: "bad-extension",
    type: "voice",
    version: "1.0.0",
    displayName: "Bad Extension",
    description: "Invalid fixture.",
    entrypoints: {
      reference: "../outside.md",
      profile: "missing.json",
      assets: [],
    },
    capabilities: ["voice.tts"],
  });

  const result = await validateExtension(extensionRoot);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /outside extension directory/i);
  assert.match(result.errors.join("\n"), /missing entrypoint/i);
});
