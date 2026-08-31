# Engineering pipeline

## 1. Executable data flow

```text
brief + evidence
  -> mechanism-map.json
  -> canonical narration.json + cues.json
  -> real narration audio + measured timing
  -> scene-spec.json
  -> template-specific HTML/CSS/SVG + paused timelines
  -> deterministic browser frames
  -> audio/video mux
  -> automated QC evidence
  -> human listen/watch
  -> publishing package and explicit decision
```

The state machine is authoritative. At each stage run `status --json`, `next --json`, perform the requested work, then `validate <stage> <project> --json`.

## 2. Project contract

```text
project.json
production-state.json
toolchain.json
extensions.lock.json
brief.json
brief.md
evidence/evidence.json
mechanism-map.json
script/narration.json
script/cues.json
storyboard.json
scene-spec.json
renderer/index.html
renderer/cover.html
renderer/template/
assets/
.publish/narration-timing.json
renders/
qc/frames/
publish/
```

JSON files are machine-authoritative; Markdown files are reviewer views. Do not maintain a separate shortened subtitle script.

## 3. Toolchain

The reference implementation uses Node.js 22+, HTML/CSS/SVG, deterministic GSAP-compatible controllers, HyperFrames 0.8.15, Chrome/Edge, and FFmpeg/ffprobe. These are compatibility pins, not claims about the latest versions. `doctor --json` reports actual host support and fallbacks before render. It reports HyperFrames as `available` when already installed, or `on-demand` when the pinned `npx --yes hyperframes@0.8.15` path can fetch it on first render; diagnosis itself must not download it.

Provider adapters remain explicit. Paid/asynchronous calls require user authorization, task-ID persistence, and status polling before retry; credentials never enter project files or logs.

## 4. Timing and renderer

- `narration prepare` normalizes canonical text without calling a paid provider.
- Generate and listen to the narration master through the selected provider.
- `narration import-timing` imports authoritative cue starts/durations.
- `build` regenerates `renderer/index.html` and `renderer/cover.html` from project contracts.
- `render` invokes HyperFrames through argument arrays with a pinned version.
- `mux` combines the visual candidate and real narration through FFmpeg.

Use paused timelines, absolute cue anchors, deterministic selectors, fixed SVG viewBoxes, local assets, and seekable state. Do not use runtime randomness, wall-clock timers, uncontrolled CSS animation, or remote network assets in render pages.

Every HyperFrames page must expose a root composition with explicit `data-composition-id`, width, height, FPS, and duration metadata, and register a seekable timeline under the same composition identifier. Declare a tested local CJK font stack, give captions stable cue identifiers, and keep all initial SVG geometry inside the declared viewBox.

## 5. Audio

Narration is primary. Duck music under speech; use effects only for meaningful completion, rejection, or transition events. Match the visual duration to real narration rather than time-stretching speech. Verify codec, sample rate, channels, loudness, peak, beginning, tail, silence diagnostics, and the exact final mux by listening.

## 6. Cover

The normal build renders `renderer/cover.html` independently. Do not overwrite a designed cover with a video frame. Produce the full cover and phone preview from the same contract and check the intended font actually loaded.

## 7. Reproducibility

Lock package/runtime versions and extension hashes. Record browser, FFmpeg, font, template, renderer, and provider evidence in the project. After upgrading Node, browser, GSAP, HyperFrames, FFmpeg, a font, or a template, rerun deterministic seek, representative snapshots, packed install, full decode, and one complete render.

Repository changes to the renderer or media pipeline must also pass `npm run smoke:render`. This gate executes a real Chrome/HyperFrames render, independent cover capture, local narration WAV generation, FFmpeg mux, ffprobe inspection, black/freeze/silence diagnostics, contact-sheet generation, and delivery audit. Adapter unit tests alone do not prove the media pipeline works.
