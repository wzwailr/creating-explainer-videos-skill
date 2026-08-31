# Explainer Video Skill

An installable, extensible, executable Agent Skill and project scaffold for mechanism, process, system, science, and technical explainer videos.

This is not a Markdown-only prompt pack. It ships a production state machine, JSON-first project generator, narration normalization, measured-audio timing import, three programmable visual templates, deterministic HTML/SVG/GSAP rendering, HyperFrames/FFmpeg adapters, media QC, declarative extensions, release gates, and non-AI end-to-end fixtures.

It is an executable production scaffold, not a one-prompt high-fidelity video generator. The bundled renderer proves the timeline, media pipeline, and generic mechanism scene; a release-quality video still requires an Agent to author subject-specific SVG/DOM, motion, licensed assets, and narration.

## Install

Recommended isolated CLI installation:

```powershell
pipx install creating-explainer-videos-skill==2.0.1
explainer-video-skill --version
```

Or install into the current Python environment:

```powershell
python -m pip install creating-explainer-videos-skill==2.0.1
```

Python lifecycle commands work without Node.js. Project creation, template preview, rendering, and media commands execute the bundled canonical JavaScript runtime and require Node.js 22+.

The verified npm tarball is also available from the GitHub Release:

```powershell
npm install --global https://github.com/wzwailr/creating-explainer-videos-skill/releases/download/v2.0.1/creating-explainer-videos-skill-2.0.1.tgz
```

The GitHub Release tarball is the stable npm-form installation path. Before using the npm Registry, verify the public version with `npm view creating-explainer-videos-skill version`; documentation is not proof of Registry publication.

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

## Portable boundaries

The package does not redistribute fonts, premium GSAP plugins, music, sound effects, stock media, or credentials. DingTalk JinBuTi/DingTalk Sans and Noto Sans SC may be used when legally installed on the host. Paid or asynchronous providers require explicit authorization and task-ID recovery rules.

CI covers Node.js 22/24 and performs a real Linux + Chrome + FFmpeg render, cover capture, audio mux, ffprobe inspection, and media audit.

See the [Chinese README](README.md), [visual collection](skill/creating-explainer-videos/references/visual-template-collection.md), [extension API](skill/creating-explainer-videos/references/extension-api.md), [v2 migration](docs/MIGRATION_V2.md), and [release notes](docs/releases/v2.0.1.md).
