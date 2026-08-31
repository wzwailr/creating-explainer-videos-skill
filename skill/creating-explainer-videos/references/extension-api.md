# Declarative extension API

Extensions change one production dimension without modifying the core state machine. Supported types are `visual`, `voice`, `research`, `qc`, and `publishing`. Executable render and voice adapters remain part of the reviewed runtime or an explicitly hash-trusted host configuration; v1 extensions cannot run arbitrary code.

## Directory and manifest

```text
extensions/<extension-id>/
  extension.json
  reference.md
  profile.json
  assets/                 # optional, redistributable files only
```

```json
{
  "apiVersion": 1,
  "id": "primary-source-research",
  "type": "research",
  "version": "1.0.0",
  "displayName": "Primary-source research",
  "description": "Evidence rules for mechanism claims.",
  "entrypoints": {
    "reference": "reference.md",
    "profile": "profile.json",
    "assets": []
  },
  "capabilities": ["research.primary-sources"],
  "permissions": ["network:read"]
}
```

IDs use lowercase letters, digits, and hyphens. Versions use semantic versioning. All entrypoints must resolve inside the extension directory. `hooks`, `scripts`, and `postinstall` fields are rejected.

## Permission vocabulary

Permissions are declarative review signals, not automatic authority. Use the narrowest applicable values, for example:

- `network:read`
- `provider:tts`
- `filesystem:project-read`
- `filesystem:project-write`
- `process:ffmpeg`
- `process:ffprobe`

A host still enforces its own filesystem, network, credential, paid-provider, and destructive-action rules. An extension manifest cannot grant itself more authority.

## Immutable selection

When an extension is selected, record its ID, type, version, permissions, manifest SHA-256, and profile SHA-256 in `extensions.lock.json`. Copy or otherwise snapshot the selected declarative payload into the project. Existing projects must continue using their locked snapshot until an explicit upgrade command validates and records the change.

The legacy research ID `ai-primary-research` resolves to `primary-source-research`; do not create new projects with the legacy name.

## Add or revise an extension

1. Copy a same-type declarative extension.
2. Change ID, version, display name, capability list, permission list, guide, and profile.
3. Remove unlicensed binary assets. Reference host-installed fonts/providers instead.
4. Run `explainer-video-skill list-extensions --json`.
5. Test path traversal, missing entrypoints, permission syntax, manifest/profile hashes, install, update, and rollback.
6. For a visual extension, also implement and validate its executable template under `templates/<id>/`; a profile alone does not create motion.

A voice extension can select language, role, rate, pitch, pronunciation, and caption policy. It cannot name a command that the runtime executes. To add executable synthesis, implement a reviewed runtime adapter or configure the versioned [host voice-adapter protocol](voice-adapter-protocol.md) with an explicit executable SHA-256. Extension selection never counts as network or provider-cost authorization.

## Presets

Presets combine default extensions and content rules. They remain independent of visual templates: `general-mechanism` deliberately sets `template: null`, so the Agent chooses from the template collection based on knowledge structure. Domain- or series-specific terminology belongs only inside its named preset.
