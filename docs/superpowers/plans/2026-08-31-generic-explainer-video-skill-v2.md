# Generic Explainer Video Skill v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a generic, executable Agent Skill and npm scaffold for producing high-quality mechanism/process explainer videos, with three extensible visual templates and truthful release gates.

**Architecture:** One portable Skill directory is the source of truth for the Agent contract, runtime, templates, presets, references, and scripts. The npm CLI imports that same runtime and adds safe install/update/rollback behavior; generated projects use JSON contracts and self-contained renderer assets. External tools such as GSAP, HyperFrames, Chrome, FFmpeg, ffprobe, and TTS providers are discovered through adapters and never hidden behind success claims.

**Tech Stack:** Node.js 18+ ESM, built-in `node:test`, JSON contracts, HTML/CSS/SVG, optional local GSAP/HyperFrames, Chrome/Edge, FFmpeg/ffprobe, npm Registry, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-30-generic-explainer-video-skill-v2-design.md`

## Global Constraints

- Product identity is `creating-explainer-videos-skill`; Skill identity is `creating-explainer-videos`; main CLI is `explainer-video-skill`.
- `ai-principle-video-skill` remains only as a compatibility command that forwards with a migration warning.
- AI-specific content may exist only in the `ai-principle-series` preset, examples, or legacy migration paths.
- Built-in visual template IDs are exactly `paper-theatre`, `spatial-chamber`, and `ink-explainer`.
- No licensed font, GSAP commercial plugin, music, image, or video binary may be redistributed.
- Captions and narration use one canonical normalized text source; underscores may not reach speech or captions.
- Automated checks may produce only `release_candidate_pending_human_listen`; only an explicit human decision may produce `passed`.
- Paid or asynchronous provider calls require explicit authorization and persisted task IDs.
- npm credentials remain outside the repository and must never be printed, copied, snapshotted, or packed.
- Every implementation task follows red-green-refactor and ends with a focused commit.

---

## File Map

### Package and installation

- `package.json`: v2 package identity, executable aliases, shipped files, scripts, public metadata.
- `bin/explainer-video-skill.mjs`: primary executable importing the portable runtime CLI.
- `bin/ai-principle-video-skill.mjs`: compatibility executable with migration warning.
- `lib/installer.mjs`: generic Skill installation, legacy discovery, backup, rollback, uninstall.
- `lib/manifest.mjs`: package integrity manifest for the generic Skill identity.
- `lib/extensions.mjs`: declarative extension validation, permissions, aliases, and immutable lock metadata.

### Portable Skill source of truth

- `skill/creating-explainer-videos/SKILL.md`: short Agent routing and mandatory state-driven workflow.
- `skill/creating-explainer-videos/runtime/cli.mjs`: argument parsing and command dispatch shared by npm and the installed Skill.
- `skill/creating-explainer-videos/runtime/state.mjs`: production stages, gates, blockers, transitions, and human decision rules.
- `skill/creating-explainer-videos/runtime/project.mjs`: project creation, contract loading, safe writes, and evidence hashes.
- `skill/creating-explainer-videos/runtime/templates.mjs`: template discovery, manifest validation, copying, and previews.
- `skill/creating-explainer-videos/runtime/renderer.mjs`: functional HTML/CSS/SVG generation from scene/cue contracts.
- `skill/creating-explainer-videos/runtime/narration.mjs`: canonical text normalization and real timing import.
- `skill/creating-explainer-videos/runtime/toolchain.mjs`: browser/Node/npm/GSAP/HyperFrames/FFmpeg/TTS capability discovery.
- `skill/creating-explainer-videos/runtime/media.mjs`: render, cover, mux, audit, evidence, and publishing package commands.
- `skill/creating-explainer-videos/scripts/explainer-video.mjs`: standalone installed-Skill executable wrapper.

### Templates, presets, and examples

- `skill/creating-explainer-videos/templates/<id>/template.json`: stable template contract.
- `skill/creating-explainer-videos/templates/<id>/scene.css`: distinct layout and visual grammar.
- `skill/creating-explainer-videos/templates/<id>/motion.mjs`: deterministic cue-anchored motion builder with fallbacks.
- `skill/creating-explainer-videos/templates/<id>/cover.css`: dedicated cover grammar.
- `skill/creating-explainer-videos/presets/general-mechanism/preset.json`: generic defaults.
- `skill/creating-explainer-videos/presets/ai-principle-series/preset.json`: isolated AI series example defaults.
- `examples/credit-card-clearing/`: non-AI process fixture.
- `examples/quantum-tunneling/`: non-AI scientific fixture.

### Tests and release

- `test/identity.test.mjs`: generic naming and AI-isolation assertions.
- `test/cli.test.mjs`: CLI compatibility and command output.
- `test/installer.test.mjs`: install/update/migrate/rollback behavior.
- `test/state.test.mjs`: stage transitions and human release boundary.
- `test/project.test.mjs`: real scaffold contracts and safe regeneration.
- `test/templates.test.mjs`: three template manifests, distinct fingerprints, fallback rules.
- `test/renderer.test.mjs`: narration/caption equality, no underscore, deterministic renderer.
- `test/toolchain.test.mjs`: adapter discovery and machine-readable doctor output.
- `test/media.test.mjs`: command construction and evidence status without false approval.
- `test/e2e.test.mjs`: two non-AI fixture projects.
- `scripts/smoke-packed.mjs`: tarball install and command smoke.
- `.github/workflows/ci.yml`: Windows/Linux test, build, pack, and smoke.
- `docs/MIGRATION_V2.md`, `docs/releases/v2.0.0.md`, `CHANGELOG.md`, `README.md`, `README.en.md`: truthful public delivery.

---

### Task 1: Generic identity and compatibility migration

**Files:**
- Modify: `package.json`
- Create: `bin/explainer-video-skill.mjs`
- Modify: `bin/ai-principle-video-skill.mjs`
- Move: `skill/creating-ai-principle-videos/` to `skill/creating-explainer-videos/`
- Modify: `lib/installer.mjs`
- Modify: `lib/manifest.mjs`
- Create: `test/identity.test.mjs`
- Modify: `test/cli.test.mjs`
- Modify: `test/installer.test.mjs`

**Interfaces:**
- Produces: `SKILL_NAME = "creating-explainer-videos"`, `LEGACY_SKILL_NAME = "creating-ai-principle-videos"`, two executable aliases pointing to one CLI implementation.
- Consumes: existing manifest hashing and atomic backup/install behavior.

- [ ] **Step 1: Write failing generic identity tests**

```js
test("package exposes generic primary command and legacy alias", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(pkg.name, "creating-explainer-videos-skill");
  assert.equal(pkg.version, "2.0.0");
  assert.equal(pkg.bin["explainer-video-skill"], "./bin/explainer-video-skill.mjs");
  assert.equal(pkg.bin["ai-principle-video-skill"], "./bin/ai-principle-video-skill.mjs");
});

test("generic skill is the only primary packaged skill", async () => {
  assert.equal(await exists("skill/creating-explainer-videos/SKILL.md"), true);
  const text = await readFile("skill/creating-explainer-videos/SKILL.md", "utf8");
  assert.match(text, /name:\s*creating-explainer-videos/);
});
```

- [ ] **Step 2: Run tests and confirm identity failures**

Run: `node --test test/identity.test.mjs test/cli.test.mjs test/installer.test.mjs`  
Expected: FAIL because v1 names and paths remain.

- [ ] **Step 3: Move the Skill, update metadata, and implement legacy forwarding**

Set package version `2.0.0`, `private: false`, generic description/keywords/repository URLs, both bins, and the generic shipped path. Make the legacy bin write one stderr migration line and call the same exported `runCli()` function as the primary bin. Update the installer to back up or migrate an existing legacy installation before placing the generic Skill.

- [ ] **Step 4: Run identity and migration tests**

Run: `node --test test/identity.test.mjs test/cli.test.mjs test/installer.test.mjs`  
Expected: PASS, including custom destination and legacy backup coverage.

- [ ] **Step 5: Commit**

```bash
git add package.json bin lib skill test
git commit -m "feat: migrate package to generic explainer identity"
```

### Task 2: Production state machine and JSON contracts

**Files:**
- Create: `skill/creating-explainer-videos/runtime/constants.mjs`
- Create: `skill/creating-explainer-videos/runtime/json.mjs`
- Create: `skill/creating-explainer-videos/runtime/state.mjs`
- Create: `test/state.test.mjs`

**Interfaces:**
- Produces: `STAGES`, `createInitialState(project)`, `nextAction(state, files)`, `validateTransition(from, to, evidence)`, `recordHumanDecision(state, decision, actor)`.
- State values: `discovery`, `brief`, `evidence`, `mechanism_map`, `narration_and_cues`, `real_audio_timing`, `scene_spec`, `runnable_renderer`, `render`, `automated_qc`, `human_listen`, `publishing_package`, `human_release_decision`.

- [ ] **Step 1: Write failing state tests**

```js
test("automated QC cannot mark a release passed", () => {
  const state = fixtureState("automated_qc");
  assert.throws(() => recordHumanDecision(state, "passed", "automation"), /human actor/);
});

test("next returns a machine-readable blocker and gate", () => {
  const next = nextAction(createInitialState({ slug: "demo" }), new Set());
  assert.equal(next.action, "write-brief");
  assert.deepEqual(next.requiredInputs, ["project.json"]);
  assert.ok(next.successGate.length > 0);
});
```

- [ ] **Step 2: Run test and confirm missing module failure**

Run: `node --test test/state.test.mjs`  
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement immutable stage definitions and release boundary**

Each transition must require exact evidence paths and hashes. `recordHumanDecision` accepts only `passed` or `failed`, a non-empty non-automation actor, an ISO timestamp, and a complete-listen evidence record.

- [ ] **Step 4: Run state tests**

Run: `node --test test/state.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skill/creating-explainer-videos/runtime test/state.test.mjs
git commit -m "feat: add evidence-driven production state machine"
```

### Task 3: Real generic project scaffold and lifecycle CLI

**Files:**
- Create: `skill/creating-explainer-videos/runtime/project.mjs`
- Create: `skill/creating-explainer-videos/runtime/cli.mjs`
- Create: `skill/creating-explainer-videos/scripts/explainer-video.mjs`
- Modify: `bin/explainer-video-skill.mjs`
- Modify: `bin/ai-principle-video-skill.mjs`
- Create: `test/project.test.mjs`
- Modify: `test/cli.test.mjs`

**Interfaces:**
- Produces: `createProject({ destination, title, topic, template, preset, force })`, `loadProject(root)`, `writeEvidence(root, kind, payload)`, `runCli(argv, io)`.
- CLI commands: `new`, `status --json`, `next --json`, `validate <stage>`, `release record-human-decision`.

- [ ] **Step 1: Write failing scaffold test**

```js
test("new creates executable JSON-first project contracts", async () => {
  const root = await tempDir();
  await createProject({ destination: root, title: "信用卡清算", topic: "清算为何分多步", template: "spatial-chamber", preset: "general-mechanism" });
  for (const file of ["project.json", "production-state.json", "toolchain.json", "brief.json", "mechanism-map.json", "script/narration.json", "script/cues.json", "storyboard.json", "scene-spec.json", "renderer/index.html", "renderer/cover.html"]) {
    assert.equal(await exists(path.join(root, file)), true, file);
  }
});
```

- [ ] **Step 2: Run test and confirm failure**

Run: `node --test test/project.test.mjs test/cli.test.mjs`  
Expected: FAIL because lifecycle modules do not exist.

- [ ] **Step 3: Implement safe scaffold writes and CLI parsing**

`new` refuses a non-empty destination unless `--force` is explicitly set, never deletes unrelated files, writes JSON with stable key ordering, and creates human-readable Markdown views from the JSON facts. `status`, `next`, and `validate` return stable JSON shapes.

- [ ] **Step 4: Run scaffold and CLI tests**

Run: `node --test test/project.test.mjs test/cli.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add bin skill/creating-explainer-videos/runtime skill/creating-explainer-videos/scripts test
git commit -m "feat: add runnable generic project lifecycle CLI"
```

### Task 4: Extensible three-template collection

**Files:**
- Create: `skill/creating-explainer-videos/runtime/templates.mjs`
- Create: `skill/creating-explainer-videos/templates/paper-theatre/{template.json,scene.css,motion.mjs,cover.css}`
- Create: `skill/creating-explainer-videos/templates/spatial-chamber/{template.json,scene.css,motion.mjs,cover.css}`
- Create: `skill/creating-explainer-videos/templates/ink-explainer/{template.json,scene.css,motion.mjs,cover.css}`
- Create: `test/templates.test.mjs`

**Interfaces:**
- Produces: `discoverTemplates(skillRoot)`, `validateTemplate(root)`, `installTemplate(id, projectRoot)`, `templatePreview(id, fixture)`.
- `TemplateManifest` fields: `id`, `version`, `displayName`, `description`, `capabilities`, `tokens`, `primitives`, `motionGrammar`, `coverGrammar`, `fontPolicy`, `fallbacks`, `fixtures`, `qcRules`.

- [ ] **Step 1: Write failing template registry tests**

```js
test("built-in collection exposes three distinct templates", async () => {
  const templates = await discoverTemplates(SKILL_ROOT);
  assert.deepEqual(templates.map(x => x.id), ["ink-explainer", "paper-theatre", "spatial-chamber"]);
  assert.equal(new Set(templates.map(x => x.manifest.motionGrammar.fingerprint)).size, 3);
});

test("spatial chamber declares licensed-plugin fallbacks", async () => {
  const template = await validateTemplate(path.join(SKILL_ROOT, "templates/spatial-chamber"));
  assert.equal(template.valid, true);
  assert.deepEqual(template.manifest.capabilities.required, ["perspective", "path-motion", "depth-layout"]);
  assert.ok(template.manifest.fallbacks.MotionPathPlugin);
  assert.ok(template.manifest.fallbacks.DrawSVGPlugin);
});
```

- [ ] **Step 2: Run test and confirm missing templates**

Run: `node --test test/templates.test.mjs`  
Expected: FAIL with missing registry/module.

- [ ] **Step 3: Extract and generalize the three validated visual systems**

Use the prior Paper Theatre, Spatial Chamber, and Ink Explainer assets as behavioral references, remove AI copy, retain distinct DOM/SVG structures, and express every advanced-plugin action with a Core transform/path fallback. Do not copy plugin binaries or third-party font files.

- [ ] **Step 4: Run template tests and preview generation**

Run: `node --test test/templates.test.mjs`  
Expected: PASS with three different fingerprints and no prohibited binaries.

- [ ] **Step 5: Commit**

```bash
git add skill/creating-explainer-videos/runtime/templates.mjs skill/creating-explainer-videos/templates test/templates.test.mjs
git commit -m "feat: add extensible three-template visual collection"
```

### Task 5: Canonical narration, cues, captions, and deterministic renderer

**Files:**
- Create: `skill/creating-explainer-videos/runtime/narration.mjs`
- Create: `skill/creating-explainer-videos/runtime/renderer.mjs`
- Create: `skill/creating-explainer-videos/runtime/browser-runtime.mjs`
- Create: `test/renderer.test.mjs`

**Interfaces:**
- Produces: `normalizeSpokenText(text)`, `importNarrationTiming(root, timing)`, `buildCaptionCues(narration, timing)`, `buildRenderer(root)`, `buildCover(root)`.
- Browser contract: `window.__timelines[compositionId]`, `window.__explainer.seek(seconds)`, stable duration and seed.

- [ ] **Step 1: Write failing narration and renderer tests**

```js
test("caption text is the canonical spoken text", () => {
  const source = [{ id: "C01", text: "把 tool\\_call 交给执行器" }];
  const timing = [{ id: "C01", start: 0, duration: 2.5 }];
  const cues = buildCaptionCues(source, timing);
  assert.equal(cues[0].caption, cues[0].tts);
  assert.equal(cues[0].tts.includes("_"), false);
  assert.match(cues[0].tts, /tool call/);
});

test("renderer is deterministic and contains no full-frame sweep", async () => {
  const first = await buildFixtureRenderer({ seed: 7 });
  const second = await buildFixtureRenderer({ seed: 7 });
  assert.equal(first, second);
  assert.doesNotMatch(first, /scan-line|cue-sweep|full-canvas-sweep/);
  assert.match(first, /window\.__explainer/);
});
```

- [ ] **Step 2: Run test and confirm failures**

Run: `node --test test/renderer.test.mjs`  
Expected: FAIL because narration/renderer modules are absent.

- [ ] **Step 3: Implement canonical text and functional renderer generation**

Normalize escaped underscores, Markdown emphasis, code delimiters, whitespace, and safe abbreviation pronunciations before writing both TTS and captions. Generate functional scene DOM/SVG, a paused cue-anchored motion timeline, dedicated caption layer, and dedicated cover composition from contracts and the selected template.

- [ ] **Step 4: Run renderer tests**

Run: `node --test test/renderer.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skill/creating-explainer-videos/runtime test/renderer.test.mjs
git commit -m "feat: add canonical narration and deterministic renderer"
```

### Task 6: Toolchain doctor and safe adapters

**Files:**
- Create: `skill/creating-explainer-videos/runtime/toolchain.mjs`
- Modify: `skill/creating-explainer-videos/runtime/cli.mjs`
- Create: `test/toolchain.test.mjs`

**Interfaces:**
- Produces: `doctor({ projectRoot })`, `findBrowser()`, `commandInfo(command, args)`, `resolveToolchain(config)`.
- Doctor result keys: `node`, `npm`, `python`, `browser`, `ffmpeg`, `ffprobe`, `hyperframes`, `gsap`, `fonts`, `tts`, `readyFor`.

- [ ] **Step 1: Write failing doctor tests with injected command runner**

```js
test("doctor distinguishes available, missing, optional, and degraded tools", async () => {
  const result = await doctor({ runner: fixtureRunner({ ffmpeg: "7.1", ffprobe: "7.1", browser: "Edge 140" }) });
  assert.equal(result.ffmpeg.status, "available");
  assert.equal(result.gsap.status, "degraded");
  assert.equal(result.readyFor.scaffold, true);
  assert.equal(result.readyFor.render, false);
});
```

- [ ] **Step 2: Run test and confirm failure**

Run: `node --test test/toolchain.test.mjs`  
Expected: FAIL with missing module.

- [ ] **Step 3: Implement discovery without changing the machine**

Probe versions, standard Windows/Linux browser paths, local project adapters, font availability, and configured TTS providers. `doctor` is read-only and reports exact remediation without installing, upgrading, or invoking paid APIs.

- [ ] **Step 4: Run doctor tests and a live JSON doctor**

Run: `node --test test/toolchain.test.mjs && node bin/explainer-video-skill.mjs doctor --json`  
Expected: tests PASS; live output is valid JSON and contains no secret values.

- [ ] **Step 5: Commit**

```bash
git add skill/creating-explainer-videos/runtime test/toolchain.test.mjs
git commit -m "feat: add provider-neutral toolchain doctor"
```

### Task 7: Render, cover, mux, automated QC, and publishing package

**Files:**
- Create: `skill/creating-explainer-videos/runtime/process.mjs`
- Create: `skill/creating-explainer-videos/runtime/media.mjs`
- Modify: `skill/creating-explainer-videos/runtime/cli.mjs`
- Create: `test/media.test.mjs`

**Interfaces:**
- Produces: `renderVideo(root, options)`, `renderCover(root, options)`, `muxAudio(root, options)`, `auditMedia(root, options)`, `createPublishingPackage(root, options)`.
- Evidence outputs: `qc/media.json`, `qc/frames/`, `qc/contact-sheet.png`, `publish/publishing-package.json`, content hashes.

- [ ] **Step 1: Write failing media command and decision-boundary tests**

```js
test("automated audit records candidate status only", async () => {
  const report = await auditMedia(fixtureProject, { runner: fixtureMediaRunner() });
  assert.equal(report.releaseDecision, "release_candidate_pending_human_listen");
  assert.notEqual(report.releaseDecision, "passed");
});

test("render command pins HyperFrames and emits an explicit output", () => {
  const command = hyperframesRenderCommand({ version: "0.8.15", fps: 30, output: "renders/visual.mp4" });
  assert.deepEqual(command.slice(0, 4), ["npx", "--yes", "hyperframes@0.8.15", "render"]);
  assert.ok(command.includes("renders/visual.mp4"));
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test test/media.test.mjs`  
Expected: FAIL with missing media implementation.

- [ ] **Step 3: Implement external command adapters and evidence generation**

Use argument arrays, never shell interpolation. Run HyperFrames from the renderer directory, render the dedicated cover through an isolated browser profile, mux the authoritative narration with FFmpeg, run ffprobe/full decode/black/freeze/silence checks, generate review frames/contact sheet, hash artifacts, and leave human listening pending.

- [ ] **Step 4: Run media tests**

Run: `node --test test/media.test.mjs`  
Expected: PASS using injected runners and fixture probe responses.

- [ ] **Step 5: Commit**

```bash
git add skill/creating-explainer-videos/runtime test/media.test.mjs
git commit -m "feat: add render and release evidence pipeline"
```

### Task 8: Presets and declarative extension collection

**Files:**
- Modify: `lib/extensions.mjs`
- Create: `skill/creating-explainer-videos/presets/general-mechanism/preset.json`
- Create: `skill/creating-explainer-videos/presets/ai-principle-series/preset.json`
- Move/rename: `skill/creating-explainer-videos/extensions/ai-primary-research/` to `skill/creating-explainer-videos/extensions/primary-source-research/`
- Modify: all extension manifests and references under `skill/creating-explainer-videos/extensions/`
- Create: `test/extensions-v2.test.mjs`

**Interfaces:**
- Produces: extension types `visual`, `voice`, `research`, `qc`, `publishing`; declarative `permissions`; alias map for `ai-primary-research`; preset validation independent of templates.

- [ ] **Step 1: Write failing generic extension tests**

```js
test("AI preset is isolated and generic preset chooses no fixed template", async () => {
  const general = await loadPreset("general-mechanism");
  const ai = await loadPreset("ai-principle-series");
  assert.equal(general.template, null);
  assert.match(JSON.stringify(ai), /AI/);
  assert.doesNotMatch(JSON.stringify(general), /AI 底层原理图解/);
});

test("legacy research ID resolves to primary-source-research", () => {
  assert.equal(resolveExtensionAlias("ai-primary-research"), "primary-source-research");
});
```

- [ ] **Step 2: Run tests and confirm AI-specific failures**

Run: `node --test test/extensions-v2.test.mjs test/manifest.test.mjs`  
Expected: FAIL until manifests and aliases migrate.

- [ ] **Step 3: Implement generic presets, permissions, and aliases**

Keep provider configuration declarative, forbid executable hooks, record hashes and permissions in `extensions.lock.json`, and ensure any AI wording is confined to the AI preset/reference.

- [ ] **Step 4: Run extension tests**

Run: `node --test test/extensions-v2.test.mjs test/manifest.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/extensions.mjs skill/creating-explainer-videos/extensions skill/creating-explainer-videos/presets test
git commit -m "feat: generalize presets and extension API"
```

### Task 9: Agent Skill contract and production references

**Files:**
- Rewrite: `skill/creating-explainer-videos/SKILL.md`
- Rewrite: `skill/creating-explainer-videos/agents/openai.yaml`
- Create/modify: references under `skill/creating-explainer-videos/references/`
- Create: `skill/creating-explainer-videos/references/visual-template-collection.md`
- Modify: `test/identity.test.mjs`

**Interfaces:**
- Produces: mandatory Agent loop `status -> next -> tool call -> validate -> evidence`, tool permission boundaries, three-template routing, research and human-listen gates.

- [ ] **Step 1: Extend failing Skill-content tests**

```js
test("SKILL routes agents through executable state and template collection", async () => {
  const text = await readFile(SKILL_MD, "utf8");
  for (const term of ["status --json", "next --json", "validate", "paper-theatre", "spatial-chamber", "ink-explainer", "human_listen"]) {
    assert.match(text, new RegExp(escapeRegExp(term)));
  }
  assert.ok(text.length < 12000);
});
```

- [ ] **Step 2: Run identity tests and confirm failure**

Run: `node --test test/identity.test.mjs`  
Expected: FAIL until the generic Skill contract is rewritten.

- [ ] **Step 3: Write concise routing Skill and detailed progressive references**

The entrypoint tells the Agent when to load content, visual, engineering, QC, publishing, and extension references. It requires actual command execution and evidence rather than prose claims, and explicitly keeps AI series behavior in its preset.

- [ ] **Step 4: Run Skill tests and local skill-creator validation**

Run: `node --test test/identity.test.mjs && python skill/creating-explainer-videos/scripts/test_skill.py`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add skill/creating-explainer-videos test/identity.test.mjs
git commit -m "docs: turn generic workflow into executable agent contract"
```

### Task 10: Two non-AI end-to-end fixtures

**Files:**
- Create: `examples/credit-card-clearing/fixture.json`
- Create: `examples/quantum-tunneling/fixture.json`
- Create: `scripts/build-examples.mjs`
- Create: `test/e2e.test.mjs`

**Interfaces:**
- Produces: reproducible non-AI projects with narration fixtures, timing, scene specs, three-template coverage, functional renderer/cover, QC candidate evidence, and publishing metadata.

- [ ] **Step 1: Write failing E2E tests**

```js
for (const fixture of ["credit-card-clearing", "quantum-tunneling"]) {
  test(`${fixture} builds without AI preset`, async () => {
    const result = await buildExample(fixture, await tempDir());
    assert.equal(result.project.preset, "general-mechanism");
    assert.doesNotMatch(JSON.stringify(result.project), /AI 底层原理图解/);
    assert.equal(result.qc.releaseDecision, "release_candidate_pending_human_listen");
    assert.equal(await exists(result.paths.renderer), true);
    assert.equal(await exists(result.paths.cover), true);
  });
}
```

- [ ] **Step 2: Run tests and confirm missing fixtures**

Run: `node --test test/e2e.test.mjs`  
Expected: FAIL because fixture projects do not exist.

- [ ] **Step 3: Add complete fixture contracts and deterministic local timing/audio metadata**

Use `spatial-chamber` for credit-card clearing and `ink-explainer` for quantum tunneling. Include real explanatory scene/cue content, deterministic fixture timings, renderer/cover generation, and candidate evidence; do not mark the examples human-approved.

- [ ] **Step 4: Run E2E tests and inspect generated HTML**

Run: `node --test test/e2e.test.mjs && node scripts/build-examples.mjs --verify`  
Expected: PASS, with two distinct render structures and zero AI core branding.

- [ ] **Step 5: Commit**

```bash
git add examples scripts/build-examples.mjs test/e2e.test.mjs
git commit -m "test: prove generic scaffold with two non-AI topics"
```

### Task 11: Package integrity, packed install, CI, and public documentation

**Files:**
- Modify: `scripts/build-package.mjs`
- Modify: `scripts/smoke-packed.mjs`
- Modify: `scripts/build-zip.ps1`
- Modify: `.github/workflows/ci.yml`
- Rewrite: `README.md`
- Rewrite: `README.en.md`
- Modify: `CHANGELOG.md`
- Create: `docs/MIGRATION_V2.md`
- Create: `docs/releases/v2.0.0.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`

**Interfaces:**
- Produces: deterministic Skill manifest, npm tarball, zip, checksums, Windows/Linux CI, truthful v2 usage and migration documentation.

- [ ] **Step 1: Extend packed smoke assertions**

```js
assert.equal(await run(bin, ["--version"]), "2.0.0");
assert.match(await run(bin, ["templates", "list", "--json"]), /spatial-chamber/);
assert.equal((await run(bin, ["new", tempProject, "--title", "Demo", "--topic", "Process", "--template", "paper-theatre", "--json"])).code, 0);
assert.equal((await run(bin, ["verify", "--destination", tempSkills])).code, 0);
```

- [ ] **Step 2: Run build/smoke and confirm failures before updates**

Run: `npm test && npm run build && npm pack --dry-run && npm run smoke:packed`  
Expected: identity/path assertions fail until packaging and docs migrate.

- [ ] **Step 3: Update packaging, secret/path scans, CI, and docs**

Ensure npm files include both README languages, docs needed for migration, examples, and the entire generic Skill while excluding caches, rendered media, credentials, personal absolute paths, and licensed assets. CI runs on `windows-latest` and `ubuntu-latest` with Node 18 and 22.

- [ ] **Step 4: Run full local release candidate checks**

Run: `npm test && npm run build && npm pack --dry-run && npm run smoke:packed`  
Expected: PASS; tarball list contains only intended files.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts .github README.md README.en.md CHANGELOG.md CONTRIBUTING.md SECURITY.md docs
git commit -m "release: prepare generic explainer video skill v2"
```

### Task 12: Forward Agent validation and release audit

**Files:**
- Create: `docs/validation/v2-forward-agent-validation.md`
- Create: `docs/validation/v2-release-audit.md`
- Modify only if findings require focused fixes: files named by failed evidence.

**Interfaces:**
- Produces: evidence that a fresh Agent follows the CLI loop for non-AI prompts and does not claim publish approval without human listening.

- [ ] **Step 1: Define fixed black-box prompts and pass criteria**

Use one process prompt, one science prompt, and one AI-preset prompt. For each, record whether the Agent invoked `status`, `next`, `validate`, selected a semantically appropriate template, generated runnable files, preserved tool boundaries, and stopped at the human gate.

- [ ] **Step 2: Run the installed tarball in a clean temporary Skill directory**

Run: `npm run smoke:packed` followed by the documented clean Agent harness.  
Expected: all three prompts create state/evidence-driven projects; no run returns `passed` automatically.

- [ ] **Step 3: Run complete security, naming, and license scans**

Run: `rg -n "D:\\\\aiCode|D:\\\\密码|npm_[A-Za-z0-9]|BEGIN .*PRIVATE KEY|AI 底层原理图解" dist package.tgz skill lib bin README*.md` and classify each match.  
Expected: no secret or personal path matches; AI series text appears only in the declared preset/example/migration context.

- [ ] **Step 4: Record evidence and fix only demonstrated failures**

The audit document lists commands, versions, hashes, results, remaining human-listen status, and any known optional-tool degradation.

- [ ] **Step 5: Commit**

```bash
git add docs/validation
git commit -m "test: record v2 forward-agent and release audit"
```

### Task 13: GitHub rename, v2.0.0 release, and npm Registry publication

**Files:**
- Modify if final URLs change: `package.json`, `README.md`, `README.en.md`, `docs/MIGRATION_V2.md`, `docs/releases/v2.0.0.md`
- Generated release assets: `dist/*.tgz`, `dist/*.zip`, `dist/SHA256SUMS.txt`

**Interfaces:**
- Produces: public GitHub repository `creating-explainer-videos-skill`, tag/release `v2.0.0`, npm package `creating-explainer-videos-skill@2.0.0`, verified public reinstallation.

- [ ] **Step 1: Verify release identity and local credentials without printing secrets**

Run read-only checks: clean branch, `npm view creating-explainer-videos-skill`, `npm whoami` using the user-designated local credential source, `gh auth status`, and exact remote URL. Record only availability and account identity, never token text.

- [ ] **Step 2: Re-run immutable release gates**

Run: `npm test && npm run build && npm pack --dry-run && npm run smoke:packed`  
Expected: PASS from a clean worktree and package version `2.0.0`.

- [ ] **Step 3: Rename GitHub repository and update verified URLs**

Rename the existing repository to `creating-explainer-videos-skill`, confirm the legacy GitHub URL redirects, update only final URL fields, rerun tests, commit, and push the same commit that will be tagged.

- [ ] **Step 4: Publish npm and verify from the public Registry**

Run `npm publish --access public` with 2FA/OTP handling from the local secure credential source. Then install `creating-explainer-videos-skill@2.0.0` into a new temporary directory and run version, template list, new-project, install, and verify commands.

- [ ] **Step 5: Create and verify GitHub v2.0.0 Release**

Create tag `v2.0.0` on the npm-published commit, attach tarball/zip/checksums, use `docs/releases/v2.0.0.md` as notes, mark v1.1.0 as Legacy AI-specific, and verify public asset hashes.

- [ ] **Step 6: Record final public evidence**

Update `docs/validation/v2-release-audit.md` with npm package URL/version, GitHub release URL/tag, commit SHA, artifact hashes, CI results, and public reinstall results. Do not include credentials.

- [ ] **Step 7: Commit any evidence-only update and report**

```bash
git add docs/validation/v2-release-audit.md
git commit -m "docs: record public v2 release verification"
git push
```

