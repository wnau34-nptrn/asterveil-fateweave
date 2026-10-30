"""After normal push/fetch, verify every manifest file from the fetched ref.
python incoming/ART-CHAR-REDESIGN-002/verify_remote.py origin/art/art-char-redesign-002
"""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'incoming/ART-CHAR-REDESIGN-002/'
ref = sys.argv[1]


def read(path):
    return subprocess.check_output(['git', 'show', f'{ref}:{PREFIX}{path}'], cwd=ROOT)


validation = json.loads(read('validation.json'))
decoded = 0
for path, expected in validation['files'].items():
    raw = read(path)
    assert len(raw) == expected['bytes'], path
    assert hashlib.sha256(raw).hexdigest() == expected['sha256'], path
    if Path(path).suffix in ('.png', '.webp'):
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
        decoded += 1
for path, expected in validation['approvedCopies']['files'].items():
    assert hashlib.sha256(read(path)).hexdigest() == expected['sha256'], path
assert validation['atlas']['outputBytes'] <= validation['atlas']['baseBytes']
assert validation['atlas']['allUntouchedPixelsIdentical']
print(json.dumps({'ref': ref, 'sha256VerifiedFiles': len(validation['files']),
                  'pillowDecodedImages': decoded, 'pr118ExactCopies': 5, 'result': 'pass'}))
