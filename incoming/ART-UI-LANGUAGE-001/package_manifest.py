#!/usr/bin/env python3
"""Build immutable delivery hashes after all captures, exports and verification.
No self-hash fiction: validation.json is hashed in SHA256SUMS; SHA256SUMS is checked
byte-for-byte against its local copy after fetching the pushed ref.
"""
from pathlib import Path
from PIL import Image
import json,hashlib,gzip
D=Path(__file__).resolve().parent
excluded={'validation.json','SHA256SUMS'}
files=[]
for p in sorted(D.rglob('*')):
 if not p.is_file() or p.relative_to(D).as_posix() in excluded:continue
 if '__pycache__' in p.parts or 'audit-test-results' in p.parts:continue
 data=p.read_bytes();e={'path':p.relative_to(D).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 if p.name.endswith('.json.gz'):
  raw=gzip.decompress(data);e.update(encoding='gzip',decodedBytes=len(raw),decodedSha256=hashlib.sha256(raw).hexdigest())
 if p.suffix=='.png':
  with Image.open(p) as im:im.load();e.update(width=im.width,height=im.height,mode=im.mode,decoded=True)
 files.append(e)
verify=json.loads((D/'verification.json').read_text())
assert verify.get('schema')==2 and verify.get('pass') and verify.get('revisionChecks',{}).get('pass'),'Current revision verification must pass before packaging'
report={'schema':1,'base':'dd99b38d','dpr':2,'engine':'Chromium','realDevices':False,'visualApproval':False,'verify':{'pass':verify['pass'],'criteria':[{k:e[k] for k in ['id','status']} for e in verify['criteria']]},'manifestPolicy':'Payload files are listed here. validation.json is covered by SHA256SUMS. SHA256SUMS is compared byte-for-byte after git fetch; a file cannot contain its own hash.','files':files}
(D/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
sums=[f'{e["sha256"]}  {e["path"]}' for e in files]
sums.append(hashlib.sha256((D/'validation.json').read_bytes()).hexdigest()+'  validation.json')
(D/'SHA256SUMS').write_text('\n'.join(sorted(sums,key=lambda x:x.split('  ',1)[1]))+'\n')
print(json.dumps({'files':len(files)+2,'png':sum(e['path'].endswith('.png') for e in files),'bytes':sum(e['bytes'] for e in files),'verify':verify['pass']}))
