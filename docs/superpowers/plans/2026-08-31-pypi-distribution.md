# PyPI Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add, validate, and publish a Python distribution that installs the complete explainer-video Skill and exposes the existing command surface.

**Architecture:** A dependency-free Python installer owns filesystem-safe Skill lifecycle commands. Project and render commands execute the canonical bundled JavaScript runtime after checking Node.js 18+, while Hatchling includes the canonical Skill tree directly in the wheel so assets have one source of truth.

**Tech Stack:** Python 3.9+, standard library, Hatchling, unittest, Node.js 18+, Twine

**Spec:** `docs/superpowers/specs/2026-08-31-pypi-distribution-design.md`

## Global Constraints

- Package and command identity remain `creating-explainer-videos-skill` and `explainer-video-skill` at version `2.0.0`.
- The Python distribution contains the canonical Skill, template collection, extensions, presets, runtime, scripts, and manifest.
- Python lifecycle commands work without Node.js; project and rendering commands require Node.js 18+.
- Publication credentials must never be printed, copied into the repository, or included in an archive.
- Existing npm behavior and its package file allowlist remain unchanged.

---

### Task 1: Python CLI and packaged-resource contract

**Files:**
- Create: `python_tests/test_cli.py`
- Create: `python_src/creating_explainer_videos_skill/__init__.py`
- Create: `python_src/creating_explainer_videos_skill/__main__.py`
- Create: `python_src/creating_explainer_videos_skill/cli.py`
- Create: `python_src/creating_explainer_videos_skill/resources.py`

**Interfaces:**
- Produces: `main(argv: Sequence[str] | None) -> int`, `package_paths() -> PackagePaths`, and the two console entrypoints.
- Consumes: canonical Skill files from the repository in source mode and bundled `assets/` in an installed wheel.

- [x] **Step 1: Write failing CLI tests**

```python
def test_version_works_without_node(self):
    result = run_cli("--version", env={"PATH": ""})
    self.assertEqual(result.returncode, 0)
    self.assertEqual(result.stdout.strip(), "2.0.0")

def test_project_command_reports_node_18_requirement(self):
    result = run_cli("templates", "list", env={"PATH": ""})
    self.assertNotEqual(result.returncode, 0)
    self.assertIn("Node.js 18+", result.stderr)
```

- [x] **Step 2: Run `py -m unittest python_tests.test_cli -v` and confirm failure because the package does not exist.**
- [x] **Step 3: Implement version/help handling, packaged-resource discovery, and Node command delegation.**
- [x] **Step 4: Re-run the focused test and confirm it passes.**

### Task 2: Safe Python Skill lifecycle

**Files:**
- Create: `python_tests/test_installer.py`
- Create: `python_src/creating_explainer_videos_skill/installer.py`
- Create: `python_src/creating_explainer_videos_skill/integrity.py`
- Modify: `python_src/creating_explainer_videos_skill/cli.py`

**Interfaces:**
- Produces: `install_skill`, `verify_installed_skill`, `rollback_skill`, `uninstall_skill`, and `discover_extensions`.
- Consumes: `PackagePaths.skill_root` and `PackagePaths.manifest_path` from Task 1.

- [x] **Step 1: Write failing integration tests for install, update backup, manifest tampering, rollback, uninstall recovery, custom destinations, and extension traversal.**
- [x] **Step 2: Run `py -m unittest python_tests.test_installer -v` and confirm failures name missing lifecycle behavior.**
- [x] **Step 3: Implement staged copies, manifest verification, extension validation, recoverable backups, and JSON output.**
- [x] **Step 4: Re-run both Python test modules and confirm they pass.**

### Task 3: Build metadata and archive smoke test

**Files:**
- Create: `pyproject.toml`
- Create: `scripts/smoke_pypi_package.py`
- Create: `scripts/audit_python_dist.py`
- Create: `python_tests/__init__.py`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `dist/*.whl`, `dist/*.tar.gz`, and deterministic archive audit/smoke commands.
- Consumes: Python package and canonical Skill tree from Tasks 1-2.

- [x] **Step 1: Write the smoke script expectations for wheel installation, both CLI names, templates, Skill installation, and verification.**
- [x] **Step 2: Run the build before metadata exists and confirm it fails for the expected missing configuration.**
- [x] **Step 3: Add Hatchling metadata, console scripts, force-included assets, and archive auditing.**
- [x] **Step 4: Build wheel/sdist in an isolated environment, run `twine check`, audit both archives, and run the exact-wheel smoke test.**

### Task 4: Documentation, release evidence, and publication

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/releases/v2.0.0.md`
- Modify: `docs/superpowers/plans/2026-08-31-pypi-distribution.md`

**Interfaces:**
- Produces: verified install instructions and public registry evidence.
- Consumes: exact built archives and local PyPI credential.

- [x] **Step 1: Document `pipx`/`pip` installation, Node.js boundary, dual-registry identity, and public verification commands.**
- [x] **Step 2: Run all Python tests, existing Node tests, Skill validators, build, `twine check`, archive audit, and clean-wheel smoke test.**
- [x] **Step 3: Upload only the verified wheel and source distribution to production PyPI without exposing the token.**
- [x] **Step 4: Install `creating-explainer-videos-skill==2.0.0` from public PyPI in a fresh environment and repeat the smoke checks.**
- [x] **Step 5: Commit and push the verified source changes, then update the GitHub repository homepage/release links if publication succeeds.**
