#!/usr/bin/env python3
"""Prepara la segunda fase ya verificada sin tocar datos de producción."""
from pathlib import Path
import json

base = Path('/home/geckosadm/grobo-ops/incoming')
current = base/'current'
previous = base/'completed-phase1-8adf4ad'
pending = base/'pending-jwt-8adf4ad'
if previous.exists():
    if (current/'manifest.json').is_file():
        manifest=json.loads((current/'manifest.json').read_text())
        if manifest.get('release_id') == 'security-8adf4ad':
            print('SECURITY_PHASE2_ALREADY_PREPARED')
            raise SystemExit(0)
    raise SystemExit('MANIFEST_REQUIRES_MANUAL_REVIEW')
if not pending.is_dir() or not current.is_dir() or any(p.is_symlink() for p in (pending,current)):
    raise SystemExit('SECURITY_PHASE2_STAGING_MISSING')
old=json.loads((current/'manifest.json').read_text())
next_=json.loads((pending/'manifest.json').read_text())
if old.get('release_id')!='tenant-reservas-phase1-8adf4ad' or len(old.get('files',[]))!=3:
    raise SystemExit('PHASE1_CURRENT_MANIFEST_UNEXPECTED')
if next_.get('release_id')!='security-8adf4ad' or len(next_.get('files',[]))!=13:
    raise SystemExit('PENDING_MANIFEST_UNEXPECTED')
current.rename(previous)
try:
    pending.rename(current)
except Exception:
    previous.rename(current)
    raise
print('SECURITY_PHASE2_MANIFEST_READY files=13')
