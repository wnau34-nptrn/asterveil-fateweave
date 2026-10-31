"""Verify fetched git objects, never a working-tree or HTTP image preview.

Run after `git fetch origin art/art-unit-animation-a7-002`:
python3 incoming/ART-UNIT-ANIMATION-A7-002/verify_remote.py FETCH_HEAD
"""
from pathlib import Path
from PIL import Image
import hashlib, io, json, subprocess, sys

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'incoming/ART-UNIT-ANIMATION-A7-002/'
ref = sys.argv[1] if len(sys.argv) > 1 else 'FETCH_HEAD'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

commit = git('rev-parse', '--verify', ref + '^{commit}').decode().strip()
manifest_bytes = git('show', f'{commit}:{PREFIX}validation.json')
assert manifest_bytes == (ROOT / PREFIX / 'validation.json').read_bytes()
manifest = json.loads(manifest_bytes)
decoded = 0
for entry in manifest['files']:
    data = git('show', f"{commit}:{PREFIX}{entry['file']}")
    assert len(data) == entry['bytes'], entry['file']
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['file']
    if entry['file'].endswith('.png'):
        with Image.open(io.BytesIO(data)) as im:
            im.load()
            assert list(im.size) == entry['size'] and im.mode == entry['mode']
        decoded += 1
tracked = {p.removeprefix(PREFIX) for p in git('ls-tree', '-r', '--name-only', commit, '--', PREFIX).decode().splitlines()}
assert tracked == {e['file'] for e in manifest['files']} | {'validation.json'}
print(json.dumps({'commit': commit, 'files_sha256_verified': len(manifest['files']), 'pngs_decoded': decoded, 'manifest_matches_local': True}, indent=2))
