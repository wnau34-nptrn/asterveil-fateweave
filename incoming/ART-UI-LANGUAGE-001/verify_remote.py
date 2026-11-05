#!/usr/bin/env python3
"""After ordinary git push AND git fetch, verify every fetched delivery blob.
Usage: python incoming/ART-UI-LANGUAGE-001/verify_remote.py origin/art/art-ui-language-001
Reads git objects (not GitHub API); fully decodes each PNG with Pillow.
"""
from pathlib import Path
from PIL import Image
from io import BytesIO
import subprocess,sys,json,hashlib,gzip
D=Path(__file__).resolve().parent;R=D.parent.parent
ref=sys.argv[1] if len(sys.argv)>1 else 'origin/art/art-ui-language-001'
prefix='incoming/ART-UI-LANGUAGE-001/'
def git(*args):return subprocess.check_output(['git',*args],cwd=R)
def blob(p):return git('show',f'{ref}:{prefix}{p}')
local=json.loads((D/'validation.json').read_text());assert blob('validation.json')==(D/'validation.json').read_bytes(),'Remote manifest differs'
assert blob('SHA256SUMS')==(D/'SHA256SUMS').read_bytes(),'Remote hash list differs'
expected={e['path']:e for e in local['files']};png=0
for p,e in expected.items():
 data=blob(p);assert len(data)==e['bytes'],f'{p}: byte length';assert hashlib.sha256(data).hexdigest()==e['sha256'],f'{p}: SHA-256'
 if e.get('encoding')=='gzip':
  decoded=gzip.decompress(data);assert len(decoded)==e['decodedBytes'] and hashlib.sha256(decoded).hexdigest()==e['decodedSha256'],f'{p}: decoded gzip integrity'
 if p.endswith('.png'):
  with Image.open(BytesIO(data)) as im:im.load();assert im.size==(e['width'],e['height']),f'{p}: size'
  png+=1
for line in blob('SHA256SUMS').decode().splitlines():
 sha,p=line.split('  ',1);assert hashlib.sha256(blob(p)).hexdigest()==sha,f'{p}: SHA256SUMS'
actual={x[len(prefix):] for x in git('ls-tree','-r','--name-only',ref,'--',prefix).decode().splitlines()}
assert actual==set(expected)|{'validation.json','SHA256SUMS'},f'File set mismatch: {actual ^ (set(expected)|{"validation.json","SHA256SUMS"})}'
print(json.dumps({'ref':ref,'commit':git('rev-parse',ref).decode().strip(),'filesChecked':len(actual),'sha256Matched':True,'pngDecodedWithPillow':png,'manifestSha256':hashlib.sha256(blob('validation.json')).hexdigest(),'hashListSha256':hashlib.sha256(blob('SHA256SUMS')).hexdigest(),'pass':True},indent=2))
