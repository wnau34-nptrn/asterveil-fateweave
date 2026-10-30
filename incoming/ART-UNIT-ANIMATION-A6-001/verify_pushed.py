"""After normal git push + fetch, verify EVERY package blob at the fetched ref.

Usage: python3 verify_pushed.py REF [--receipt]
Default prints results only. --receipt saves a receipt of that exact pushed ref;
commit/push the receipt, fetch again, and rerun without --receipt for final proof.
"""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
PREFIX = ROOT.relative_to(REPO).as_posix() + '/'
REF = sys.argv[1]


def git(*args):
    return subprocess.check_output(['git', *args], cwd=REPO)


def digest(data):
    return hashlib.sha256(data).hexdigest()


commit = git('rev-parse', REF).decode().strip()
paths = git('ls-tree', '-r', '--name-only', commit, '--', PREFIX).decode().splitlines()
manifest_data = git('show', commit + ':' + PREFIX + 'validation.json')
manifest = json.loads(manifest_data)
expected = {PREFIX + f['path']: f for f in manifest['files']}
assert set(paths) == set(expected) | {PREFIX + 'validation.json'} | ({PREFIX + 'post-push-verification.json'} if PREFIX + 'post-push-verification.json' in paths else set())
checks = []
for path in paths:
    data = git('show', commit + ':' + path)
    local = (REPO / path).read_bytes()
    assert data == local, ('remote/local mismatch', path)
    hash_value = digest(data)
    if path in expected:
        assert hash_value == expected[path]['sha256'], ('manifest mismatch', path)
        assert len(data) == expected[path]['bytes']
    row = dict(path=path[len(PREFIX):], bytes=len(data), sha256=hash_value, local_equals_fetched_blob=True)
    if path.endswith('.png'):
        with Image.open(io.BytesIO(data)) as image:
            image.load()
            row.update(png_decoded=True, width=image.width, height=image.height, mode=image.mode)
    checks.append(row)
report = dict(package=ROOT.name, pushed_commit=commit, ref_checked=REF, files_verified=len(checks), pngs_decoded=sum(c.get('png_decoded',False) for c in checks), validation_sha256=digest(manifest_data), all_local_remote_sha256_equal=True, all_manifest_sha256_equal=True, files=checks)
if '--receipt' in sys.argv:
    (ROOT / 'post-push-verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k:v for k,v in report.items() if k!='files'},indent=2))
