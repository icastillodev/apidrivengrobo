#!/usr/bin/env bash
# GROBO: habilita sudo SIN contraseña solo para ejecutores root propios.
# Ejecutar una única vez: sudo bash /home/geckosadm/grobo-ops/grobo-bootstrap-passwordless-ops.sh
set -euo pipefail
umask 077
EXPECTED_USER=geckosadm
SOURCE_DIR=/home/geckosadm/grobo-ops
BIN_DIR=/usr/local/sbin
LIB_DIR=/usr/local/libexec/grobo
SUDOERS_FILE=/etc/sudoers.d/grobo-limited

[[ "$EUID" -eq 0 ]] || { echo 'GROBO_BOOTSTRAP_REQUIRES_SUDO'; exit 2; }
[[ "$SUDO_USER" == "$EXPECTED_USER" ]] || {
    echo 'GROBO_BOOTSTRAP_WRONG_AUTHORIZED_USER'; exit 2;
}
for file in grobo-root-status.sh grobo-controlled-deploy.py grobo-check-jwt-secret.php; do
    [[ -f "$SOURCE_DIR/$file" && ! -L "$SOURCE_DIR/$file" ]] || {
      echo 'GROBO_BOOTSTRAP_SOURCE_MISSING'; exit 2;
    }
done
[[ ! -L "$LIB_DIR" && ! -L "$BIN_DIR" ]] || {
    echo 'GROBO_BOOTSTRAP_SYMLINK_DEST_REJECTED'; exit 2;
}
install -d -o root -g root -m 0755 "$LIB_DIR"
install -o root -g root -m 0755 "$SOURCE_DIR/grobo-root-status.sh" "$BIN_DIR/grobo-status"
install -o root -g root -m 0755 "$SOURCE_DIR/grobo-controlled-deploy.py" "$LIB_DIR/deploy.py"
install -o root -g root -m 0644 "$SOURCE_DIR/grobo-check-jwt-secret.php" "$LIB_DIR/check-jwt.php"
/usr/bin/python3 -m py_compile "$LIB_DIR/deploy.py"
/usr/bin/php -l "$LIB_DIR/check-jwt.php" >/dev/null
/bin/bash -n "$BIN_DIR/grobo-status"

cat > "$BIN_DIR/grobo-deploy-check" <<'EOS'
#!/bin/sh
set -eu
exec /usr/bin/python3 /usr/local/libexec/grobo/deploy.py --check
EOS
cat > "$BIN_DIR/grobo-deploy-apply" <<'EOS'
#!/bin/sh
set -eu
exec /usr/bin/python3 /usr/local/libexec/grobo/deploy.py --apply
EOS
chown root:root "$BIN_DIR/grobo-deploy-check" "$BIN_DIR/grobo-deploy-apply"
chmod 0755 "$BIN_DIR/grobo-deploy-check" "$BIN_DIR/grobo-deploy-apply"

# Los argumentos "" en sudoers prohíben parámetros adicionales.
tmp=$(mktemp /etc/sudoers.d/.grobo-limited.XXXXXX)
trap 'rm -f -- "$tmp"' EXIT
cat > "$tmp" <<'EOS'
# GROBO: mantenimiento delegado al usuario SSH autenticado por clave.
# NO concede NOPASSWD para bash, sh, python, php, cp, install ni systemctl.
geckosadm ALL=(root) NOPASSWD: /usr/local/sbin/grobo-status "", /usr/local/sbin/grobo-deploy-check "", /usr/local/sbin/grobo-deploy-apply ""
EOS
chown root:root "$tmp"
chmod 0440 "$tmp"
/usr/sbin/visudo -cf "$tmp" >/dev/null
if [[ -e "$SUDOERS_FILE" ]]; then
    cp -p "$SUDOERS_FILE" "$SUDOERS_FILE.bak-$(date -u +%Y%m%dT%H%M%SZ)"
fi
install -o root -g root -m 0440 "$tmp" "$SUDOERS_FILE"
/usr/sbin/visudo -c >/dev/null || {
    echo 'GROBO_SUDOERS_VALIDATION_FAILED'
    rm -f "$SUDOERS_FILE"
    exit 2
}
trap - EXIT
rm -f -- "$tmp"

echo 'GROBO_SUDOERS_INSTALLED_WITH_EXACT_COMMAND_ALLOWLIST'
/usr/sbin/runuser -u "$EXPECTED_USER" -- /usr/bin/sudo -n /usr/local/sbin/grobo-status
echo 'GROBO_PASSWORDLESS_ROOT_HELPERS_READY'
echo 'Unrestricted sudo and login passwords remain protected.'
