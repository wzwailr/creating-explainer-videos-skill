#!/usr/bin/env python3
"""Read-only validation for declarative explainer-video extensions."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any


EXTENSION_API_VERSION = 1
EXTENSION_TYPES = {"visual", "voice", "research", "qc", "publishing"}
EXTENSION_ALIASES = {"ai-primary-research": "primary-source-research"}
PERMISSION_PATTERN = re.compile(r"[a-z][a-z0-9-]*(?::[a-z0-9-]+)*")


def resolve_extension_alias(extension_id: str) -> str:
    return EXTENSION_ALIASES.get(extension_id, extension_id)


def _inside(root: Path, relative_path: str) -> tuple[bool, Path]:
    resolved = (root / relative_path).resolve()
    try:
        resolved.relative_to(root.resolve())
        return resolved != root.resolve(), resolved
    except ValueError:
        return False, resolved


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_extension(extension_root: Path) -> dict[str, Any]:
    root = extension_root.resolve()
    manifest_path = root / "extension.json"
    errors: list[str] = []
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {"valid": False, "root": root, "errors": [f"cannot read extension.json: {exc}"]}

    extension_id = manifest.get("id", "")
    extension_type = manifest.get("type")
    if manifest.get("apiVersion") != EXTENSION_API_VERSION:
        errors.append(f"apiVersion must be {EXTENSION_API_VERSION}")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", extension_id):
        errors.append("id must use lowercase letters, digits, and hyphens")
    if extension_type not in EXTENSION_TYPES:
        errors.append(f"type must be one of {sorted(EXTENSION_TYPES)}")
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", str(manifest.get("version", ""))):
        errors.append("version must use semantic version format")
    for field in ("displayName", "description"):
        if not isinstance(manifest.get(field), str) or not manifest[field].strip():
            errors.append(f"{field} must be a non-empty string")
    if not isinstance(manifest.get("capabilities"), list) or not manifest["capabilities"]:
        errors.append("capabilities must be a non-empty array")
    permissions = manifest.get("permissions")
    if not isinstance(permissions, list):
        errors.append("permissions must be an array")
    elif any(not isinstance(item, str) or not PERMISSION_PATTERN.fullmatch(item) for item in permissions):
        errors.append("permissions must contain declarative lowercase capability strings")
    if any(key in manifest for key in ("hooks", "scripts", "postinstall")):
        errors.append("extension API v1 does not allow executable hooks")

    entrypoints = manifest.get("entrypoints")
    resolved_entrypoints: dict[str, Any] = {}
    if not isinstance(entrypoints, dict):
        errors.append("entrypoints is required")
    else:
        for key in ("reference", "profile"):
            value = entrypoints.get(key)
            if not isinstance(value, str) or not value:
                errors.append(f"entrypoints.{key} is required")
                continue
            inside, resolved = _inside(root, value)
            if not inside:
                errors.append(f"entrypoints.{key} points outside extension directory")
            if not resolved.is_file():
                errors.append(f"missing entrypoint: {value}")
            resolved_entrypoints[key] = resolved
        assets = entrypoints.get("assets")
        if not isinstance(assets, list):
            errors.append("entrypoints.assets must be an array")
        else:
            resolved_assets = []
            for value in assets:
                if not isinstance(value, str) or not value:
                    errors.append("entrypoints.assets contains an invalid path")
                    continue
                inside, resolved = _inside(root, value)
                if not inside:
                    errors.append("entrypoints.assets points outside extension directory")
                if not resolved.is_file():
                    errors.append(f"missing entrypoint: {value}")
                resolved_assets.append(resolved)
            resolved_entrypoints["assets"] = resolved_assets

    return {
        "valid": not errors,
        "root": root,
        "manifestPath": manifest_path,
        "id": extension_id,
        "type": extension_type,
        "version": manifest.get("version"),
        "displayName": manifest.get("displayName"),
        "permissions": permissions if isinstance(permissions, list) else [],
        "manifest": manifest,
        "entrypoints": resolved_entrypoints,
        "errors": errors,
    }


def discover_extensions(skill_root: Path) -> dict[str, dict[str, Any]]:
    extensions_root = skill_root.resolve() / "extensions"
    if not extensions_root.is_dir():
        return {}
    catalog: dict[str, dict[str, Any]] = {}
    for root in sorted((item for item in extensions_root.iterdir() if item.is_dir()), key=lambda item: item.name):
        extension = validate_extension(root)
        key = extension.get("id") or root.name
        if key in catalog:
            extension["valid"] = False
            extension["errors"].append(f"duplicate extension id: {key}")
        catalog[key] = extension
    return catalog


def load_extension(skill_root: Path, extension_id: str, expected_type: str | None = None) -> dict[str, Any]:
    requested_id = extension_id
    extension_id = resolve_extension_alias(extension_id)
    catalog = discover_extensions(skill_root)
    if extension_id not in catalog:
        raise ValueError(f"unknown extension: {requested_id}")
    extension = catalog[extension_id]
    if not extension["valid"]:
        raise ValueError(f"invalid extension {extension_id}: {'; '.join(extension['errors'])}")
    if expected_type and extension["type"] != expected_type:
        raise ValueError(f"extension {extension_id} has type {extension['type']}, expected {expected_type}")
    return extension


def extension_lock_entry(extension: dict[str, Any]) -> dict[str, Any]:
    if not extension.get("valid"):
        raise ValueError("a valid extension is required")
    profile_path = extension["entrypoints"]["profile"]
    return {
        "id": extension["id"],
        "type": extension["type"],
        "version": extension["version"],
        "permissions": list(extension["permissions"]),
        "manifestSha256": _sha256(extension["manifestPath"]),
        "profileSha256": _sha256(profile_path),
    }
