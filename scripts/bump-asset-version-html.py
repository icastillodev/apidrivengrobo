"""One-off: bump cache-bust query on front HTML. Edit V and run: python scripts/bump-asset-version-html.py"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "front"
V = "20260409"


def main() -> None:
    for p in ROOT.rglob("*.html"):
        t = p.read_text(encoding="utf-8")
        o = t
        # unify old ?v=20260xxx to new
        t = re.sub(r"\?v=20260[0-9]{3}[a-z]?", f"?v={V}", t)
        t = re.sub(r"auth\.js\?v1\b", f"auth.js?v={V}", t)
        t = re.sub(r"\.js\?v1\b", f".js?v={V}", t)
        # dist/js/auth.js (evita coincidir con superAuth.js u otros)
        t = re.sub(
            rf"(from\s+['\"])([^'\"]*dist/js/auth\.js)(?!\?v=)(['\"])",
            rf"\1\2?v={V}\3",
            t,
        )
        # bare *.js en import (no ?v aún)
        for name in (
            "i18n.js",
            "capacitacion.js",
            "LoaderComponent.js",
            "NotificationManager.js",
        ):
            pat = rf"(from\s+['\"])([^'\"]*{re.escape(name)})(?!\?v=)(['\"])"
            t = re.sub(pat, rf"\1\2?v={V}\3", t)
        # CSS href (cualquier profundidad hacia dist/style/css/)
        def _css_href(m: re.Match[str]) -> str:
            q, path = m.group(1), m.group(2)
            if "?v=" in path or "dist/style/css/" not in path:
                return m.group(0)
            return f"href={q}{path}?v={V}{q}"

        t = re.sub(r'href=(["\'])([^"\']*dist/style/css/[^"\']*\.css)\1', _css_href, t)
        if t != o:
            p.write_text(t, encoding="utf-8")
            print("updated", p.relative_to(ROOT))


if __name__ == "__main__":
    main()
