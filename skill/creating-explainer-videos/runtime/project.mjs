import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { PROJECT_SCHEMA_VERSION, STAGES } from "./constants.mjs";
import { installPresetExtensions, loadRuntimePreset } from "./extensions.mjs";
import { validateStageEvidence } from "./gates.mjs";
import { readJson, sha256File, stableStringify, writeJsonAtomic } from "./json.mjs";
import { buildCover, buildRenderer } from "./renderer.mjs";
import { createInitialState, nextAction, validateTransition } from "./state.mjs";
import { getTemplate, installTemplate } from "./templates.mjs";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function safeSlug(value) {
  const slug = value.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "explainer-project";
}

function briefMarkdown(brief) {
  return `# ${brief.title}\n\n- 主题：${brief.topic}\n- 目标观众：${brief.audience || "尚未确定"}\n- 核心问题：${brief.exactQuestion || "尚未确定"}\n- 承诺答案：${brief.promisedAnswer || "尚未确定"}\n- 状态：${brief.complete ? "已确认" : "草案"}\n`;
}

export async function createProject(options = {}) {
  if (!options.destination) throw new Error("destination is required");
  if (!options.title?.trim()) throw new Error("title is required");
  if (!options.topic?.trim()) throw new Error("topic is required");
  const preset = await loadRuntimePreset(options.preset || "general-mechanism");
  const template = options.template || preset.template || "ink-explainer";
  await getTemplate(template);
  const root = path.resolve(options.destination);
  if (await exists(root)) {
    const entries = await readdir(root);
    if (entries.length && !options.force) throw new Error(`destination is non-empty: ${root}`);
  }
  await mkdir(root, { recursive: true });
  for (const directory of [
    "assets",
    "evidence",
    "script",
    "renderer",
    ".publish",
    "renders",
    "qc/frames",
    "publish",
  ]) {
    await mkdir(path.join(root, directory), { recursive: true });
  }

  const now = new Date().toISOString();
  const slug = safeSlug(path.basename(root));
  const project = {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    slug,
    title: options.title.trim(),
    topic: options.topic.trim(),
    preset: preset.id,
    template,
    language: options.language || "zh-CN",
    platform: options.platform || "short-video",
    frame: { width: 1920, height: 1080, fps: 30 },
    createdAt: now,
    updatedAt: now,
  };
  const brief = {
    schemaVersion: 1,
    title: project.title,
    topic: project.topic,
    audience: "",
    exactQuestion: project.topic,
    promisedAnswer: "",
    scope: [],
    constraints: [],
    complete: false,
  };
  const state = createInitialState(project);
  const files = new Map([
    ["project.json", project],
    ["production-state.json", state],
    ["toolchain.json", { schemaVersion: 1, hyperframesVersion: "0.8.15", tools: {} }],
    ["brief.json", brief],
    ["evidence/evidence.json", { schemaVersion: 1, claims: [], sources: [], complete: false }],
    ["mechanism-map.json", { schemaVersion: 1, input: [], internalChanges: [], output: [], boundaries: [], failures: [], complete: false }],
    ["script/narration.json", { schemaVersion: 1, canonicalText: [], complete: false }],
    ["script/cues.json", { schemaVersion: 1, cues: [], timingSource: "unmeasured", complete: false }],
    ["storyboard.json", { schemaVersion: 1, scenes: [], complete: false }],
    ["scene-spec.json", { schemaVersion: 1, template, scenes: [], complete: false }],
    ["visual-program.json", { schemaVersion: 1, template, scenes: [], complete: false }],
  ]);
  for (const [relativePath, value] of files) {
    await writeJsonAtomic(path.join(root, relativePath), value);
  }
  await writeFile(path.join(root, "brief.md"), briefMarkdown(brief), "utf8");
  await installPresetExtensions(root, preset, template);
  await installTemplate(template, root);
  await buildRenderer(root, { allowIncompleteVisual: true });
  await buildCover(root);
  return { root, project, state, createdFiles: [...files.keys(), "extensions.lock.json", "brief.md", "renderer/index.html", "renderer/cover.html"] };
}

export async function loadProject(projectRoot) {
  const root = path.resolve(projectRoot);
  const projectFile = path.join(root, "project.json");
  if (!(await exists(projectFile))) throw new Error(`not an explainer project: ${root}`);
  return {
    root,
    project: await readJson(projectFile),
    state: await readJson(path.join(root, "production-state.json")),
    toolchain: await readJson(path.join(root, "toolchain.json")),
    extensionsLock: await readJson(path.join(root, "extensions.lock.json")),
  };
}

export async function writeEvidence(projectRoot, kind, payload) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(kind ?? "")) throw new Error("evidence kind must be a lowercase slug");
  const root = path.resolve(projectRoot);
  await loadProject(root);
  const relativePath = `evidence/${kind}.json`;
  const target = path.join(root, relativePath);
  const record = { schemaVersion: 1, kind, recordedAt: new Date().toISOString(), payload };
  await writeJsonAtomic(target, record);
  return { path: relativePath, sha256: await sha256File(target), record };
}

async function listProjectFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listProjectFiles(root, fullPath));
    else if (entry.isFile() && (await stat(fullPath)).size >= 0) files.push(path.relative(root, fullPath).split(path.sep).join("/"));
  }
  return files;
}

export async function projectStatus(projectRoot) {
  const loaded = await loadProject(projectRoot);
  const files = new Set(await listProjectFiles(loaded.root));
  if (loaded.state.humanDecision) files.add("production-state.json#humanDecision");
  const action = nextAction(loaded.state, files);
  const gate = await validateStageEvidence(loaded.root, loaded.state.stage, loaded.state);
  action.blockers.push(...gate.errors.map((message) => ({ code: "incomplete-evidence", message })));
  return {
    project: loaded.project,
    state: loaded.state,
    next: action,
  };
}

export async function validateProjectStage(projectRoot, stage) {
  const loaded = await loadProject(projectRoot);
  if (loaded.state.stage !== stage) {
    return { valid: false, errors: [`project is at ${loaded.state.stage}, not ${stage}`], state: loaded.state };
  }
  const files = new Set(await listProjectFiles(loaded.root));
  if (loaded.state.humanDecision) files.add("production-state.json#humanDecision");
  const action = nextAction(loaded.state, files);
  const missing = [...action.requiredInputs, ...action.evidenceToRecord]
    .filter((file) => !files.has(file));
  if (missing.length) return { valid: false, errors: missing.map((file) => `missing stage file: ${file}`), state: loaded.state, action };
  const gate = await validateStageEvidence(loaded.root, stage, loaded.state);
  if (!gate.valid) return { valid: false, errors: gate.errors, state: loaded.state, action };
  const currentIndex = STAGES.indexOf(stage);
  if (currentIndex === STAGES.length - 1) return { valid: true, errors: [], state: loaded.state, action };
  const nextStage = STAGES[currentIndex + 1];
  const transition = validateTransition(stage, nextStage, action.evidenceToRecord);
  if (!transition.valid) return { valid: false, errors: transition.errors, state: loaded.state, action };
  const at = new Date().toISOString();
  const state = {
    ...loaded.state,
    stage: nextStage,
    blockers: [],
    updatedAt: at,
    history: [...loaded.state.history, { stage: nextStage, at, evidence: [...action.evidenceToRecord] }],
  };
  await writeJsonAtomic(path.join(loaded.root, "production-state.json"), state);
  return { valid: true, errors: [], state, action, transition };
}

export { stableStringify };
