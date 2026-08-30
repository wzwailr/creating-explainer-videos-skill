import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tarball = path.resolve(process.argv[2] || "");
const npmExecPath = process.env.npm_execpath;
if (!process.argv[2]) throw new Error("tarball path is required");
if (!npmExecPath) throw new Error("run through `npm run smoke:packed -- <tarball>`");

function runCli(args, expectedStatus = 0) {
  const result = spawnSync(
    process.execPath,
    [npmExecPath, "exec", "--yes", `--package=${tarball}`, "--", "ai-principle-video-skill", ...args, "--json"],
    { encoding: "utf8", windowsHide: true, env: { ...process.env, npm_config_cache: npmCache } },
  );
  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ai-video-packed-smoke-"));
const destination = path.join(tempRoot, "generic-agent", "skills");
const codexHome = path.join(tempRoot, "codex-home");
const globalPrefix = path.join(tempRoot, "npm-global");
const npmCache = path.join(tempRoot, "npm-cache");

const genericInstall = runCli(["install", "--destination", destination]);
assert.equal(genericInstall.targetKind, "custom");
const genericVerify = runCli(["verify", "--destination", destination]);
assert.equal(genericVerify.valid, true);
assert.ok(genericVerify.integrity.checkedFiles > 0);
const extensions = runCli(["list-extensions", "--destination", destination]);
assert.equal(extensions.length, 6);
const genericUpdate = runCli(["update", "--destination", destination]);
assert.equal(genericUpdate.action, "updated");
assert.ok(genericUpdate.backupPath);
const genericRollback = runCli(["rollback", "--destination", destination]);
assert.equal(genericRollback.action, "rolled_back");
assert.ok(genericRollback.displacedTo);
assert.equal(runCli(["verify", "--destination", destination]).valid, true);
const genericUninstall = runCli(["uninstall", "--destination", destination]);
assert.equal(genericUninstall.action, "uninstalled");
assert.equal(runCli(["verify", "--destination", destination], 1).valid, false);

assert.equal(runCli(["install", "--target", "codex", "--codex-home", codexHome]).targetKind, "codex");
assert.equal(runCli(["verify", "--target", "codex", "--codex-home", codexHome]).valid, true);
assert.equal(runCli(["uninstall", "--target", "codex", "--codex-home", codexHome]).action, "uninstalled");

const globalInstall = spawnSync(
  process.execPath,
  [npmExecPath, "install", "--global", "--prefix", globalPrefix, tarball],
  { encoding: "utf8", windowsHide: true, env: { ...process.env, npm_config_cache: npmCache } },
);
assert.equal(globalInstall.status, 0, globalInstall.stderr || globalInstall.stdout);
const installedCli = path.join(
  globalPrefix,
  "node_modules",
  "creating-ai-principle-videos-skill",
  "bin",
  "ai-principle-video-skill.mjs",
);
const installedVersion = spawnSync(process.execPath, [installedCli, "--version"], { encoding: "utf8", windowsHide: true });
assert.equal(installedVersion.status, 0, installedVersion.stderr || installedVersion.stdout);
assert.equal(installedVersion.stdout.trim(), "1.1.0");

console.log(`PASS packed npx/global lifecycle for generic and Codex targets in ${tempRoot}`);
