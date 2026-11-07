#!/usr/bin/env python3
"""Autenticacion SMTP Brevo, SIN enviar correo ni mostrar credenciales."""
import os
import re
import smtplib
import ssl
from pathlib import Path

file = Path("/home/geckosadm/grobo-ops/.brevo-smtp-credentials")
if not file.is_file() or file.is_symlink():
    raise SystemExit("BREVO_CREDENTIAL_FILE_MISSING")
if file.stat().st_mode & 0o077:
    raise SystemExit("BREVO_CREDENTIAL_FILE_PERMISSIONS_INVALID")
data = {}
for line in file.read_text(encoding="utf-8-sig").splitlines():
    key, sep, val = line.partition("=")
    if sep and key in ("SMTP_LOGIN", "SMTP_KEY"):
        data[key] = val.strip()
user = data.get("SMTP_LOGIN", "")
key = data.get("SMTP_KEY", "")
if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", user):
    raise SystemExit("BREVO_LOGIN_INVALID_FORMAT")
if not 15 <= len(key) <= 512 or key.startswith("xkeysib-"):
    raise SystemExit("BREVO_KEY_INVALID_FORMAT_OR_WRONG_KEY_TYPE")
try:
    with smtplib.SMTP("smtp-relay.brevo.com", 587, timeout=23) as smtp:
        smtp.ehlo()
        if not smtp.has_extn("starttls"):
            raise RuntimeError("NO_STARTTLS")
        smtp.starttls(context=ssl.create_default_context())
        smtp.ehlo()
        smtp.login(user, key)
        print("BREVO_SMTP_AUTH_OK")
except smtplib.SMTPAuthenticationError as err:
    code = int(getattr(err, 'smtp_code', 0))
    raise SystemExit('BREVO_SMTP_AUTH_REJECTED_CODE_' + str(code))
except smtplib.SMTPException as err:
    raise SystemExit("BREVO_SMTP_ERROR_" + type(err).__name__)
except Exception as err:
    raise SystemExit("BREVO_NETWORK_OR_TLS_ERROR_" + type(err).__name__)
