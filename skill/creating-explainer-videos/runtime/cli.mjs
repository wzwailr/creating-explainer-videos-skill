import path from "node:path";
import { writeFile } from "node:fs/promises";

import { readJson, writeJsonAtomic } from "./json.mjs";
import {
  createProject,
  loadProject,
  projectStatus,
  validateProjectStage,
} from "./project.mjs";
import { recordHumanDecision } from "./state.mjs";
import { importNarrationTiming, normalizeSpokenText } from "./narration.mjs";
import { buildCover, buildRenderer } from "./renderer.mjs";
import { doctor } from "./toolchain.mjs";
import {
  auditMedia,
  createPublishingPackage,
  muxAudio,
  renderCover,
  renderVideo,
} from "./media.mjs";
import {
  discoverTemplates,
  getTemplate,
  templatePreview,
} from "./templates.mjs";
import {
  compileVisualProgram,
  loadVisualProgram,
  validateVisualProgram,
} from "./visual-dsl.mjs";

const PROJECT_COMMANDS = new Set(["new", "status", "next", "validate", "release", "templates", "visual", "narration", "build", "cover", "render", "mux", "audit", "package", "doctor"]);

export function isProjectCommand(command) {
  return PROJECT_COMMANDS.has(command);
}

function extractFlags(args) {
  const options = { positional: [], json: false, force: false, completeListen: false };
  const valueFlags = new Set([
    "--title",
    "--topic",
    "--template",
    "--preset",
    "--language",
    "--platform",
    "--decision",
    "--actor",
    "--listened-sha256",
    "--notes",
    "--output",
    "--timing",
    "--project",
    "--video",
    "--audio",
    "--quality",
    "--workers",
    "--browser-path",
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (item === "--json") options.json = true;
    else if (item === "--force") options.force = true;
    else if (item === "--complete-listen") options.completeListen = true;
    else if (valueFlags.has(item)) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${item} requires a value`);
      options[item.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
    } else if (item.startsWith("--")) {
      throw new Error(`unknown option: ${item}`);
    } else {
      options.positional.push(item);
    }
  }
  return options;
}

function print(value, asJson, output) {
  output(asJson || typeof value !== "string" ? JSON.stringify(value, null, 2) : value);
}

export async function runProjectCli(argv, io = {}) {
  const output = io.output || console.log;
  const [command, ...rest] = argv;
  if (!isProjectCommand(command)) throw new Error(`unknown project command: ${command}`);
  const options = extractFlags(rest);

  if (command === "new") {
    const destination = options.positional[0];
    const result = await createProject({
      destination,
      title: options.title,
      topic: options.topic,
      template: options.template,
      preset: options.preset,
      language: options.language,
      platform: options.platform,
      force: options.force,
    });
    print(result, options.json, output);
    return { exitCode: 0, result };
  }

  if (command === "doctor") {
    const result = await doctor({ projectRoot: options.project || options.positional[0] });
    print(result, options.json, output);
    return { exitCode: 0, result };
  }

  if (command === "templates") {
    const [subcommand = "list", id] = options.positional;
    let result;
    if (subcommand === "list") {
      const templates = await discoverTemplates();
      result = templates.map(({ id: templateId, valid, errors, manifest }) => ({
        id: templateId,
        valid,
        errors,
        version: manifest.version,
        displayName: manifest.displayName,
        description: manifest.description,
        capabilities: manifest.capabilities,
      }));
    } else if (subcommand === "inspect") {
      if (!id) throw new Error("templates inspect requires an id");
      const template = await getTemplate(id);
      result = { id: template.id, valid: template.valid, manifest: template.manifest };
    } else if (subcommand === "preview") {
      if (!id) throw new Error("templates preview requires an id");
      result = await templatePreview(id, { title: options.title, topic: options.topic }, { output: options.output });
    } else {
      throw new Error(`unknown templates command: ${subcommand}`);
    }
    print(result, options.json, output);
    return { exitCode: Array.isArray(result) && result.some((item) => !item.valid) ? 1 : 0, result };
  }

  if (command === "visual") {
    const [subcommand, projectRoot] = options.positional;
    const root = path.resolve(projectRoot || process.cwd());
    const program = await loadVisualProgram(root);
    const [project, sceneDocument, cueDocument] = await Promise.all([
      readJson(path.join(root, "project.json")),
      readJson(path.join(root, "scene-spec.json")),
      readJson(path.join(root, "script", "cues.json")),
    ]);
    const validation = program
      ? validateVisualProgram(program, { projectRoot: root, project, sceneDocument, cueDocument })
      : { valid: false, errors: [{ code: "missing-visual-program", path: "visual-program.json", message: "visual-program.json is required" }], warnings: [] };
    let result;
    if (subcommand === "validate") {
      result = validation;
    } else if (subcommand === "compile") {
      if (!validation.valid) result = validation;
      else {
        const compiled = await compileVisualProgram(root);
        result = {
          valid: true,
          scenes: compiled.scenes.length,
          elements: compiled.scenes.reduce((total, scene) => total + scene.elements.length, 0),
          actions: compiled.scenes.reduce((total, scene) => total + scene.actions.length, 0),
          warnings: compiled.warnings,
        };
      }
    } else if (subcommand === "preview") {
      if (!options.output) throw new Error("visual preview requires --output FILE");
      if (!validation.valid) result = validation;
      else {
        const renderer = await buildRenderer(root);
        const target = path.resolve(options.output);
        await writeFile(target, renderer.html, "utf8");
        result = { valid: true, output: target, scenes: renderer.scenes.length, actions: Object.values((await compileVisualProgram(root)).actionsByScene).flat().length };
      }
    } else {
      throw new Error("visual supports validate, compile, or preview");
    }
    print(result, options.json, output);
    return { exitCode: result.valid ? 0 : 1, result };
  }

  if (command === "narration") {
    const [subcommand, projectRoot] = options.positional;
    const root = path.resolve(projectRoot || process.cwd());
    let result;
    if (subcommand === "prepare") {
      const narrationPath = path.join(root, "script", "narration.json");
      const document = await readJson(narrationPath);
      document.canonicalText = (document.canonicalText ?? []).map((row) => ({ ...row, text: normalizeSpokenText(row.text) }));
      await writeJsonAtomic(narrationPath, document);
      result = { path: narrationPath, rows: document.canonicalText.length, paidProviderCalled: false };
    } else if (subcommand === "import-timing") {
      if (!options.timing) throw new Error("narration import-timing requires --timing FILE");
      result = await importNarrationTiming(root, options.timing);
    } else {
      throw new Error("narration supports prepare or import-timing");
    }
    print(result, options.json, output);
    return { exitCode: 0, result };
  }

  if (command === "build") {
    const root = path.resolve(options.positional[0] || process.cwd());
    const result = { renderer: await buildRenderer(root), cover: await buildCover(root) };
    print(result, options.json, output);
    return { exitCode: 0, result };
  }

  if (new Set(["cover", "render", "mux", "audit", "package"]).has(command)) {
    const root = path.resolve(options.positional[0] || process.cwd());
    let result;
    if (command === "cover") result = await renderCover(root, { output: options.output, browserPath: options.browserPath });
    else if (command === "render") result = await renderVideo(root, { output: options.output, quality: options.quality, workers: options.workers ? Number(options.workers) : undefined });
    else if (command === "mux") result = await muxAudio(root, { output: options.output, visual: options.video, audio: options.audio });
    else if (command === "audit") result = await auditMedia(root, { video: options.video });
    else result = await createPublishingPackage(root, { video: options.video });
    print(result, options.json, output);
    return { exitCode: result.automatedPassed === false ? 1 : 0, result };
  }

  if (command === "status" || command === "next") {
    const root = path.resolve(options.positional[0] || process.cwd());
    const status = await projectStatus(root);
    const result = command === "next" ? status.next : status;
    print(result, options.json, output);
    return { exitCode: result.blockers?.length ? 1 : 0, result };
  }

  if (command === "validate") {
    const [stage, projectRoot] = options.positional;
    if (!stage) throw new Error("validate requires a stage");
    const result = await validateProjectStage(path.resolve(projectRoot || process.cwd()), stage);
    print(result, options.json, output);
    return { exitCode: result.valid ? 0 : 1, result };
  }

  const [subcommand, projectRoot] = options.positional;
  if (subcommand !== "record-human-decision") {
    throw new Error("release supports only record-human-decision");
  }
  const root = path.resolve(projectRoot || process.cwd());
  const loaded = await loadProject(root);
  const publishing = await readJson(path.join(root, "publish", "publishing-package.json"));
  const humanListen = await readJson(path.join(root, "qc", "human-listen.json"));
  const expectedHash = String(publishing.artifacts?.video?.sha256 ?? "").toLowerCase();
  const listenedHash = String(options.listenedSha256 ?? "").toLowerCase();
  if (!expectedHash || listenedHash !== expectedHash || String(humanListen.candidateSha256 ?? "").toLowerCase() !== expectedHash) {
    throw new Error("human decision hash must match both the publishing video and complete-listen evidence");
  }
  const state = recordHumanDecision(loaded.state, options.decision, options.actor, {
    completeListen: options.completeListen,
    listenedArtifactSha256: options.listenedSha256,
    notes: options.notes,
  });
  await writeJsonAtomic(path.join(root, "production-state.json"), state);
  const result = { state, project: await readJson(path.join(root, "project.json")) };
  print(result, options.json, output);
  return { exitCode: 0, result };
}
