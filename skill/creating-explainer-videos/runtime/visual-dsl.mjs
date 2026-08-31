import { access } from "node:fs/promises";
import path from "node:path";

import { readJson } from "./json.mjs";

const LAYOUTS = new Set(["free", "flow", "compare", "stack", "network", "timeline"]);
const ELEMENT_TYPES = new Set(["group", "text", "node", "shape", "connector", "asset", "annotation"]);
const ACTION_KINDS = new Set(["appear", "exit", "move", "focus", "draw", "pulse", "replace"]);
const SHAPES = new Set(["rectangle", "circle", "diamond", "line"]);
const ROUTES = new Set(["line", "curve", "orthogonal"]);
const ASSET_EXTENSIONS = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp"]);

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function issue(code, issuePath, message) {
  return { code, path: issuePath, message };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeToken(value, fallback = "default") {
  const token = String(value ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return token || fallback;
}

function validId(value) {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9-]*$/.test(value);
}

function validateFrame(frame, framePath, errors) {
  if (!frame || typeof frame !== "object") {
    errors.push(issue("invalid-geometry", framePath, "frame is required"));
    return;
  }
  const values = ["x", "y", "width", "height"].map((key) => Number(frame[key]));
  const [x, y, width, height] = values;
  if (values.some((value) => !Number.isFinite(value))
    || x < 0 || y < 0 || width <= 0 || height <= 0
    || x > 1 || y > 1 || width > 1 || height > 1
    || x + width > 1.000001 || y + height > 1.000001) {
    errors.push(issue("invalid-geometry", framePath, "frame must fit inside normalized coordinates 0..1"));
  }
}

function normalizeAssetSource(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const source = value.trim().replaceAll("\\", "/");
  if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith("//") || source.startsWith("/") || source.includes("\0")) return null;
  const normalized = path.posix.normalize(source.replace(/^assets\//, ""));
  if (normalized === "." || normalized === ".." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) return null;
  if (!ASSET_EXTENSIONS.has(path.posix.extname(normalized).toLowerCase())) return null;
  return normalized;
}

function contextMaps(context) {
  const scenes = new Map((context.sceneDocument?.scenes ?? []).map((scene) => [scene.id, scene]));
  const cues = new Map((context.cueDocument?.cues ?? []).map((cue) => [cue.id, cue]));
  return { scenes, cues };
}

export function validateVisualProgram(program, context = {}) {
  const errors = [];
  const warnings = [];
  if (!program || typeof program !== "object" || Array.isArray(program)) {
    return { valid: false, errors: [issue("invalid-program", "$", "visual program must be an object")], warnings, program };
  }
  if (program.schemaVersion !== 1) errors.push(issue("unsupported-schema-version", "schemaVersion", "visual program schemaVersion must be 1"));
  if (typeof program.template !== "string" || !program.template) errors.push(issue("missing-template", "template", "visual program template is required"));
  const expectedTemplates = [context.project?.template, context.sceneDocument?.template].filter(Boolean);
  if (expectedTemplates.some((template) => template !== program.template)) {
    errors.push(issue("template-mismatch", "template", "visual program template must match project and scene specification"));
  }
  if (!Array.isArray(program.scenes) || program.scenes.length === 0) {
    errors.push(issue("missing-scenes", "scenes", "visual program must contain at least one scene"));
    return { valid: false, errors, warnings, program };
  }

  const { scenes: contextScenes, cues } = contextMaps(context);
  const sceneIds = new Set();
  for (const [sceneIndex, scene] of program.scenes.entries()) {
    const scenePath = `scenes[${sceneIndex}]`;
    if (!validId(scene?.id)) errors.push(issue("invalid-scene-id", `${scenePath}.id`, "scene id must start with a letter and contain letters, digits, or hyphens"));
    else if (sceneIds.has(scene.id)) errors.push(issue("duplicate-scene-id", `${scenePath}.id`, `duplicate scene id ${scene.id}`));
    else sceneIds.add(scene.id);
    if (contextScenes.size && !contextScenes.has(scene?.id)) errors.push(issue("missing-scene-reference", `${scenePath}.id`, `scene ${scene?.id} is absent from scene-spec.json`));
    if (!LAYOUTS.has(scene?.layout)) errors.push(issue("unsupported-layout", `${scenePath}.layout`, `unsupported layout ${scene?.layout}`));
    if (!Array.isArray(scene?.cueIds) || scene.cueIds.length === 0) errors.push(issue("missing-scene-cues", `${scenePath}.cueIds`, "scene must own at least one cue"));
    const ownedCues = new Set(scene?.cueIds ?? []);
    for (const [cueIndex, cueId] of (scene?.cueIds ?? []).entries()) {
      const cue = cues.get(cueId);
      if (!cue || (cue.sceneId && cue.sceneId !== scene.id)) {
        errors.push(issue("missing-cue-reference", `${scenePath}.cueIds[${cueIndex}]`, `cue ${cueId} is not available to scene ${scene.id}`));
      }
    }
    if (!Array.isArray(scene?.elements) || scene.elements.length === 0) {
      errors.push(issue("missing-elements", `${scenePath}.elements`, "scene must contain at least one visual element"));
      continue;
    }

    const elementIds = new Set();
    for (const [elementIndex, element] of scene.elements.entries()) {
      const elementPath = `${scenePath}.elements[${elementIndex}]`;
      if (!validId(element?.id)) errors.push(issue("invalid-element-id", `${elementPath}.id`, "element id must start with a letter and contain letters, digits, or hyphens"));
      else if (elementIds.has(element.id)) errors.push(issue("duplicate-element-id", `${elementPath}.id`, `duplicate element id ${element.id}`));
      else elementIds.add(element.id);
      if (!ELEMENT_TYPES.has(element?.type)) errors.push(issue("unsupported-element-type", `${elementPath}.type`, `unsupported element type ${element?.type}`));
      if (element?.type !== "connector") validateFrame(element?.frame, `${elementPath}.frame`, errors);
      if (element?.type === "text" && typeof element.text !== "string") errors.push(issue("missing-element-text", `${elementPath}.text`, "text element requires text"));
      if (element?.type === "node" && typeof element.label !== "string") errors.push(issue("missing-element-label", `${elementPath}.label`, "node element requires label"));
      if (element?.type === "shape" && !SHAPES.has(element.shape)) errors.push(issue("unsupported-shape", `${elementPath}.shape`, `unsupported shape ${element.shape}`));
      if (element?.type === "connector" && !ROUTES.has(element.route)) errors.push(issue("unsupported-route", `${elementPath}.route`, `unsupported connector route ${element.route}`));
      if (element?.type === "asset" && !normalizeAssetSource(element.src)) errors.push(issue("unsafe-asset-path", `${elementPath}.src`, "asset must be a supported local file under assets/"));
      if (element?.type === "annotation" && typeof element.text !== "string") errors.push(issue("missing-element-text", `${elementPath}.text`, "annotation requires text"));
    }

    for (const [elementIndex, element] of scene.elements.entries()) {
      const elementPath = `${scenePath}.elements[${elementIndex}]`;
      for (const field of element.type === "connector" ? ["from", "to"] : element.type === "annotation" ? ["target"] : []) {
        if (!elementIds.has(element[field])) errors.push(issue("missing-element-reference", `${elementPath}.${field}`, `${field} references missing element ${element[field]}`));
      }
    }

    if (!Array.isArray(scene.actions)) errors.push(issue("missing-actions", `${scenePath}.actions`, "scene actions must be an array"));
    for (const [actionIndex, action] of (scene.actions ?? []).entries()) {
      const actionPath = `${scenePath}.actions[${actionIndex}]`;
      if (!ACTION_KINDS.has(action?.kind)) errors.push(issue("unsupported-action-kind", `${actionPath}.kind`, `unsupported action kind ${action?.kind}`));
      if (!ownedCues.has(action?.cueId) || !cues.has(action?.cueId)) errors.push(issue("missing-cue-reference", `${actionPath}.cueId`, `action cue ${action?.cueId} is not available to scene ${scene.id}`));
      if (!elementIds.has(action?.target)) errors.push(issue("missing-element-reference", `${actionPath}.target`, `action target ${action?.target} is missing`));
      if (action?.kind === "replace" && !elementIds.has(action?.with)) errors.push(issue("missing-element-reference", `${actionPath}.with`, `replacement target ${action?.with} is missing`));
      const at = action?.at === undefined ? 0 : Number(action.at);
      const duration = action?.duration === undefined ? .25 : Number(action.duration);
      if (!Number.isFinite(at) || !Number.isFinite(duration) || at < 0 || duration <= 0 || at > 1 || duration > 1 || at + duration > 1.000001) {
        errors.push(issue("invalid-action-timing", actionPath, "action at and duration must fit inside its cue"));
      }
      if (action?.kind === "move") {
        for (const field of ["x", "y"]) {
          if (action[field] !== undefined && (!Number.isFinite(Number(action[field])) || Number(action[field]) < -1 || Number(action[field]) > 1)) {
            errors.push(issue("invalid-action-offset", `${actionPath}.${field}`, "move offsets must be normalized values from -1 to 1"));
          }
        }
      }
    }
  }
  return { valid: errors.length === 0, errors, warnings, program };
}

function frameStyle(frame) {
  return `left:${frame.x * 100}%;top:${frame.y * 100}%;width:${frame.width * 100}%;height:${frame.height * 100}%`;
}

function connectorGeometry(element, elements) {
  const from = elements.get(element.from)?.frame;
  const to = elements.get(element.to)?.frame;
  const start = { x: (from.x + from.width / 2) * 1000, y: (from.y + from.height / 2) * 1000 };
  const end = { x: (to.x + to.width / 2) * 1000, y: (to.y + to.height / 2) * 1000 };
  if (element.route === "curve") {
    const bend = Math.max(60, Math.abs(end.x - start.x) * .28);
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${(start.x + bend).toFixed(2)} ${start.y.toFixed(2)} ${(end.x - bend).toFixed(2)} ${end.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }
  if (element.route === "orthogonal") {
    const middle = (start.x + end.x) / 2;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${middle.toFixed(2)} ${start.y.toFixed(2)} L ${middle.toFixed(2)} ${end.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function elementMarkup(element, elements) {
  const id = escapeHtml(element.id);
  const role = safeToken(element.role);
  if (element.type === "connector") {
    const route = connectorGeometry(element, elements);
    return `<svg class="visual-element visual-connector role-${role}" data-visual-element-id="${id}" data-from="${escapeHtml(element.from)}" data-to="${escapeHtml(element.to)}" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><path data-visual-path d="${route}" pathLength="1"/></svg>`;
  }
  const style = frameStyle(element.frame);
  if (element.type === "group") return `<section class="visual-element visual-group role-${role}" data-visual-element-id="${id}" style="${style}">${element.label ? `<span>${escapeHtml(element.label)}</span>` : ""}</section>`;
  if (element.type === "text") return `<div class="visual-element visual-text role-${role}" data-visual-element-id="${id}" style="${style}">${escapeHtml(element.text)}</div>`;
  if (element.type === "node") return `<div class="visual-element visual-node role-${role}" data-visual-element-id="${id}" style="${style}">${escapeHtml(element.label)}</div>`;
  if (element.type === "shape") return `<div class="visual-element visual-shape shape-${safeToken(element.shape)} role-${role}" data-visual-element-id="${id}" style="${style}" aria-hidden="true"></div>`;
  if (element.type === "asset") {
    const source = normalizeAssetSource(element.src);
    return `<img class="visual-element visual-asset role-${role}" data-visual-element-id="${id}" style="${style}" src="../assets/${escapeHtml(source)}" alt="${escapeHtml(element.alt)}">`;
  }
  return `<aside class="visual-element visual-annotation role-${role}" data-visual-element-id="${id}" data-target="${escapeHtml(element.target)}" style="${style}">${escapeHtml(element.text)}</aside>`;
}

function compileScene(scene, cues) {
  const cueRows = scene.cueIds.map((id) => cues.get(id));
  const sceneStart = Math.min(...cueRows.map((cue) => Number(cue.start)));
  const elements = new Map(scene.elements.map((element) => [element.id, element]));
  const markup = `<div class="visual-program visual-layout-${safeToken(scene.layout)}" data-visual-scene-id="${escapeHtml(scene.id)}">${scene.elements.map((element) => elementMarkup(element, elements)).join("")}</div>`;
  const actions = scene.actions.map((action, index) => {
    const cue = cues.get(action.cueId);
    const at = action.at === undefined ? 0 : Number(action.at);
    const fraction = action.duration === undefined ? .25 : Number(action.duration);
    return {
      id: `${scene.id}-A${String(index + 1).padStart(2, "0")}`,
      cueId: action.cueId,
      target: action.target,
      with: action.with || null,
      kind: action.kind,
      start: Number((Number(cue.start) - sceneStart + at * Number(cue.duration)).toFixed(6)),
      duration: Number((fraction * Number(cue.duration)).toFixed(6)),
      x: action.x === undefined ? 0 : Number(action.x),
      y: action.y === undefined ? 0 : Number(action.y),
    };
  }).sort((left, right) => left.start - right.start || left.id.localeCompare(right.id));
  return { markup, actions };
}

export async function loadVisualProgram(projectRoot) {
  const target = path.join(path.resolve(projectRoot), "visual-program.json");
  return await exists(target) ? readJson(target) : null;
}

export async function compileVisualProgram(projectRoot) {
  const root = path.resolve(projectRoot);
  const [program, project, sceneDocument, cueDocument] = await Promise.all([
    loadVisualProgram(root),
    readJson(path.join(root, "project.json")),
    readJson(path.join(root, "scene-spec.json")),
    readJson(path.join(root, "script", "cues.json")),
  ]);
  if (!program) return null;
  const validation = validateVisualProgram(program, { projectRoot: root, project, sceneDocument, cueDocument });
  if (!validation.valid) {
    const error = new Error(`visual program is invalid: ${validation.errors.map((item) => `${item.code} at ${item.path}`).join("; ")}`);
    error.code = "INVALID_VISUAL_PROGRAM";
    error.errors = validation.errors;
    throw error;
  }
  const cues = new Map(cueDocument.cues.map((cue) => [cue.id, cue]));
  const markupByScene = {};
  const actionsByScene = {};
  for (const scene of program.scenes) {
    const compiled = compileScene(scene, cues);
    markupByScene[scene.id] = compiled.markup;
    actionsByScene[scene.id] = compiled.actions;
  }
  return { program, scenes: program.scenes, markupByScene, actionsByScene, warnings: validation.warnings };
}
