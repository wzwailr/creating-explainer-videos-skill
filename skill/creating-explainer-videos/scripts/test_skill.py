#!/usr/bin/env python3
"""Black-box self-test for the portable generic Skill runtime."""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
CLI = SKILL_ROOT / "scripts" / "explainer-video.mjs"


def run(arguments: list[str], expected: int = 0) -> dict:
    environment = os.environ.copy()
    environment["PYTHONUTF8"] = "1"
    result = subprocess.run(
        ["node", str(CLI), *arguments],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=environment,
        check=False,
    )
    if result.returncode != expected:
        raise AssertionError(f"command failed ({result.returncode}): {result.stdout}\n{result.stderr}")
    return json.loads(result.stdout)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="explainer-video-skill-") as temp:
        project = Path(temp) / "credit-card-clearing"
        created = run([
            "new", str(project),
            "--title", "信用卡清算",
            "--topic", "为什么授权成功后还要清算",
            "--template", "spatial-chamber",
            "--preset", "general-mechanism",
            "--json",
        ])
        assert created["project"]["template"] == "spatial-chamber"
        assert created["project"]["preset"] == "general-mechanism"
        assert (project / "renderer" / "index.html").is_file()
        assert (project / "renderer" / "cover.html").is_file()

        status = run(["status", str(project), "--json"])
        next_action = run(["next", str(project), "--json"], expected=1)
        assert status["state"]["stage"] == "discovery"
        assert next_action["stage"] == "discovery"
        assert next_action["blockers"]

        narration_path = project / "script" / "narration.json"
        narration = json.loads(narration_path.read_text(encoding="utf-8"))
        narration["canonicalText"] = [{"id": "c01", "text": "把 search\\_policy 写成自然语言"}]
        narration_path.write_text(json.dumps(narration, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        prepared = run(["narration", "prepare", str(project), "--json"])
        assert prepared["paidProviderCalled"] is False
        normalized = json.loads(narration_path.read_text(encoding="utf-8"))["canonicalText"][0]["text"]
        assert "_" not in normalized and "下划线" not in normalized

    print("PASS generic project, state loop, runnable renderer/cover, and narration normalization")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
