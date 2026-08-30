#!/usr/bin/env node

import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tarball = path.resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("tarball path is required");
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "explainer-tarball-audit-"));
const result = spawnSync("tar", ["-xf", tarball, "-C", tempRoot], { encoding: "utf8", windowsHide: true });
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "tar extraction failed");
const packageRoot = path.join(tempRoot, "package");

async function listFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, fullPath));
    else if (entry.isFile()) files.push(path.relative(root, fullPath).split(path.sep).join("/"));
  }
  return files;
}

const files = await listFiles(packageRoot);
const errors = [];
const forbiddenNames = /(^|\/)(?:\.env(?:\..*)?|\.npmrc|credentials(?:\.json)?|id_rsa|id_ed25519|__pycache__)(?:$|\/)|\.pyc$/i;
const forbiddenBinary = /\.(?:ttf|otf|woff2?|mp3|wav|mp4|mov)$/i;
const sensitivePatterns = [
  ["personal Windows user path", /C:\\Users\\GALAXY/i],
  ["workspace path", /D:\\aiCode/i],
  ["credential-directory path", /D:\\密码/i],
  ["npm auth token", /(?:npm_[A-Za-z0-9]{20,}|_authToken\s*=)/],
  ["GitHub token", /(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];

for (const relativePath of files) {
  if (forbiddenNames.test(relativePath)) errors.push(`forbidden secret/cache filename: ${relativePath}`);
  if (forbiddenBinary.test(relativePath)) errors.push(`forbidden media/font binary: ${relativePath}`);
  const extension = path.extname(relativePath).toLowerCase();
  if (new Set([".png", ".jpg", ".jpeg", ".gif", ".zip", ".tgz", ".gz"]).has(extension)) continue;
  const text = await readFile(path.join(packageRoot, ...relativePath.split("/")), "utf8");
  for (const [label, pattern] of sensitivePatterns) {
    if (pattern.test(text)) errors.push(`${label}: ${relativePath}`);
  }
}

if (errors.length) {
  throw new Error(`tarball audit failed:\n${errors.join("\n")}`);
}
console.log(JSON.stringify({
  valid: true,
  tarball,
  files: files.length,
  extractedTo: packageRoot,
  checks: ["secret-filenames", "personal-paths", "credential-patterns", "private-keys", "media-font-binaries", "python-cache"],
}, null, 2));
