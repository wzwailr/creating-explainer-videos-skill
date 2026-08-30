#!/usr/bin/env python3
"""Self-test the generic declarative extension collection."""

from __future__ import annotations

from pathlib import Path

from extension_catalog import (
    discover_extensions,
    extension_lock_entry,
    load_extension,
    resolve_extension_alias,
)


SKILL_ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    catalog = discover_extensions(SKILL_ROOT)
    required = {
        "ink-explainer": "visual",
        "paper-theatre": "visual",
        "spatial-chamber": "visual",
        "neutral-technical-zh": "voice",
        "primary-source-research": "research",
        "strict-release-qc": "qc",
        "douyin-release": "publishing",
    }
    assert set(catalog) == set(required), sorted(catalog)
    for extension_id, extension_type in required.items():
        extension = load_extension(SKILL_ROOT, extension_id, expected_type=extension_type)
        assert extension["valid"] is True, extension["errors"]
        assert isinstance(extension["permissions"], list)
        lock = extension_lock_entry(extension)
        assert len(lock["manifestSha256"]) == 64
        assert len(lock["profileSha256"]) == 64

    assert resolve_extension_alias("ai-primary-research") == "primary-source-research"
    assert load_extension(SKILL_ROOT, "ai-primary-research", "research")["id"] == "primary-source-research"
    print("PASS seven generic extensions, three visual profiles, permissions, aliases, and hashes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
