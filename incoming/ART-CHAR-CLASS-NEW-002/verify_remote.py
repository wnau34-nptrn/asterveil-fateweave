#!/usr/bin/env python3
"""Fetch the pushed branch, verify EVERY packaged SHA and decode EVERY PNG.

Usage: python verify_remote.py [--ref refs/remotes/origin/art/art-char-class-new-002]
Run with normal network access. Uses git object bytes, never GitHub text APIs.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
from PIL import Image

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[1]
PREFIX=str(ROOT.relative_to(REPO))+'/'
BRANCH='art/art-char-class-new-002'
BASE='a748ce1d3753db2253772ee9f0678f7d5926f6be'

def git(*args):
    return subprocess.check_output(['git',*args],cwd=REPO)

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--ref',default='refs/remotes/origin/'+BRANCH)
    p.add_argument('--no-fetch',action='store_true',help='Only after an explicit successful fetch')
    args=p.parse_args()
    if not args.no_fetch:
        git('fetch','origin',f'{BRANCH}:refs/remotes/origin/{BRANCH}')
    ref=args.ref
    blob=lambda name:git('show',f'{ref}:{PREFIX}{name}')
    manifest=json.loads(blob('validation.json'))
    sums=blob('SHA256SUMS').decode().splitlines()
    checked=[]
    for line in sums:
        expected,name=line.split('  ',1)
        data=blob(name)
        assert hashlib.sha256(data).hexdigest()==expected,name+' checksum mismatch'
        if name in manifest['files']:
            meta=manifest['files'][name]
            assert len(data)==meta['bytes'] and expected==meta['sha256'],name
        if name.endswith('.png'):
            with Image.open(io.BytesIO(data)) as im:
                im.verify()
            with Image.open(io.BytesIO(data)) as im:
                im.load()
                assert list(im.size)==manifest['files'][name]['size'],name
        checked.append(name)
    tracked=git('ls-tree','-r','--name-only',ref,'--',PREFIX).decode().splitlines()
    assert {PREFIX+n for n in checked}|{PREFIX+'SHA256SUMS'}==set(tracked),'unmanifested file'
    changed=git('diff','--name-status',BASE,ref).decode().splitlines()
    assert all(line.startswith('A\t'+PREFIX) for line in changed),'change outside package or non-addition'
    assert manifest['all_technical_checks_pass'],'technical gates failed'
    print(json.dumps(dict(commit=git('rev-parse',ref).decode().strip(),
        files_sha256_verified=len(checked),png_decodes=sum(n.endswith('.png') for n in checked),
        additions_only_under=PREFIX,technical_gates='pass',owner_visual_approval='pending'),indent=2))

if __name__=='__main__':
    main()
