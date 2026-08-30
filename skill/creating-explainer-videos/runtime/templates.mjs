import { access, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_FILES = Object.freeze(["template.json", "scene.css", "motion.mjs", "cover.css"]);
const BINARY_EXTENSIONS = new Set([".ttf", ".otf", ".woff", ".woff2", ".mp3", ".wav", ".mp4", ".mov"]);

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function defaultSkillRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function validateTemplate(templateRoot) {
  const root = path.resolve(templateRoot);
  const errors = [];
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(path.join(root, "template.json"), "utf8"));
  } catch (error) {
    return { valid: false, root, id: path.basename(root), manifest, errors: [`cannot read template.json: ${error.message}`] };
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(manifest.id ?? "")) errors.push("id must be a lowercase slug");
  if (manifest.id !== path.basename(root)) errors.push("id must match the template directory name");
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) errors.push("version must use semantic version format");
  for (const field of ["displayName", "description", "domFingerprint"]) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) errors.push(`${field} is required`);
  }
  if (!manifest.capabilities || !Array.isArray(manifest.capabilities.required) || !Array.isArray(manifest.capabilities.optional)) {
    errors.push("capabilities.required and capabilities.optional arrays are required");
  }
  for (const field of ["tokens", "motionGrammar", "coverGrammar", "fontPolicy", "fallbacks", "qcRules"]) {
    if (!manifest[field] || typeof manifest[field] !== "object" || Array.isArray(manifest[field])) errors.push(`${field} object is required`);
  }
  if (!Array.isArray(manifest.primitives) || manifest.primitives.length === 0) errors.push("primitives must be a non-empty array");
  if (!Array.isArray(manifest.fixtures) || manifest.fixtures.length === 0) errors.push("fixtures must be a non-empty array");
  if (typeof manifest.motionGrammar?.fingerprint !== "string" || !manifest.motionGrammar.fingerprint) {
    errors.push("motionGrammar.fingerprint is required");
  }
  for (const file of TEMPLATE_FILES) {
    if (!(await exists(path.join(root, file)))) errors.push(`missing template asset: ${file}`);
  }
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && BINARY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      errors.push(`redistributable template cannot contain binary asset: ${entry.name}`);
    }
  }
  for (const sourceFile of ["scene.css", "motion.mjs", "cover.css"]) {
    if (!(await exists(path.join(root, sourceFile)))) continue;
    const text = await readFile(path.join(root, sourceFile), "utf8");
    if (/https?:\/\//i.test(text)) errors.push(`${sourceFile} contains a remote runtime dependency`);
  }
  return { valid: errors.length === 0, root, id: manifest.id, manifest, errors };
}

export async function discoverTemplates(skillRoot = defaultSkillRoot()) {
  const templatesRoot = path.join(path.resolve(skillRoot), "templates");
  const entries = await readdir(templatesRoot, { withFileTypes: true });
  const templates = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    templates.push(await validateTemplate(path.join(templatesRoot, entry.name)));
  }
  return templates;
}

export async function getTemplate(id, skillRoot = defaultSkillRoot()) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id ?? "")) throw new Error(`invalid template id: ${id}`);
  const template = await validateTemplate(path.join(path.resolve(skillRoot), "templates", id));
  if (!template.valid) throw new Error(`invalid template ${id}: ${template.errors.join("; ")}`);
  return template;
}

export async function installTemplate(id, projectRoot, options = {}) {
  const template = await getTemplate(id, options.skillRoot || defaultSkillRoot());
  const target = path.join(path.resolve(projectRoot), "renderer", "template");
  await mkdir(target, { recursive: true });
  for (const file of TEMPLATE_FILES) await copyFile(path.join(template.root, file), path.join(target, file));
  return { id, source: template.root, target, files: [...TEMPLATE_FILES], manifest: template.manifest };
}

export async function templatePreview(id, fixture = {}, options = {}) {
  const template = await getTemplate(id, options.skillRoot || defaultSkillRoot());
  const title = escapeHtml(fixture.title || template.manifest.displayName);
  const topic = escapeHtml(fixture.topic || template.manifest.description);
  const css = await readFile(path.join(template.root, "scene.css"), "utf8");
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>${css}</style></head><body><main class="template-preview ${id}" data-template="${id}"><div class="preview-stage"><div class="preview-kicker">${escapeHtml(template.manifest.displayName)}</div><h1>${title}</h1><p>${topic}</p><div class="preview-mechanism"><span>INPUT</span><i></i><span>CHANGE</span><i></i><span>OUTPUT</span></div></div></main></body></html>\n`;
  if (options.output) await writeFile(path.resolve(options.output), html, "utf8");
  return { id, manifest: template.manifest, html, output: options.output ? path.resolve(options.output) : null };
}

export { TEMPLATE_FILES };
