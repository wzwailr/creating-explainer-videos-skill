# Install and portability

## npm package model

The npm package is a product-neutral installer for a folder-based Agent Skill. Its payload is standard `SKILL.md`, `scripts/`, `references/`, `assets/`, and `extensions/`. `agents/openai.yaml` improves Codex discovery but is not required by the core workflow.

Install directly from the public GitHub repository without npm Registry publication:

```powershell
npx --yes --package github:wzwailr/creating-ai-principle-videos-skill `
  ai-principle-video-skill install
```

Install the same Skill into any Agent product, repository, or team skills directory:

```powershell
npx --yes --package github:wzwailr/creating-ai-principle-videos-skill `
  ai-principle-video-skill install --destination "C:\path\to\agent\skills"
```

`--destination` is the parent skills directory; the CLI appends `creating-ai-principle-videos`. This avoids binding the package to Codex, Claude Code, or any other single host.

Alternatively, use the verified tarball attached to a GitHub Release:

```powershell
npx --yes --package "D:\path\creating-ai-principle-videos-skill-1.1.0.tgz" `
  ai-principle-video-skill install --destination "C:\path\to\agent\skills"
```

Or install the CLI globally:

```powershell
npm install -g "D:\path\creating-ai-principle-videos-skill-1.1.0.tgz"
ai-principle-video-skill install --destination "C:\path\to\agent\skills"
```

Useful lifecycle commands:

```powershell
ai-principle-video-skill verify --destination "C:\path\to\agent\skills"
ai-principle-video-skill list-extensions --destination "C:\path\to\agent\skills"
ai-principle-video-skill update --destination "C:\path\to\agent\skills"
ai-principle-video-skill rollback --destination "C:\path\to\agent\skills"
ai-principle-video-skill uninstall --destination "C:\path\to\agent\skills"
ai-principle-video-skill doctor
```

The package verifies its SHA-256 file manifest before installation. Update and uninstall move the exact installed directory to a recoverable backup. `rollback` restores the newest compatible backup; pass `--backup <path>` to select a specific backup from the same target. These commands do not delete unrelated skills.

## Manual fallback

Copy the complete folder, without changing its directory name, to a host's skills root:

```text
<skills-root>/creating-ai-principle-videos/
```

For Codex, `<skills-root>` is normally `<CODEX_HOME>/skills`. Start a new host session after installation if its skill discovery is session-scoped.

Invoke explicitly:

```text
使用 $creating-ai-principle-videos 制作一集关于“主题”的 AI 底层原理图解视频。
```

The skill also supports implicit discovery from requests to make, redesign, render, audit, or package a Chinese AI-principle explainer video.

## Host prerequisites

Minimum for planning and contract validation:

- Python 3.10 or newer;
- UTF-8 mode on Windows when the host's Python defaults to GBK: `$env:PYTHONUTF8='1'`.

For programmable rendering and release QC:

- Node.js compatible with the chosen renderer;
- Chrome or Chromium;
- FFmpeg and FFprobe;
- a reproducible TTS engine;
- licensed local GSAP files and compatible plugins;
- installed licensed fonts or documented fallbacks.

HyperFrames 0.8.15 and GSAP 3.15.0 are known reference pins from the source workflow. A different version is allowed only after a small seek/render/plugin/font/full-decode regression.

## First-use smoke test

Run:

```powershell
$env:PYTHONUTF8='1'
python <skill-dir>\scripts\test_skill.py
```

Expected result:

```text
PASS scaffold fails safely, valid contract passes, mismatch/underscore guards fail correctly
```

Then scaffold an episode in a new empty folder and run `validate_episode.py --phase plan` after completing every plan document.

List and validate extension profiles separately:

```powershell
python <skill-dir>\scripts\test_extensions.py
ai-principle-video-skill list-extensions --destination "<skills-root>"
```

## Licensing boundary

This package intentionally excludes font binaries, GSAP binaries/plugins, music, sound effects, and third-party images. Copying the skill does not grant licenses to those assets. Record the source, license, version, and hash in each episode project.
