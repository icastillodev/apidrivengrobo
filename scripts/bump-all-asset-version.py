"""Sustituye ?v=YYYYMMDD por un nuevo token en front/**/*.html y front/**/*.js (cache-bust global)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "front"
NEW_V = "20260703"


def bump_text(t: str) -> str:
    t = re.sub(r"\?v=20\d{6}[a-z]?", f"?v={NEW_V}", t)
    t = re.sub(r"ASSET_VERSION = '20\d{6}'", f"ASSET_VERSION = '{NEW_V}'", t)
    t = re.sub(r"POE_ASSET_VERSION = '20\d{6}'", f"POE_ASSET_VERSION = '{NEW_V}'", t)
    return t


def main() -> None:
    n = 0
    for p in ROOT.rglob("*"):
        if "node_modules" in p.parts:
            continue
        if p.suffix.lower() not in (".html", ".js"):
            continue
        t = p.read_text(encoding="utf-8")
        t2 = bump_text(t)
        if t2 != t:
            p.write_text(t2, encoding="utf-8")
            n += 1
            print("updated", p.relative_to(ROOT.parent))
    print("bump-all-asset-version:", n, "files -> ?v=" + NEW_V)


if __name__ == "__main__":
    main()
