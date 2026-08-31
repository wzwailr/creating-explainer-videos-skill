# Explainer Video Skill

<p align="center">
  <strong>Help an Agent explain knowledge through motion instead of pouring text into a template.</strong><br>
  From an exact question to a narration-synchronized MP4 — executable, traceable, and reviewable.
</p>

<p align="center">
  <a href="https://github.com/wzwailr/creating-explainer-videos-skill/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/wzwailr/creating-explainer-videos-skill/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://pypi.org/project/creating-explainer-videos-skill/"><img alt="PyPI" src="https://img.shields.io/pypi/v/creating-explainer-videos-skill"></a>
  <a href="https://github.com/wzwailr/creating-explainer-videos-skill/releases"><img alt="Release" src="https://img.shields.io/github/v/release/wzwailr/creating-explainer-videos-skill"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
</p>

![Actual generated explainer-video frame showing dispatch, compute, and merge in a mixture-of-experts route](https://raw.githubusercontent.com/wzwailr/creating-explainer-videos-skill/main/docs/assets/showcase/hero-s02e16-moe-dispatch.webp)

<p align="center"><sub>Actual project output · S02E16 “MoE expert routing” · Ink Explainer</sub></p>

Give an Agent an exact question and it can advance through evidence, mechanism mapping, canonical narration and captions, semantic animation, rendering, QC, and publishing materials using an executable state machine. The scaffold is domain-neutral: mechanisms, processes, systems, science, and technical education are all first-class uses.

| Production capability | Default safeguard |
| --- | --- |
| Create a runnable video project from a topic | A JSON-first state machine exposes the next action, evidence, and stop condition |
| Make motion explain the current narration | A bounded visual DSL compiles cue actions into template-native structures and routes |
| Keep captions, TTS, and animation synchronized | One canonical string, measured audio timing, and deterministic timelines |
| Avoid treating “it rendered” as “it is ready” | Layout, media, template-structure, and human watch-and-listen gates |
| Adapt the pipeline without forking the core | Pluggable visual, voice, research, QC, and publishing profiles |

This is not a Markdown-only prompt pack. It ships a CLI, project generator, production state machine, topic visual compiler, executable voice adapters and recovery cache, deterministic HTML/SVG/GSAP rendering, HyperFrames/FFmpeg integration, three visual templates, media QC, extension APIs, packaging tools, and non-AI end-to-end fixtures.

[中文说明](README.md) · [Quick start](#quick-start) · [Actual output](#actual-generated-output) · [Visual templates](#visual-template-collection) · [v2 migration](docs/MIGRATION_V2.md) · [Visual DSL](skill/creating-explainer-videos/references/visual-program-dsl.md) · [Extension API](skill/creating-explainer-videos/references/extension-api.md)

## Quick start

Recommended isolated CLI installation:

```powershell
pipx install creating-explainer-videos-skill==2.2.1
explainer-video-skill --version
explainer-video-skill install --target codex --json
explainer-video-skill doctor --json
```

Or install into the current Python environment:

```powershell
python -m pip install creating-explainer-videos-skill==2.2.1
```

Python lifecycle commands work without Node.js. Project creation, template preview, rendering, and media commands execute the bundled canonical JavaScript runtime and require Node.js 22+.

Install the npm package from the public Registry:

```powershell
npm install --global creating-explainer-videos-skill@2.2.1
```

The GitHub Release also provides the audited tarball built from the same tag. Verify the live Registry version with `npm view creating-explainer-videos-skill version --registry=https://registry.npmjs.org/`.

Install the Skill into Codex or another folder-based Agent host:

```powershell
explainer-video-skill install --target codex --json
explainer-video-skill install --destination "C:\path\to\skills" --json
```

## Create a project

```powershell
explainer-video-skill doctor --json
explainer-video-skill new ".\demo" --title "Credit-card clearing" --topic "Why authorization is not settlement" --template spatial-chamber --preset general-mechanism --json
explainer-video-skill status --json ".\demo"
explainer-video-skill next --json ".\demo"
```

Agents advance through `status -> next -> real work -> evidence -> validate`. The production stages cover brief, evidence, mechanism mapping, canonical narration/cues, measured audio timing, scene design, renderer, media render, automated QC, human listening, publishing package, and explicit human release decision.

Automation cannot approve a release. It can only produce `release_candidate_pending_human_listen`; `passed` requires a named human who reviewed the exact artifact hash.

## Actual generated output

These frames come from real episode 16–18 video projects, not concept art or generative-video mockups. They demonstrate the same path from knowledge objects to narration cues, semantic actions, and deterministic rendering. The included AI-series preset is one example use of the domain-neutral core.

| S02E17 · Worked Softmax | S02E18 · Online feedback loop |
| --- | --- |
| ![Actual generated frame explaining a worked Softmax distribution](https://raw.githubusercontent.com/wzwailr/creating-explainer-videos-skill/main/docs/assets/showcase/s02e17-softmax-explanation.webp) | ![Actual generated frame explaining an online feedback loop](https://raw.githubusercontent.com/wzwailr/creating-explainer-videos-skill/main/docs/assets/showcase/s02e18-online-feedback.webp) |
| Probabilities, candidate distribution, and the failure source remain visible in one explanation scene. | Offline evaluation, limited traffic, and feedback return form a visible operational loop. |

These images demonstrate actual visual output; they do not replace the complete human watch-and-listen release decision for the corresponding videos.

## Visual template collection

- `paper-theatre`: object identity, evidence, sorting, comparison, and physical processing.
- `spatial-chamber`: routes, layers, pipelines, networks, queues, and spatial state transitions.
- `ink-explainer`: derivations, formulas, causal relations, comparison, annotation, and correction.

The templates have distinct DOM and motion fingerprints, cover grammars, plugin fallbacks, and measurable QC rules. They are not lettered recolors.

Topic knowledge is compiled from `visual-program.json`, not hidden in generated HTML:

```powershell
explainer-video-skill visual validate ".\demo" --json
explainer-video-skill visual compile ".\demo" --json
explainer-video-skill visual preview ".\demo" --output ".\preview.html" --json
```

The bounded schema supports groups, text, nodes, shapes, connectors, licensed local assets, annotations, normalized geometry, and cue-relative actions. Its compiler maps generic semantics to template-native DOM and motion grammar, uses roles or explicit `tone` values for success, warning, failure, input, and controller states, and routes directed connectors between node boundaries. It rejects scripts, remote resources, traversal, bad references, caption-safe-area intrusion, unreadably small frames, uncovered cues, and structurally disconnected spatial scenes before build. Schema-1 projects without a visual program retain the v2.0 fallback, which is not a finished topic scene.

## Narration adapters

```powershell
explainer-video-skill narration adapters --json
python -m pip install edge-tts
explainer-video-skill narration doctor ".\demo" --adapter edge-tts --json
explainer-video-skill narration synthesize ".\demo" --adapter edge-tts --voice zh-CN-YunxiNeural --allow-network --json
explainer-video-skill narration recover ".\demo" --adapter edge-tts --voice zh-CN-YunxiNeural --allow-network --json
```

The runtime synthesizes and verifies each cue, normalizes audio with FFmpeg, measures it with ffprobe, writes the narration master, and rebuilds caption-identical cue timing. Canonical, caption, and TTS text must match cue by cue, mechanism references must cover the core explanation objects, and average cue duration must be at least 2.2 seconds. Hash-valid cues are reused; recovery regenerates only invalid inputs. Network and provider-cost permissions are explicit. The local fixture adapter is test-only and cannot satisfy the production audio gate.

Media audit verifies native template fingerprints, motion selectors, connector animation, and topic-derived cover markup. It extracts representative frames for every narration cue, builds 6-frame short-film or 12-frame long-film contact sheets, and normalizes the final narration track to approximately -16 LUFS. Automated checks still cannot substitute for a complete human watch-and-listen review.

## Portable boundaries

The package does not redistribute fonts, premium GSAP plugins, music, sound effects, stock media, or credentials. DingTalk JinBuTi/DingTalk Sans and Noto Sans SC may be used when legally installed on the host. Paid or asynchronous providers require explicit authorization and task-ID recovery rules.

CI covers Node.js 22/24 and performs a real Linux + Chrome + FFmpeg render, cover capture, audio mux, ffprobe inspection, and media audit.

See the [Chinese README](README.md), [visual DSL](skill/creating-explainer-videos/references/visual-program-dsl.md), [voice adapter protocol](skill/creating-explainer-videos/references/voice-adapter-protocol.md), [visual collection](skill/creating-explainer-videos/references/visual-template-collection.md), [extension API](skill/creating-explainer-videos/references/extension-api.md), [v2 migration](docs/MIGRATION_V2.md), and [release notes](docs/releases/v2.2.1.md).
