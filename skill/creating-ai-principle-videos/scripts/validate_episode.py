#!/usr/bin/env python3
"""Validate the portable contract for an AI-principle explainer episode."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from extension_catalog import EXTENSION_API_VERSION, EXTENSION_TYPES, validate_extension


FIELDS = (
    "cue",
    "scene",
    "start",
    "duration",
    "rate",
    "pitch",
    "scene_title",
    "caption",
    "tts",
    "focus",
    "from",
    "action",
    "to",
    "handoff",
)
PLACEHOLDER_MARKERS = ("待写", "待补", "待按", "TODO", "TBD", "{{", "按本集机制重画")
ALLOWED_DECISIONS = {
    "not_assessed",
    "failed",
    "release_candidate_pending_human_listen",
    "passed",
}


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    passed: list[str] = field(default_factory=list)

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def ok(self, message: str) -> None:
        self.passed.append(message)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("episode_dir", type=Path)
    parser.add_argument("--phase", choices=("plan", "timed", "candidate", "release"), default="plan")
    parser.add_argument("--json", action="store_true", dest="as_json")
    return parser.parse_args()


def contains_placeholder(value: str) -> bool:
    return any(marker.lower() in value.lower() for marker in PLACEHOLDER_MARKERS)


def read_required(path: Path, report: Report) -> str:
    if not path.is_file():
        report.error(f"missing required file: {path.name}")
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        report.error(f"cannot read {path.name} as UTF-8: {exc}")
        return ""


def load_config(root: Path, report: Report) -> dict[str, Any]:
    text = read_required(root / "episode.json", report)
    if not text:
        return {}
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        report.error(f"episode.json is invalid JSON: {exc}")
        return {}
    required = ("series", "season", "episode", "topic", "question", "answer", "previous_topic", "next_topic", "style", "width", "height", "fps")
    missing = [key for key in required if key not in data or data[key] in (None, "")]
    if missing:
        report.error("episode.json missing values: " + ", ".join(missing))
    placeholder_fields = [key for key in required if isinstance(data.get(key), str) and contains_placeholder(data[key])]
    if placeholder_fields:
        report.error("episode.json still contains placeholders: " + ", ".join(placeholder_fields))
    return data


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_extension_lock(root: Path, config: dict[str, Any], report: Report) -> None:
    text = read_required(root / "extensions.lock.json", report)
    if not text:
        return
    try:
        lock = json.loads(text)
    except json.JSONDecodeError as exc:
        report.error(f"extensions.lock.json is invalid JSON: {exc}")
        return
    if lock.get("apiVersion") != EXTENSION_API_VERSION:
        report.error(f"extensions.lock.json apiVersion must be {EXTENSION_API_VERSION}")
    selections = lock.get("selections")
    if not isinstance(selections, dict) or set(selections) != EXTENSION_TYPES:
        report.error("extensions.lock.json must select visual, voice, research, qc, and publishing")
        return
    if config.get("extensions") != selections:
        report.error("episode.json extensions do not match extensions.lock.json selections")

    entries = lock.get("extensions")
    if not isinstance(entries, list):
        report.error("extensions.lock.json extensions must be an array")
        return
    by_type = {entry.get("type"): entry for entry in entries if isinstance(entry, dict)}
    for extension_type in sorted(EXTENSION_TYPES):
        extension_id = selections[extension_type]
        entry = by_type.get(extension_type)
        if not entry or entry.get("id") != extension_id:
            report.error(f"missing locked {extension_type} extension: {extension_id}")
            continue
        snapshot = root / "extensions" / extension_id
        extension = validate_extension(snapshot)
        if not extension["valid"]:
            report.error(f"invalid locked extension {extension_id}: {'; '.join(extension['errors'])}")
            continue
        if extension["type"] != extension_type or extension["version"] != entry.get("version"):
            report.error(f"locked extension metadata mismatch: {extension_id}")
        hash_targets = (
            ("manifestSha256", snapshot / "extension.json"),
            ("profileSha256", extension["entrypoints"]["profile"]),
        )
        for field_name, path in hash_targets:
            if entry.get(field_name) != sha256_file(path):
                report.error(f"locked extension hash mismatch: {extension_id}/{path.name}")
    if not report.errors:
        report.ok("extension selections and immutable snapshots are valid")


def parse_rows(root: Path, report: Report) -> list[dict[str, str]]:
    text = read_required(root / "script.md", report)
    rows: list[dict[str, str]] = []
    for line_number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not re.match(r"^C\d+\|", line):
            continue
        parts = [part.strip() for part in line.split("|")]
        if len(parts) != len(FIELDS):
            report.error(f"script.md:{line_number} has {len(parts)} fields; expected {len(FIELDS)}")
            continue
        rows.append(dict(zip(FIELDS, parts)))
    if not rows:
        report.error("script.md has no canonical cue rows")
    return rows


def target_range(config: dict[str, Any], key: str, default: tuple[int, int]) -> tuple[int, int]:
    value = config.get(key, list(default))
    if isinstance(value, list) and len(value) == 2:
        try:
            return int(value[0]), int(value[1])
        except (TypeError, ValueError):
            pass
    return default


def validate_rows(rows: list[dict[str, str]], config: dict[str, Any], phase: str, report: Report) -> None:
    if not rows:
        return
    cue_ids = [row["cue"] for row in rows]
    if len(cue_ids) != len(set(cue_ids)):
        report.error("cue IDs are not unique")

    scene_numbers: list[int] = []
    invalid_scenes: list[str] = []
    for row in rows:
        try:
            scene_numbers.append(int(row["scene"]))
        except ValueError:
            invalid_scenes.append(row["cue"])
    if invalid_scenes:
        report.error("non-numeric scene numbers: " + ", ".join(invalid_scenes[:8]))

    scene_min, scene_max = target_range(config, "target_scenes", (10, 11))
    cue_min, cue_max = target_range(config, "target_cues", (30, 45))
    scene_count = len(set(scene_numbers))
    if not (scene_min <= scene_count <= scene_max):
        report.error(f"scene count {scene_count} is outside {scene_min}–{scene_max}")
    else:
        report.ok(f"scene count: {scene_count}")
    if not (cue_min <= len(rows) <= cue_max):
        report.error(f"cue count {len(rows)} is outside {cue_min}–{cue_max}")
    else:
        report.ok(f"cue count: {len(rows)}")

    mismatch = [row["cue"] for row in rows if row["caption"] != row["tts"]]
    if mismatch:
        report.error("caption != tts: " + ", ".join(mismatch[:8]) + ("…" if len(mismatch) > 8 else ""))
    else:
        report.ok("every caption is character-identical to TTS")

    dangerous = [row["cue"] for row in rows if "_" in row["caption"] or "_" in row["tts"]]
    if dangerous:
        report.error("spoken/caption text contains underscore: " + ", ".join(dangerous[:8]))
    else:
        report.ok("spoken/caption text contains no underscore")

    critical_fields = ("scene_title", "caption", "tts", "focus", "from", "action", "to", "handoff")
    for field_name in critical_fields:
        bad = [row["cue"] for row in rows if not row[field_name] or contains_placeholder(row[field_name])]
        if bad:
            report.error(f"{field_name} is empty or placeholder in {len(bad)} cue(s): " + ", ".join(bad[:8]) + ("…" if len(bad) > 8 else ""))

    chinese_count = len(re.findall(r"[\u3400-\u9fff]", "".join(row["caption"] for row in rows)))
    char_min, char_max = target_range(config, "target_chinese_characters", (1700, 2200))
    if not (char_min <= chinese_count <= char_max):
        report.error(f"Chinese narration character count {chinese_count} is outside {char_min}–{char_max}")
    else:
        report.ok(f"Chinese narration characters: {chinese_count}")

    opening = rows[0]["caption"]
    opening_terms = config.get("opening_required_terms") or [config.get("previous_topic", ""), config.get("topic", "")]
    missing_opening = [str(term) for term in opening_terms if term and str(term) not in opening]
    if missing_opening:
        report.error("opening cue does not connect/name: " + ", ".join(missing_opening))
    else:
        report.ok("opening cue connects the previous episode and names this topic")

    ending = rows[-1]["caption"]
    ending_terms = config.get("ending_required_terms") or [config.get("next_topic", "")]
    missing_ending = [str(term) for term in ending_terms if term and str(term) not in ending]
    if missing_ending:
        report.error("ending cue does not name: " + ", ".join(missing_ending))
    else:
        report.ok("ending cue names the next episode")

    if phase in {"timed", "candidate", "release"}:
        starts: list[float] = []
        durations: list[float] = []
        timing_bad: list[str] = []
        for row in rows:
            try:
                start = float(row["start"])
                duration = float(row["duration"])
                if start < 0 or duration <= 0:
                    raise ValueError
                starts.append(start)
                durations.append(duration)
            except ValueError:
                timing_bad.append(row["cue"])
        if timing_bad:
            report.error("missing/invalid real timing: " + ", ".join(timing_bad[:8]) + ("…" if len(timing_bad) > 8 else ""))
        else:
            if starts != sorted(starts):
                report.error("cue starts are not monotonic")
            overlaps = [cue_ids[index] for index in range(1, len(rows)) if starts[index] < starts[index - 1] + durations[index - 1] - 0.02]
            if overlaps:
                report.error("cue timing overlaps: " + ", ".join(overlaps[:8]))
            total = starts[-1] + durations[-1]
            duration_min, duration_max = target_range(config, "target_duration_seconds", (300, 420))
            if not (duration_min <= total <= duration_max):
                report.error(f"real cue duration {total:.3f}s is outside {duration_min}–{duration_max}s")
            else:
                report.ok(f"real cue duration: {total:.3f}s")


def validate_documents(root: Path, config: dict[str, Any], phase: str, report: Report) -> None:
    required = (
        "production-brief.md",
        "visual-direction.md",
        "cover-spec.md",
        "animation-map.md",
        "storyboard.md",
        "publish-notes.md",
        "release-acceptance.md",
    )
    docs = {name: read_required(root / name, report) for name in required}

    plan_contract_docs = (
        "production-brief.md",
        "storyboard.md",
        "animation-map.md",
        "visual-direction.md",
        "cover-spec.md",
    )
    incomplete_docs = [name for name in plan_contract_docs if contains_placeholder(docs.get(name, ""))]
    if incomplete_docs:
        report.error("plan contract documents still contain placeholders: " + ", ".join(incomplete_docs))

    visual = docs.get("visual-direction.md", "")
    visual_terms = ("真实旁白时轴", "gsap.timeline({ paused: true })", "钉钉进步体", "Noto Sans SC", "无全画幅扫描线")
    missing_visual = [term for term in visual_terms if term not in visual]
    if missing_visual:
        report.error("visual-direction.md missing contract terms: " + ", ".join(missing_visual))

    cover = docs.get("cover-spec.md", "")
    cover_terms = (
        str(config.get("series", "")),
        f"第 {config.get('season', '')} 季 · 第 {config.get('episode', '')} 集",
        str(config.get("topic", "")),
        "左上角",
        "右上角保持干净",
        "独立生成",
    )
    missing_cover = [term for term in cover_terms if term and term not in cover]
    if missing_cover:
        report.error("cover-spec.md missing hierarchy terms: " + ", ".join(missing_cover))

    index_html = read_required(root / "index.html", report)
    if index_html:
        if not re.search(r"gsap\.timeline\(\{\s*paused\s*:\s*true", index_html):
            report.error("index.html does not define a deterministic paused GSAP timeline")
        if re.search(r"https?://", index_html, flags=re.I):
            report.error("index.html contains remote runtime assets")
        if re.search(r"cue-sweep|scan-line|sweep-mask|full-canvas-sweep", index_html, flags=re.I):
            report.error("index.html contains a prohibited scan/sweep pattern")

    cover_html = read_required(root / "cover.html", report)
    if cover_html:
        if "series-cluster" not in cover_html:
            report.error("cover.html is missing the top-left series cluster")
        if "top-right-badge" in cover_html:
            report.error("cover.html puts a badge in the reserved top-right area")
        for term in (str(config.get("series", "")), str(config.get("topic", ""))):
            if term and term not in cover_html:
                report.error(f"cover.html is missing visible text: {term}")

    if phase in {"candidate", "release"}:
        if "Implement episode-specific scene DOM" in index_html:
            report.error("index.html is still the scaffold shell; implement episode-specific scene DOM/SVG")
        if contains_placeholder(cover_html):
            report.error("cover.html still contains a placeholder mechanism graphic")

    if phase in {"candidate", "release"}:
        publish = docs.get("publish-notes.md", "")
        if contains_placeholder(publish):
            report.error("publish-notes.md still contains placeholders")
        title_match = re.search(r"## 发布标题\s+([^\r\n]+)", publish)
        if not title_match or not re.search(r"[:：]", title_match.group(1)):
            report.error("publish title must use '主题：具体问题或核心结论'")


def parse_decision(text: str) -> str:
    match = re.search(r"release_decision:\s*([a-z_]+)", text)
    return match.group(1) if match else ""


def probe_media(path: Path, report: Report) -> dict[str, Any]:
    executable = shutil.which("ffprobe")
    if not executable:
        report.error("ffprobe is required for candidate/release validation")
        return {}
    result = subprocess.run(
        [executable, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if result.returncode != 0:
        report.error(f"ffprobe failed for {path.name}: {result.stderr.strip()}")
        return {}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        report.error(f"ffprobe returned invalid JSON for {path.name}: {exc}")
        return {}


def validate_artifacts(root: Path, config: dict[str, Any], phase: str, report: Report) -> None:
    if phase == "plan":
        return
    timing = root / ".hyperframes" / "publish" / "narration-timing.json"
    narration = root / ".hyperframes" / "publish" / "narration.wav"
    for path in (timing, narration):
        if not path.is_file() or path.stat().st_size == 0:
            report.error(f"missing or empty timed artifact: {path.relative_to(root)}")
    if phase == "timed":
        return

    candidate = root / "renders" / "candidate.mp4"
    final = root / "renders" / "final.mp4"
    video = final if final.is_file() else candidate
    required_artifacts = (
        root / "renders" / "cover.png",
        root / "renders" / "cover-mobile-preview.png",
        root / "renders" / "contact-sheet.png",
    )
    if not video.is_file() or video.stat().st_size == 0:
        report.error("missing candidate media: renders/candidate.mp4 or renders/final.mp4")
    for path in required_artifacts:
        if not path.is_file() or path.stat().st_size == 0:
            report.error(f"missing or empty artifact: {path.relative_to(root)}")

    acceptance = read_required(root / "release-acceptance.md", report)
    decision = parse_decision(acceptance)
    if decision not in ALLOWED_DECISIONS:
        report.error(f"invalid release_decision: {decision or '(missing)'}")
    if final.is_file() and decision != "passed":
        report.warn("renders/final.mp4 exists, but release_decision is not passed; treat it only as a candidate")
    if phase == "release":
        if decision != "passed":
            report.error("release phase requires release_decision: passed")
        if not final.is_file():
            report.error("release phase requires renders/final.mp4")
        if "- [ ]" in acceptance:
            report.error("release-acceptance.md still has unchecked required items")

    if video.is_file() and video.stat().st_size > 0:
        data = probe_media(video, report)
        streams = data.get("streams", []) if data else []
        video_stream = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
        audio_stream = next((stream for stream in streams if stream.get("codec_type") == "audio"), None)
        if not video_stream:
            report.error("candidate/final MP4 has no video stream")
        else:
            expected_size = (int(config.get("width", 0)), int(config.get("height", 0)))
            actual_size = (int(video_stream.get("width", 0)), int(video_stream.get("height", 0)))
            if actual_size != expected_size:
                report.error(f"video size {actual_size} does not match {expected_size}")
            if video_stream.get("codec_name") != "h264":
                report.error(f"video codec is {video_stream.get('codec_name')}, expected h264")
            if video_stream.get("pix_fmt") != "yuv420p":
                report.error(f"pixel format is {video_stream.get('pix_fmt')}, expected yuv420p")
        if not audio_stream:
            report.error("candidate/final MP4 has no audio stream")
        else:
            if audio_stream.get("codec_name") != "aac":
                report.error(f"audio codec is {audio_stream.get('codec_name')}, expected aac")
            if str(audio_stream.get("sample_rate")) != "48000":
                report.error(f"audio sample rate is {audio_stream.get('sample_rate')}, expected 48000")


def print_report(report: Report, as_json: bool) -> None:
    if as_json:
        print(json.dumps({"errors": report.errors, "warnings": report.warnings, "passed": report.passed}, ensure_ascii=False, indent=2))
        return
    for message in report.passed:
        print(f"PASS  {message}")
    for message in report.warnings:
        print(f"WARN  {message}")
    for message in report.errors:
        print(f"FAIL  {message}")
    print(f"SUMMARY errors={len(report.errors)} warnings={len(report.warnings)} passed={len(report.passed)}")


def main() -> int:
    args = parse_args()
    root = args.episode_dir.resolve()
    report = Report()
    if not root.is_dir():
        report.error(f"episode directory does not exist: {root}")
        print_report(report, args.as_json)
        return 1
    config = load_config(root, report)
    validate_extension_lock(root, config, report)
    rows = parse_rows(root, report)
    validate_rows(rows, config, args.phase, report)
    validate_documents(root, config, args.phase, report)
    validate_artifacts(root, config, args.phase, report)
    print_report(report, args.as_json)
    return 1 if report.errors else 0


if __name__ == "__main__":
    sys.exit(main())
