#!/usr/bin/env python3
"""Prepara exactamente tres archivos de seguridad independientes de JWT."""
from pathlib import Path
import hashlib, json, shutil, os

ops=Path("/home/geckosadm/grobo-ops")
incoming=ops/"incoming"
stage=ops/"staging-security-8adf4ad"
current=incoming/"current"
held=incoming/"pending-jwt-8adf4ad"
new=incoming/".phase1-staged-8adf4ad"
paths=[
"api/src/Controllers/AdminConfigReservasController.php",
"api/src/Models/AdminConfig/AdminConfigReservasModel.php",
"api/src/Models/Protocol/ProtocolModel.php",
]
if not stage.is_dir() or not current.is_dir():
    raise SystemExit("PHASE1_STAGE_NOT_AVAILABLE")
manifest=json.loads((current/"manifest.json").read_text())
if manifest.get("release_id") != "security-8adf4ad" or len(manifest.get("files",[]))!=13:
    raise SystemExit("CURRENT_MANIFEST_NOT_EXPECTED")
if held.exists() or new.exists():
    raise SystemExit("PHASE1_PREVIOUS_ATTEMPT_REQUIRES_REVIEW")
new.mkdir(mode=0o700)
items=[]
for rel in paths:
    src=stage/rel
    if not src.is_file() or src.is_symlink():
        raise SystemExit("MISSING_SAFETY_FILE")
    data=src.read_bytes()
    file=new/rel
    file.parent.mkdir(parents=True,exist_ok=True)
    file.write_bytes(data)
    items.append({"path":rel,"sha256":hashlib.sha256(data).hexdigest()})
(new/"manifest.json").write_text(json.dumps({"release_id":"tenant-reservas-phase1-8adf4ad","files":items},indent=2)+"\n")
current.rename(held)
try:
    new.rename(current)
except Exception:
    held.rename(current)
    raise
print("SAFE_PHASE1_READY files=3 previous_manifest_preserved=yes")
