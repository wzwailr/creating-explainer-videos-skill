# PyPI Distribution Design

## Goal

Publish `creating-explainer-videos-skill` as a real Python distribution without weakening the existing npm package or duplicating the maintained Skill and template assets.

## User Experience

- Install with `pipx install creating-explainer-videos-skill` or `python -m pip install creating-explainer-videos-skill`.
- Run `explainer-video-skill --help` and `explainer-video-skill --version` without Node.js.
- Install, update, verify, roll back, uninstall, and list extensions through the Python CLI.
- Keep `ai-principle-video-skill` as a compatibility command.
- Delegate project creation, validation, rendering, and media commands to the bundled JavaScript runtime, with a clear Node.js 18+ diagnostic when Node is unavailable.

## Architecture

The Python package is an additional distribution layer in the same repository. Hatchling builds a pure-Python wheel from `python_src/creating_explainer_videos_skill` and force-includes the canonical `skill/creating-explainer-videos` tree plus `skill-manifest.json` as package assets. This avoids a second maintained copy of the Skill, templates, extensions, and runtime.

The Python installer mirrors the safety properties of the Node installer: validate before mutation, stage before replace, back up an existing installation, keep uninstall recoverable, reject path traversal in extension entrypoints, and verify every packaged file against the canonical manifest.

## Boundaries

- Python 3.9+ is required for the Python distribution.
- Node.js 18+ remains required for project and rendering commands because the canonical runtime, GSAP templates, and rendering toolchain are JavaScript-based.
- No credentials, `.npmrc`, `.pypirc`, fonts, media binaries, caches, or machine-specific paths may enter wheel or source distribution files.
- The npm tarball allowlist remains unchanged.
- PyPI publication uses the local credential only at upload time; it is never printed, committed, or copied into project files.

## Verification Gates

1. Python unit and integration tests pass.
2. Existing Node tests and Skill validators pass.
3. Wheel and sdist build successfully and pass `twine check`.
4. A clean virtual environment installs the exact wheel and exercises version, help, template listing, Skill installation, and verification.
5. The built archives pass a secret and portability audit.
6. After upload, a second clean environment installs the exact public PyPI version and repeats the smoke checks.
