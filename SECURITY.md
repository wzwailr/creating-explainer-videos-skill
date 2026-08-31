# Security policy

## Supported version

Security fixes target the latest major release. v1 is retained as a legacy release; upgrade to v2 for current fixes.

## Reporting

Do not post credentials, tokens, private media, paid-provider task IDs, or personal filesystem paths in a public issue. Create a minimal non-sensitive report and request a private follow-up when sensitive evidence is unavoidable.

## Trust boundaries

- Extension API v1 is declarative, permission-listed, path-contained, and rejects executable hooks.
- Skill installation verifies a SHA-256 package manifest before copying files.
- Update, rollback, and uninstall target one exact Skill directory and preserve recoverable backups.
- CLI process execution uses argument arrays; it does not build shell commands from project text.
- Visual programs are bounded data: raw HTML/JavaScript, remote assets, traversal, invalid geometry, and cross-scene references are rejected before compilation.
- Executable voice adapters live in the reviewed runtime or an explicitly configured host command whose executable SHA-256 is verified before use.
- Host voice-adapter requests and outputs remain under the project `.publish/narration` boundary; malformed responses and path escape are rejected.
- Uncached network synthesis requires explicit network authorization, and paid or unknown-cost synthesis requires separate provider-cost authorization.
- Provider credentials and paid-execution authorization remain outside the package and generated projects.
- Automated QC cannot create a human `passed` decision.
- Published archives must exclude tokens, personal absolute paths, cache files, generated media, font binaries, and premium plugin binaries.
