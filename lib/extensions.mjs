import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const EXTENSION_API_VERSION = 1;
export const EXTENSION_TYPES = new Set(["visual", "voice", "research", "qc", "publishing"]);

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveInside(root, relativePath) {
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  return {
    resolved,
    inside: relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative),
  };
}

export async function validateExtension(extensionRoot) {
  const root = path.resolve(extensionRoot);
  const manifestPath = path.join(root, "extension.json");
  const errors = [];
  let manifest;

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    return {
      valid: false,
      root,
      manifestPath,
      errors: [`cannot read extension.json: ${error.message}`],
    };
  }

  if (manifest.apiVersion !== EXTENSION_API_VERSION) {
    errors.push(`unsupported apiVersion ${manifest.apiVersion}; expected ${EXTENSION_API_VERSION}`);
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(manifest.id ?? "")) {
    errors.push("id must use lowercase letters, digits, and hyphens");
  }
  if (!EXTENSION_TYPES.has(manifest.type)) {
    errors.push(`type must be one of: ${[...EXTENSION_TYPES].join(", ")}`);
  }
  for (const field of ["version", "displayName", "description"]) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version ?? "")) {
    errors.push("version must be semantic version format");
  }
  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
    errors.push("capabilities must be a non-empty array");
  }
  if ("hooks" in manifest || "scripts" in manifest || "postinstall" in manifest) {
    errors.push("executable hooks/scripts are not allowed by extension API v1");
  }

  const entrypoints = manifest.entrypoints;
  if (!entrypoints || typeof entrypoints !== "object") {
    errors.push("entrypoints is required");
  } else {
    const references = [];
    for (const key of ["reference", "profile"]) {
      if (typeof entrypoints[key] !== "string" || !entrypoints[key]) {
        errors.push(`entrypoints.${key} is required`);
      } else {
        references.push([`entrypoints.${key}`, entrypoints[key]]);
      }
    }
    if (!Array.isArray(entrypoints.assets)) {
      errors.push("entrypoints.assets must be an array");
    } else {
      for (const asset of entrypoints.assets) {
        references.push(["entrypoints.assets", asset]);
      }
    }

    for (const [label, relativePath] of references) {
      if (typeof relativePath !== "string" || !relativePath) {
        errors.push(`${label} contains an invalid path`);
        continue;
      }
      const candidate = resolveInside(root, relativePath);
      if (!candidate.inside) {
        errors.push(`${label} points outside extension directory: ${relativePath}`);
      }
      if (!(await exists(candidate.resolved))) {
        errors.push(`missing entrypoint: ${relativePath}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    root,
    manifestPath,
    id: manifest.id,
    type: manifest.type,
    version: manifest.version,
    displayName: manifest.displayName,
    capabilities: manifest.capabilities ?? [],
    manifest,
    errors,
  };
}

export async function discoverExtensions(skillRoot) {
  const extensionsRoot = path.join(path.resolve(skillRoot), "extensions");
  let entries;
  try {
    entries = await readdir(extensionsRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const results = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    results.push(await validateExtension(path.join(extensionsRoot, entry.name)));
  }
  return results;
}

