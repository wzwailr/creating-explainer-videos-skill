# Explainer Video Skill

An installable, extensible, executable Agent Skill and project scaffold for mechanism, process, system, science, and technical explainer videos.

This is not a Markdown-only prompt pack. It ships a production state machine, JSON-first project generator, bounded topic visual DSL, executable voice adapters, narration caching and recovery, measured-audio timing, three programmable visual templates, deterministic HTML/SVG/GSAP rendering, HyperFrames/FFmpeg adapters, media QC, declarative extensions, release gates, and non-AI end-to-end fixtures.

It combines an executable production scaffold with default quality safeguards. Visual programs compile into each template's native structure, semantic roles receive distinguishable states, routed connectors meet node boundaries and show direction, covers reuse the actual topic scene, and automated QC inspects template structure plus representative narration-cue frames. Facts, asset licensing, pronunciation, and final release still require human verification.

## Install

Recommended isolated CLI installation:

```powershell
pipx install creating-explainer-videos-skill==2.2.1
explainer-video-skill --version
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
