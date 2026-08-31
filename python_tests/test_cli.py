from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python_src"))

from creating_explainer_videos_skill import cli


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
        self.assertEqual(result.stdout.strip(), "2.2.1")

    def test_help_works_without_node(self) -> None:
        result = run_cli("--help", path="")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Explainer Video Skill installer and scaffold", result.stdout)
        self.assertIn("explainer-video-skill install", result.stdout)

    def test_project_command_reports_node_22_requirement(self) -> None:
        result = run_cli("templates", "list", path="")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Node.js 22+", result.stderr)

    def test_install_and_verify_work_without_node(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "skills"

            installed = run_cli("install", "--destination", str(destination), "--json", path="")
            verified = run_cli("verify", "--destination", str(destination), "--json", path="")

            self.assertEqual(installed.returncode, 0, installed.stderr)
            self.assertEqual(json.loads(installed.stdout)["action"], "installed")
            self.assertEqual(verified.returncode, 0, verified.stderr)
            self.assertTrue(json.loads(verified.stdout)["valid"])

    def test_project_commands_reject_node_21(self) -> None:
        completed = subprocess.CompletedProcess(["node", "--version"], 0, "v21.7.3\n", "")

        with patch.object(cli.shutil, "which", return_value="C:/node.exe"), patch.object(cli.subprocess, "run", return_value=completed):
            with self.assertRaisesRegex(RuntimeError, r"Node\.js 22\+"):
                cli._node_executable()

    def test_project_commands_accept_node_22(self) -> None:
        completed = subprocess.CompletedProcess(["node", "--version"], 0, "v22.10.0\n", "")

        with patch.object(cli.shutil, "which", return_value="C:/node.exe"), patch.object(cli.subprocess, "run", return_value=completed):
            self.assertEqual(cli._node_executable(), "C:/node.exe")


if __name__ == "__main__":
    unittest.main()
