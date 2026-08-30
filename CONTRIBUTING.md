# Contributing

Contributions are welcome when they preserve the production contract and remain portable.

## Before opening a pull request

1. Keep the core Skill product-neutral. Host-specific discovery metadata must remain optional.
2. Do not add credentials, paid-provider authorization, font binaries, GSAP binaries, music, or media files.
3. Keep extensions declarative. Extension API v1 rejects `hooks`, `scripts`, and `postinstall`.
4. Add or update tests before production behavior changes.
5. Run:

```powershell
npm test
$env:PYTHONDONTWRITEBYTECODE='1'
python skill\creating-ai-principle-videos\scripts\test_skill.py
python skill\creating-ai-principle-videos\scripts\test_extensions.py
npm run build
```

## Adding an extension

Copy an existing extension of the same type, assign a new lowercase hyphenated ID and semantic version, update `extension.json`, `profile.json`, and `reference.md`, then scaffold a disposable episode and inspect `extensions.lock.json`.

New visual profiles must define their own semantic-motion language, typography roles, cover grammar, and style tokens. They must not be simple recolors of an existing template.
