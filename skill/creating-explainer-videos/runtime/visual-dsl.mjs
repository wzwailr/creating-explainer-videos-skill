import { access } from "node:fs/promises";
import path from "node:path";

import { readJson } from "./json.mjs";

const LAYOUTS = new Set(["free", "flow", "compare", "stack", "network", "timeline"]);
const ELEMENT_TYPES = new Set(["group", "text", "node", "shape", "connector", "asset", "annotation"]);
const ACTION_KINDS = new Set(["appear", "exit", "move", "focus", "draw", "pulse", "replace"]);
const SHAPES = new Set(["rectangle", "circle", "diamond", "line"]);
const ROUTES = new Set(["line", "curve", "orthogonal"]);
const TONES = new Set(["default", "info", "process", "success", "warning", "danger", "accent", "muted"]);
const ASSET_EXTENSIONS = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp"]);
const GENERIC_VISUAL_LABELS = new Set([
  "input", "change", "process", "output", "step", "mechanism",
  "输入", "变化", "内部变化", "过程", "处理", "输出", "步骤", "机制",
]);
const TEMPLATE_ADAPTERS = Object.freeze({
  "paper-theatre": {
    fingerprint: "paper-stage-layer-stack-and-cutouts",
    stageClass: "paper-stage template-visual-stage",
    stagePrefix: "",
    motion: "paper",
  },
  "spatial-chamber": {
    fingerprint: "perspective-chamber-tunnel-and-depth-lanes",
    stageClass: "chamber-stage template-visual-stage signal-tunnel",
    stagePrefix: '<div class="spatial-grid" aria-hidden="true"></div>',
    motion: "depth",
  },
  "ink-explainer": {
    fingerprint: "ruled-board-rough-strokes-and-teacher-notes",
    stageClass: "ink-stage template-visual-stage derivation-board-runtime",
    stagePrefix: "",
    motion: "note",
  },
});

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

function inferTone(element) {
  if (TONES.has(element?.tone)) return element.tone;
  const semantic = `${element?.role ?? ""} ${element?.label ?? ""} ${element?.text ?? ""}`.toLowerCase();
  if (/(green|success|safe|ready|passed|complete|output|result|通过|完成|安全|绿色|绿灯|·\s*绿)/i.test(semantic)) return "success";
  if (/(yellow|warning|pending|transition|caution|黄灯|黄色|告警|警告|过渡)/i.test(semantic)) return "warning";
  if (/(red|danger|error|failed|blocked|conflict|全红|红灯|红色|错误|失败|冲突|阻塞)/i.test(semantic)) return "danger";
  if (/(controller|process|mechanism|transform|compute|控制器|机制|处理|计算|变化)/i.test(semantic)) return "process";
  if (/(input|source|sensor|detect|request|输入|来源|检测|请求)/i.test(semantic)) return "info";
  if (/(metric|score|weight|attention|highlight|指标|权重|注意力|重点)/i.test(semantic)) return "accent";
  return "default";
}

function validId(value) {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9-]*$/.test(value);
}

function isGenericVisualLabel(value) {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return !normalized || GENERIC_VISUAL_LABELS.has(normalized) || /^步骤[一二三四五六七八九十\d]+$/.test(normalized);
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
      if (["node", "text", "annotation", "asset"].includes(element?.type) && element?.frame) {
        const widthPixels = Number(element.frame.width) * Number(context.project?.frame?.width || 1920);
        const heightPixels = Number(element.frame.height) * Number(context.project?.frame?.height || 1080);
        if (Number(element.frame.y) + Number(element.frame.height) > .86) {
          errors.push(issue("caption-occlusion-risk", `${elementPath}.frame`, "text-bearing elements must stay above the default caption safe area"));
        }
        if (widthPixels < 140 || heightPixels < 64) {
          errors.push(issue("unreadable-frame", `${elementPath}.frame`, "text-bearing frame is too small for reliable encoded-video readability"));
        }
      }
      if (element?.type === "text" && typeof element.text !== "string") errors.push(issue("missing-element-text", `${elementPath}.text`, "text element requires text"));
      if (element?.type === "node" && typeof element.label !== "string") errors.push(issue("missing-element-label", `${elementPath}.label`, "node element requires label"));
      if (element?.type === "shape" && !SHAPES.has(element.shape)) errors.push(issue("unsupported-shape", `${elementPath}.shape`, `unsupported shape ${element.shape}`));
      if (element?.type === "connector" && !ROUTES.has(element.route)) errors.push(issue("unsupported-route", `${elementPath}.route`, `unsupported connector route ${element.route}`));
      if (element?.tone !== undefined && !TONES.has(element.tone)) errors.push(issue("unsupported-tone", `${elementPath}.tone`, `unsupported semantic tone ${element.tone}`));
      if (element?.type === "asset" && !normalizeAssetSource(element.src)) errors.push(issue("unsafe-asset-path", `${elementPath}.src`, "asset must be a supported local file under assets/"));
      if (element?.type === "annotation" && typeof element.text !== "string") errors.push(issue("missing-element-text", `${elementPath}.text`, "annotation requires text"));
    }

    for (const [elementIndex, element] of scene.elements.entries()) {
      const elementPath = `${scenePath}.elements[${elementIndex}]`;
      for (const field of element.type === "connector" ? ["from", "to"] : element.type === "annotation" ? ["target"] : []) {
        if (!elementIds.has(element[field])) errors.push(issue("missing-element-reference", `${elementPath}.${field}`, `${field} references missing element ${element[field]}`));
      }
    }

    const visibleLabels = scene.elements
      .map((element) => element.label ?? element.text ?? element.alt)
      .filter((value) => typeof value === "string" && value.trim());
    if (!visibleLabels.length || visibleLabels.every(isGenericVisualLabel)) {
      errors.push(issue("generic-topic-visual", `${scenePath}.elements`, "scene must show topic-specific objects or claims, not only generic input/process/output placeholders"));
    }

    if (!Array.isArray(scene.actions)) errors.push(issue("missing-actions", `${scenePath}.actions`, "scene actions must be an array"));
    const actionCueIds = new Set((scene.actions ?? []).map((action) => action?.cueId));
    for (const [cueIndex, cueId] of (scene.cueIds ?? []).entries()) {
      if (!actionCueIds.has(cueId)) errors.push(issue("uncovered-cue-action", `${scenePath}.cueIds[${cueIndex}]`, `cue ${cueId} must drive at least one semantic visual action`));
    }
    const mechanismElements = scene.elements.filter((element) => ["node", "asset", "group", "shape"].includes(element.type));
    const connectors = scene.elements.filter((element) => element.type === "connector");
    if (program.template === "spatial-chamber" && mechanismElements.length >= 2 && connectors.length === 0) {
      errors.push(issue("template-mechanism-missing", `${scenePath}.elements`, "spatial-chamber scenes with multiple mechanism objects require a visible routed relation"));
    }
    const drawnConnectors = new Set((scene.actions ?? []).filter((action) => action.kind === "draw").map((action) => action.target));
    for (const connector of connectors) {
      if (!drawnConnectors.has(connector.id)) errors.push(issue("connector-action-missing", `${scenePath}.actions`, `connector ${connector.id} requires a cue-bound draw action`));
    }
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
  for (const sceneId of contextScenes.keys()) {
    if (!sceneIds.has(sceneId)) errors.push(issue("missing-visual-scene", `scenes.${sceneId}`, `scene ${sceneId} has no visual program`));
  }
  return { valid: errors.length === 0, errors, warnings, program };
}

function frameStyle(frame) {
  return `left:${frame.x * 100}%;top:${frame.y * 100}%;width:${frame.width * 100}%;height:${frame.height * 100}%`;
}

function frameCenter(frame) {
  return { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
}

function boundaryAnchor(frame, toward) {
  const center = frameCenter(frame);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return center;
  const scale = 1 / Math.max(
    Math.abs(dx) / Math.max(frame.width / 2, 1e-9),
    Math.abs(dy) / Math.max(frame.height / 2, 1e-9),
  );
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function connectorGeometry(element, elements) {
  const from = elements.get(element.from)?.frame;
  const to = elements.get(element.to)?.frame;
  const fromCenter = frameCenter(from);
  const toCenter = frameCenter(to);
  const sourceAnchor = boundaryAnchor(from, toCenter);
  const targetAnchor = boundaryAnchor(to, fromCenter);
  const start = { x: sourceAnchor.x * 1000, y: sourceAnchor.y * 1000 };
  const end = { x: targetAnchor.x * 1000, y: targetAnchor.y * 1000 };
  if (element.route === "curve") {
    const bend = Math.max(60, Math.abs(end.x - start.x) * .28);
    const direction = Math.sign(end.x - start.x) || 1;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${(start.x + bend * direction).toFixed(2)} ${start.y.toFixed(2)} ${(end.x - bend * direction).toFixed(2)} ${end.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }
  if (element.route === "orthogonal") {
    const middle = (start.x + end.x) / 2;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${middle.toFixed(2)} ${start.y.toFixed(2)} L ${middle.toFixed(2)} ${end.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function elementMarkup(element, elements, template) {
  const id = escapeHtml(element.id);
  const role = safeToken(element.role);
  const tone = inferTone(element);
  const adapter = TEMPLATE_ADAPTERS[template] ?? TEMPLATE_ADAPTERS["ink-explainer"];
  if (element.type === "connector") {
    const route = connectorGeometry(element, elements);
    const templatePath = template === "spatial-chamber" ? " data-signal-path" : template === "ink-explainer" ? ' data-motion="draw"' : "";
    const signalDot = template === "spatial-chamber" ? `<circle data-signal-dot cx="0" cy="0" r="8"/>` : "";
    return `<svg class="visual-element visual-connector role-${role} tone-${tone}" data-visual-element-id="${id}" data-from="${escapeHtml(element.from)}" data-to="${escapeHtml(element.to)}" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrow-${id}" markerWidth="12" markerHeight="12" refX="9" refY="5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L10,5 L0,10 z"/></marker></defs><path data-visual-path${templatePath} d="${route}" pathLength="1" marker-end="url(#arrow-${id})" data-marker-end="url(#arrow-${id})"/>${signalDot}</svg>`;
  }
  const style = frameStyle(element.frame);
  const motion = adapter.motion;
  const classes = `role-${role} tone-${tone}`;
  let content;
  if (element.type === "group") content = `<section class="visual-element visual-contained visual-group ${classes}" data-visual-element-id="${id}">${element.label ? `<span>${escapeHtml(element.label)}</span>` : ""}</section>`;
  else if (element.type === "text") content = `<div class="visual-element visual-contained visual-text ${classes}" data-visual-element-id="${id}">${escapeHtml(element.text)}</div>`;
  else if (element.type === "node") content = `<div class="visual-element visual-contained visual-node ${classes}" data-visual-element-id="${id}">${escapeHtml(element.label)}</div>`;
  else if (element.type === "shape") content = `<div class="visual-element visual-contained visual-shape shape-${safeToken(element.shape)} ${classes}" data-visual-element-id="${id}" aria-hidden="true"></div>`;
  if (element.type === "asset") {
    const source = normalizeAssetSource(element.src);
    content = `<img class="visual-element visual-contained visual-asset ${classes}" data-visual-element-id="${id}" src="../assets/${escapeHtml(source)}" alt="${escapeHtml(element.alt)}">`;
  }
  if (element.type === "annotation") content = `<aside class="visual-element visual-contained visual-annotation ${classes}" data-visual-element-id="${id}" data-target="${escapeHtml(element.target)}">${escapeHtml(element.text)}</aside>`;
  return `<div class="visual-motion-shell" data-motion="${motion}" style="${style}">${content}</div>`;
}

function compileScene(scene, cues, template) {
  const cueRows = scene.cueIds.map((id) => cues.get(id));
  const sceneStart = Math.min(...cueRows.map((cue) => Number(cue.start)));
  const elements = new Map(scene.elements.map((element) => [element.id, element]));
  const adapter = TEMPLATE_ADAPTERS[template] ?? TEMPLATE_ADAPTERS["ink-explainer"];
  const elementBody = scene.elements.map((element) => elementMarkup(element, elements, template)).join("");
  const programMarkup = `<div class="visual-program visual-layout-${safeToken(scene.layout)}" data-visual-scene-id="${escapeHtml(scene.id)}">${elementBody}</div>`;
  const markup = `${adapter.stagePrefix}<div class="${adapter.stageClass}" data-template-fingerprint="${adapter.fingerprint}">${programMarkup}</div>`;
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
  return { markup, coverMarkup: programMarkup, actions };
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
  const coverMarkupByScene = {};
  const actionsByScene = {};
  for (const scene of program.scenes) {
    const compiled = compileScene(scene, cues, program.template);
    markupByScene[scene.id] = compiled.markup;
    coverMarkupByScene[scene.id] = compiled.coverMarkup;
    actionsByScene[scene.id] = compiled.actions;
  }
  return { program, scenes: program.scenes, markupByScene, coverMarkupByScene, actionsByScene, warnings: validation.warnings };
}
