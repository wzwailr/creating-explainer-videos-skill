# AI Principle Explainer Video Skill

A product-neutral Agent Skill for producing rigorous Chinese AI-principle explainer videos.

It connects primary-source research, mechanism-first scripts, narration-identical captions, real-audio timing, semantic motion, dedicated covers, release QC, and publishing assets into one verifiable workflow.

## Install from GitHub

Codex:

```powershell
npx --yes --package github:wzwailr/creating-ai-principle-videos-skill `
  ai-principle-video-skill install
```

Any folder-based Agent Skill host:

```powershell
npx --yes --package github:wzwailr/creating-ai-principle-videos-skill `
  ai-principle-video-skill install --destination "C:\path\to\agent\skills"
```

The installer supports install, update, integrity verification, rollback, extension discovery, and recoverable uninstall.

## Extension API

Five declarative extension types are supported: visual, voice, research, QC, and publishing. Extensions cannot execute hooks or store credentials. Episode scaffolds snapshot and hash every selected extension.

See the [Chinese README](README.md), [extension contract](skill/creating-ai-principle-videos/references/extension-api.md), and [release notes](CHANGELOG.md).

## License boundary

Original code and documentation are MIT licensed. Fonts, GSAP binaries/plugins, music, sound effects, and third-party media are intentionally excluded.
