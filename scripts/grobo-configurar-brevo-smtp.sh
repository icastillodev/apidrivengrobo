#!/usr/bin/env bash
# GROBO: SMTP transaccional Brevo. Nunca muestra ni almacena la clave en Git/logs.
set -euo pipefail
set +x
ENVFILE=/var/www/html/core-backend-gem/.env
CRED_FILE=/home/geckosadm/grobo-ops/.brevo-smtp-credentials

if [[ ${1:-} == --check ]]; then
  test -f "$ENVFILE" || { echo 'ERROR: falta configuracion .env'; exit 1; }
  echo 'BREVO_SETUP_CHECK_OK'
  exit 0
fi
if [[ $EUID -ne 0 ]]; then
  echo 'ERROR: se necesita sudo/root para modificar el SMTP de produccion'
  exit 1
fi
if [[ ! -f "$ENVFILE" || -L "$ENVFILE" ]]; then
  echo 'ERROR: configuracion de produccion invalida'
  exit 1
fi
if [[ ! -f "$CRED_FILE" || -L "$CRED_FILE" ]]; then
  echo 'ERROR: falta el archivo de usuario y clave SMTP de Brevo en el VPS'
  exit 2
fi
chmod 600 "$CRED_FILE"
read -r -p 'Correo destino para prueba Brevo: ' TEST_MAIL
if [[ ! "$TEST_MAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo 'ERROR: correo de prueba no valido'
  exit 2
fi
export GROBO_TEST_MAIL="$TEST_MAIL"
# La prueba real de STARTTLS, AUTH y DATA ocurre ANTES de editar el .env.
python3 - "$ENVFILE" "$CRED_FILE" <<'PY'
from email.message import EmailMessage
from pathlib import Path
import datetime
import os
import re
import smtplib
import ssl
import stat
import sys
import tempfile

env_path = Path(sys.argv[1])
cred_path = Path(sys.argv[2])
if cred_path.stat().st_mode & (stat.S_IRWXG | stat.S_IRWXO):
    sys.exit("ERROR: el archivo de credenciales debe tener permisos 600")

creds = {}
for line in cred_path.read_text(encoding="utf-8-sig").splitlines():
    if not line.strip() or line.lstrip().startswith("#"):
        continue
    k, sep, v = line.partition("=")
    if sep and k.strip() in ("SMTP_LOGIN", "SMTP_KEY"):
        creds[k.strip()] = v.strip()
login = creds.get("SMTP_LOGIN", "")
secret = creds.get("SMTP_KEY", "")
if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", login):
    sys.exit("ERROR: SMTP_LOGIN no es un email de inicio de sesion valido")
if not 15 <= len(secret) <= 512 or any(c.isspace() or c in "'\"#\\" for c in secret):
    sys.exit("ERROR: SMTP_KEY invalida (usar la clave SMTP, NO la API key)")
if secret.startswith("xkeysib-"):
    sys.exit("ERROR: parece una API key Brevo; se necesita una CLAVE SMTP")
recipient = os.environ.get("GROBO_TEST_MAIL", "")
if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", recipient):
    sys.exit("ERROR: destinatario de prueba invalido")

def read_env():
    values = {}
    original = env_path.read_text(encoding="utf-8")
    for line in original.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return original, values

original, env = read_env()
sender = env.get("MAIL_FROM", "no-reply@groboapp.com")
if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", sender):
    sys.exit("ERROR: MAIL_FROM no es valido. Verificar dominio y remitente en Brevo")

msg = EmailMessage()
msg["From"] = sender
msg["To"] = recipient
msg["Subject"] = "GROBO - Prueba SMTP Brevo"
msg.set_content("Prueba de envio transaccional de GROBO via Brevo. Sin contrasenas ni tokens.")
try:
    with smtplib.SMTP("smtp-relay.brevo.com", 587, timeout=30) as smtp:
        smtp.ehlo()
        if not smtp.has_extn("starttls"):
            raise RuntimeError("STARTTLS no disponible")
        smtp.starttls(context=ssl.create_default_context())
        smtp.ehlo()
        smtp.login(login, secret)
        smtp.send_message(msg)
except Exception as exc:
    print("ERROR: Brevo rechazo la prueba o no se pudo conectar (" + type(exc).__name__ + ")")
    sys.exit(2)
print("BREVO_SMTP_TEST_ACCEPTED: relay acepto el correo, comprobar bandeja de entrada")

updates = {
    "MAIL_HOST": "smtp-relay.brevo.com",
    "MAIL_PORT": "587",
    "MAIL_SECURE": "tls",
    "MAIL_USER": login,
    "MAIL_PASS": secret,
    "MAIL_ENABLED": "1",
    "MAIL_DEBUG": "0",
    "GROBO_SKIP_EMAIL_AUTH": "0"
}
stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
backup = Path("/root/grobo-smtp-env-before-brevo-" + stamp)
backup_fd = os.open(str(backup), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
try:
    with os.fdopen(backup_fd, "w", encoding="utf-8") as f:
        f.write(original)
except BaseException:
    backup.unlink(missing_ok=True)
    raise
st = env_path.stat()
result = []
seen = set()
for line in original.splitlines(keepends=True):
    key = line.split("=", 1)[0].strip() if "=" in line else ""
    if key in updates:
        if key not in seen:
            result.append(key + "=" + updates[key] + "\n")
            seen.add(key)
    else:
        result.append(line)
for key, val in updates.items():
    if key not in seen:
        if result and not result[-1].endswith("\n"):
            result.append("\n")
        result.append(key + "=" + val + "\n")

tmp_name = None
try:
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=env_path.parent, prefix=".grobo-brevo-", delete=False) as tmp:
        tmp_name = tmp.name
        os.chmod(tmp_name, 0o640)
        os.fchown(tmp.fileno(), st.st_uid, st.st_gid)
        tmp.write("".join(result))
        tmp.flush()
        os.fsync(tmp.fileno())
    os.replace(tmp_name, env_path)
except BaseException:
    if tmp_name:
        Path(tmp_name).unlink(missing_ok=True)
    raise
print("BREVO_ENV_UPDATED: configuracion aplicada; backup privado " + str(backup))
PY
unset GROBO_TEST_MAIL
# No mantener secretos temporales en el VPS tras configurar el relay.
rm -f -- "$CRED_FILE"
echo 'BREVO_SETUP_DONE: verificar recepcion del mensaje y estado del relay Brevo'
