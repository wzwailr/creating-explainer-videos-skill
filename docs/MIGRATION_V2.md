# Migrating from v1 to v2

v2 changes the product identity from an AI-series-specific Skill to a generic explainer-video production scaffold.

| v1 | v2 |
| --- | --- |
| npm package `creating-ai-principle-videos-skill` | `creating-explainer-videos-skill` |
| Skill `creating-ai-principle-videos` | `creating-explainer-videos` |
| CLI `ai-principle-video-skill` | primary `explainer-video-skill`; old alias retained |
| research `ai-primary-research` | `primary-source-research`; old ID resolves as alias |
| A/C visual labels | named template collection with Paper Theatre, Spatial Chamber, Ink Explainer |
| Markdown/Python episode scaffold | executable JSON-first state machine and Node.js runtime |

## Upgrade

```powershell
npm install --global creating-explainer-videos-skill@2
explainer-video-skill install --target codex --json
```

If the installer finds `creating-ai-principle-videos`, it moves it to a timestamped recoverable backup before installing `creating-explainer-videos`. It does not silently rewrite existing episode projects.

Existing v1 projects should remain on their locked extension snapshots. Create a v2 project, then deliberately port the brief, evidence, canonical narration, real timing, and scene contracts. Do not copy an old generated renderer and assume it satisfies the v2 state or QC gates.

## v2.0 to v2.1 projects

v2.1 new projects use project schema 2 and add `visual-program.json`. Existing schema-1 projects without that file continue to build with the v2.0 generic renderer. To adopt topic compilation, create a complete visual program with one matching scene per `scene-spec.json` scene, then run `visual validate`, `visual compile`, and `build`.

Existing external narration masters and measured timing remain valid. To adopt executable synthesis, keep the canonical narration, run `narration doctor`, then explicitly authorize the selected adapter. The fixture adapter is test-only; it cannot migrate or replace real narration evidence.

## v2.1 to v2.2 projects

v2.2 connects the Visual DSL to template-native structure and adds stricter production gates. Existing completed renders are not rewritten. Rebuilding a schema-2 project may expose missing information that v2.1 accepted:

- assign a stable `id` to every mechanism-map input, internal change, output, boundary, failure, and worked example;
- add `mechanismRefs` to every canonical narration cue and cover all core mechanism IDs plus at least one boundary or failure;
- keep canonical, caption, and TTS text identical for each cue;
- keep average cue duration at or above 2.2 seconds;
- keep text-bearing elements above the caption-safe boundary and at least 140 by 64 encoded pixels;
- give every cue a visual action; Spatial Chamber scenes with multiple mechanism objects require a connector, and each connector requires a cue-bound `draw` action.

After migration, run `visual validate`, `build`, `render`, `cover`, `mux`, and `audit` again. Review `qc/frames/` cue by cue and the contact sheet before recording human approval. A previous v2.1 automated-QC result does not satisfy the new native-template checks.

The AI-series workflow remains available as the `ai-principle-series` example preset. It no longer defines package branding or core defaults.
