import { STATE_SCHEMA_VERSION, STAGES } from "./constants.mjs";

const DEFINITIONS = Object.freeze({
  discovery: {
    action: "write-brief",
    requiredInputs: ["project.json"],
    evidenceToRecord: ["brief.json"],
    successGate: "The audience, exact question, promised answer, scope, platform, and constraints are explicit.",
  },
  brief: {
    action: "collect-evidence",
    requiredInputs: ["brief.json"],
    evidenceToRecord: ["evidence/evidence.json"],
    successGate: "Claims are backed by traceable sources and uncertainty is labelled.",
  },
  evidence: {
    action: "map-mechanism",
    requiredInputs: ["brief.json", "evidence/evidence.json"],
    evidenceToRecord: ["mechanism-map.json"],
    successGate: "Input, internal changes, output, boundaries, and failure paths form a teachable causal chain.",
  },
  mechanism_map: {
    action: "write-narration-and-cues",
    requiredInputs: ["mechanism-map.json"],
    evidenceToRecord: ["script/narration.json", "script/cues.json"],
    successGate: "Every cue advances one mechanism claim and captions share the canonical narration text.",
  },
  narration_and_cues: {
    action: "generate-or-import-real-audio",
    requiredInputs: ["script/narration.json", "script/cues.json"],
    evidenceToRecord: [".publish/narration.wav", ".publish/narration-timing.json"],
    successGate: "A real narration artifact and measured cue timings exist; estimated timing is no longer authoritative.",
  },
  real_audio_timing: {
    action: "design-scenes",
    requiredInputs: ["mechanism-map.json", "script/cues.json", ".publish/narration-timing.json"],
    evidenceToRecord: ["scene-spec.json", "storyboard.json"],
    successGate: "Each scene has a semantic visual action anchored to measured narration cues.",
  },
  scene_spec: {
    action: "build-renderer",
    requiredInputs: ["project.json", "scene-spec.json", "script/cues.json"],
    evidenceToRecord: ["renderer/index.html", "renderer/cover.html"],
    successGate: "The renderer and dedicated cover are functional, deterministic, local, and template-valid.",
  },
  runnable_renderer: {
    action: "render-candidate",
    requiredInputs: ["renderer/index.html", "renderer/cover.html", ".publish/narration.wav"],
    evidenceToRecord: ["renders/candidate.mp4", "renders/cover.png"],
    successGate: "Candidate video and dedicated cover are freshly rendered from the current content hashes.",
  },
  render: {
    action: "run-automated-qc",
    requiredInputs: ["renders/candidate.mp4", "renders/cover.png"],
    evidenceToRecord: ["qc/media.json", "qc/contact-sheet.png"],
    successGate: "Decode, duration, codec, black/freeze/silence, layout, overflow, and review-frame evidence pass.",
  },
  automated_qc: {
    action: "complete-human-listen",
    requiredInputs: ["renders/candidate.mp4", "qc/media.json"],
    evidenceToRecord: ["qc/human-listen.json"],
    successGate: "A human listened to the complete candidate and recorded audio, pronunciation, sync, and pacing findings.",
  },
  human_listen: {
    action: "create-publishing-package",
    requiredInputs: ["qc/human-listen.json", "renders/candidate.mp4", "renders/cover.png"],
    evidenceToRecord: ["publish/publishing-package.json"],
    successGate: "Platform title, cover, copy, topics, pinned comment, paths, and hashes are complete.",
  },
  publishing_package: {
    action: "enter-human-release-decision",
    requiredInputs: ["publish/publishing-package.json", "qc/human-listen.json"],
    evidenceToRecord: [],
    successGate: "The package and complete-listen evidence are ready for an explicit named human decision.",
  },
  human_release_decision: {
    action: "report-release-state",
    requiredInputs: ["production-state.json#humanDecision"],
    evidenceToRecord: [],
    successGate: "The recorded decision is reported without changing it automatically.",
  },
});

export function createInitialState(project) {
  if (!project?.slug || typeof project.slug !== "string") {
    throw new Error("project.slug is required");
  }
  const createdAt = new Date().toISOString();
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    projectSlug: project.slug,
    stage: "discovery",
    releaseDecision: "not_assessed",
    blockers: [],
    evidence: [],
    history: [{ stage: "discovery", at: createdAt }],
    createdAt,
    updatedAt: createdAt,
    humanDecision: null,
  };
}

export function nextAction(state, files = new Set()) {
  if (!STAGES.includes(state?.stage)) throw new Error(`unknown production stage: ${state?.stage}`);
  const definition = DEFINITIONS[state.stage];
  const available = files instanceof Set ? files : new Set(files);
  const blockers = definition.requiredInputs
    .filter((file) => !available.has(file))
    .map((file) => ({ code: "missing-input", path: file, message: `Missing required input: ${file}` }));
  return {
    stage: state.stage,
    action: definition.action,
    requiredInputs: [...definition.requiredInputs],
    allowedTools: allowedToolsFor(state.stage),
    commands: commandsFor(state.stage),
    successGate: definition.successGate,
    blockers,
    evidenceToRecord: [...definition.evidenceToRecord],
  };
}

export function validateTransition(from, to, evidence = []) {
  const fromIndex = STAGES.indexOf(from);
  const expected = STAGES[fromIndex + 1];
  const errors = [];
  if (fromIndex < 0) errors.push(`unknown source stage: ${from}`);
  if (to !== expected) errors.push(`expected next stage ${expected ?? "(none)"}, received ${to}`);
  const supplied = new Set(evidence);
  for (const required of DEFINITIONS[from]?.evidenceToRecord ?? []) {
    if (!supplied.has(required)) errors.push(`missing transition evidence: ${required}`);
  }
  return { valid: errors.length === 0, from, to, errors };
}

export function recordHumanDecision(state, decision, actor, details = {}) {
  if (state?.stage !== "human_release_decision") {
    throw new Error("human decision is allowed only at human_release_decision stage");
  }
  if (!new Set(["passed", "failed"]).has(decision)) {
    throw new Error("human decision must be passed or failed");
  }
  if (typeof actor !== "string" || !actor.trim() || /automation|agent|bot|system/i.test(actor)) {
    throw new Error("a named human actor is required");
  }
  if (details.completeListen !== true) {
    throw new Error("a complete listen is required before the human decision");
  }
  if (!/^[a-f0-9]{64}$/i.test(details.listenedArtifactSha256 ?? "")) {
    throw new Error("listenedArtifactSha256 must be a SHA-256 hash");
  }
  const decidedAt = details.decidedAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(decidedAt))) throw new Error("decidedAt must be an ISO timestamp");
  const humanDecision = {
    decision,
    actor: actor.trim(),
    completeListen: true,
    listenedArtifactSha256: details.listenedArtifactSha256.toLowerCase(),
    decidedAt,
    notes: typeof details.notes === "string" ? details.notes : "",
  };
  return {
    ...state,
    releaseDecision: decision,
    humanDecision,
    updatedAt: decidedAt,
    history: [...(state.history ?? []), { stage: state.stage, event: "human-release-decision", at: decidedAt, decision }],
  };
}

function allowedToolsFor(stage) {
  if (new Set(["brief", "evidence"]).has(stage)) return ["primary-source-research", "local-files:read"];
  if (new Set(["narration_and_cues", "real_audio_timing"]).has(stage)) return ["tts:authorized", "audio-timing", "local-files:write"];
  if (new Set(["scene_spec", "runnable_renderer", "render"]).has(stage)) return ["templates", "browser", "hyperframes", "ffmpeg"];
  if (stage === "automated_qc") return ["ffprobe", "ffmpeg", "browser", "human-review"];
  if (new Set(["human_listen", "publishing_package", "human_release_decision"]).has(stage)) return ["human-review", "publishing-profile"];
  return ["local-files:read", "local-files:write"];
}

function commandsFor(stage) {
  const command = {
    discovery: "validate discovery",
    brief: "validate brief",
    evidence: "validate evidence",
    mechanism_map: "validate mechanism_map",
    narration_and_cues: "narration prepare",
    real_audio_timing: "narration import-timing",
    scene_spec: "build",
    runnable_renderer: "render",
    render: "audit",
    automated_qc: "validate human_listen",
    human_listen: "package",
    publishing_package: "validate publishing_package",
    human_release_decision: "release record-human-decision",
  }[stage];
  return command ? [`explainer-video-skill ${command}`] : [];
}
