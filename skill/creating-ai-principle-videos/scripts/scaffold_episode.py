#!/usr/bin/env python3
"""Create a portable AI-principle video episode contract and renderer shell."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

from extension_catalog import EXTENSION_API_VERSION, load_extension


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--season", type=int, required=True)
    parser.add_argument("--episode", type=int, required=True)
    parser.add_argument("--topic", required=True)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--previous", required=True, dest="previous_topic")
    parser.add_argument("--next", required=True, dest="next_topic")
    parser.add_argument("--series", default="AI 底层原理图解")
    parser.add_argument("--question")
    parser.add_argument("--answer", default="待写")
    parser.add_argument("--next-value", default="它如何承接本集输出并继续完整机制链")
    parser.add_argument("--style", choices=("ink", "paper"), help="Legacy alias for the built-in visual extension")
    parser.add_argument("--visual", help="Visual extension id")
    parser.add_argument("--voice", default="neutral-technical-zh", help="Voice extension id")
    parser.add_argument("--research", default="ai-primary-research", help="Research extension id")
    parser.add_argument("--qc", default="strict-release-qc", help="QC extension id")
    parser.add_argument("--publishing", default="douyin-release", help="Publishing extension id")
    parser.add_argument("--aspect", choices=("16:9", "9:16"), default="16:9")
    parser.add_argument("--scenes", type=int, default=11)
    parser.add_argument("--cues", type=int, default=40)
    parser.add_argument("--fps", type=int, default=30)
    return parser.parse_args()


def ensure_safe_args(args: argparse.Namespace) -> None:
    if args.season < 1 or args.episode < 1:
        raise SystemExit("season and episode must be positive")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", args.slug):
        raise SystemExit("slug must use lowercase letters, digits, and hyphens")
    if args.scenes < 1 or args.cues < args.scenes:
        raise SystemExit("cues must be at least the number of scenes")
    if args.output_dir.exists() and any(args.output_dir.iterdir()):
        raise SystemExit(f"output directory is not empty: {args.output_dir}")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8", newline="\n")


def render_template(asset_dir: Path, name: str, values: dict[str, str]) -> str:
    content = (asset_dir / name).read_text(encoding="utf-8")
    for key, value in values.items():
        content = content.replace("{{" + key + "}}", value)
    unresolved = sorted(set(re.findall(r"\{\{([A-Z0-9_]+)\}\}", content)))
    if unresolved:
        raise RuntimeError(f"unresolved template keys in {name}: {', '.join(unresolved)}")
    return content


def scene_for_cue(cue_index: int, cue_count: int, scene_count: int) -> int:
    return min(scene_count, (cue_index * scene_count) // cue_count + 1)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    args = parse_args()
    ensure_safe_args(args)

    width, height = (1920, 1080) if args.aspect == "16:9" else (1080, 1920)
    question = args.question or f"{args.topic}的输入、内部变化和输出为什么成立？"
    episode_padded = f"{args.episode:02d}"
    root = args.output_dir.resolve()
    skill_root = Path(__file__).resolve().parents[1]
    asset_dir = skill_root / "assets"

    visual_id = args.visual or ("paper-theatre" if args.style == "paper" else "ink-explainer")
    selections = {
        "visual": load_extension(skill_root, visual_id, "visual"),
        "voice": load_extension(skill_root, args.voice, "voice"),
        "research": load_extension(skill_root, args.research, "research"),
        "qc": load_extension(skill_root, args.qc, "qc"),
        "publishing": load_extension(skill_root, args.publishing, "publishing"),
    }
    visual_profile = selections["visual"]["profile"]
    voice_profile = selections["voice"]["profile"]
    style = visual_profile["style"]
    style_name = visual_profile.get("styleName", selections["visual"]["displayName"])
    speech_rate = voice_profile.get("rate", "+10%")
    speech_pitch = voice_profile.get("pitch", "+0Hz")

    root.mkdir(parents=True, exist_ok=True)
    for directory in ("assets", "renders", "evidence", ".hyperframes/publish"):
        (root / directory).mkdir(parents=True, exist_ok=True)

    values = {
        "SERIES": args.series,
        "SEASON": str(args.season),
        "EPISODE": str(args.episode),
        "EPISODE_PADDED": episode_padded,
        "TOPIC": args.topic,
        "SLUG": args.slug,
        "PREVIOUS_TOPIC": args.previous_topic,
        "NEXT_TOPIC": args.next_topic,
        "NEXT_VALUE": args.next_value,
        "QUESTION": question,
        "ANSWER": args.answer,
        "STYLE_NAME": style_name,
        "VISUAL_EXTENSION": selections["visual"]["id"],
        "VOICE_EXTENSION": selections["voice"]["id"],
        "RESEARCH_EXTENSION": selections["research"]["id"],
        "QC_EXTENSION": selections["qc"]["id"],
        "PUBLISHING_EXTENSION": selections["publishing"]["id"],
        "WIDTH": str(width),
        "HEIGHT": str(height),
        "FPS": str(args.fps),
        "SCENES": str(args.scenes),
        "CUES": str(args.cues),
    }

    config = {
        "id": f"{args.slug}-s{args.season:02d}e{episode_padded}",
        "series": args.series,
        "season": args.season,
        "episode": args.episode,
        "slug": args.slug,
        "topic": args.topic,
        "question": question,
        "answer": args.answer,
        "previous_topic": args.previous_topic,
        "next_topic": args.next_topic,
        "next_value": args.next_value,
        "style": style,
        "extensions": {extension_type: extension["id"] for extension_type, extension in selections.items()},
        "width": width,
        "height": height,
        "fps": args.fps,
        "target_scenes": [10, 11],
        "target_cues": [30, 45],
        "target_chinese_characters": [1700, 2200],
        "target_duration_seconds": [300, 420],
        "opening_required_terms": [args.previous_topic, args.topic],
        "ending_required_terms": [args.next_topic],
        "release_decision": "not_assessed",
    }
    write_text(root / "episode.json", json.dumps(config, ensure_ascii=False, indent=2))

    template_outputs = {
        "production-brief.template.md": "production-brief.md",
        "visual-direction.template.md": "visual-direction.md",
        "cover-spec.template.md": "cover-spec.md",
        "release-acceptance.template.md": "release-acceptance.md",
        "publish-notes.template.md": "publish-notes.md",
        "renderer-shell.template.html": "index.html",
        "cover-shell.template.html": "cover.html",
    }
    for template_name, output_name in template_outputs.items():
        write_text(root / output_name, render_template(asset_dir, template_name, values))

    token_source = selections["visual"]["root"] / visual_profile["tokenAsset"]
    shutil.copyfile(token_source, root / "assets" / "style-tokens.css")

    locked_extensions = []
    for extension_type, extension in selections.items():
        snapshot_root = root / "extensions" / extension["id"]
        shutil.copytree(extension["root"], snapshot_root)
        locked_extensions.append(
            {
                "id": extension["id"],
                "type": extension_type,
                "version": extension["version"],
                "manifestSha256": sha256_file(extension["root"] / "extension.json"),
                "profileSha256": sha256_file(extension["entrypoints"]["profile"]),
            }
        )
    extension_lock = {
        "apiVersion": EXTENSION_API_VERSION,
        "selections": {extension_type: extension["id"] for extension_type, extension in selections.items()},
        "extensions": locked_extensions,
    }
    write_text(root / "extensions.lock.json", json.dumps(extension_lock, ensure_ascii=False, indent=2))

    header = (
        f"# S{args.season:02d}E{episode_padded} {args.topic} 统一旁白与视觉 cue\n\n"
        "格式：cue|scene|start|duration|rate|pitch|scene_title|caption|tts|focus|from|action|to|handoff\n\n"
    )
    rows: list[str] = []
    animation_rows: list[str] = []
    for index in range(args.cues):
        cue_number = index + 1
        cue_id = f"C{cue_number:03d}"
        scene = scene_for_cue(index, args.cues, args.scenes)
        scene_title = f"Scene {scene:02d}｜待写本幕机制任务"
        if cue_number == 1:
            caption = f"上一集，我们讲清了{args.previous_topic}；这一集，我们继续拆解{args.topic}，回答{question}"
            focus = "episode-bridge-and-question"
            from_state = "上一集输出仍在画面中"
            action = "把上一集输出交给本集核心机制并圈出问题"
            to_state = "本集主题和问题同时稳定可读"
            handoff = "本集输入对象"
        elif cue_number == args.cues:
            caption = f"下一集，我们将进入{args.next_topic}，继续回答{args.next_value}。"
            focus = "next-episode-handoff"
            from_state = "本集机制结论"
            action = "回收本集链路并翻页到下一主题"
            to_state = "下一集主题与价值完整可读"
            handoff = args.next_topic
        else:
            caption = f"待写 {cue_id}：只讲一个知识动作，并让观众看见输入、内部变化或输出。"
            focus = f"待写-focus-{cue_id.lower()}"
            from_state = "待写起始状态"
            action = "待写语义动作"
            to_state = "待写结束状态"
            handoff = "待写交接对象"
        fields = [
            cue_id,
            str(scene),
            "",
            "",
            speech_rate,
            speech_pitch,
            scene_title,
            caption,
            caption,
            focus,
            from_state,
            action,
            to_state,
            handoff,
        ]
        rows.append("|".join(fields))
        animation_rows.append(f"| {cue_id} | {scene} | {focus} | {action} | {handoff} |")
    write_text(root / "script.md", header + "\n".join(rows))

    animation_map = (
        f"# S{args.season:02d}E{episode_padded} 动画语义映射\n\n"
        "| Cue | Scene | Focus | 视觉动作 | Handoff |\n"
        "| --- | ---: | --- | --- | --- |\n"
        + "\n".join(animation_rows)
    )
    write_text(root / "animation-map.md", animation_map)

    storyboard_sections = []
    for scene in range(1, args.scenes + 1):
        storyboard_sections.append(
            f"## Scene {scene:02d}\n\n"
            "- 观众理解变化：待写\n"
            "- 输入：待写\n"
            "- 内部变化：待写\n"
            "- 输出：待写\n"
            "- 机制画面：待写\n"
            "- 构图任务：待写\n"
        )
    write_text(root / "storyboard.md", f"# S{args.season:02d}E{episode_padded} 分镜\n\n" + "\n".join(storyboard_sections))

    write_text(
        root / "hyperframes.json",
        json.dumps({"entry": "index.html", "output": "renders", "fps": args.fps, "quality": "high"}, indent=2),
    )
    write_text(
        root / "pronunciation-notes.md",
        "# 发音与口播映射\n\n| 屏幕写法 | 口播与字幕 | 验证结果 |\n| --- | --- | --- |\n| 待写 | 待写 | not_assessed |",
    )
    write_text(
        root / "assets" / "THIRD_PARTY_ASSETS.md",
        "# 第三方资产边界\n\n- GSAP 核心与插件：按许可证从合法来源安装到本目录，保持兼容版本并记录哈希。\n- 钉钉进步体 / DingTalk Sans：仅调用合法安装的系统字体，不随本 Skill 分发。\n- Noto Sans SC：使用前记录来源与许可证。\n- 音乐、音效、图片：逐项记录来源、许可证和用途。",
    )
    write_text(
        root / "README.md",
        f"# S{args.season:02d}E{episode_padded} {args.topic}\n\n"
        f"扩展锁：视觉 `{selections['visual']['id']}`、声音 `{selections['voice']['id']}`、调研 `{selections['research']['id']}`、QC `{selections['qc']['id']}`、发布 `{selections['publishing']['id']}`。\n\n"
        "1. 填完生产简报、事实表、完整旁白和逐 cue 语义合同。\n"
        "2. 运行 Skill 的 `validate_episode.py --phase plan`。\n"
        "3. 生成真实 TTS，将时间写回 `script.md` 和 `narration-timing.json`。\n"
        "4. 按本集机制重做 `index.html` 与 `cover.html`，再进入渲染与发布 QC。\n",
    )

    print(f"Scaffolded episode at {root}")
    print("Expected next result: plan validation should fail until all '待写' cue fields are completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
