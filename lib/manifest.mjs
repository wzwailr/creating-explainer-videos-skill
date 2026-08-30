import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const INTERNAL_MANIFEST = ".skill-package-manifest.json";

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function listFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`symbolic links are not allowed in packaged skills: ${fullPath}`);
    }
    if (entry.isDirectory()) {
      if (entry.name === "__pycache__") continue;
      files.push(...await listFiles(root, fullPath));
    } else if (entry.isFile() && entry.name !== INTERNAL_MANIFEST && entry.name !== ".npmignore" && !entry.name.endsWith(".pyc")) {
      files.push(path.relative(root, fullPath).split(path.sep).join("/"));
    }
  }
  return files.sort((left, right) => left.localeCompare(right, "en"));
}

export async function createSkillManifest({ skillRoot, packageVersion }) {
  const root = path.resolve(skillRoot);
  const files = [];
  for (const relativePath of await listFiles(root)) {
    const fullPath = path.join(root, ...relativePath.split("/"));
    const stats = await lstat(fullPath);
    files.push({
      path: relativePath,
      sha256: await sha256File(fullPath),
      size: stats.size,
    });
  }
  return {
    schemaVersion: 1,
    packageVersion,
    skillName: "creating-explainer-videos",
    extensionApiVersion: 1,
    files,
  };
}

export async function verifySkillManifest({ skillRoot, manifestPath }) {
  const root = path.resolve(skillRoot);
  const errors = [];
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
  } catch (error) {
    return { valid: false, checkedFiles: 0, errors: [`cannot read skill manifest: ${error.message}`] };
  }
  if (manifest.schemaVersion !== 1) errors.push("manifest schemaVersion must be 1");
  if (manifest.skillName !== "creating-explainer-videos") errors.push("manifest skillName is invalid");
  if (!Array.isArray(manifest.files)) errors.push("manifest files must be an array");
  if (errors.length) return { valid: false, checkedFiles: 0, errors, manifest };

  const currentFiles = await listFiles(root);
  const expectedFiles = manifest.files.map((item) => item.path).sort((left, right) => left.localeCompare(right, "en"));
  for (const unexpected of currentFiles.filter((item) => !expectedFiles.includes(item))) {
    errors.push(`unexpected file: ${unexpected}`);
  }
  for (const missing of expectedFiles.filter((item) => !currentFiles.includes(item))) {
    errors.push(`missing file: ${missing}`);
  }
  for (const item of manifest.files) {
    if (!currentFiles.includes(item.path)) continue;
    const fullPath = path.join(root, ...item.path.split("/"));
    const stats = await lstat(fullPath);
    if (stats.size !== item.size) errors.push(`size mismatch: ${item.path}`);
    const hash = await sha256File(fullPath);
    if (hash !== item.sha256) errors.push(`hash mismatch: ${item.path}`);
  }
  return { valid: errors.length === 0, checkedFiles: manifest.files.length, errors, manifest };
}

export { INTERNAL_MANIFEST };
