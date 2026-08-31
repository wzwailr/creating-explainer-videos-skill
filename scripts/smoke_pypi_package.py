#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import venv


def run(command: list[str], *, environment: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        env=environment,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"command failed ({result.returncode}): {' '.join(command)}\n"
            f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
    return result


def executable(virtual_environment: Path, name: str) -> Path:
    scripts = virtual_environment / ("Scripts" if os.name == "nt" else "bin")
    suffix = ".exe" if os.name == "nt" else ""
    return scripts / f"{name}{suffix}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Install and smoke-test a local wheel or public PyPI requirement.")
    parser.add_argument("artifact", help="Wheel path or requirement such as creating-explainer-videos-skill==2.1.0")
    parser.add_argument("--index-url")
    options = parser.parse_args()

    artifact_path = Path(options.artifact)
    artifact = str(artifact_path.resolve()) if artifact_path.is_file() else options.artifact
    with tempfile.TemporaryDirectory(prefix="explainer-pypi-smoke-") as temporary:
        root = Path(temporary)
        virtual_environment = root / "venv"
        venv.EnvBuilder(with_pip=True, clear=True).create(virtual_environment)
        python = executable(virtual_environment, "python")
        install_command = [str(python), "-m", "pip", "install", "--disable-pip-version-check", "--no-deps"]
        if options.index_url:
            install_command.extend(["--index-url", options.index_url])
        install_command.append(artifact)
        run(install_command)

        cli = executable(virtual_environment, "explainer-video-skill")
        legacy = executable(virtual_environment, "ai-principle-video-skill")
        version = run([str(cli), "--version"]).stdout.strip()
        legacy_version = run([str(legacy), "--version"]).stdout.strip()
        help_text = run([str(cli), "--help"]).stdout
        templates = json.loads(run([str(cli), "templates", "list", "--json"]).stdout)
        destination = root / "agent-skills"
        installation = json.loads(
            run([str(cli), "install", "--destination", str(destination), "--json"]).stdout
        )
        verification = json.loads(
            run([str(cli), "verify", "--destination", str(destination), "--json"]).stdout
        )

        template_ids = sorted(item["id"] for item in templates)
        if version != "2.1.0" or legacy_version != version:
            raise RuntimeError(f"unexpected CLI versions: {version!r}, {legacy_version!r}")
        if "Explainer Video Skill installer and scaffold" not in help_text:
            raise RuntimeError("help output is incomplete")
        if template_ids != ["ink-explainer", "paper-theatre", "spatial-chamber"]:
            raise RuntimeError(f"unexpected template collection: {template_ids}")
        if installation.get("action") != "installed" or not verification.get("valid"):
            raise RuntimeError("Skill install or verification failed")

        print(
            json.dumps(
                {
                    "valid": True,
                    "artifact": options.artifact,
                    "version": version,
                    "commands": ["explainer-video-skill", "ai-principle-video-skill"],
                    "templates": template_ids,
                    "installedFiles": verification["integrity"]["checkedFiles"],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    return 0


raise SystemExit(main())
