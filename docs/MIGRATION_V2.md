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

The AI-series workflow remains available as the `ai-principle-series` example preset. It no longer defines package branding or core defaults.
