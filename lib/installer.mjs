import { access, copyFile, cp, mkdir, readFile, readdir, rename, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { discoverExtensions } from "./extensions.mjs";
import { INTERNAL_MANIFEST, verifySkillManifest } from "./manifest.mjs";

export const SKILL_NAME = "creating-explainer-videos";
export const LEGACY_SKILL_NAME = "creating-ai-principle-videos";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function resolveCodexHome(explicitHome) {
  return path.resolve(explicitHome || process.env.CODEX_HOME || path.join(os.homedir(), ".codex"));
}

export function resolveSkillsRoot(options = {}) {
  if (typeof options === "string") {
    return path.join(resolveCodexHome(options), "skills");
  }
  if (options.destination) {
    return path.resolve(options.destination);
  }
  const target = options.target || "codex";
  if (target !== "codex") {
    throw new Error(`target ${target} requires --destination`);
  }
  return path.join(resolveCodexHome(options.codexHome), "skills");
}

export function installedSkillPath(options = {}) {
  return path.join(resolveSkillsRoot(options), SKILL_NAME);
}

function backupRoot(options, skillsRoot) {
  if (typeof options !== "string" && options.destination) {
    return path.join(path.dirname(skillsRoot), ".explainer-video-skill-backups");
  }
  return path.join(resolveCodexHome(typeof options === "string" ? options : options.codexHome), "skill-backups");
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function validateSkillRoot(skillRoot) {
  const root = path.resolve(skillRoot);
  const errors = [];
  let skillText = "";
  try {
    skillText = await readFile(path.join(root, "SKILL.md"), "utf8");
  } catch (error) {
    errors.push(`cannot read SKILL.md: ${error.message}`);
  }
  if (!/^---\s*[\s\S]*?\bname:\s*creating-explainer-videos\s*[\s\S]*?---/m.test(skillText)) {
    errors.push("SKILL.md frontmatter does not declare creating-explainer-videos");
  }
  for (const directory of ["agents", "scripts", "references"]) {
    if (!(await exists(path.join(root, directory)))) {
      errors.push(`missing required directory: ${directory}`);
    }
  }
  const extensions = await discoverExtensions(root);
  for (const extension of extensions) {
    if (!extension.valid) {
      errors.push(`invalid extension ${extension.id || path.basename(extension.root)}: ${extension.errors.join("; ")}`);
    }
  }
  return { valid: errors.length === 0, root, errors, extensions };
}

export async function verifyInstalledSkill(options = {}) {
  const target = installedSkillPath(options);
  if (!(await exists(target))) {
    return { valid: false, target, errors: ["skill is not installed"], extensions: [] };
  }
  const validation = await validateSkillRoot(target);
  const manifestPath = path.join(target, INTERNAL_MANIFEST);
  const integrity = await exists(manifestPath)
    ? await verifySkillManifest({ skillRoot: target, manifestPath })
    : { valid: true, checkedFiles: 0, errors: [], skipped: true };
  return {
    ...validation,
    valid: validation.valid && integrity.valid,
    errors: [...validation.errors, ...integrity.errors],
    integrity,
    target,
  };
}

export async function installSkill({ source, codexHome, destination, target: targetKind, manifestPath } = {}) {
  if (!source) throw new Error("source is required");
  const sourceRoot = path.resolve(source);
  const validation = await validateSkillRoot(sourceRoot);
  if (!validation.valid) {
    throw new Error(`Invalid skill source: ${validation.errors.join("; ")}`);
  }
  if (manifestPath) {
    const integrity = await verifySkillManifest({ skillRoot: sourceRoot, manifestPath });
    if (!integrity.valid) {
      throw new Error(`Skill package integrity check failed: ${integrity.errors.join("; ")}`);
    }
  }

  const installOptions = { codexHome, destination, target: targetKind };
  const skillsRoot = resolveSkillsRoot(installOptions);
  const backupsRoot = backupRoot(installOptions, skillsRoot);
  const target = path.join(skillsRoot, SKILL_NAME);
  const legacyTarget = path.join(skillsRoot, LEGACY_SKILL_NAME);
  if (path.resolve(sourceRoot) === path.resolve(target)) {
    throw new Error("source and installed target are the same directory");
  }
  await mkdir(skillsRoot, { recursive: true });
  await mkdir(backupsRoot, { recursive: true });

  const hadExisting = await exists(target);
  const hadLegacy = !hadExisting && await exists(legacyTarget);
  const backupPath = hadExisting
    ? path.join(backupsRoot, `${SKILL_NAME}-${timestamp()}-${process.pid}`)
    : null;
  const legacyBackupPath = hadLegacy
    ? path.join(backupsRoot, `${LEGACY_SKILL_NAME}-migration-${timestamp()}-${process.pid}`)
    : null;
  const staging = path.join(skillsRoot, `.${SKILL_NAME}-install-${process.pid}-${Date.now()}`);

  try {
    await rm(staging, { recursive: true, force: true });
    await cp(sourceRoot, staging, { recursive: true, force: false, errorOnExist: true });
    if (manifestPath) {
      await copyFile(path.resolve(manifestPath), path.join(staging, INTERNAL_MANIFEST));
    }
    const stagedValidation = await validateSkillRoot(staging);
    if (!stagedValidation.valid) {
      throw new Error(`staged skill failed validation: ${stagedValidation.errors.join("; ")}`);
    }
    if (hadExisting) {
      await rename(target, backupPath);
    }
    if (hadLegacy) {
      await rename(legacyTarget, legacyBackupPath);
    }
    await rename(staging, target);
    return {
      action: hadExisting ? "updated" : hadLegacy ? "migrated" : "installed",
      targetKind: destination ? "custom" : "codex",
      skillsRoot,
      target,
      backupPath,
      legacyBackupPath,
      extensions: stagedValidation.extensions.map(({ id, type, version }) => ({ id, type, version })),
    };
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (backupPath && (await exists(backupPath)) && !(await exists(target))) {
      await rename(backupPath, target);
    }
    if (legacyBackupPath && (await exists(legacyBackupPath)) && !(await exists(legacyTarget))) {
      await rename(legacyBackupPath, legacyTarget);
    }
    throw error;
  }
}

export async function uninstallSkill(options = {}) {
  const skillsRoot = resolveSkillsRoot(options);
  const target = installedSkillPath(options);
  if (!(await exists(target))) {
    throw new Error(`skill is not installed: ${target}`);
  }
  const backupsRoot = backupRoot(options, skillsRoot);
  await mkdir(backupsRoot, { recursive: true });
  const backupPath = path.join(backupsRoot, `${SKILL_NAME}-uninstalled-${timestamp()}-${process.pid}`);
  await rename(target, backupPath);
  return { action: "uninstalled", targetKind: options.destination ? "custom" : "codex", skillsRoot, target, backupPath };
}

export async function rollbackSkill(options = {}) {
  const skillsRoot = resolveSkillsRoot(options);
  const target = installedSkillPath(options);
  const backupsRoot = backupRoot(options, skillsRoot);
  if (!(await exists(backupsRoot))) {
    throw new Error(`no backup directory exists: ${backupsRoot}`);
  }

  let selected;
  if (options.backupPath) {
    selected = path.resolve(options.backupPath);
    if (path.dirname(selected) !== path.resolve(backupsRoot) || !path.basename(selected).startsWith(`${SKILL_NAME}-`)) {
      throw new Error("backup must be an exact creating-explainer-videos backup in this target's backup directory");
    }
  } else {
    const candidates = [];
    for (const entry of await readdir(backupsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith(`${SKILL_NAME}-`)) continue;
      const candidate = path.join(backupsRoot, entry.name);
      candidates.push({ path: candidate, modified: (await stat(candidate)).mtimeMs });
    }
    candidates.sort((left, right) => right.modified - left.modified || right.path.localeCompare(left.path));
    selected = candidates[0]?.path;
  }
  if (!selected || !(await exists(selected))) {
    throw new Error(`no recoverable backup found in: ${backupsRoot}`);
  }
  const validation = await validateSkillRoot(selected);
  if (!validation.valid) {
    throw new Error(`backup is not a valid skill: ${validation.errors.join("; ")}`);
  }

  await mkdir(skillsRoot, { recursive: true });
  const hadExisting = await exists(target);
  const displacedTo = hadExisting
    ? path.join(backupsRoot, `${SKILL_NAME}-before-rollback-${timestamp()}-${process.pid}`)
    : null;
  try {
    if (hadExisting) await rename(target, displacedTo);
    await rename(selected, target);
  } catch (error) {
    if (displacedTo && (await exists(displacedTo)) && !(await exists(target))) {
      await rename(displacedTo, target);
    }
    throw error;
  }
  return {
    action: "rolled_back",
    targetKind: options.destination ? "custom" : "codex",
    skillsRoot,
    target,
    restoredFrom: selected,
    displacedTo,
  };
}
