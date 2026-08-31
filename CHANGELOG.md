# Changelog

All notable changes are documented here.

## [2.2.1] - 2026-08-31

### Fixed

- Resolved npm tarball and Python wheel names from `package.json` in CI instead of pinning a previous release number.
- Raised the freeze diagnostic window from 1.5 to 2.5 seconds so deliberate low-motion explanatory scenes are not rejected while sustained frozen output still fails automated QC.

### Release integrity

- Supersedes 2.2.0 as the recommended installation because the original 2.2.0 GitHub CI run exposed the two cross-platform release issues above.

## [2.2.0] - 2026-08-31

### Fixed

- Connected the topic Visual DSL to each selected template's native DOM and motion grammar instead of applying only template colors to generic cards.
- Made Spatial Chamber animate every signal path and signal dot, not only the first route.
- Routed connectors between node boundaries and added arrow markers so relation lines no longer cross the center of text cards by default.
- Applied semantic visual states for success, warning, danger, input, controller, and metric roles.
- Built covers from the first completed topic scene instead of a hard-coded generic flow.
- Normalized muxed narration to approximately -16 LUFS and isolated temporary browser profiles outside project output.
- Tuned black-frame detection for intentionally dark templates while retaining a strict near-black frame threshold.
- Hid connector routes, signal dots, and endpoint markers until their cue-bound draw action begins; endpoint arrows appear only when the route is complete.
- Prevented later exit, move, focus, and pulse actions from overriding an element before their scheduled start.

### Added

- Static visual-program guards for caption-safe-area intrusion, unreadably small frames, missing cue actions, disconnected spatial mechanisms, and connectors without timed drawing.
- Stable mechanism IDs and cue-level `mechanismRefs`, with narration coverage validation for core mechanism objects and at least one boundary or failure condition.
- Cue-by-cue canonical/caption/TTS identity checks and a 2.2-second minimum average cue duration.
- Automated native-template fingerprint checks, topic-cover checks, one representative image per narration cue, and denser short/long contact sheets.
- A topic-specific real-render smoke fixture that exercises semantic states, multiple routes, native Spatial Chamber structure, cover capture, audio mux, and media audit.

### Release boundary

- Structural and media QC prevent known generic-scaffold regressions, but they do not establish factual accuracy, teaching quality, pronunciation quality, or human release approval.

## [2.1.0] - 2026-08-31

### Added

- A bounded `visual-program.json` DSL for topic-specific nodes, text, shapes, connectors, assets, annotations, layouts, and cue-relative actions.
- Deterministic visual-program compilation into escaped DOM/SVG under Paper Theatre, Spatial Chamber, and Ink Explainer.
- `visual validate`, `visual compile`, and `visual preview` CLI commands.
- Executable `edge-tts`, deterministic test-fixture, and hash-trusted host-command voice adapters.
- Per-cue audio normalization, silence trimming, ffprobe measurement, deterministic gaps, cache hashing, and selective recovery.
- `narration adapters`, `narration doctor`, `narration synthesize`, and `narration recover` CLI commands.
- Topic-specific visual programs for the credit-card-clearing and quantum-tunneling fixtures.

### Security and compatibility

- Uncached network synthesis requires explicit network authorization; paid or unknown-cost adapters require separate cost authorization.
- Host commands require an explicit executable SHA-256, versioned request/response protocol, and confined output.
- Declarative Extension API v1 remains non-executable.
- New projects use project schema 2 and require a valid visual program at the scene-design gate; schema-1 projects without that file retain the v2.0 renderer fallback.
- Synthetic fixture audio is marked test-only and cannot satisfy the production real-audio gate.

### Release boundary

- Topic compilation and provider success are not pedagogical or release approval. Automated evidence still stops at `release_candidate_pending_human_listen`.

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
