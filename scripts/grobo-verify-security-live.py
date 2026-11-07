#!/usr/bin/env python3
"""Comparacion de solo lectura entre staging firmado y archivos de GROBO."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ops=Path("/home/geckosadm/grobo-ops")
live=Path("/var/www/html/core-backend-gem")
incoming=ops/"incoming"/"current"
manifest=json.loads((incoming/"manifest.json").read_text())
count=0;errors=[]
for item in manifest["files"]:
    relative=item["path"]
    if not relative.startswith("api/"):
        errors.append("UNEXPECTED_PACKAGE_PATH")
        continue
    file=live/relative[4:]
    if not file.is_file() or file.is_symlink():
        errors.append("MISSING_FILE")
        continue
    content=file.read_bytes()
    sha=hashlib.sha256(content).hexdigest()
    if sha!=item["sha256"]:
        errors.append("HASH_MISMATCH")
        continue
    if file.suffix==".php":
        result=subprocess.run(["php","-l",str(file)],capture_output=True,text=True)
        if result.returncode:
            errors.append("PHP_SYNTAX_ERROR")
            continue
    count+=1
print(f"GROBO_SECURITY_LIVE_COMPARE expected={len(manifest['files'])} matched={count} errors={len(errors)}")
for err in errors: print("CHECK_ERROR="+err)
raise SystemExit(0 if count==13 and not errors else 2)
