# Security policy

## Supported version

Security fixes currently target the latest GitHub Release.

## Reporting

Do not post credentials, tokens, private media, or paid-provider task IDs in a public issue. Open a GitHub issue containing only a minimal non-sensitive reproduction and request a private follow-up when sensitive evidence is required.

## Trust boundary

- Extension API v1 is declarative and rejects executable hooks.
- Package installation verifies a SHA-256 manifest before copying files.
- Update, rollback, and uninstall operate on one exact Skill directory and keep recoverable backups.
- Provider credentials and paid execution authorization must remain outside the Skill.
