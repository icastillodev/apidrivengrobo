#!/usr/bin/env python3
"""GROBO: despliegue acotado a codigo web, sin shell ni SQL ni migraciones.

Solo root puede instalar y ejecutar este archivo. El usuario SSH puede dejar
un manifiesto JSON en incoming/current; no puede modificar el ejecutor.
La instalacion solo escribe en dos arboles permitidos de la aplicacion.
"""
import hashlib
import json
import os
import pathlib
import pwd
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

INCOMING = pathlib.Path("/home/geckosadm/grobo-ops/incoming/current")
API_ROOT = pathlib.Path("/var/www/html/core-backend-gem")
FRONT_ROOT = pathlib.Path("/var/www/html/app")
BACKUP_ROOT = pathlib.Path("/root")
JWT_PREFLIGHT = "/usr/local/libexec/grobo/check-jwt.php"
ALLOWED_SUFFIXES = {
    ".php", ".js", ".html", ".css", ".json", ".svg",
    ".png", ".jpg", ".jpeg", ".webp", ".woff2", ".ico",
}
AUTH_SENSITIVE = {
    "api/index.php",
    "api/src/Controllers/AuthController.php",
    "api/src/Utils/Auditoria.php",
    "api/src/Utils/JwtSigningKey.php",
    "api/src/Utils/AuthenticationException.php",
    "api/src/Utils/ApiExceptionHandler.php",
}
MAX_FILES = 250
MAX_SINGLE = 5 * 1024 * 1024
MAX_TOTAL = 50 * 1024 * 1024


def fail(message):
    raise RuntimeError(message)


def run(*args):
    return subprocess.run(args, check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def reject_symlink_ancestors(path, min_root):
    cursor = path
    while cursor != min_root.parent:
        if cursor.is_symlink():
            fail("SYMLINK_NOT_ALLOWED")
        if cursor == min_root:
            break
        cursor = cursor.parent


def read_safe_file(root, relative):
    src = root.joinpath(*relative.parts)
    reject_symlink_ancestors(src, root)
    fd = os.open(src, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_SINGLE:
            fail("SOURCE_FILE_INVALID")
        with os.fdopen(fd, "rb", closefd=False) as f:
            data = f.read(MAX_SINGLE + 1)
        if len(data) > MAX_SINGLE:
            fail("SOURCE_TOO_LARGE")
        return data
    finally:
        os.close(fd)


def validate_relative(value):
    if not isinstance(value, str) or len(value) > 240 or "\\" in value:
        fail("INVALID_RELATIVE_PATH")
    p = pathlib.PurePosixPath(value)
    if p.is_absolute() or not p.parts:
        fail("INVALID_RELATIVE_PATH")
    for part in p.parts:
        if part in (".", "..") or part.startswith(".") or not re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9_.-]*", part):
            fail("INVALID_PATH_COMPONENT")
    if p.suffix.lower() not in ALLOWED_SUFFIXES:
        fail("UNSUPPORTED_FILE_TYPE")
    if p.parts[0] == "api":
        if not (len(p.parts) >= 3 and p.parts[1] == "src") and str(p) not in (
            "api/index.php", "api/routes.php", "api/autoload.php"
        ):
            fail("API_PATH_NOT_ALLOWED")
        return p, API_ROOT, pathlib.PurePosixPath(*p.parts[1:])
    if p.parts[0] == "front" and len(p.parts) >= 2:
        return p, FRONT_ROOT, pathlib.PurePosixPath(*p.parts[1:])
    fail("DESTINATION_OUTSIDE_ALLOWED_APP")


def prepare():
    if INCOMING.is_symlink() or INCOMING.parent.is_symlink() or not INCOMING.is_dir():
        fail("INCOMING_DIRECTORY_INVALID")
    manifest_data = read_safe_file(INCOMING, pathlib.PurePosixPath("manifest.json"))
    if len(manifest_data) > 2 * 1024 * 1024:
        fail("MANIFEST_TOO_LARGE")
    manifest = json.loads(manifest_data)
    if not isinstance(manifest, dict):
        fail("MANIFEST_BAD_SCHEMA")
    version = manifest.get("release_id")
    if not isinstance(version, str) or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]{2,63}", version):
        fail("INVALID_RELEASE_ID")
    inputs = manifest.get("files")
    if not isinstance(inputs, list) or not 1 <= len(inputs) <= MAX_FILES:
        fail("MANIFEST_INVALID_FILE_COUNT")
    seen = set()
    blobs = []
    total = 0
    for item in inputs:
        if not isinstance(item, dict):
            fail("INVALID_FILE_ENTRY")
        full, dest_root, target_rel = validate_relative(item.get("path"))
        name = str(full)
        if name in seen:
            fail("DUPLICATE_PATH")
        seen.add(name)
        sha = item.get("sha256")
        if not isinstance(sha, str) or re.fullmatch(r"[a-f0-9]{64}", sha) is None:
            fail("INVALID_HASH")
        data = read_safe_file(INCOMING, full)
        if hashlib.sha256(data).hexdigest() != sha:
            fail("FILE_CHECKSUM_MISMATCH")
        total += len(data)
        if total > MAX_TOTAL:
            fail("PACKAGE_TOO_LARGE")
        target = dest_root.joinpath(*target_rel.parts)
        reject_symlink_ancestors(target, dest_root)
        if target.exists() and not target.is_file():
            fail("TARGET_NOT_A_FILE")
        blobs.append((name, target, data))
    if any(n in AUTH_SENSITIVE for n in seen):
        result = subprocess.run(
            ["/usr/bin/php", JWT_PREFLIGHT],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        if result.returncode != 0:
            label = (result.stderr or result.stdout).strip().splitlines()
            fail("AUTH_DEPLOY_BLOCKED_BY_JWT_PREFLIGHT " + (label[0] if label else "FAILED"))
    return version, blobs


def atomic_install(target, data, uid, gid):
    target.parent.mkdir(parents=True, exist_ok=True)
    reject_symlink_ancestors(target, API_ROOT if target.is_relative_to(API_ROOT) else FRONT_ROOT)
    fd, tmp_path = tempfile.mkstemp(prefix=".grobo-release-", dir=target.parent)
    try:
        os.fchmod(fd, 0o644)
        os.fchown(fd, uid, gid)
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_path, target)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def deploy(version, blobs):
    if os.geteuid() != 0:
        fail("SUDO_REQUIRED")
    user = pwd.getpwnam("www-data")
    uid, gid = user.pw_uid, user.pw_gid
    run("/usr/sbin/php-fpm8.3", "-t")
    run("/usr/sbin/nginx", "-t")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = BACKUP_ROOT / ("grobo-managed-backup-" + timestamp)
    backup_dir.mkdir(mode=0o700, exist_ok=False)
    before = []
    for name, target, _ in blobs:
        if target.is_file():
            previous = target.read_bytes()
            info = target.stat()
            before.append((target, previous, info.st_uid, info.st_gid, stat.S_IMODE(info.st_mode)))
            backup_path = backup_dir / name
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            backup_path.write_bytes(previous)
        else:
            before.append((target, None, uid, gid, 0o644))
    for f in backup_dir.rglob("*"):
        if f.is_file():
            f.chmod(0o600)
        elif f.is_dir():
            f.chmod(0o700)
    succeeded = False
    applied = []
    try:
        for name, target, data in blobs:
            atomic_install(target, data, uid, gid)
            applied.append(target)
            if target.suffix == ".php":
                run("/usr/bin/php", "-l", str(target))
            if target.read_bytes() != data:
                fail("POST_INSTALL_CHECKSUM_MISMATCH")
        run("/usr/sbin/php-fpm8.3", "-t")
        run("/usr/sbin/nginx", "-t")
        run("/bin/systemctl", "reload", "php8.3-fpm")
        run("/bin/systemctl", "is-active", "--quiet", "php8.3-fpm")
        run("/bin/systemctl", "is-active", "--quiet", "nginx")
        succeeded = True
    finally:
        if not succeeded:
            for target, prev, old_uid, old_gid, old_mode in before:
                if target not in applied:
                    continue
                try:
                    if prev is None:
                        target.unlink(missing_ok=True)
                    else:
                        atomic_install(target, prev, old_uid, old_gid)
                        target.chmod(old_mode)
                except Exception:
                    print("ROLLBACK_ITEM_REQUIRES_MANUAL_REVIEW", file=sys.stderr)
            subprocess.run(["/bin/systemctl", "reload", "php8.3-fpm"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print("GROBO_ROLLBACK_ATTEMPTED", file=sys.stderr)
    print("GROBO_CONTROLLED_DEPLOY_OK version=%s files=%s backup=%s" %
          (version, len(blobs), str(backup_dir)))


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("--check", "--apply"):
        fail("INVALID_HELPER_INVOCATION")
    version, blobs = prepare()
    print("GROBO_MANIFEST_OK version=%s files=%d" % (version, len(blobs)))
    if sys.argv[1] == "--apply":
        deploy(version, blobs)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Don't print path contents or secrets from Python exceptions.
        print("GROBO_DEPLOY_ERROR " + str(e), file=sys.stderr)
        sys.exit(2)
