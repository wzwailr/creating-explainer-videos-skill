import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { readJson } from "./json.mjs";
import { validateVisualProgram } from "./visual-dsl.mjs";

function present(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

async function json(root, relativePath, errors) {
  try {
    return await readJson(path.join(root, relativePath));
  } catch (error) {
    errors.push(`${relativePath} is unreadable: ${error.message}`);
    return null;
  }
}

async function nonEmptyFile(root, relativePath, errors) {
  try {
    if ((await stat(path.join(root, relativePath))).size <= 0) errors.push(`${relativePath} is empty`);
  } catch (error) {
    errors.push(`${relativePath} is unavailable: ${error.message}`);
  }
}

function requireFields(document, fields, label, errors) {
  for (const field of fields) {
    if (!present(document?.[field])) errors.push(`${label}.${field} must be a non-empty string`);
  }
}

export async function validateStageEvidence(root, stage, state) {
  const errors = [];
  if (stage === "discovery") {
    const brief = await json(root, "brief.json", errors);
    if (brief && brief.complete !== true) errors.push("brief.json complete must be true");
    requireFields(brief, ["audience", "exactQuestion", "promisedAnswer"], "brief", errors);
    if (brief && !Array.isArray(brief.scope)) errors.push("brief.scope must be an array");
    if (brief && !Array.isArray(brief.constraints)) errors.push("brief.constraints must be an array");
  } else if (stage === "brief") {
    const evidence = await json(root, "evidence/evidence.json", errors);
    if (evidence && evidence.complete !== true) errors.push("evidence/evidence.json complete must be true");
    if (evidence && !nonEmptyArray(evidence.claims)) errors.push("evidence.claims must contain at least one claim");
    if (evidence && !nonEmptyArray(evidence.sources)) errors.push("evidence.sources must contain at least one source");
    for (const [index, claim] of (evidence?.claims ?? []).entries()) {
      requireFields(claim, ["claim", "sourceType", "verifiedAt", "visualExpression"], `evidence.claims[${index}]`, errors);
    }
  } else if (stage === "evidence") {
    const mechanism = await json(root, "mechanism-map.json", errors);
    if (mechanism && mechanism.complete !== true) errors.push("mechanism-map.json complete must be true");
    for (const field of ["input", "internalChanges", "output", "boundaries", "failures"]) {
      if (mechanism && !nonEmptyArray(mechanism[field])) errors.push(`mechanism-map.${field} must contain at least one item`);
    }
    if (mechanism && (!mechanism.workedExample || typeof mechanism.workedExample !== "object")) {
      errors.push("mechanism-map.workedExample is required");
    }
    for (const field of ["input", "internalChanges", "output", "boundaries", "failures"]) {
      for (const [index, item] of (mechanism?.[field] ?? []).entries()) {
        if (!present(item?.id)) errors.push(`mechanism-map.${field}[${index}].id must be a non-empty string`);
      }
    }
    if (mechanism?.workedExample && !present(mechanism.workedExample.id)) errors.push("mechanism-map.workedExample.id must be a non-empty string");
  } else if (stage === "mechanism_map") {
    const narration = await json(root, "script/narration.json", errors);
    const mechanism = await json(root, "mechanism-map.json", errors);
    if (narration && narration.complete !== true) errors.push("script/narration.json complete must be true");
    if (narration && !nonEmptyArray(narration.canonicalText)) errors.push("narration.canonicalText must contain cues");
    const knownRefs = new Set([
      ...(mechanism?.input ?? []),
      ...(mechanism?.internalChanges ?? []),
      ...(mechanism?.output ?? []),
      ...(mechanism?.boundaries ?? []),
      ...(mechanism?.failures ?? []),
      mechanism?.workedExample,
    ].filter(Boolean).map((item) => item.id).filter(present));
    const coveredRefs = new Set();
    for (const [index, cue] of (narration?.canonicalText ?? []).entries()) {
      requireFields(cue, ["id", "sceneId", "text", "focus", "visualEvent"], `narration.canonicalText[${index}]`, errors);
      if (String(cue.text ?? "").includes("_")) errors.push(`narration cue ${cue.id || index} contains an underscore`);
      if (!nonEmptyArray(cue.mechanismRefs)) errors.push(`narration cue ${cue.id || index} mechanismRefs must contain mechanism ids`);
      for (const reference of cue.mechanismRefs ?? []) {
        if (!knownRefs.has(reference)) errors.push(`narration cue ${cue.id || index} mechanismRefs contains unknown id ${reference}`);
        else coveredRefs.add(reference);
      }
    }
    const requiredRefs = [
      ...(mechanism?.input ?? []),
      ...(mechanism?.internalChanges ?? []),
      ...(mechanism?.output ?? []),
      mechanism?.workedExample,
    ].filter(Boolean).map((item) => item.id).filter(present);
    for (const reference of requiredRefs) {
      if (!coveredRefs.has(reference)) errors.push(`canonical narration does not cover required mechanism id ${reference}`);
    }
    const boundaryOrFailureRefs = [...(mechanism?.boundaries ?? []), ...(mechanism?.failures ?? [])].map((item) => item.id).filter(present);
    if (boundaryOrFailureRefs.length && !boundaryOrFailureRefs.some((reference) => coveredRefs.has(reference))) {
      errors.push("canonical narration must cover at least one boundary or failure mechanism id");
    }
  } else if (stage === "narration_and_cues") {
    await nonEmptyFile(root, ".publish/narration.wav", errors);
    const timing = await json(root, ".publish/narration-timing.json", errors);
    const cues = await json(root, "script/cues.json", errors);
    const narration = await json(root, "script/narration.json", errors);
    if (timing && (timing.source !== "measured" || !nonEmptyArray(timing.cues))) errors.push("narration timing must be measured and contain cues");
    if (timing?.testOnly === true) errors.push("test-only narration cannot satisfy real audio timing");
    if (cues && (cues.complete !== true || cues.timingSource !== "measured" || !nonEmptyArray(cues.cues))) {
      errors.push("script/cues.json must be complete and measured");
    }
    const canonicalById = new Map((narration?.canonicalText ?? []).map((cue) => [cue.id, cue.text]));
    for (const cue of cues?.cues ?? []) {
      if (cue.caption !== cue.tts || cue.tts !== canonicalById.get(cue.id)) {
        errors.push(`cue ${cue.id || "unknown"} caption and TTS must equal canonical narration`);
      }
    }
    if (nonEmptyArray(cues?.cues)) {
      const averageCueDuration = cues.cues.reduce((sum, cue) => sum + Number(cue.duration || 0), 0) / cues.cues.length;
      if (averageCueDuration < 2.2) errors.push(`average cue duration ${averageCueDuration.toFixed(3)}s is below the 2.2s explanation floor`);
    }
  } else if (stage === "real_audio_timing") {
    const designDocuments = {};
    for (const relativePath of ["scene-spec.json", "storyboard.json"]) {
      const document = await json(root, relativePath, errors);
      designDocuments[relativePath] = document;
      if (document && document.complete !== true) errors.push(`${relativePath} complete must be true`);
      if (document && !nonEmptyArray(document.scenes)) errors.push(`${relativePath} must contain scenes`);
      for (const [index, scene] of (document?.scenes ?? []).entries()) {
        requireFields(scene, ["id", "title", "knowledgePoint", "input", "transformation", "output", "compositionTask"], `${relativePath}.scenes[${index}]`, errors);
        if (!nonEmptyArray(scene.cueIds)) errors.push(`${relativePath}.scenes[${index}].cueIds must contain cues`);
      }
    }
    const project = await json(root, "project.json", errors);
    const cueDocument = await json(root, "script/cues.json", errors);
    const visualPath = path.join(root, "visual-program.json");
    let visualProgram = null;
    try {
      visualProgram = await readJson(visualPath);
    } catch (error) {
      if (Number(project?.schemaVersion || 1) >= 2) errors.push(`visual-program.json is unreadable: ${error.message}`);
    }
    if (visualProgram) {
      if (visualProgram.complete !== true) errors.push("visual-program.json complete must be true");
      else {
        const validation = validateVisualProgram(visualProgram, {
          projectRoot: root,
          project,
          sceneDocument: designDocuments["scene-spec.json"],
          cueDocument,
        });
        errors.push(...validation.errors.map((item) => `visual-program.json ${item.code} at ${item.path}: ${item.message}`));
      }
    }
  } else if (stage === "scene_spec") {
    const renderer = await readFile(path.join(root, "renderer/index.html"), "utf8").catch((error) => {
      errors.push(`renderer/index.html is unreadable: ${error.message}`);
      return "";
    });
    const cover = await readFile(path.join(root, "renderer/cover.html"), "utf8").catch((error) => {
      errors.push(`renderer/cover.html is unreadable: ${error.message}`);
      return "";
    });
    if (!renderer.includes("window.__explainer") || !renderer.includes("window.__timelines")) errors.push("renderer must expose deterministic seek timelines");
    if (!cover.includes("cover-title") || !cover.includes("cover-question")) errors.push("dedicated cover source is incomplete");
  } else if (stage === "runnable_renderer") {
    await nonEmptyFile(root, "renders/candidate.mp4", errors);
    await nonEmptyFile(root, "renders/cover.png", errors);
  } else if (stage === "render") {
    const report = await json(root, "qc/media.json", errors);
    await nonEmptyFile(root, "qc/contact-sheet.png", errors);
    if (report && report.automatedPassed !== true) errors.push("qc/media.json automatedPassed must be true");
    if (report && report.releaseDecision !== "release_candidate_pending_human_listen") errors.push("automated QC must stop at the human-listen candidate state");
    if (report && report.humanListenRequired !== true) errors.push("automated QC must require human listening");
  } else if (stage === "automated_qc") {
    const review = await json(root, "qc/human-listen.json", errors);
    if (review && review.complete !== true) errors.push("human listen review must be complete");
    requireFields(review, ["reviewer", "candidateSha256"], "humanListen", errors);
    if (review && !/^[a-f0-9]{64}$/i.test(review.candidateSha256 ?? "")) errors.push("human listen candidateSha256 must be a SHA-256 hash");
    for (const pass of ["mutedVisual", "audioOnly", "normalWatch"]) {
      if (review && review[pass] !== true) errors.push(`human listen ${pass} pass must be true`);
    }
  } else if (stage === "human_listen") {
    const publishing = await json(root, "publish/publishing-package.json", errors);
    requireFields(publishing, ["title", "description", "pinnedComment"], "publishing", errors);
    if (publishing && !nonEmptyArray(publishing.topics)) errors.push("publishing.topics must contain at least one topic");
    for (const key of ["video", "cover"]) {
      if (publishing && !/^[a-f0-9]{64}$/i.test(publishing.artifacts?.[key]?.sha256 ?? "")) errors.push(`publishing artifact ${key} must have a SHA-256 hash`);
    }
  } else if (stage === "human_release_decision") {
    if (!state?.humanDecision?.completeListen) errors.push("a complete named human decision is required");
  }
  return { valid: errors.length === 0, errors };
}
