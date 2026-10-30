"""Verify every delivered file from a fetched Git ref, without trusting checkout.
Run after normal git push and git fetch origin art/art-char-redesign-001:
python incoming/ART-CHAR-REDESIGN-001/verify_remote.py origin/art/art-char-redesign-001
"""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'incoming/ART-CHAR-REDESIGN-001/'
ref = sys.argv[1]


def read(path):
    return subprocess.check_output(['git', 'show', f'{ref}:{PREFIX}{path}'], cwd=ROOT)


manifest = json.loads(read('validation.json'))
assert manifest['status'] == 'packaged-local', 'incomplete package cannot be accepted'
decoded = 0
for path, expected in manifest['files'].items():
    raw = read(path)
    assert len(raw) == expected['bytes'], path
    assert hashlib.sha256(raw).hexdigest() == expected['sha256'], path
    if Path(path).suffix in ('.png', '.webp'):
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
        decoded += 1
print(json.dumps({'ref': ref, 'sha256VerifiedFiles': len(manifest['files']),
                  'pillowDecodedImages': decoded, 'result': 'pass'}))
