"""Verify fetched Git bytes, every SHA-256 and every image with Pillow.

Run after a normal git fetch:
  python3 incoming/ART-UNIT-ANIMATION-A7-003/verify_remote.py --ref FETCH_HEAD
No network, checkout or file mutations are performed by this verifier.
"""
from pathlib import Path
import argparse, hashlib, io, json, subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'incoming/ART-UNIT-ANIMATION-A7-003/'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ref', required=True)
    args = parser.parse_args()
    commit = subprocess.check_output(['git','rev-parse',args.ref+'^{commit}'],cwd=ROOT,text=True).strip()
    def read(path):
        if Path(path).is_absolute() or '..' in Path(path).parts:
            raise ValueError('Invalid manifest path')
        return subprocess.check_output(['git','show',commit+':'+PREFIX+path],cwd=ROOT)
    sums = read('SHA256SUMS').decode().splitlines()
    inventory = json.loads(read('validation.json'))
    images = 0
    verified = {}
    for line in sums:
        expected, path = line.split('  ',1)
        blob = read(path)
        actual = hashlib.sha256(blob).hexdigest()
        assert actual == expected, path+' checksum mismatch'
        if path in inventory['files']:
            assert inventory['files'][path]['sha256'] == actual
            assert inventory['files'][path]['bytes'] == len(blob)
        if path.endswith('.png'):
            with Image.open(io.BytesIO(blob)) as im:
                im.verify()
            with Image.open(io.BytesIO(blob)) as im:
                im.load()
                spec = inventory['files'][path]
                assert list(im.size) == spec['size'] and im.mode == spec['mode']
            images += 1
        verified[path] = actual
    assert set(inventory['files']) | {'validation.json'} == set(verified)
    tracked = subprocess.check_output(['git','ls-tree','-r','--name-only',commit,'--',PREFIX],cwd=ROOT,text=True).splitlines()
    assert {p[len(PREFIX):] for p in tracked} == set(verified) | {'SHA256SUMS'}
    print(json.dumps({'commit':commit,'checksumsVerified':len(verified),'imagesDecoded':images,
                      'candidateStrips':inventory['candidateStrips'],'missingMoves':inventory['missingMoves'],
                      'result':'pass'},indent=2))

if __name__ == '__main__':
    main()
