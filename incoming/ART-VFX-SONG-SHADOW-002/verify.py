"""Verify all fetched Git blobs against local bytes and both hash manifests.

Usage: python incoming/ART-VFX-SONG-SHADOW-002/verify.py <fetched-ref>
Prints a machine-readable report, without changing the package.
"""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
from PIL import Image

root=Path(__file__).resolve().parent
repo=Path(subprocess.check_output(['git','rev-parse','--show-toplevel'],cwd=root,text=True).strip())
prefix=root.relative_to(repo).as_posix()+'/'
ref=sys.argv[1]
def git(*args):
    return subprocess.check_output(['git',*args],cwd=repo)
names=git('ls-tree','-r','--name-only',ref,'--',prefix).decode().splitlines()
local={prefix+p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
assert set(names)==local, 'Remote/local file set mismatch'
blobs={}
pngs=0
for name in names:
    data=git('show',f'{ref}:{name}')
    assert data==(repo/name).read_bytes(), name
    blobs[name[len(prefix):]]=data
    if name.endswith('.png'):
        with Image.open(io.BytesIO(data)) as i:i.load()
        pngs+=1
validation=json.loads(blobs['validation.json'])
assert set(validation['files'])==set(blobs)-{'validation.json','SHA256SUMS'}
for name,item in validation['files'].items():
    assert hashlib.sha256(blobs[name]).hexdigest()==item['sha256'],name
    assert len(blobs[name])==item['bytes'],name
sums={}
for line in blobs['SHA256SUMS'].decode().splitlines():
    digest,name=line.split('  ',1);sums[name]=digest
assert set(sums)==set(blobs)-{'SHA256SUMS'}
for name,digest in sums.items():assert hashlib.sha256(blobs[name]).hexdigest()==digest,name
layers=json.loads(blobs['layers.json'])['layers']
for layer in layers:
    with Image.open(io.BytesIO(blobs[layer['file']])) as i:
        i.load();assert i.size==(256,256) and i.mode=='RGBA'
        b=i.getchannel('A').getbbox()
        assert b and min(b[:2])>=8 and max(b[2:])<=248
        assert list(b)==layer['alpha_bounds']
        assert hashlib.sha256(blobs[layer['file']]).hexdigest()==layer['sha256']
print(json.dumps({'ref':ref,'commit':git('rev-parse',ref).decode().strip(),
    'files_byte_identical':len(blobs),'PNGs_fully_decoded':pngs,'layers_validated':len(layers),
    'validation_sha256':'all matched','SHA256SUMS':'all matched','status':'PASS'},indent=2))
