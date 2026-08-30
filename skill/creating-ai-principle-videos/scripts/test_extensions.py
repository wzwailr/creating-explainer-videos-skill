#!/usr/bin/env python3
"""Test extension discovery and scaffold selection."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from extension_catalog import discover_extensions, load_extension
from validate_episode import Report, validate_extension_lock


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCAFFOLD = SKILL_ROOT / "scripts" / "scaffold_episode.py"


def main() -> int:
    catalog = discover_extensions(SKILL_ROOT)
    required = {
        "ink-explainer": "visual",
        "paper-theatre": "visual",
        "neutral-technical-zh": "voice",
        "ai-primary-research": "research",
        "strict-release-qc": "qc",
        "douyin-release": "publishing",
    }
    for extension_id, extension_type in required.items():
        extension = load_extension(SKILL_ROOT, extension_id, expected_type=extension_type)
        assert extension["type"] == extension_type
        assert catalog[extension_id]["valid"] is True

    with tempfile.TemporaryDirectory(prefix="ai-principle-video-extensions-") as temp:
        episode = Path(temp) / "episode"
        environment = os.environ.copy()
        environment["PYTHONUTF8"] = "1"
        result = subprocess.run(
            [
                sys.executable,
                str(SCAFFOLD),
                str(episode),
                "--season",
                "2",
                "--episode",
                "19",
                "--topic",
                "推荐系统",
                "--slug",
                "recommendation-system",
                "--previous",
                "AI 评测",
                "--next",
                "扩散模型",
                "--visual",
                "paper-theatre",
                "--voice",
                "neutral-technical-zh",
                "--research",
                "ai-primary-research",
                "--qc",
                "strict-release-qc",
                "--publishing",
                "douyin-release",
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=environment,
            check=False,
        )
        assert result.returncode == 0, result.stdout + result.stderr
        lock = json.loads((episode / "extensions.lock.json").read_text(encoding="utf-8"))
        assert lock["apiVersion"] == 1
        assert lock["selections"] == {
            "visual": "paper-theatre",
            "voice": "neutral-technical-zh",
            "research": "ai-primary-research",
            "qc": "strict-release-qc",
            "publishing": "douyin-release",
        }
        assert "--cream" in (episode / "assets" / "style-tokens.css").read_text(encoding="utf-8")
        assert (episode / "extensions" / "paper-theatre" / "profile.json").is_file()
        assert (episode / "extensions" / "neutral-technical-zh" / "reference.md").is_file()

        report = Report()
        config = json.loads((episode / "episode.json").read_text(encoding="utf-8"))
        validate_extension_lock(episode, config, report)
        assert not report.errors, "\n".join(report.errors)

        (episode / "extensions" / "paper-theatre" / "profile.json").write_text("{}\n", encoding="utf-8")
        tampered = Report()
        validate_extension_lock(episode, config, tampered)
        assert any("hash mismatch" in error for error in tampered.errors), tampered.errors

    print("PASS extension catalog discovers six profiles and scaffold locks selected extensions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
