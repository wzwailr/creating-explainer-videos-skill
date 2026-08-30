export const SKILL_NAME = "creating-explainer-videos";
export const PROJECT_SCHEMA_VERSION = 1;
export const STATE_SCHEMA_VERSION = 1;

export const STAGES = Object.freeze([
  "discovery",
  "brief",
  "evidence",
  "mechanism_map",
  "narration_and_cues",
  "real_audio_timing",
  "scene_spec",
  "runnable_renderer",
  "render",
  "automated_qc",
  "human_listen",
  "publishing_package",
  "human_release_decision",
]);

export const RELEASE_DECISIONS = Object.freeze([
  "not_assessed",
  "failed",
  "release_candidate_pending_human_listen",
  "passed",
]);

