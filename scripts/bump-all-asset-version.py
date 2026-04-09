"""Sustituye ?v=20260406 por un nuevo token en front/**/*.html y front/**/*.js (cache-bust global)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "front"
OLD_V = "?v=20260406"
NEW_V = "?v=20260408"


def bump_text(t: str) -> str:
    t = t.replace(OLD_V, NEW_V)
    t = t.replace("ASSET_VERSION = '20260406'", "ASSET_VERSION = '20260408'")
    t = t.replace("buscar 20260406", "buscar 20260408")
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
    print("bump-all-asset-version:", n, "files", OLD_V, "->", NEW_V)


if __name__ == "__main__":
    main()
