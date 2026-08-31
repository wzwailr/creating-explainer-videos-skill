import assert from "node:assert/strict";
import { access, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tarball = path.resolve(process.argv[2] || "");
const npmExecPath = process.env.npm_execpath;
if (!process.argv[2]) throw new Error("tarball path is required");
if (!npmExecPath) throw new Error("run through `npm run smoke:packed -- <tarball>`");
await access(tarball);

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-packed-smoke-"));
const destination = path.join(tempRoot, "generic-agent", "skills");
const codexHome = path.join(tempRoot, "codex-home");
const project = path.join(tempRoot, "demo-project");
const globalPrefix = path.join(tempRoot, "npm-global");
const npmCache = path.join(tempRoot, "npm-cache");
const commandEnvironment = { ...process.env, npm_config_cache: npmCache };

function execPacked(command, args = [], options = {}) {
  const result = spawnSync(
    process.execPath,
    [npmExecPath, "exec", "--yes", `--package=${tarball}`, "--", command, ...args],
    { encoding: "utf8", windowsHide: true, env: commandEnvironment },
  );
  assert.equal(result.status, options.expectedStatus ?? 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function runJson(args, expectedStatus = 0) {
  return JSON.parse(execPacked("explainer-video-skill", [...args, "--json"], { expectedStatus }));
}

assert.equal(execPacked("explainer-video-skill", ["--version"]), "2.1.0");
assert.equal(execPacked("ai-principle-video-skill", ["--version"]), "2.1.0");

const templates = runJson(["templates", "list"]);
assert.deepEqual(templates.map((item) => item.id).sort(), ["ink-explainer", "paper-theatre", "spatial-chamber"]);
assert.equal(templates.every((item) => item.valid), true);

const created = runJson([
  "new", project,
  "--title", "Demo",
  "--topic", "How a process changes state",
  "--template", "paper-theatre",
]);
assert.equal(created.project.preset, "general-mechanism");
assert.equal(created.project.template, "paper-theatre");
assert.equal(runJson(["status", project]).state.stage, "discovery");
assert.equal(runJson(["next", project], 1).stage, "discovery");

const genericInstall = runJson(["install", "--destination", destination]);
assert.equal(genericInstall.targetKind, "custom");
const genericVerify = runJson(["verify", "--destination", destination]);
assert.equal(genericVerify.valid, true);
assert.ok(genericVerify.integrity.checkedFiles > 0);
const extensions = runJson(["list-extensions", "--destination", destination]);
assert.equal(extensions.length, 7);
assert.equal(extensions.every((item) => item.valid), true);
const genericUpdate = runJson(["update", "--destination", destination]);
assert.equal(genericUpdate.action, "updated");
assert.ok(genericUpdate.backupPath);
const genericRollback = runJson(["rollback", "--destination", destination]);
assert.equal(genericRollback.action, "rolled_back");
assert.ok(genericRollback.displacedTo);
assert.equal(runJson(["verify", "--destination", destination]).valid, true);
assert.equal(runJson(["uninstall", "--destination", destination]).action, "uninstalled");
assert.equal(runJson(["verify", "--destination", destination], 1).valid, false);

assert.equal(runJson(["install", "--target", "codex", "--codex-home", codexHome]).targetKind, "codex");
assert.equal(runJson(["verify", "--target", "codex", "--codex-home", codexHome]).valid, true);
assert.equal(runJson(["uninstall", "--target", "codex", "--codex-home", codexHome]).action, "uninstalled");

const globalInstall = spawnSync(
  process.execPath,
  [npmExecPath, "install", "--global", "--prefix", globalPrefix, tarball],
  { encoding: "utf8", windowsHide: true, env: commandEnvironment },
);
assert.equal(globalInstall.status, 0, globalInstall.stderr || globalInstall.stdout);
const installedCli = path.join(
  globalPrefix,
  "node_modules",
  "creating-explainer-videos-skill",
  "bin",
  "explainer-video-skill.mjs",
);
const installedVersion = spawnSync(process.execPath, [installedCli, "--version"], { encoding: "utf8", windowsHide: true });
assert.equal(installedVersion.status, 0, installedVersion.stderr || installedVersion.stdout);
assert.equal(installedVersion.stdout.trim(), "2.1.0");

console.log(`PASS packed npx/global CLI, scaffold, templates, and Skill lifecycle in ${tempRoot}`);
