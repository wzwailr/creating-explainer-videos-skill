#!/usr/bin/env python3
"""Self-test the scaffold and validator using temporary episode data."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCAFFOLD = SKILL_ROOT / "scripts" / "scaffold_episode.py"
VALIDATOR = SKILL_ROOT / "scripts" / "validate_episode.py"


def run(command: list[str], expected: int) -> subprocess.CompletedProcess[str]:
    environment = os.environ.copy()
    environment["PYTHONUTF8"] = "1"
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=environment,
        check=False,
    )
    if result.returncode != expected:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise AssertionError(f"expected exit {expected}, got {result.returncode}: {' '.join(command)}")
    return result


def build_valid_rows() -> str:
    rows = []
    start = 0.0
    for index in range(40):
        cue = f"C{index + 1:03d}"
        scene = min(11, (index * 11) // 40 + 1)
        if index == 0:
            caption = "上一集，我们讲清了模型评测；这一集，我们继续拆解推荐系统，回答候选召回、特征排序和反馈学习怎样把用户行为变成下一条内容。"
        elif index == 39:
            caption = "下一集，我们将进入扩散模型，继续回答噪声怎样一步步还原成结构清晰的图像，以及训练目标为什么能够指导反向生成。"
        else:
            caption = f"第{index + 1}个知识动作让输入经过可见步骤，改变状态并交给下一环节；观众能复述它为什么成立，以及失败时会发生什么。"
        duration = 9.0
        fields = [
            cue,
            str(scene),
            f"{start:.3f}",
            f"{duration:.3f}",
            "+10%",
            "+0Hz",
            f"Scene {scene:02d}｜机制步骤 {scene}",
            caption,
            caption,
            f"focus-{cue.lower()}",
            "输入对象处于上一步稳定状态",
            "执行当前知识变化并突出相关对象",
            "本步结论稳定可读",
            "下一条线索",
        ]
        rows.append("|".join(fields))
        start += duration
    return (
        "# Self-test script\n\n"
        "格式：cue|scene|start|duration|rate|pitch|scene_title|caption|tts|focus|from|action|to|handoff\n\n"
        + "\n".join(rows)
        + "\n"
    )


def complete_plan_documents(episode: Path) -> None:
    for name in (
        "production-brief.md",
        "storyboard.md",
        "animation-map.md",
        "visual-direction.md",
        "cover-spec.md",
    ):
        path = episode / name
        text = path.read_text(encoding="utf-8")
        text = text.replace("待写", "机制合同已完成")
        text = text.replace("待补", "内容已补齐")
        text = text.replace("待按", "已按")
        path.write_text(text, encoding="utf-8", newline="\n")


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="ai-principle-video-skill-") as temp:
        episode = Path(temp) / "episode"
        run(
            [
                sys.executable,
                str(SCAFFOLD),
                str(episode),
                "--season",
                "2",
                "--episode",
                "19",
                "--topic",
                "推荐系统",
                "--slug",
                "recommendation-system",
                "--previous",
                "模型评测",
                "--next",
                "扩散模型",
                "--answer",
                "候选召回、特征排序和反馈学习共同完成个性化选择",
            ],
            expected=0,
        )
        baseline = run([sys.executable, str(VALIDATOR), str(episode), "--phase", "plan"], expected=1)
        if "placeholder" not in baseline.stdout and "待写" not in baseline.stdout:
            raise AssertionError("fresh scaffold did not fail on incomplete cue content")

        (episode / "script.md").write_text(build_valid_rows(), encoding="utf-8", newline="\n")
        complete_plan_documents(episode)
        valid = run([sys.executable, str(VALIDATOR), str(episode), "--phase", "plan"], expected=0)
        if "caption is character-identical" not in valid.stdout:
            raise AssertionError("valid contract did not report caption/TTS identity")

        broken = (episode / "script.md").read_text(encoding="utf-8")
        broken = broken.replace("下一条线索|", "下一条线索|", 1)
        first_row = next(line for line in broken.splitlines() if line.startswith("C001|"))
        fields = first_row.split("|")
        fields[8] = fields[8] + "_unsafe"
        broken = broken.replace(first_row, "|".join(fields), 1)
        (episode / "script.md").write_text(broken, encoding="utf-8", newline="\n")
        guard = run([sys.executable, str(VALIDATOR), str(episode), "--phase", "plan"], expected=1)
        if "caption != tts" not in guard.stdout or "underscore" not in guard.stdout:
            raise AssertionError("validator did not catch subtitle mismatch and spoken underscore")

    print("PASS scaffold fails safely, valid contract passes, mismatch/underscore guards fail correctly")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
