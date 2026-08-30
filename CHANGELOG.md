# Changelog

All notable changes are documented here.

## [2.0.0] - 2026-08-31

### Changed

- Renamed the product from an AI-series-specific Skill to the domain-neutral `creating-explainer-videos-skill` package and `creating-explainer-videos` Skill.
- Promoted `explainer-video-skill` to the primary CLI; kept `ai-principle-video-skill` as a deprecated compatibility alias.
- Moved series-specific defaults into the isolated `ai-principle-series` example preset.

### Added

- Executable production state machine and JSON-first project lifecycle commands.
- Runnable renderer and dedicated cover generated for every new project.
- Canonical narration normalization, escaped/snake-case underscore guard, caption/TTS identity, and measured timing import.
- Deterministic render, mux, ffprobe/FFmpeg audit, artifact hashing, packaging, and human-release decision boundary.
- Three-template visual collection: Paper Theatre, Spatial Chamber, and Ink Explainer.
- Spatial Chamber depth/path grammar, licensed-plugin fallbacks, and QC limits derived from the former B visual direction.
- Declarative presets, permission-listed extensions, immutable hash metadata, and legacy research ID alias.
- Credit-card clearing and quantum-tunneling non-AI fixtures.
- Windows/Linux and Node.js 18/22 CI plus packed npx/global install smoke tests.

### Security and licensing

- No font, premium GSAP, music, audio, image, or video binaries are redistributed.
- Automated QC cannot set `passed`; a named human must completely review the exact artifact hash.
- Package commands use argument arrays and keep provider credentials outside projects and logs.

## [1.1.0] - 2026-08-30

Legacy AI-series-specific first public release: portable installer, declarative extension API, integrity manifest, Ink/Paper profiles, episode scaffold, and release gates.
