#!/usr/bin/env bash
# Rotación interactiva: requiere clave NUEVA creada en Resend.com. Nunca la guardes en Git/chat.
set -euo pipefail
set +x
if [[ $EUID -ne 0 ]]; then echo 'ERROR: requiere sudo/root'; exit 1; fi
ENVFILE=/var/www/html/core-backend-gem/.env
test -f "$ENVFILE" || { echo 'ERROR: falta .env'; exit 1; }
read -r -s -p 'Nueva API key SMTP Resend: ' NEW_MAIL_PASS
printf '\n'
if [[ ${#NEW_MAIL_PASS} -lt 20 ]] || [[ "$NEW_MAIL_PASS" == *$'\n'* ]]; then
 echo 'Clave inválida o demasiado corta'; exit 1
fi
read -r -p 'Correo que recibirá un mensaje de prueba: ' TEST_MAIL
if [[ ! "$TEST_MAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
 echo 'Correo de prueba no válido'; exit 1
fi
export NEW_MAIL_PASS TEST_MAIL
# Validar entrega real ANTES de cambiar .env. El relay puede aceptar AUTH y rechazar DATA.
python3 - <<'PY'
import os,smtplib,ssl,sys
from email.message import EmailMessage
from pathlib import Path
p=Path('/var/www/html/core-backend-gem/.env')
def env_get(key, default=''):
 for l in p.read_text().splitlines():
  if l.startswith(key+'='):
   return l.split('=',1)[1].strip().strip('"').strip("'")
 return default
frm=env_get('MAIL_FROM','no-reply@groboapp.com')
msg=EmailMessage()
msg['From']=frm
msg['To']=os.environ['TEST_MAIL']
msg['Subject']='GROBO - Prueba de rotación SMTP'
msg.set_content('La nueva credencial SMTP de GROBO envió este correo de prueba correctamente.')
try:
 with smtplib.SMTP('smtp.resend.com',587,timeout=20) as smtp:
  smtp.starttls(context=ssl.create_default_context())
  smtp.login('resend',os.environ['NEW_MAIL_PASS'])
  smtp.send_message(msg)
except Exception as ex:
 print('ERROR SMTP: nuevo secreto rechazado o entrega fallida ('+type(ex).__name__+')')
 sys.exit(2)
print('OK: correo de prueba aceptado por el SMTP')
PY
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP="/root/grobo-smtp-env-before-$STAMP"
install -m 600 -o root -g root "$ENVFILE" "$BACKUP"
python3 - <<'PY'
import os
from pathlib import Path
p=Path('/var/www/html/core-backend-gem/.env')
lines=p.read_text().splitlines(keepends=True)
new_value=os.environ['NEW_MAIL_PASS']
replacement={'MAIL_HOST':'smtp.resend.com','MAIL_USER':'resend','MAIL_PORT':'587',
             'MAIL_SECURE':'tls','MAIL_PASS':new_value}
out=[];seen=set()
for ln in lines:
 key=ln.split('=',1)[0].strip() if '=' in ln else ''
 if key in replacement:
  if key not in seen: out.append(key+'='+replacement[key]+'\n');seen.add(key)
 else: out.append(ln)
for k,v in replacement.items():
 if k not in seen: out.append(k+'='+v+'\n')
p.write_text(''.join(out))
PY
chown www-data:www-data "$ENVFILE"
chmod 640 "$ENVFILE"
unset NEW_MAIL_PASS TEST_MAIL
echo "OK: nueva credencial Resend aplicada a .env. Respaldo privado: $BACKUP"
echo 'IMPORTANTE: revocar la credencial anterior en el panel de Resend.'
