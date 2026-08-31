from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PackagePaths:
    skill_root: Path
    manifest_path: Path


def package_paths() -> PackagePaths:
    package_root = Path(__file__).resolve().parent
    packaged_assets = package_root / "assets"
    if packaged_assets.is_dir():
        return PackagePaths(
            skill_root=packaged_assets / "creating-explainer-videos",
            manifest_path=packaged_assets / "skill-manifest.json",
        )

    repository_root = package_root.parents[1]
    return PackagePaths(
        skill_root=repository_root / "skill" / "creating-explainer-videos",
        manifest_path=repository_root / "skill-manifest.json",
    )
