import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(packageRoot, "bin", "explainer-video-skill.mjs");

async function createSource(root) {
  const source = path.join(root, "creating-explainer-videos");
  for (const directory of ["agents", "scripts", "references", "assets", "extensions"]) {
    await mkdir(path.join(source, directory), { recursive: true });
  }
  await writeFile(
    path.join(source, "SKILL.md"),
    "---\nname: creating-explainer-videos\ndescription: Use when testing CLI installation.\n---\n\n# CLI fixture\n",
    "utf8",
  );
  await writeFile(path.join(source, "agents", "openai.yaml"), "interface:\n  display_name: CLI fixture\n", "utf8");
  return source;
}

test("CLI installs and verifies from an explicit source", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ai-video-skill-cli-"));
  const source = await createSource(path.join(tempRoot, "source"));
  const codexHome = path.join(tempRoot, "codex-home");

  const install = spawnSync(process.execPath, [cli, "install", "--source", source, "--codex-home", codexHome, "--json"], {
    encoding: "utf8",
  });
  const verify = spawnSync(process.execPath, [cli, "verify", "--codex-home", codexHome, "--json"], {
    encoding: "utf8",
  });

  assert.equal(install.status, 0, install.stderr || install.stdout);
  assert.equal(JSON.parse(install.stdout).action, "installed");
  assert.equal(verify.status, 0, verify.stderr || verify.stdout);
  assert.equal(JSON.parse(verify.stdout).valid, true);
});

test("CLI installs product-neutral skill into an arbitrary skills directory", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ai-video-skill-generic-cli-"));
  const source = await createSource(path.join(tempRoot, "source"));
  const destination = path.join(tempRoot, "any-agent", "skills");

  const install = spawnSync(
    process.execPath,
    [cli, "install", "--source", source, "--destination", destination, "--json"],
    { encoding: "utf8" },
  );
  const verify = spawnSync(
    process.execPath,
    [cli, "verify", "--destination", destination, "--json"],
    { encoding: "utf8" },
  );

  assert.equal(install.status, 0, install.stderr || install.stdout);
  assert.equal(JSON.parse(install.stdout).targetKind, "custom");
  assert.equal(verify.status, 0, verify.stderr || verify.stdout);
  assert.equal(JSON.parse(verify.stdout).valid, true);
});

test("CLI creates a project and reports its next state as JSON", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-video-project-cli-"));
  const projectRoot = path.join(tempRoot, "clearing-flow");
  const created = spawnSync(process.execPath, [
    cli,
    "new",
    projectRoot,
    "--title",
    "信用卡清算",
    "--topic",
    "清算为什么分多步",
    "--template",
    "spatial-chamber",
    "--json",
  ], { encoding: "utf8" });
  const status = spawnSync(process.execPath, [cli, "status", projectRoot, "--json"], { encoding: "utf8" });

  assert.equal(created.status, 0, created.stderr || created.stdout);
  assert.equal(JSON.parse(created.stdout).project.template, "spatial-chamber");
  assert.equal(status.status, 0, status.stderr || status.stdout);
  assert.equal(JSON.parse(status.stdout).next.action, "write-brief");
});

test("CLI lists the visual template collection", () => {
  const listed = spawnSync(process.execPath, [cli, "templates", "list", "--json"], { encoding: "utf8" });

  assert.equal(listed.status, 0, listed.stderr || listed.stdout);
  assert.deepEqual(
    JSON.parse(listed.stdout).map((item) => item.id),
    ["ink-explainer", "paper-theatre", "spatial-chamber"],
  );
});
