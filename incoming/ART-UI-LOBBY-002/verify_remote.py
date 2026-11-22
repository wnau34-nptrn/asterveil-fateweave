"""Verify every package byte from a fetched Git ref, never checkout/unpack remote code.

git fetch origin art/art-ui-lobby-002
python3 incoming/ART-UI-LOBBY-002/verify_remote.py --ref FETCH_HEAD
Also compares all published bytes with the local package. No network requests.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
PREFIX = 'incoming/ART-UI-LOBBY-002/'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=REPO)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--ref', required=True, help='Already fetched branch/commit')
    args = p.parse_args()
    ref = git('rev-parse', '--verify', args.ref + '^{commit}').decode().strip()
    def blob(name):
        return git('show', f'{ref}:{PREFIX}{name}')
    validation = json.loads(blob('validation.json'))
    sums = {}
    for line in blob('SHA256SUMS').decode().splitlines():
        digest, name = line.split('  ', 1)
        sums[name] = digest
    names = set(git('ls-tree', '-r', '--name-only', ref, '--', PREFIX).decode().splitlines())
    expected = {PREFIX + n for n in sums} | {PREFIX + 'SHA256SUMS'}
    assert names == expected, ('manifest coverage', names ^ expected)
    assert set(validation['files']) == set(sums) - {'validation.json'}
    decoded = 0
    for name in sorted(sums):
        data = blob(name)
        digest = hashlib.sha256(data).hexdigest()
        assert digest == sums[name], ('SHA256SUMS', name)
        assert (ROOT / name).read_bytes() == data, ('local/remote mismatch', name)
        if name in validation['files']:
            entry = validation['files'][name]
            assert digest == entry['sha256'] and len(data) == entry['bytes'], name
            if name.endswith(('.png', '.webp')):
                with Image.open(io.BytesIO(data)) as im:
                    im.load()
                    assert list(im.size) == entry['size'], name
                    decoded += 1
    assert (ROOT/'SHA256SUMS').read_bytes() == blob('SHA256SUMS')
    protected = json.loads(blob('protected-sha256.json'))
    for path, digest in protected.items():
        assert hashlib.sha256(git('show', ref+':'+path)).hexdigest() == digest, path
    config = json.loads(blob('selection.json'))
    changes = git('diff', '--name-only', config['baseCommit'], ref).decode().splitlines()
    assert changes and all(n.startswith(PREFIX) for n in changes), 'out-of-scope change'
    print(json.dumps({'commit':ref, 'files':len(names), 'hashedPayloadFiles':len(sums),
                     'imagesDecodedByPillow':decoded, 'protectedAssetsUnchanged':len(protected),
                     'onlyRequestedDirectoryChanged':True, 'result':'PASS'}, indent=2))


if __name__ == '__main__':
    main()
