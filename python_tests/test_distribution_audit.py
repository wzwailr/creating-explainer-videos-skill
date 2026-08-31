from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "python_src"))

try:
    from creating_explainer_videos_skill.dist_audit import audit_archive
except ModuleNotFoundError:
    audit_archive = None


REQUIRED_WHEEL_FILES = {
    "creating_explainer_videos_skill/__init__.py": "__version__ = '2.0.1'\n",
    "creating_explainer_videos_skill/assets/skill-manifest.json": json.dumps({"schemaVersion": 1}),
    "creating_explainer_videos_skill/assets/creating-explainer-videos/SKILL.md": "---\nname: creating-explainer-videos\n---\n",
    "creating_explainer_videos_skill/assets/creating-explainer-videos/scripts/explainer-video.mjs": "export {};\n",
    "creating_explainer_videos_skill/assets/creating-explainer-videos/runtime/cli.mjs": "export {};\n",
    "creating_explainer_videos_skill/assets/creating-explainer-videos/templates/ink-explainer/template.json": "{}\n",
    "creating_explainer_videos_skill/assets/creating-explainer-videos/templates/paper-theatre/template.json": "{}\n",
    "creating_explainer_videos_skill/assets/creating-explainer-videos/templates/spatial-chamber/template.json": "{}\n",
    "creating_explainer_videos_skill-2.0.1.dist-info/METADATA": "Name: creating-explainer-videos-skill\nVersion: 2.0.1\n",
    "creating_explainer_videos_skill-2.0.1.dist-info/entry_points.txt": (
        "[console_scripts]\nexplainer-video-skill = creating_explainer_videos_skill.cli:main\n"
    ),
}


def write_wheel(path: Path, files: dict[str, str]) -> None:
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)


class DistributionAuditTests(unittest.TestCase):
    def require_implementation(self) -> None:
        self.assertIsNotNone(audit_archive, "distribution archive audit is not implemented")

    def test_build_targets_pin_supported_core_metadata(self) -> None:
        pyproject = (REPOSITORY_ROOT / "pyproject.toml").read_text(encoding="utf-8")
        self.assertEqual(pyproject.count('core-metadata-version = "2.4"'), 2)

    def test_accepts_wheel_with_runtime_skill_and_three_templates(self) -> None:
        self.require_implementation()
        with tempfile.TemporaryDirectory() as temporary:
            wheel = Path(temporary) / "creating_explainer_videos_skill-2.0.1-py3-none-any.whl"
            write_wheel(wheel, REQUIRED_WHEEL_FILES)

            result = audit_archive(wheel)

            self.assertTrue(result["valid"], result["errors"])
            self.assertEqual(result["templates"], ["ink-explainer", "paper-theatre", "spatial-chamber"])

    def test_rejects_credential_files_and_token_patterns(self) -> None:
        self.require_implementation()
        with tempfile.TemporaryDirectory() as temporary:
            wheel = Path(temporary) / "creating_explainer_videos_skill-2.0.1-py3-none-any.whl"
            files = dict(REQUIRED_WHEEL_FILES)
            token_setting = "_auth" + "Token"
            fake_token = "npm" + "_" + "abcdefghijklmnopqrstuvwxyz"
            files["creating_explainer_videos_skill/assets/.npmrc"] = (
                f"//registry.npmjs.org/:{token_setting}={fake_token}\n"
            )
            write_wheel(wheel, files)

            result = audit_archive(wheel)

            self.assertFalse(result["valid"])
            self.assertTrue(any("credential filename" in error for error in result["errors"]))
            self.assertTrue(any("credential pattern" in error for error in result["errors"]))


if __name__ == "__main__":
    unittest.main()
