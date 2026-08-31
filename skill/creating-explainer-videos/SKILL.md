---
name: creating-explainer-videos
description: Use when researching, planning, scripting, animating, rendering, auditing, or packaging a mechanism, process, system, or scientific explainer video with executable project state, narration-identical captions, cue-synchronized motion, dedicated covers, and release evidence.
---

# Creating Explainer Videos

Create a traceable teaching product, not just an MP4. The Agent must drive the executable state machine, call the required tools, inspect their evidence, and stop at unresolved gates.

## Start with the executable project

Use the installed CLI `explainer-video-skill`. From a copied Skill directory use `node <skill-dir>/scripts/explainer-video.mjs` instead. Run `doctor --json` before promising a render.

JavaScript project and media commands require Node.js 22+. The Python lifecycle commands for install, update, verify, rollback, uninstall, and extension listing do not require Node.js.

Create a project only after the exact question, audience, language, platform, and aspect ratio are known:

```powershell
explainer-video-skill new <project-dir> --title "标题" --topic "要解释的精确问题" --template spatial-chamber --preset general-mechanism --json
explainer-video-skill status --json <project-dir>
explainer-video-skill next --json <project-dir>
```

For every stage, repeat this loop:

1. Run `status --json` and `next --json`.
2. Read the listed required inputs and gate.
3. Perform the real research, writing, generation, render, or review action.
4. Write the requested evidence file; do not invent success.
5. Run `validate <current-stage> <project-dir> --json`.
6. Continue only when validation moves the project forward.

The stages are `discovery -> brief -> evidence -> mechanism_map -> narration_and_cues -> real_audio_timing -> scene_spec -> runnable_renderer -> render -> automated_qc -> human_listen -> publishing_package -> human_release_decision`.

## Content contract

Read [content-and-script-contract.md](references/content-and-script-contract.md) when defining the promise, evidence, mechanism, narration, or cue map.

- Explain `input -> internal state changes -> output`, including why each step follows.
- Include one worked example and one relevant boundary, cost, control, or failure chain.
- Treat duration, scene count, and word count as depth alarms, never padding targets.
- Keep the public topic no broader than the mechanism actually taught.
- For a series, the opening sentence connects the previous output to this exact topic; the final sentence previews the next exact question. For a standalone video, open with the exact question and close with the reusable conclusion.
- Store one canonical spoken string. Captions and TTS must be character-identical after normalization.
- Remove `\_`, snake_case underscores, Markdown syntax, and other characters a TTS engine may pronounce literally. Keep technical spelling in a separate on-screen label.
- Bind every cue's narration, visible title, mechanism label, focus, action, and handoff to the same local claim.

Use primary evidence for mechanism facts. Keep source, source type, verification date, simplification, and planned visual expression in the evidence table. Community sources may expose confusion or edge cases but do not establish the mechanism by themselves.

## Select from the visual template collection

Read [visual-template-collection.md](references/visual-template-collection.md) before choosing or modifying a template. Inspect the executable manifests with:

```powershell
explainer-video-skill templates list --json
explainer-video-skill templates inspect paper-theatre --json
explainer-video-skill templates inspect spatial-chamber --json
explainer-video-skill templates inspect ink-explainer --json
```

- `paper-theatre`: object identity, physical processing, evidence, sorting, comparison, and editorial transformation.
- `spatial-chamber`: systems, routes, layers, pipelines, queues, transfer, and high-impact spatial state changes.
- `ink-explainer`: derivation, formulas, causal relations, dense annotations, comparisons, and correction.

Select by knowledge structure, not decoration. A project may combine primitives, but one grammar must remain dominant. Do not copy an old scene and swap text. Do not use full-frame scanning lines, narration-length sweeps, meaningless particles, or repeated cards as substitute motion.

Read [visual-program-dsl.md](references/visual-program-dsl.md) after measured timing. New projects require `visual-program.json`: one bounded semantic scene for every scene specification, real topic elements instead of generic labels, and cue-bound actions that show the state change being narrated.

```powershell
explainer-video-skill visual validate <project-dir> --json
explainer-video-skill visual compile <project-dir> --json
explainer-video-skill visual preview <project-dir> --output <preview.html> --json
```

`build` and `render` regenerate renderer HTML, so do not hide topic logic in a hand-edited generated page. A legacy project without a visual program may use the generic scaffold for compatibility, but the fallback is not finished visual direction. Never present it as a high-fidelity topic video merely because it renders.

Use DingTalk JinBuTi/DingTalk Sans for display roles when locally licensed and installed, and Noto Sans SC or a tested CJK fallback for captions. Never package font binaries or commercial GSAP plugins without redistribution rights. Every premium plugin needs the fallback declared by its template.

## Narration, timing, and render

Read [engineering-pipeline.md](references/engineering-pipeline.md) before implementation.

```powershell
explainer-video-skill narration prepare <project-dir> --json
explainer-video-skill narration adapters --json
explainer-video-skill narration doctor <project-dir> --adapter edge-tts --json
explainer-video-skill narration synthesize <project-dir> --adapter edge-tts --voice zh-CN-YunxiNeural --allow-network --json
# Or import already measured timing from an externally generated master.
explainer-video-skill narration import-timing <project-dir> --timing <measured-timing.json> --json
explainer-video-skill build <project-dir> --json
explainer-video-skill render <project-dir> --json
explainer-video-skill cover <project-dir> --json
explainer-video-skill mux <project-dir> --audio <narration.wav> --json
```

Read [voice-adapter-protocol.md](references/voice-adapter-protocol.md) before synthesis, provider configuration, or recovery. `prepare` only normalizes text; it is not narration generation. `fixture-tts` is test-only and cannot satisfy real-audio evidence. Network calls need `--allow-network`; paid or unknown-cost adapters additionally need `--authorize-provider-cost`. Reuse hash-verified cue cache and use `narration recover` after interruption instead of resubmitting completed cues.

Real measured narration timing is the only final animation clock. Use deterministic paused timelines, local assets, fixed viewBoxes, and explicit cue anchors. Never use runtime randomness, remote assets, wall-clock timers, or estimated timings in a release render.

When changing the renderer or media toolchain in this repository, run `npm run smoke:render` so a real browser render, cover capture, audio mux, ffprobe inspection, and media audit exercise the integration path.

Generate a dedicated cover, not a random frame. The cover must state the exact topic and remain readable in a phone-size preview. Series/season/episode labels are preset rules, not core-package branding.

## QC and release boundary

Read [release-qc-and-publishing.md](references/release-qc-and-publishing.md) before calling a candidate complete.

```powershell
explainer-video-skill audit <project-dir> --json
explainer-video-skill package <project-dir> --json
```

Automated checks must include full decode, media specifications, black/freeze/silence diagnostics, representative frames, warning frames, overflow/layout inspection, cover preview, and artifact hashes. Automation may only write `release_candidate_pending_human_listen`.

Complete three human passes on the exact hashed candidate: muted visual, audio-only, and normal watch. Record title/narration/caption/focus mismatches, clipping, unreadable text, accidental symbol speech, timing drift, dead motion, repeated composition, dirty transitions, and mixing defects with timestamps.

Only after a named reviewer listened to the whole hashed candidate may the Agent run:

```powershell
explainer-video-skill release record-human-decision <project-dir> --decision passed --actor "<reviewer>" --complete-listen --listened-sha256 "<sha256>" --json
```

Never infer `passed` from a render, a provider success, green tests, or file presence.

## Extensions, presets, and portability

Read [extension-api.md](references/extension-api.md) before adding a visual, voice, research, QC, or publishing profile. Extensions are declarative, permission-listed, hash-locked, and cannot run arbitrary hooks. Executable voice adapters belong to the reviewed runtime or an explicitly hash-trusted host command; selecting a voice extension never grants process, network, credential, or payment authority. `general-mechanism` is domain-neutral; topic-specific behavior belongs in an explicit preset such as the included `ai-principle-series` example.

Read [install-and-portability.md](references/install-and-portability.md) for npm, Codex, other Agent hosts, migration, update, rollback, and asset-license rules.

## Stop conditions

Stop and report the exact blocker when facts are unverified, the topic promise is broader than the explanation, canonical narration is not fixed, real audio timing is missing, title/card/narration/focus diverge, text clips or overflows, the selected template does not express the mechanism, media decode fails, licensed assets are unresolved, or human review is incomplete.
