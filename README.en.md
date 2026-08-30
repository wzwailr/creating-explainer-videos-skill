# Explainer Video Skill

An installable, extensible, executable Agent Skill and project scaffold for mechanism, process, system, science, and technical explainer videos.

This is not a Markdown-only prompt pack. It ships a production state machine, JSON-first project generator, narration normalization, measured-audio timing import, three programmable visual templates, deterministic HTML/SVG/GSAP rendering, HyperFrames/FFmpeg adapters, media QC, declarative extensions, release gates, and non-AI end-to-end fixtures.

## Install

```powershell
npx --yes --package creating-explainer-videos-skill@2 explainer-video-skill --version
npm install --global creating-explainer-videos-skill@2
```

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

See the [Chinese README](README.md), [visual collection](skill/creating-explainer-videos/references/visual-template-collection.md), [extension API](skill/creating-explainer-videos/references/extension-api.md), [v2 migration](docs/MIGRATION_V2.md), and [release notes](docs/releases/v2.0.0.md).
