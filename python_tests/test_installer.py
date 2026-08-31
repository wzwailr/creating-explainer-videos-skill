from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "python_src"))

try:
    from creating_explainer_videos_skill.installer import (
        discover_extensions,
        install_skill,
        rollback_skill,
        uninstall_skill,
        verify_installed_skill,
    )
    from creating_explainer_videos_skill.resources import package_paths
except ModuleNotFoundError:
    discover_extensions = None
    install_skill = None
    rollback_skill = None
    uninstall_skill = None
    verify_installed_skill = None
    package_paths = None


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def create_fixture_skill(root: Path, marker: str = "v1", *, traversal: bool = False) -> Path:
    root.mkdir(parents=True, exist_ok=True)
    (root / "SKILL.md").write_text(
        "---\nname: creating-explainer-videos\ndescription: Fixture.\n---\n\n" + marker,
        encoding="utf-8",
    )
    for directory in ("agents", "scripts", "references"):
        (root / directory).mkdir()
    extension = root / "extensions" / "fixture-visual"
    extension.mkdir(parents=True)
    (extension / "reference.md").write_text("fixture", encoding="utf-8")
    write_json(extension / "profile.json", {"marker": marker})
    write_json(
        extension / "extension.json",
        {
            "apiVersion": 1,
            "id": "fixture-visual",
            "type": "visual",
            "version": "1.0.0",
            "displayName": "Fixture visual",
            "description": "Fixture extension.",
            "entrypoints": {
                "reference": "../outside.md" if traversal else "reference.md",
                "profile": "profile.json",
                "assets": [],
            },
            "capabilities": ["visual.tokens"],
            "permissions": [],
        },
    )
    return root


class InstallerContractTests(unittest.TestCase):
    def require_implementation(self) -> None:
        self.assertIsNotNone(install_skill, "installer lifecycle module is not implemented")

    def test_installs_and_verifies_canonical_skill_with_manifest(self) -> None:
        self.require_implementation()
        paths = package_paths()
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "skills"
            result = install_skill(paths.skill_root, destination=destination, manifest_path=paths.manifest_path)
            verification = verify_installed_skill(destination=destination)

            self.assertEqual(result["action"], "installed")
            self.assertTrue(verification["valid"], verification["errors"])
            self.assertGreater(verification["integrity"]["checkedFiles"], 40)
            self.assertEqual(
                sorted(item["id"] for item in verification["extensions"] if item["type"] == "visual"),
                ["ink-explainer", "paper-theatre", "spatial-chamber"],
            )

    def test_manifest_verification_detects_installed_file_tampering(self) -> None:
        self.require_implementation()
        paths = package_paths()
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "skills"
            install_skill(paths.skill_root, destination=destination, manifest_path=paths.manifest_path)
            installed = destination / "creating-explainer-videos" / "SKILL.md"
            installed.write_text(installed.read_text(encoding="utf-8") + "\ntampered", encoding="utf-8")

            verification = verify_installed_skill(destination=destination)

            self.assertFalse(verification["valid"])
            self.assertIn("hash mismatch: SKILL.md", verification["errors"])

    def test_update_creates_recoverable_backup_and_rollback_restores_it(self) -> None:
        self.require_implementation()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            destination = root / "agent" / "skills"
            source_v1 = create_fixture_skill(root / "source-v1", "version-one")
            source_v2 = create_fixture_skill(root / "source-v2", "version-two")
            install_skill(source_v1, destination=destination)

            update = install_skill(source_v2, destination=destination)
            self.assertTrue(Path(update["backupPath"]).is_dir())
            rollback = rollback_skill(destination=destination)

            self.assertEqual(update["action"], "updated")
            self.assertIn(
                "version-one",
                (destination / "creating-explainer-videos" / "SKILL.md").read_text(encoding="utf-8"),
            )
            self.assertEqual(Path(rollback["restoredFrom"]), Path(update["backupPath"]))

    def test_uninstall_moves_skill_to_recoverable_backup(self) -> None:
        self.require_implementation()
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            destination = root / "skills"
            source = create_fixture_skill(root / "source")
            install_skill(source, destination=destination)

            result = uninstall_skill(destination=destination)

            self.assertFalse((destination / "creating-explainer-videos").exists())
            self.assertTrue(Path(result["backupPath"]).is_dir())

    def test_extension_validation_rejects_path_traversal(self) -> None:
        self.require_implementation()
        with tempfile.TemporaryDirectory() as temporary:
            source = create_fixture_skill(Path(temporary) / "source", traversal=True)

            extensions = discover_extensions(source)

            self.assertEqual(len(extensions), 1)
            self.assertFalse(extensions[0]["valid"])
            self.assertIn("outside extension directory", "\n".join(extensions[0]["errors"]))
            with self.assertRaisesRegex(ValueError, "(?i)invalid skill source"):
                install_skill(source, destination=Path(temporary) / "skills")


if __name__ == "__main__":
    unittest.main()
