# Contributing

Contributions are welcome when they preserve the executable production contract, portability, and release truthfulness.

## Required rules

1. Keep the core package domain-neutral; domain or series behavior belongs in a named preset/example.
2. Do not add credentials, paid-provider authorization, personal paths, font binaries, premium GSAP binaries, music, or media files.
3. Keep Extension API v1 declarative. `hooks`, `scripts`, and `postinstall` are forbidden.
4. A new visual template needs a unique DOM/motion fingerprint, semantic primitives, fallback implementation, cover grammar, QC rules, and fixtures. A recolor is not a template.
5. Preserve canonical narration/caption identity, real timing, deterministic seek, and the human release boundary.
6. Add a failing test before changing behavior and keep changes scoped.

## Validation

```powershell
npm test
npm run smoke:render
npm run examples:verify
$env:PYTHONUTF8='1'
python skill\creating-explainer-videos\scripts\test_skill.py
python skill\creating-explainer-videos\scripts\test_extensions.py
npm run build
npm run pack:local
npm run smoke:packed -- .\dist\creating-explainer-videos-skill-2.0.1.tgz
```

Run the clean ZIP build on Windows when changing the portable Skill payload. Review `npm pack --dry-run --json` and the unpacked tarball before a release.
