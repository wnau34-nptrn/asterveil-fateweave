"""Validate the delivery locally, or verify fetched Git blobs with --ref REF."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
PREFIX = ROOT.relative_to(REPO).as_posix() + '/'
BASE = '8616ad3155a179e05210fe6aa552e6d234c9bd24'
parser = argparse.ArgumentParser()
parser.add_argument('--ref', help='Fetched Git ref; verifies its blob bytes against its own manifest')
args = parser.parse_args()

def git(*xs): return subprocess.check_output(['git', *xs], cwd=REPO)
def read(name): return git('show', args.ref + ':' + PREFIX + name) if args.ref else (ROOT / name).read_bytes()

sums = read('SHA256SUMS').decode().splitlines()
for line in sums:
    expected, name = line.split('  ', 1)
    assert hashlib.sha256(read(name)).hexdigest() == expected, name

data = json.loads(read('layers.json'))
assert len(data['layers']) == 24
assert len({x['sha256'] for x in data['layers']}) == 24
for layer in data['layers']:
    assert hashlib.sha256(read(layer['path'])).hexdigest() == layer['sha256']
    assert layer['pivot'] == [v / 256 for v in layer['pivotPx']]
    if not args.ref:
        im = Image.open(ROOT / layer['path'])
        assert im.mode == 'RGBA' and im.size == (256, 256)
        alpha = im.getchannel('A')
        assert alpha.getbbox() is not None
        assert alpha.crop((0, 0, 16, 256)).getbbox() is None
        assert alpha.crop((240, 0, 256, 256)).getbbox() is None
        assert alpha.crop((0, 0, 256, 16)).getbbox() is None
        assert alpha.crop((0, 240, 256, 256)).getbbox() is None
for source in data['sources']:
    assert hashlib.sha256(read(source['path'])).hexdigest() == source['sha256']
for board in data['storyboards']:
    assert board['size'][0] == 390
    assert hashlib.sha256(read(board['path'])).hexdigest() == board['sha256']

if args.ref:
    changed = git('diff', '--name-only', BASE, args.ref).decode().splitlines()
    assert changed and all(p.startswith(PREFIX) for p in changed), changed
    assert git('rev-parse', args.ref).strip() == git('rev-parse', 'HEAD').strip()
    print('Fetched commit:', git('rev-parse', args.ref).decode().strip())
else:
    # Include newly added untracked files in the scope check before first commit.
    changed = git('diff', '--name-only', BASE).decode().splitlines()
    changed += git('ls-files', '--others', '--exclude-standard').decode().splitlines()
    assert changed and all(p.startswith(PREFIX) for p in changed), changed
print(f'PASS: SHA-256 verified for {len(sums)} files; 24 unique layers, source/pivot/storyboard checks and folder scope passed.')
