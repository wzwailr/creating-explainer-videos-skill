#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPOSITORY_ROOT / "python_src"))

from creating_explainer_videos_skill.dist_audit import audit_archives, format_audit


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: audit_python_dist.py ARCHIVE [ARCHIVE ...]", file=sys.stderr)
        return 2
    try:
        result = audit_archives(sys.argv[1:])
    except (OSError, ValueError) as error:
        print(f"ERROR {error}", file=sys.stderr)
        return 1
    print(format_audit(result))
    return 0 if result["valid"] else 1


raise SystemExit(main())
