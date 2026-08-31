# Changelog

All notable changes are documented here.

## [2.0.1] - 2026-08-31

### Fixed

- Raised the executable renderer requirement to Node.js 22+, matching HyperFrames 0.8.15.
- Made `doctor` distinguish an installed HyperFrames command from the pinned on-demand `npx` path without downloading packages during diagnosis.
- Added the required HyperFrames composition metadata, deterministic timeline registration, local CJK font declaration, caption identifiers, and safe SVG geometry to generated renderers.
- Waited for a non-empty browser cover screenshot instead of accepting an early successful process exit.
- Made short-video contact sheets produce and verify a real output file instead of recording a false pass.
- Pinned wheel and source-distribution core metadata to 2.4 so current Twine and registry tooling can validate the artifacts.

### Added

- A real Chrome + HyperFrames + FFmpeg + ffprobe render/mux/audit smoke test.
- A dedicated Linux CI job that exercises the real media pipeline rather than only mocked command adapters.
- Explicit documentation of the generic scaffold boundary and the Agent's responsibility for topic-specific visual authorship.

### Release integrity

- This release supersedes v2.0.0, whose tag predates later packaging fixes and whose Node.js 18 compatibility claim was incorrect for the pinned renderer.
- The generic renderer remains a runnable mechanism scaffold, not an automatic substitute for subject-specific visual direction or human release review.

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
- PyPI wheel/source distribution with a dependency-free Python lifecycle CLI, bundled canonical Skill assets, Node.js runtime delegation, archive security audit, and clean-environment smoke test.

### Security and licensing

- No font, premium GSAP, music, audio, image, or video binaries are redistributed.
- Automated QC cannot set `passed`; a named human must completely review the exact artifact hash.
- Package commands use argument arrays and keep provider credentials outside projects and logs.

## [1.1.0] - 2026-08-30

Legacy AI-series-specific first public release: portable installer, declarative extension API, integrity manifest, Ink/Paper profiles, episode scaffold, and release gates.
