from __future__ import annotations

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
from typing import Any

from .integrity import INTERNAL_MANIFEST, list_skill_files, verify_skill_manifest


SKILL_NAME = "creating-explainer-videos"
LEGACY_SKILL_NAME = "creating-ai-principle-videos"
EXTENSION_API_VERSION = 1
EXTENSION_TYPES = {"visual", "voice", "research", "qc", "publishing"}


def resolve_codex_home(explicit_home: str | Path | None = None) -> Path:
    return Path(explicit_home or os.environ.get("CODEX_HOME") or Path.home() / ".codex").resolve()


def resolve_skills_root(
    *,
    codex_home: str | Path | None = None,
    destination: str | Path | None = None,
    target: str | None = None,
) -> Path:
    if destination is not None:
        return Path(destination).resolve()
    selected_target = target or "codex"
    if selected_target != "codex":
        raise ValueError(f"target {selected_target} requires --destination")
    return resolve_codex_home(codex_home) / "skills"


def installed_skill_path(**options: Any) -> Path:
    return resolve_skills_root(**options) / SKILL_NAME


def _backup_root(*, skills_root: Path, codex_home: str | Path | None, destination: str | Path | None) -> Path:
    if destination is not None:
        return skills_root.parent / ".explainer-video-skill-backups"
    return resolve_codex_home(codex_home) / "skill-backups"


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%fZ")


def _resolve_entrypoint(extension_root: Path, relative: str) -> tuple[Path, bool]:
    if not relative or Path(relative).is_absolute():
        return extension_root, False
    resolved = (extension_root / relative).resolve()
    try:
        resolved.relative_to(extension_root.resolve())
    except ValueError:
        return resolved, False
    return resolved, resolved != extension_root.resolve()


def validate_extension(extension_root: Path) -> dict[str, Any]:
    root = extension_root.resolve()
    errors: list[str] = []
    manifest_path = root / "extension.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return {
            "valid": False,
            "root": str(root),
            "manifestPath": str(manifest_path),
            "errors": [f"cannot read extension.json: {error}"],
        }

    extension_id = manifest.get("id")
    extension_type = manifest.get("type")
    if manifest.get("apiVersion") != EXTENSION_API_VERSION:
        errors.append(
            f"unsupported apiVersion {manifest.get('apiVersion')}; expected {EXTENSION_API_VERSION}"
        )
    if not isinstance(extension_id, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", extension_id):
        errors.append("id must use lowercase letters, digits, and hyphens")
    if extension_type not in EXTENSION_TYPES:
        errors.append(f"unsupported extension type: {extension_type}")
    if not isinstance(manifest.get("version"), str) or not re.fullmatch(r"\d+\.\d+\.\d+", manifest["version"]):
        errors.append("version must use MAJOR.MINOR.PATCH")
    for field in ("displayName", "description"):
        if not isinstance(manifest.get(field), str) or not manifest[field].strip():
            errors.append(f"{field} must be a non-empty string")
    for field in ("capabilities", "permissions"):
        if not isinstance(manifest.get(field), list) or not all(isinstance(item, str) for item in manifest[field]):
            errors.append(f"{field} must be an array of strings")

    entrypoints = manifest.get("entrypoints")
    if not isinstance(entrypoints, dict):
        errors.append("entrypoints must be an object")
    else:
        declared: list[str] = []
        for field in ("reference", "profile"):
            value = entrypoints.get(field)
            if not isinstance(value, str):
                errors.append(f"entrypoints.{field} must be a string")
            else:
                declared.append(value)
        assets = entrypoints.get("assets", [])
        if not isinstance(assets, list) or not all(isinstance(item, str) for item in assets):
            errors.append("entrypoints.assets must be an array of strings")
        else:
            declared.extend(assets)
        for relative in declared:
            resolved, inside = _resolve_entrypoint(root, relative)
            if not inside:
                errors.append(f"entrypoint is outside extension directory: {relative}")
            elif not resolved.is_file():
                errors.append(f"missing entrypoint: {relative}")

    return {
        "id": extension_id,
        "type": extension_type,
        "version": manifest.get("version"),
        "displayName": manifest.get("displayName"),
        "permissions": manifest.get("permissions", []),
        "valid": not errors,
        "errors": errors,
        "root": str(root),
        "manifestPath": str(manifest_path),
    }


def discover_extensions(skill_root: str | Path) -> list[dict[str, Any]]:
    extensions_root = Path(skill_root).resolve() / "extensions"
    if not extensions_root.is_dir():
        return []
    return [
        validate_extension(path)
        for path in sorted(extensions_root.iterdir(), key=lambda item: item.name)
        if path.is_dir()
    ]


def validate_skill_root(skill_root: str | Path) -> dict[str, Any]:
    root = Path(skill_root).resolve()
    errors: list[str] = []
    try:
        skill_text = (root / "SKILL.md").read_text(encoding="utf-8")
    except OSError as error:
        skill_text = ""
        errors.append(f"cannot read SKILL.md: {error}")
    if not re.search(
        r"^---\s*[\s\S]*?\bname:\s*creating-explainer-videos\s*[\s\S]*?---",
        skill_text,
        re.MULTILINE,
    ):
        errors.append("SKILL.md frontmatter does not declare creating-explainer-videos")
    for directory in ("agents", "scripts", "references"):
        if not (root / directory).is_dir():
            errors.append(f"missing required directory: {directory}")
    try:
        list_skill_files(root)
    except (OSError, ValueError) as error:
        errors.append(str(error))
    extensions = discover_extensions(root)
    for extension in extensions:
        if not extension["valid"]:
            errors.append(
                f"invalid extension {extension.get('id') or Path(extension['root']).name}: "
                + "; ".join(extension["errors"])
            )
    return {"valid": not errors, "root": str(root), "errors": errors, "extensions": extensions}


def verify_installed_skill(
    *,
    codex_home: str | Path | None = None,
    destination: str | Path | None = None,
    target: str | None = None,
) -> dict[str, Any]:
    install_options = {"codex_home": codex_home, "destination": destination, "target": target}
    installed = installed_skill_path(**install_options)
    if not installed.is_dir():
        return {"valid": False, "target": str(installed), "errors": ["skill is not installed"], "extensions": []}
    validation = validate_skill_root(installed)
    internal_manifest = installed / INTERNAL_MANIFEST
    integrity = (
        verify_skill_manifest(installed, internal_manifest)
        if internal_manifest.is_file()
        else {"valid": True, "checkedFiles": 0, "errors": [], "skipped": True}
    )
    errors = [*validation["errors"], *integrity["errors"]]
    return {
        **validation,
        "valid": validation["valid"] and integrity["valid"],
        "errors": errors,
        "integrity": integrity,
        "target": str(installed),
    }


def install_skill(
    source: str | Path,
    *,
    codex_home: str | Path | None = None,
    destination: str | Path | None = None,
    target: str | None = None,
    manifest_path: str | Path | None = None,
) -> dict[str, Any]:
    source_root = Path(source).resolve()
    validation = validate_skill_root(source_root)
    if not validation["valid"]:
        raise ValueError("Invalid skill source: " + "; ".join(validation["errors"]))
    if manifest_path is not None:
        integrity = verify_skill_manifest(source_root, Path(manifest_path).resolve())
        if not integrity["valid"]:
            raise ValueError("Skill package integrity check failed: " + "; ".join(integrity["errors"]))

    install_options = {"codex_home": codex_home, "destination": destination, "target": target}
    skills_root = resolve_skills_root(**install_options)
    installed = skills_root / SKILL_NAME
    legacy = skills_root / LEGACY_SKILL_NAME
    if source_root == installed.resolve():
        raise ValueError("source and installed target are the same directory")
    backups = _backup_root(skills_root=skills_root, codex_home=codex_home, destination=destination)
    skills_root.mkdir(parents=True, exist_ok=True)
    backups.mkdir(parents=True, exist_ok=True)

    had_existing = installed.is_dir()
    had_legacy = not had_existing and legacy.is_dir()
    unique = f"{_timestamp()}-{os.getpid()}"
    backup = backups / f"{SKILL_NAME}-{unique}" if had_existing else None
    legacy_backup = backups / f"{LEGACY_SKILL_NAME}-migration-{unique}" if had_legacy else None
    staging = skills_root / f".{SKILL_NAME}-install-{unique}"

    try:
        if staging.exists():
            shutil.rmtree(staging)
        shutil.copytree(source_root, staging)
        if manifest_path is not None:
            shutil.copy2(Path(manifest_path).resolve(), staging / INTERNAL_MANIFEST)
        staged = validate_skill_root(staging)
        if not staged["valid"]:
            raise ValueError("staged skill failed validation: " + "; ".join(staged["errors"]))
        if manifest_path is not None:
            staged_integrity = verify_skill_manifest(staging, staging / INTERNAL_MANIFEST)
            if not staged_integrity["valid"]:
                raise ValueError("staged skill failed integrity verification: " + "; ".join(staged_integrity["errors"]))
        if backup is not None:
            installed.rename(backup)
        if legacy_backup is not None:
            legacy.rename(legacy_backup)
        staging.rename(installed)
    except Exception:
        if staging.exists():
            shutil.rmtree(staging)
        if backup is not None and backup.exists() and not installed.exists():
            backup.rename(installed)
        if legacy_backup is not None and legacy_backup.exists() and not legacy.exists():
            legacy_backup.rename(legacy)
        raise

    return {
        "action": "updated" if had_existing else "migrated" if had_legacy else "installed",
        "targetKind": "custom" if destination is not None else "codex",
        "skillsRoot": str(skills_root),
        "target": str(installed),
        "backupPath": str(backup) if backup is not None else None,
        "legacyBackupPath": str(legacy_backup) if legacy_backup is not None else None,
        "extensions": [
            {"id": item["id"], "type": item["type"], "version": item["version"]}
            for item in staged["extensions"]
        ],
    }


def uninstall_skill(
    *,
    codex_home: str | Path | None = None,
    destination: str | Path | None = None,
    target: str | None = None,
) -> dict[str, Any]:
    skills_root = resolve_skills_root(codex_home=codex_home, destination=destination, target=target)
    installed = skills_root / SKILL_NAME
    if not installed.is_dir():
        raise ValueError(f"skill is not installed: {installed}")
    backups = _backup_root(skills_root=skills_root, codex_home=codex_home, destination=destination)
    backups.mkdir(parents=True, exist_ok=True)
    backup = backups / f"{SKILL_NAME}-uninstalled-{_timestamp()}-{os.getpid()}"
    installed.rename(backup)
    return {
        "action": "uninstalled",
        "targetKind": "custom" if destination is not None else "codex",
        "skillsRoot": str(skills_root),
        "target": str(installed),
        "backupPath": str(backup),
    }


def rollback_skill(
    *,
    codex_home: str | Path | None = None,
    destination: str | Path | None = None,
    target: str | None = None,
    backup_path: str | Path | None = None,
) -> dict[str, Any]:
    skills_root = resolve_skills_root(codex_home=codex_home, destination=destination, target=target)
    installed = skills_root / SKILL_NAME
    backups = _backup_root(skills_root=skills_root, codex_home=codex_home, destination=destination)
    if not backups.is_dir():
        raise ValueError(f"no backup directory exists: {backups}")

    if backup_path is not None:
        selected = Path(backup_path).resolve()
        if selected.parent != backups.resolve() or not selected.name.startswith(f"{SKILL_NAME}-"):
            raise ValueError("backup must be an exact creating-explainer-videos backup in this target's backup directory")
    else:
        candidates = [
            path for path in backups.iterdir()
            if path.is_dir() and path.name.startswith(f"{SKILL_NAME}-")
        ]
        candidates.sort(key=lambda path: (path.stat().st_mtime_ns, path.name), reverse=True)
        selected = candidates[0] if candidates else None
    if selected is None or not selected.is_dir():
        raise ValueError(f"no recoverable backup found in: {backups}")
    validation = validate_skill_root(selected)
    if not validation["valid"]:
        raise ValueError("backup is not a valid skill: " + "; ".join(validation["errors"]))
    internal_manifest = selected / INTERNAL_MANIFEST
    if internal_manifest.is_file():
        integrity = verify_skill_manifest(selected, internal_manifest)
        if not integrity["valid"]:
            raise ValueError("backup failed integrity verification: " + "; ".join(integrity["errors"]))

    skills_root.mkdir(parents=True, exist_ok=True)
    displaced = backups / f"{SKILL_NAME}-before-rollback-{_timestamp()}-{os.getpid()}" if installed.is_dir() else None
    try:
        if displaced is not None:
            installed.rename(displaced)
        selected.rename(installed)
    except Exception:
        if displaced is not None and displaced.exists() and not installed.exists():
            displaced.rename(installed)
        raise
    return {
        "action": "rolled_back",
        "targetKind": "custom" if destination is not None else "codex",
        "skillsRoot": str(skills_root),
        "target": str(installed),
        "restoredFrom": str(selected),
        "displacedTo": str(displaced) if displaced is not None else None,
    }
