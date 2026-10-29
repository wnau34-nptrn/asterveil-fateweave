"""Compare a fetched Git branch with every A7 file and SHA-256 manifest entry.

Example after git fetch origin art/art-unit-animation-a7-001:
    python3 incoming/ART-UNIT-ANIMATION-A7-001/verify_remote.py --ref FETCH_HEAD

Use --git-dir to verify against a separately fetched bare repository.
"""
import argparse
import hashlib
from io import BytesIO
import json
from pathlib import Path
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
PREFIX = 'incoming/ART-UNIT-ANIMATION-A7-001/'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ref', default='FETCH_HEAD')
    parser.add_argument('--git-dir')
    parser.add_argument('--report')
    args = parser.parse_args()
    command = ['git', '--git-dir', args.git_dir] if args.git_dir else ['git', '-C', str(REPO)]

    def git(*arguments):
        return subprocess.check_output(command + list(arguments))

    commit = git('rev-parse', args.ref).decode().strip()
    local = subprocess.check_output(['git', '-C', str(REPO), 'rev-parse', 'HEAD']).decode().strip()
    assert commit == local, ('Fetched commit differs from local HEAD', commit, local)
    manifest = json.loads((ROOT / 'validation.json').read_text())
    expected = {item['file']: item for item in manifest['files']}
    paths = git('ls-tree', '-r', '--name-only', '-z', args.ref, '--', PREFIX).decode().split('\0')
    paths = [path for path in paths if path]
    assert {p.removeprefix(PREFIX) for p in paths} == set(expected) | {'validation.json'}
    results = []
    pngs = 0
    for path in paths:
        relative = path.removeprefix(PREFIX)
        data = git('show', f'{args.ref}:{path}')
        sha = hashlib.sha256(data).hexdigest()
        local_data = (ROOT / relative).read_bytes()
        assert sha == hashlib.sha256(local_data).hexdigest(), ('Local/fetched mismatch', path)
        if relative != 'validation.json':
            assert sha == expected[relative]['sha256'], ('Manifest mismatch', path)
            assert len(data) == expected[relative]['bytes'], ('Byte length mismatch', path)
        info = {'file': path, 'bytes': len(data), 'sha256': sha}
        if path.endswith('.png'):
            with Image.open(BytesIO(data)) as im:
                im.load()
                info.update(decodes=True, size=list(im.size), mode=im.mode)
                if im.mode == 'RGBA':
                    low, high = im.getchannel('A').getextrema()
                    assert low == 0 and high > 80, path
            pngs += 1
        results.append(info)
    report = {'remote_commit': commit, 'all_sha256_match': True,
              'manifest_itself_verified_against_fetched_blob': True,
              'file_count': len(results), 'decoded_png_count': pngs,
              'bytes_verified': sum(item['bytes'] for item in results), 'files': results}
    if args.report:
        Path(args.report).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'files'}, indent=2))


if __name__ == '__main__':
    main()
