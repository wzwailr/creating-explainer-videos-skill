# Installation and portability

The npm package contains one portable folder-based Agent Skill plus the executable scaffold CLI. The Skill works in Codex and any host that can load a `SKILL.md` directory; the CLI also works independently of an Agent host.

## npm and npx

Install the command globally:

```powershell
npm install --global creating-explainer-videos-skill@2
explainer-video-skill --version
```

Or run without a permanent global install:

```powershell
npx --yes --package creating-explainer-videos-skill@2 explainer-video-skill --version
```

Install the Skill into Codex:

```powershell
explainer-video-skill install --target codex --json
explainer-video-skill verify --target codex --json
```

Install it into another product or repository's skills root:

```powershell
explainer-video-skill install --destination "C:\path\to\skills" --json
explainer-video-skill verify --destination "C:\path\to\skills" --json
```

`--destination` is the parent skills directory. The installed folder is `creating-explainer-videos`.

## Upgrade, rollback, and uninstall

```powershell
explainer-video-skill update --destination "C:\path\to\skills" --json
explainer-video-skill rollback --destination "C:\path\to\skills" --json
explainer-video-skill uninstall --destination "C:\path\to\skills" --json
```

Updates are staged and validated before replacement. Existing installs move to a recoverable timestamped backup. A legacy `creating-ai-principle-videos` Skill is migrated into a recoverable backup; the old CLI name remains a deprecation alias for compatibility.

## Host validation

Run:

```powershell
explainer-video-skill doctor --json
explainer-video-skill templates list --json
explainer-video-skill list-extensions --destination "C:\path\to\skills" --json
```

`doctor` reports Node.js, npm, browser, FFmpeg, ffprobe, HyperFrames, GSAP capability/fallback status, fonts, and TTS configuration. Missing optional tools are not hidden. Paid TTS or generation providers remain unconfigured until the user supplies credentials and authorizes any cost.

## Asset boundaries

The package intentionally does not redistribute font binaries, premium GSAP plugins, music, sound effects, stock media, or provider credentials. Record every project asset's source, license, version, and hash. Keep tokens and personal absolute paths out of project files, logs, fixtures, manifests, archives, and publishing packages.

## Cross-platform notes

- Use argument arrays rather than shell-built command strings.
- Resolve npm/npx through the active Node installation on Windows when `.cmd` spawning is restricted.
- Use `NUL` on Windows and `/dev/null` on Unix only inside platform-aware adapters.
- Configure the browser path in `toolchain.json` when automatic discovery fails.
- Re-run deterministic seek, font load, full-decode, and packed-install smoke tests after Node, browser, FFmpeg, HyperFrames, or GSAP changes.
