import test from "node:test";
import assert from "node:assert/strict";

import {
  createInitialState,
  nextAction,
  recordHumanDecision,
  validateTransition,
} from "../skill/creating-explainer-videos/runtime/state.mjs";

test("initial state exposes a machine-readable next action and gate", () => {
  const state = createInitialState({ slug: "demo" });
  const next = nextAction(state, new Set(["project.json"]));

  assert.equal(state.stage, "discovery");
  assert.equal(next.action, "write-brief");
  assert.deepEqual(next.requiredInputs, ["project.json"]);
  assert.deepEqual(next.evidenceToRecord, ["brief.json"]);
  assert.ok(next.successGate.length > 0);
});

test("transition validation accepts only the adjacent stage with required evidence", () => {
  assert.equal(validateTransition("discovery", "brief", ["brief.json"]).valid, true);
  assert.equal(validateTransition("discovery", "evidence", ["brief.json"]).valid, false);
  assert.equal(validateTransition("discovery", "brief", []).valid, false);
});

test("next action exposes real narration and visual-program commands", () => {
  const narration = nextAction(
    { ...createInitialState({ slug: "demo" }), stage: "narration_and_cues" },
    new Set(["script/narration.json", "script/cues.json"]),
  );
  const scenes = nextAction(
    { ...createInitialState({ slug: "demo" }), stage: "scene_spec" },
    new Set(["project.json", "scene-spec.json", "script/cues.json"]),
  );

  assert.equal(narration.commands.some((command) => command.includes("narration synthesize") && command.includes("edge-tts")), true);
  assert.equal(narration.commands.some((command) => command.includes("narration import-timing")), true);
  assert.equal(scenes.commands.some((command) => command.includes("visual validate")), true);
  assert.equal(scenes.commands.some((command) => command.endsWith(" build")), true);
});

test("publishing package can enter the final human decision stage without circular evidence", () => {
  assert.equal(validateTransition("publishing_package", "human_release_decision", []).valid, true);
});

test("automated QC cannot mark a release passed", () => {
  const state = { ...createInitialState({ slug: "demo" }), stage: "human_release_decision" };

  assert.throws(
    () => recordHumanDecision(state, "passed", "automation", { completeListen: true }),
    /human actor/i,
  );
  assert.throws(
    () => recordHumanDecision(state, "passed", "reviewer", { completeListen: false }),
    /complete listen/i,
  );
});

test("explicit human decision records evidence without mutating the input", () => {
  const state = { ...createInitialState({ slug: "demo" }), stage: "human_release_decision" };
  const decided = recordHumanDecision(state, "passed", "human:editor", {
    completeListen: true,
    listenedArtifactSha256: "a".repeat(64),
    decidedAt: "2026-08-31T00:00:00.000Z",
  });

  assert.equal(state.releaseDecision, "not_assessed");
  assert.equal(decided.releaseDecision, "passed");
  assert.equal(decided.humanDecision.actor, "human:editor");
  assert.equal(decided.humanDecision.completeListen, true);
});
