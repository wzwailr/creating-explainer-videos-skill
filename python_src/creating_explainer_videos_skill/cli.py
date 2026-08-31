from __future__ import annotations

import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from typing import Sequence

from . import __version__
from .installer import (
    discover_extensions,
    install_skill,
    installed_skill_path,
    rollback_skill,
    uninstall_skill,
    verify_installed_skill,
)
from .resources import package_paths


HELP_TEXT = """Explainer Video Skill installer and scaffold

Usage:
  explainer-video-skill install [--target codex | --destination SKILLS_DIR] [--source PATH]
  explainer-video-skill update [--target codex | --destination SKILLS_DIR] [--source PATH]
  explainer-video-skill verify [--target codex | --destination SKILLS_DIR]
  explainer-video-skill rollback [--target codex | --destination SKILLS_DIR] [--backup PATH]
  explainer-video-skill uninstall [--target codex | --destination SKILLS_DIR]
  explainer-video-skill list-extensions [--target codex | --destination SKILLS_DIR] [--source PATH]
  explainer-video-skill doctor [--json]
  explainer-video-skill new PROJECT_DIR --title TITLE --topic TOPIC [--template ID] [--json]
  explainer-video-skill status|next [PROJECT_DIR] [--json]
  explainer-video-skill validate STAGE [PROJECT_DIR] [--json]
  explainer-video-skill templates list|inspect|preview [ID] [--json]
  explainer-video-skill narration prepare PROJECT_DIR [--json]
  explainer-video-skill narration import-timing PROJECT_DIR --timing FILE [--json]
  explainer-video-skill build|render|cover|mux|audit|package [PROJECT_DIR] [--json]
  explainer-video-skill --version

No command defaults to install. Python lifecycle commands do not require Node.js.
Project and rendering commands use the bundled runtime and require Node.js 18+.
"""

LIFECYCLE_COMMANDS = {"install", "update", "verify", "rollback", "uninstall", "list-extensions"}


def _parse_lifecycle(arguments: Sequence[str]) -> tuple[str, dict[str, object]]:
    remaining = list(arguments)
    command = remaining.pop(0) if remaining and not remaining[0].startswith("-") else "install"
    options: dict[str, object] = {"json": False}
    value_flags = {
        "--source": "source",
        "--codex-home": "codex_home",
        "--destination": "destination",
        "--target": "target",
        "--backup": "backup_path",
    }
    while remaining:
        flag = remaining.pop(0)
        if flag == "--json":
            options["json"] = True
            continue
        key = value_flags.get(flag)
        if key is None:
            raise ValueError(f"unknown option: {flag}")
        if not remaining:
            raise ValueError(f"missing value for {flag}")
        options[key] = remaining.pop(0)
    if options.get("destination") and options.get("codex_home"):
        raise ValueError("use either --destination or --codex-home, not both")
    return command, options


def _print_result(value: object, as_json: bool) -> None:
    if as_json or not isinstance(value, str):
        print(json.dumps(value, ensure_ascii=False, indent=2))
    else:
        print(value)


def _run_lifecycle(arguments: Sequence[str]) -> int:
    command, options = _parse_lifecycle(arguments)
    paths = package_paths()
    common = {
        "codex_home": options.get("codex_home"),
        "destination": options.get("destination"),
        "target": options.get("target"),
    }
    if command in {"install", "update"}:
        source = Path(str(options["source"])).resolve() if options.get("source") else paths.skill_root
        result = install_skill(
            source,
            **common,
            manifest_path=None if options.get("source") else paths.manifest_path,
        )
        exit_code = 0
    elif command == "verify":
        result = verify_installed_skill(**common)
        exit_code = 0 if result["valid"] else 1
    elif command == "rollback":
        result = rollback_skill(**common, backup_path=options.get("backup_path"))
        exit_code = 0
    elif command == "uninstall":
        result = uninstall_skill(**common)
        exit_code = 0
    elif command == "list-extensions":
        root = Path(str(options["source"])).resolve() if options.get("source") else installed_skill_path(**common)
        result = [
            {
                "id": item.get("id"),
                "type": item.get("type"),
                "version": item.get("version"),
                "displayName": item.get("displayName"),
                "valid": item["valid"],
                "errors": item["errors"],
            }
            for item in discover_extensions(root)
        ]
        exit_code = 1 if any(not item["valid"] for item in result) else 0
    else:
        raise ValueError(f"unknown command: {command}")
    _print_result(result, bool(options["json"]))
    return exit_code


def _node_executable() -> str:
    executable = shutil.which("node")
    if not executable:
        raise RuntimeError(
            "Node.js 18+ is required for project, template, and rendering commands; "
            "Skill install and verify commands remain available without Node.js."
        )
    result = subprocess.run(
        [executable, "--version"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    match = re.search(r"v?(\d+)", result.stdout)
    if result.returncode != 0 or not match or int(match.group(1)) < 18:
        raise RuntimeError("Node.js 18+ is required for project, template, and rendering commands.")
    return executable


def _run_javascript_runtime(arguments: Sequence[str]) -> int:
    node = _node_executable()
    entrypoint = package_paths().skill_root / "scripts" / "explainer-video.mjs"
    if not entrypoint.is_file():
        raise RuntimeError(f"bundled JavaScript runtime is missing: {entrypoint}")
    completed = subprocess.run([node, os.fspath(entrypoint), *arguments], check=False)
    return completed.returncode


def main(argv: Sequence[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(encoding="utf-8")
    arguments = list(sys.argv[1:] if argv is None else argv)
    if "--help" in arguments or "-h" in arguments:
        print(HELP_TEXT)
        return 0
    if "--version" in arguments or "-v" in arguments:
        print(__version__)
        return 0

    try:
        if not arguments or arguments[0] in LIFECYCLE_COMMANDS or arguments[0].startswith("-"):
            return _run_lifecycle(arguments)
        return _run_javascript_runtime(arguments)
    except (OSError, RuntimeError, ValueError) as error:
        print(f"ERROR {error}", file=sys.stderr)
        return 1
