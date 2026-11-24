#!/usr/bin/env python3
"""Verify every delivered git blob, including manifests; never checks out files.

Usage: git fetch origin art/art-world-map-003
       python verify_remote.py FETCH_HEAD
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import subprocess
import sys
from PIL import Image

ROOT=Path(__file__).resolve().parent
PREFIX='incoming/ART-WORLD-MAP-003/'


def main():
    ref=sys.argv[1] if len(sys.argv)>1 else 'HEAD'
    def blob(name):
        return subprocess.check_output(['git','show',f'{ref}:{PREFIX}{name}'],cwd=ROOT)
    manifest=blob('SHA256SUMS').decode()
    expected={line.split('  ',1)[1]:line.split('  ',1)[0] for line in manifest.splitlines()}
    names=subprocess.check_output(['git','ls-tree','-r','--name-only',ref,'--',PREFIX],cwd=ROOT.parents[1]).decode().splitlines()
    actual={p[len(PREFIX):] for p in names}
    assert actual==set(expected)|{'SHA256SUMS'}, (actual-set(expected),set(expected)-actual)
    validation=json.loads(blob('validation.json'))
    count=0
    for name,digest in expected.items():
        data=blob(name)
        assert hashlib.sha256(data).hexdigest()==digest,name
        if name in validation['files']:
            entry=validation['files'][name]
            assert digest==entry['sha256'] and len(data)==entry['bytes'],name
        if Path(name).suffix in ('.png','.webp'):
            with Image.open(BytesIO(data)) as im:
                im.load()
                entry=validation['files'][name]
                assert list(im.size)==entry['size'] and im.mode==entry['mode'],name
            count+=1
    local=(ROOT/'SHA256SUMS').read_bytes()
    assert hashlib.sha256(blob('SHA256SUMS')).digest()==hashlib.sha256(local).digest(),'remote manifest differs from local'
    print(json.dumps(dict(ref=ref,files_verified=len(expected)+1,images_decoded=count,sha256='PASS',decode='PASS')))


if __name__=='__main__':
    main()
