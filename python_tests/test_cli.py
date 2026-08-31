from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
PYTHON_SOURCE = REPOSITORY_ROOT / "python_src"


def run_cli(*arguments: str, path: str | None = None) -> subprocess.CompletedProcess[str]:
    environment = os.environ.copy()
    environment["PYTHONPATH"] = str(PYTHON_SOURCE)
    if path is not None:
        environment["PATH"] = path
    return subprocess.run(
        [sys.executable, "-m", "creating_explainer_videos_skill", *arguments],
        cwd=REPOSITORY_ROOT,
        env=environment,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )


class CliContractTests(unittest.TestCase):
    def test_version_works_without_node(self) -> None:
        result = run_cli("--version", path="")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "2.0.0")

    def test_help_works_without_node(self) -> None:
        result = run_cli("--help", path="")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Explainer Video Skill installer and scaffold", result.stdout)
        self.assertIn("explainer-video-skill install", result.stdout)

    def test_project_command_reports_node_18_requirement(self) -> None:
        result = run_cli("templates", "list", path="")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Node.js 18+", result.stderr)

    def test_install_and_verify_work_without_node(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "skills"

            installed = run_cli("install", "--destination", str(destination), "--json", path="")
            verified = run_cli("verify", "--destination", str(destination), "--json", path="")

            self.assertEqual(installed.returncode, 0, installed.stderr)
            self.assertEqual(json.loads(installed.stdout)["action"], "installed")
            self.assertEqual(verified.returncode, 0, verified.stderr)
            self.assertTrue(json.loads(verified.stdout)["valid"])


if __name__ == "__main__":
    unittest.main()
