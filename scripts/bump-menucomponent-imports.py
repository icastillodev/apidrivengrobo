"""Add ?v=20260406 to MenuComponent.js imports missing query string."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "front"
V = "20260406"


def main() -> None:
    pat = re.compile(
        r"(from\s+['\"](?:\.\./)*dist/js/components/MenuComponent\.js)(?!\?v=)(['\"])"
    )
    for p in ROOT.rglob("*.html"):
        t = p.read_text(encoding="utf-8")
        t2 = pat.sub(rf"\1?v={V}\2", t)
        if t2 != t:
            p.write_text(t2, encoding="utf-8")
            print("updated", p.relative_to(ROOT))


if __name__ == "__main__":
    main()
