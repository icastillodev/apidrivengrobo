#!/usr/bin/env python3
"""Prepara solo archivos ya aprobados en staging para el desplegador controlado."""
from pathlib import Path
import hashlib
import json
import shutil

ops = Path("/home/geckosadm/grobo-ops")
src = ops / "staging-security-8adf4ad"
dst = ops / "incoming" / "current"
if not src.is_dir() or not (src / "api" / "src" / "Utils" / "JwtSigningKey.php").exists():
    raise SystemExit("SOURCE_SECURITY_RELEASE_MISSING")
if dst.exists() and any(dst.iterdir()):
    raise SystemExit("INCOMING_ALREADY_POPULATED_DO_NOT_OVERWRITE")
dst.mkdir(parents=True, exist_ok=True)
items = []
for file in sorted((src / "api").rglob("*.php")):
    rel = file.relative_to(src)
    if file.is_symlink():
        raise SystemExit("SOURCE_SYMLINK_REFUSED")
    raw = file.read_bytes()
    path = dst / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(file, path)
    items.append({"path": rel.as_posix(), "sha256": hashlib.sha256(raw).hexdigest()})
if len(items) != 13:
    raise SystemExit("WRONG_SECURITY_FILE_COUNT")
manifest = {"release_id": "security-8adf4ad", "files": items}
(dst / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print("GROBO_INCOMING_MANIFEST_READY files=" + str(len(items)))
