import { createHash } from "node:crypto";
import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeJsonAtomic } from "./json.mjs";

const EXTENSION_TYPES = new Set(["visual", "voice", "research", "qc", "publishing"]);
const ALIASES = Object.freeze({ "ai-primary-research": "primary-source-research" });
const runtimeRoot = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(runtimeRoot, "..");

function slug(value, label) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value ?? "")) throw new Error(`${label} must be a lowercase slug`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function resolveInside(root, relativePath) {
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`extension entrypoint escapes its directory: ${relativePath}`);
  }
  return resolved;
}

export async function loadRuntimePreset(id) {
  slug(id, "preset id");
  const presetPath = path.join(skillRoot, "presets", id, "preset.json");
  const preset = JSON.parse(await readFile(presetPath, "utf8"));
  if (preset.schemaVersion !== 1 || preset.id !== id) throw new Error(`invalid preset: ${id}`);
  if (!(preset.template === null || /^[a-z0-9][a-z0-9-]*$/.test(preset.template ?? ""))) {
    throw new Error(`invalid template in preset: ${id}`);
  }
  if (!preset.extensions || typeof preset.extensions !== "object" || Array.isArray(preset.extensions)) {
    throw new Error(`invalid extensions in preset: ${id}`);
  }
  return preset;
}

async function loadRuntimeExtension(requestedId, expectedType) {
  const id = ALIASES[requestedId] ?? requestedId;
  slug(id, "extension id");
  const root = path.join(skillRoot, "extensions", id);
  const manifestPath = path.join(root, "extension.json");
  const manifestText = await readFile(manifestPath);
  const manifest = JSON.parse(manifestText.toString("utf8"));
  if (manifest.apiVersion !== 1 || manifest.id !== id || !EXTENSION_TYPES.has(manifest.type)) {
    throw new Error(`invalid extension manifest: ${id}`);
  }
  if (manifest.type !== expectedType) throw new Error(`extension ${id} must have type ${expectedType}`);
  if (!Array.isArray(manifest.permissions)) throw new Error(`extension ${id} must declare permissions`);
  if ("hooks" in manifest || "scripts" in manifest || "postinstall" in manifest) {
    throw new Error(`extension ${id} cannot declare executable hooks`);
  }
  const profilePath = resolveInside(root, manifest.entrypoints?.profile);
  const referencePath = resolveInside(root, manifest.entrypoints?.reference);
  const profileText = await readFile(profilePath);
  await readFile(referencePath);
  for (const asset of manifest.entrypoints?.assets ?? []) await readFile(resolveInside(root, asset));
  return {
    root,
    manifest,
    lock: {
      id,
      type: manifest.type,
      version: manifest.version,
      permissions: [...manifest.permissions],
      manifestSha256: sha256(manifestText),
      profileSha256: sha256(profileText),
    },
  };
}

export async function installPresetExtensions(projectRoot, preset, visualTemplate) {
  const selections = {
    visual: visualTemplate,
    voice: preset.extensions.voice,
    research: preset.extensions.research,
    qc: preset.extensions.qc,
    publishing: preset.extensions.publishing,
  };
  const extensions = [];
  const snapshotsRoot = path.join(path.resolve(projectRoot), "extensions");
  await mkdir(snapshotsRoot, { recursive: true });
  for (const type of ["visual", "voice", "research", "qc", "publishing"]) {
    const extension = await loadRuntimeExtension(selections[type], type);
    await cp(extension.root, path.join(snapshotsRoot, extension.manifest.id), { recursive: true, force: true });
    selections[type] = extension.manifest.id;
    extensions.push(extension.lock);
  }
  const lock = {
    schemaVersion: 1,
    apiVersion: 1,
    generatedAt: new Date().toISOString(),
    preset: { id: preset.id, version: preset.version },
    selections,
    extensions,
  };
  await writeJsonAtomic(path.join(projectRoot, "extensions.lock.json"), lock);
  return lock;
}
