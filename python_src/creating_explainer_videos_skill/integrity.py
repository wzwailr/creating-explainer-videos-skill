from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


INTERNAL_MANIFEST = ".skill-package-manifest.json"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def list_skill_files(root: Path) -> list[str]:
    root = root.resolve()
    files: list[str] = []
    for path in sorted(root.rglob("*"), key=lambda item: item.as_posix().lower()):
        if "__pycache__" in path.parts:
            continue
        if path.is_symlink():
            raise ValueError(f"symbolic links are not allowed in packaged skills: {path}")
        if not path.is_file() or path.name in {INTERNAL_MANIFEST, ".npmignore"} or path.suffix == ".pyc":
            continue
        files.append(path.relative_to(root).as_posix())
    return files


def verify_skill_manifest(skill_root: Path, manifest_path: Path) -> dict[str, Any]:
    root = skill_root.resolve()
    errors: list[str] = []
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return {"valid": False, "checkedFiles": 0, "errors": [f"cannot read skill manifest: {error}"]}

    if manifest.get("schemaVersion") != 1:
        errors.append("manifest schemaVersion must be 1")
    if manifest.get("skillName") != "creating-explainer-videos":
        errors.append("manifest skillName is invalid")
    declared = manifest.get("files")
    if not isinstance(declared, list):
        errors.append("manifest files must be an array")
        return {"valid": False, "checkedFiles": 0, "errors": errors, "manifest": manifest}

    try:
        current_files = list_skill_files(root)
    except ValueError as error:
        return {"valid": False, "checkedFiles": 0, "errors": [str(error)], "manifest": manifest}
    expected_files = sorted(str(item.get("path", "")) for item in declared)
    for unexpected in sorted(set(current_files) - set(expected_files)):
        errors.append(f"unexpected file: {unexpected}")
    for missing in sorted(set(expected_files) - set(current_files)):
        errors.append(f"missing file: {missing}")

    current_set = set(current_files)
    for item in declared:
        relative = str(item.get("path", ""))
        if relative not in current_set:
            continue
        path = root.joinpath(*relative.split("/"))
        if path.stat().st_size != item.get("size"):
            errors.append(f"size mismatch: {relative}")
        if sha256_file(path) != item.get("sha256"):
            errors.append(f"hash mismatch: {relative}")

    return {
        "valid": not errors,
        "checkedFiles": len(declared),
        "errors": errors,
        "manifest": manifest,
    }
