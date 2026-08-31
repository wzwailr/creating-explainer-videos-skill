from __future__ import annotations

import json
from pathlib import Path, PurePosixPath
import re
import tarfile
from typing import Iterable
import zipfile


CREDENTIAL_NAME = re.compile(
    r"(^|/)(?:\.env(?:\..*)?|\.npmrc|\.pypirc|credentials(?:\.json)?|id_rsa|id_ed25519)(?:$|/)",
    re.IGNORECASE,
)
CACHE_NAME = re.compile(r"(^|/)(?:__pycache__|\.pytest_cache|\.mypy_cache)(?:/|$)|\.pyc$", re.IGNORECASE)
FORBIDDEN_BINARY = re.compile(r"\.(?:mp3|wav|m4a|mp4|mov|avi|ttf|otf|woff2?|zip|7z)$", re.IGNORECASE)
CREDENTIAL_PATTERNS = (
    ("npm token", re.compile(rb"npm_[A-Za-z0-9]{20,}")),
    ("PyPI token", re.compile(rb"pypi-[A-Za-z0-9_-]{20,}")),
    ("registry auth setting", re.compile(rb"_authToken\s*=")),
    ("private key", re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
)
PERSONAL_PATHS = (
    re.compile(rb"[A-Za-z]:\\Users\\[^\\\s]+\\", re.IGNORECASE),
    re.compile(rb"/(?:Users|home)/[^/\s]+/"),
)


def _read_archive(path: Path) -> list[tuple[str, bytes]]:
    if path.suffix == ".whl" or zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            return [
                (item.filename.replace("\\", "/"), archive.read(item))
                for item in archive.infolist()
                if not item.is_dir()
            ]
    if path.name.endswith((".tar.gz", ".tgz")):
        with tarfile.open(path, "r:gz") as archive:
            result: list[tuple[str, bytes]] = []
            for item in archive.getmembers():
                if item.issym() or item.islnk():
                    result.append((item.name.replace("\\", "/"), b"SYMLINK"))
                elif item.isfile():
                    extracted = archive.extractfile(item)
                    result.append((item.name.replace("\\", "/"), extracted.read() if extracted else b""))
            return result
    raise ValueError(f"unsupported distribution archive: {path}")


def _has_suffix(names: Iterable[str], suffix: str) -> bool:
    return any(name == suffix or name.endswith("/" + suffix) for name in names)


def audit_archive(archive_path: str | Path) -> dict[str, object]:
    path = Path(archive_path).resolve()
    if not path.is_file():
        raise ValueError(f"distribution archive does not exist: {path}")
    entries = _read_archive(path)
    names = [name for name, _ in entries]
    errors: list[str] = []

    required_suffixes = (
        "creating_explainer_videos_skill/__init__.py",
        "creating_explainer_videos_skill/assets/skill-manifest.json",
        "creating_explainer_videos_skill/assets/creating-explainer-videos/SKILL.md",
        "creating_explainer_videos_skill/assets/creating-explainer-videos/scripts/explainer-video.mjs",
        "creating_explainer_videos_skill/assets/creating-explainer-videos/runtime/cli.mjs",
    )
    if path.suffix == ".whl":
        for required in required_suffixes:
            if not _has_suffix(names, required):
                errors.append(f"missing required file: {required}")
        if not any(name.endswith(".dist-info/METADATA") for name in names):
            errors.append("missing wheel metadata")
        if not any(name.endswith(".dist-info/entry_points.txt") for name in names):
            errors.append("missing console entrypoints")
    else:
        for required in (
            "pyproject.toml",
            "python_src/creating_explainer_videos_skill/cli.py",
            "skill/creating-explainer-videos/SKILL.md",
            "skill-manifest.json",
        ):
            if not _has_suffix(names, required):
                errors.append(f"missing required source file: {required}")

    templates = sorted(
        PurePosixPath(name).parts[-2]
        for name in names
        if name.endswith("/template.json")
        and "/assets/creating-explainer-videos/templates/" in "/" + name
    )
    if path.suffix == ".whl" and templates != ["ink-explainer", "paper-theatre", "spatial-chamber"]:
        errors.append(f"wheel template collection is incomplete: {templates}")

    for name, content in entries:
        normalized = "/" + name.strip("/")
        if CREDENTIAL_NAME.search(normalized):
            errors.append(f"credential filename: {name}")
        if CACHE_NAME.search(normalized):
            errors.append(f"cache artifact: {name}")
        if FORBIDDEN_BINARY.search(normalized):
            errors.append(f"forbidden media or font binary: {name}")
        for label, pattern in CREDENTIAL_PATTERNS:
            if pattern.search(content):
                errors.append(f"credential pattern ({label}): {name}")
        for pattern in PERSONAL_PATHS:
            if pattern.search(content):
                errors.append(f"personal absolute path: {name}")

    return {
        "valid": not errors,
        "archive": str(path),
        "files": len(entries),
        "templates": templates,
        "errors": sorted(set(errors)),
        "checks": [
            "required-runtime-and-skill-files",
            "three-template-collection",
            "credential-filenames",
            "credential-patterns",
            "personal-paths",
            "media-font-binaries",
            "cache-artifacts",
        ],
    }


def audit_archives(paths: Iterable[str | Path]) -> dict[str, object]:
    results = [audit_archive(path) for path in paths]
    return {"valid": all(bool(item["valid"]) for item in results), "archives": results}


def format_audit(result: dict[str, object]) -> str:
    return json.dumps(result, ensure_ascii=False, indent=2)
