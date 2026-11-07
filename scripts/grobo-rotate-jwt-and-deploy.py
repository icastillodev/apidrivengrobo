#!/usr/bin/env python3
"""Una operación administrativa autorizada: valida esquema, rota JWT y aplica release.
Requiere sudo interactivo; el único cambio de datos es JWT_SECRET en .env.
No escribe ni imprime secretos en terminal o Git.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import stat
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

OPS=Path("/home/geckosadm/grobo-ops")
ENV=Path("/var/www/html/core-backend-gem/.env")
INCOMING=OPS/"incoming/current"
ROOT_HELPER=Path("/usr/local/sbin/grobo-deploy-apply")
CHECK_HELPER=Path("/usr/local/sbin/grobo-deploy-check")
JWT_CHECK=OPS/"grobo-check-jwt-secret.php"
DB_CHECK=OPS/"grobo-db-schema-preflight.php"
JWT_TEST=OPS/"grobo-jwt-verify-signature.php"
EXPECTED_RELEASE="security-8adf4ad"
OLD_FALLBACK="TuClaveSuperSecretaGROBO2026"

def stop(label):
    print(label)
    raise SystemExit(2)

def run(cmd, success_label, allow_output=False):
    r=subprocess.run(cmd,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if r.returncode:
        stop(success_label.replace("_OK","_FAILED"))
    if allow_output:
        # Only commands with known, no-secret output.
        print((r.stdout or "").strip())
    else:
        print(success_label)
    return r

def inspect_manifest():
    if not INCOMING.is_dir() or INCOMING.is_symlink():
        stop("GROBO_FULL_RELEASE_NOT_READY")
    manifest_path=INCOMING/"manifest.json"
    if not manifest_path.is_file() or manifest_path.is_symlink():
        stop("GROBO_MANIFEST_INVALID")
    manifest=json.loads(manifest_path.read_text())
    if manifest.get("release_id")!=EXPECTED_RELEASE or len(manifest.get("files",[]))!=13:
        stop("GROBO_WRONG_RELEASE_MANIFEST")
    hashes=set()
    for item in manifest["files"]:
        rel=item["path"]
        fp=INCOMING/rel
        if rel in hashes or not fp.is_file() or fp.is_symlink():
            stop("GROBO_STAGE_CONTENT_INVALID")
        hashes.add(rel)
        if hashlib.sha256(fp.read_bytes()).hexdigest()!=item["sha256"]:
            stop("GROBO_STAGE_HASH_MISMATCH")
        if fp.suffix==".php":
            run(["/usr/bin/php","-l",str(fp)],"PHP_STAGE_SYNTAX_OK")
    print("GROBO_FULL_RELEASE_VERIFIED files=13")

def jwt_current_state():
    if not ENV.is_file() or ENV.is_symlink():
        stop("GROBO_ENV_INVALID")
    raw=ENV.read_text(encoding="utf-8")
    all_lines=raw.splitlines(keepends=True)
    entries=[]
    for idx,line in enumerate(all_lines):
        match=re.match(r"^\s*JWT_SECRET\s*=(.*?)(?:\r?\n)?$",line)
        if match: entries.append((idx,match.group(1).strip().strip(chr(34)).strip(chr(39))))
    if len(entries)!=1:
        stop("GROBO_JWT_ENV_MISSING_OR_DUPLICATE")
    old=entries[0][1]
    return raw,all_lines,entries[0][0],not (len(old)>=32 and old!=OLD_FALLBACK)

def secure_rotation(raw,lines,index):
    print("GROBO_ACTIVE_JWT_SESSIONS_WILL_BE_INVALIDATED")
    answer=input("Escribi ROTAR para confirmar cierre de sesiones y publicacion: ").strip()
    if answer!="ROTAR":
        stop("GROBO_ROTATION_NOT_AUTHORIZED")
    stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup=Path("/root/grobo-jwt-before-rotation-"+stamp)
    backup.mkdir(mode=0o700,exist_ok=False)
    original=backup/"production.env"
    shutil.copy2(ENV,original)
    original.chmod(0o600)
    st=ENV.stat()
    key=secrets.token_hex(32)
    lines[index]="JWT_SECRET="+key+"\n"
    updated="".join(lines)
    fd,tmp=tempfile.mkstemp(prefix=".grobo-jwt-rotation-",dir=ENV.parent)
    try:
        os.fchown(fd,st.st_uid,st.st_gid)
        os.fchmod(fd,stat.S_IMODE(st.st_mode))
        with os.fdopen(fd,"w",encoding="utf-8") as f:
            f.write(updated)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp,ENV)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
    print("GROBO_JWT_ROTATED_BACKUP_PROTECTED")
    run(["/usr/bin/php",str(JWT_CHECK)],"JWT_SECRET_PREFLIGHT_OK")
    return backup

def main():
    if len(sys.argv)!=2 or sys.argv[1]!="--run":
        stop("GROBO_INVALID_INVOCATION")
    if os.geteuid()!=0 or os.getenv("SUDO_USER")!="geckosadm":
        stop("GROBO_INTERACTIVE_SUDO_REQUIRED")
    for file in [JWT_CHECK,DB_CHECK,JWT_TEST,ROOT_HELPER,CHECK_HELPER]:
        if not file.is_file() or file.is_symlink():
            stop("GROBO_REQUIRED_FILE_INVALID")
    if not ROOT_HELPER.stat().st_uid==0:
        stop("GROBO_DEPLOY_HELPER_NOT_ROOT_OWNED")
    inspect_manifest()
    run(["/usr/sbin/php-fpm8.3","-t"],"PHP_FPM_SYNTAX_OK")
    run(["/usr/sbin/nginx","-t"],"NGINX_SYNTAX_OK")
    run(["/usr/bin/php",str(DB_CHECK)],"DATABASE_READONLY_SCHEMA_OK")
    raw, lines, index, needs_rotation=jwt_current_state()
    if needs_rotation:
        secure_rotation(raw,lines,index)
    else:
        print("GROBO_JWT_ALREADY_STRONG_NO_ROTATION")
        run(["/usr/bin/php",str(JWT_CHECK)],"JWT_SECRET_PREFLIGHT_OK")
    run([str(CHECK_HELPER)],"GROBO_MANIFEST_CHECK_OK")
    run([str(ROOT_HELPER)],"GROBO_FULL_BACKEND_DEPLOY_OK",allow_output=True)
    run(["/usr/bin/php",str(JWT_TEST)],"GROBO_NEW_JWT_SIGNATURE_OK",allow_output=True)
    run(["/usr/bin/php",str(DB_CHECK)],"GROBO_DATABASE_SCHEMA_POSTCHECK_OK")
    for url in ["https://app.groboapp.com/urbe/","https://app.groboapp.com/cupae/"]:
        run(["/usr/bin/curl","-fLsS","--connect-timeout","6","--max-time","15",
             "-o","/dev/null",url],"GROBO_PUBLIC_WEB_OK")
    print("GROBO_ROTATION_AND_FULL_SECURITY_DEPLOY_DONE")

if __name__=="__main__":
    try:
        main()
    except (EOFError,KeyboardInterrupt):
        stop("GROBO_OPERATOR_CANCELLED")
    except SystemExit:
        raise
    except Exception as exc:
        # Never include exception details: paths or secrets could be embedded.
        print("GROBO_OPERATION_FAILED type="+type(exc).__name__)
        raise SystemExit(2)
