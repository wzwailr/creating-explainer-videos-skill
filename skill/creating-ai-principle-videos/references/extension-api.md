# Extension API v1

Extensions add selectable production profiles without rewriting the core Skill. Version 1 is declarative: it allows references, JSON profiles, and output assets, but never executable hooks.

## Directory contract

```text
extensions/<extension-id>/
  extension.json
  profile.json
  reference.md
  assets/                 # optional files declared in the manifest
```

`extension.json`:

```json
{
  "apiVersion": 1,
  "id": "ink-explainer",
  "type": "visual",
  "version": "1.0.0",
  "displayName": "C · Ink Explainer",
  "description": "Hand-drawn mechanism explanation profile.",
  "entrypoints": {
    "reference": "reference.md",
    "profile": "profile.json",
    "assets": ["assets/style-tokens.css"]
  },
  "capabilities": ["visual.tokens", "visual.motion"]
}
```

Allowed types: `visual`, `voice`, `research`, `qc`, `publishing`. IDs use lowercase letters, digits, and hyphens. Versions use semantic version format. Every declared file must remain inside its extension directory.

## Type profiles

| Type | Profile purpose | Typical fields |
| --- | --- | --- |
| visual | composition and semantic motion language | `style`, `styleName`, `tokenAsset`, `motionPlugins`, `coverGrammar` |
| voice | TTS role and pronunciation policy | `providerClass`, `language`, `voiceId`, `rate`, `pitch`, `pronunciationPolicy` |
| research | evidence acquisition and fact boundaries | `sourcePriority`, `evidenceFields`, `communityRole`, `currentVerification` |
| qc | media and human release gates | `freezeSeconds`, `durationToleranceSeconds`, `requiredHumanPasses` |
| publishing | platform title, cover, and copy contract | `platform`, `titlePattern`, `coverRules`, `deliverables` |

Profiles must not contain credentials. A voice profile may name a provider class or configurable voice ID, but API keys and paid authorization remain outside the Skill.

## Add an extension

1. Copy an existing extension of the same type to a new ID.
2. Replace its manifest, profile, reference, and assets.
3. Keep the extension declarative; `hooks`, `scripts`, and `postinstall` are rejected.
4. Run:

```powershell
python <skill-dir>\scripts\test_extensions.py
ai-principle-video-skill list-extensions
```

5. Scaffold a disposable episode selecting the new extension and inspect `extensions.lock.json` plus the copied snapshot.

Each episode locks extension IDs and versions and copies selected profiles into its own directory. Later Skill upgrades therefore do not silently change an existing episode.

