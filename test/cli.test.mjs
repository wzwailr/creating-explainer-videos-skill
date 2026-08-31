import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { writeJsonAtomic } from "../skill/creating-explainer-videos/runtime/json.mjs";
import { importNarrationTiming } from "../skill/creating-explainer-videos/runtime/narration.mjs";
import { createProject } from "../skill/creating-explainer-videos/runtime/project.mjs";

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

async function createVisualCliProject(root) {
  await createProject({ destination: root, title: "注意力路由", topic: "两个 token 如何交换信息", template: "spatial-chamber" });
  await writeJsonAtomic(path.join(root, "script", "narration.json"), {
    schemaVersion: 1,
    complete: true,
    canonicalText: [{ id: "C01", sceneId: "S01", text: "查询与键的分数决定信息路由。" }],
  });
  await writeJsonAtomic(path.join(root, "scene-spec.json"), {
    schemaVersion: 1,
    template: "spatial-chamber",
    complete: true,
    scenes: [{ id: "S01", title: "分数控制路由", cueIds: ["C01"] }],
  });
  await writeJsonAtomic(path.join(root, "visual-program.json"), {
    schemaVersion: 1,
    template: "spatial-chamber",
    complete: true,
    scenes: [{
      id: "S01",
      cueIds: ["C01"],
      layout: "flow",
      elements: [
        { id: "query", type: "node", label: "查询", role: "token", frame: { x: .1, y: .3, width: .2, height: .2 } },
        { id: "key", type: "node", label: "键", role: "token", frame: { x: .65, y: .3, width: .2, height: .2 } },
        { id: "score", type: "connector", from: "query", to: "key", route: "line", role: "attention" },
      ],
      actions: [{ cueId: "C01", target: "score", kind: "draw", at: 0, duration: 1 }],
    }],
  });
  await importNarrationTiming(root, [{ id: "C01", start: 0, duration: 2 }]);
}

test("CLI validates, compiles, and previews a topic visual program", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-visual-cli-"));
  const projectRoot = path.join(tempRoot, "project");
  const previewPath = path.join(tempRoot, "preview.html");
  await createVisualCliProject(projectRoot);

  const validate = spawnSync(process.execPath, [cli, "visual", "validate", projectRoot, "--json"], { encoding: "utf8" });
  const compile = spawnSync(process.execPath, [cli, "visual", "compile", projectRoot, "--json"], { encoding: "utf8" });
  const preview = spawnSync(process.execPath, [cli, "visual", "preview", projectRoot, "--output", previewPath, "--json"], { encoding: "utf8" });

  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  assert.equal(JSON.parse(validate.stdout).valid, true);
  assert.equal(compile.status, 0, compile.stderr || compile.stdout);
  assert.deepEqual(JSON.parse(compile.stdout), { valid: true, scenes: 1, elements: 3, actions: 1, warnings: [] });
  assert.equal(preview.status, 0, preview.stderr || preview.stdout);
  assert.match(await readFile(previewPath, "utf8"), /data-visual-element-id="score"/);
});

test("CLI returns structured visual validation failures", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-invalid-visual-cli-"));
  const projectRoot = path.join(tempRoot, "project");
  await createVisualCliProject(projectRoot);
  const programPath = path.join(projectRoot, "visual-program.json");
  const program = JSON.parse(await readFile(programPath, "utf8"));
  program.scenes[0].actions[0].target = "missing";
  await writeJsonAtomic(programPath, program);

  const validate = spawnSync(process.execPath, [cli, "visual", "validate", projectRoot, "--json"], { encoding: "utf8" });
  const result = JSON.parse(validate.stdout);

  assert.equal(validate.status, 1, validate.stderr || validate.stdout);
  assert.equal(result.valid, false);
  assert.equal(result.errors.some((error) => error.code === "missing-element-reference"), true);
});
