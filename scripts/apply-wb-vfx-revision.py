"""Replace only the seven approved-for-intake layers, in the existing lossless atlas slots.
No original incoming files, atlas layout, runtime metadata or playback code is written.
Usage: python3 -I scripts/apply-wb-vfx-revision.py [--write]
Requires the PR #292 baseline commit locally (git fetch --filter=blob:none origin refs/pull/292/head).
"""
from pathlib import Path
from PIL import Image
import argparse, hashlib, io, json, subprocess
ROOT = Path(__file__).resolve().parents[1]
BASE = 'df25df95ce31581e418b19a595aca3780a5d62a6'
PKG = ROOT / 'incoming/ART-VFX-WB-TRIO-REV-001'
ATLAS = 'public/assets/fx/boss_signature_fx.webp'
LAYOUT = 'public/assets/fx/boss_signature_fx.json'
ART = 'src/game/visuals/boss-signature-art.json'
REPORT = ROOT / 'docs/validation/wb-vfx-revision/intake-report.json'

def sha(data): return hashlib.sha256(data).hexdigest()
def baseline(path): return subprocess.check_output(['git', 'show', f'{BASE}:{path}'], cwd=ROOT)
def canvas(atlas, frame):
    assert not frame['rotated']
    r, s = frame['frame'], frame['spriteSourceSize']
    out = Image.new('RGBA', (frame['sourceSize']['w'], frame['sourceSize']['h']))
    out.paste(atlas.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h'])), (s['x'], s['y']))
    return out

def main(write):
    raw = baseline(ATLAS)
    assert sha(raw) == json.loads(baseline('incoming/ART-VFX-WB-TRIO-001/intake-report.json'))['atlasSha256']
    assert (ROOT / LAYOUT).read_bytes() == baseline(LAYOUT), 'atlas layout changed'
    assert (ROOT / ART).read_bytes() == baseline(ART), 'runtime metadata changed'
    layout = json.loads((ROOT / LAYOUT).read_text())
    old = Image.open(io.BytesIO(raw)).convert('RGBA'); result = old.copy()
    rows = json.loads((PKG / 'layers.json').read_text())['layers']
    validation = json.loads((PKG / 'validation.json').read_text())['files']
    assert len(rows) == 7
    replacements = {}
    for row in rows:
        meta = row['original_metadata']; name = f"{meta['move']}_{meta['beat']}"
        data = (PKG / row['file']).read_bytes()
        assert sha(data) == row['sha256'] == validation[row['file']]['sha256']
        art = json.loads((ROOT / ART).read_text())[name]
        assert art == {'anchor': meta['anchor'], 'pivot': meta['pivot_px'], 'width': meta['suggested_canvas_width_390'], **({'offset': meta['offset_390']} if any(meta['offset_390']) else {})}
        im = Image.open(io.BytesIO(data)); im.load(); assert im.size == (256, 256) and im.mode == 'RGBA'
        frame = layout['frames'][name]; original = canvas(old, frame)
        assert original.getchannel('A').tobytes() == im.getchannel('A').tobytes(), name
        s, r = frame['spriteSourceSize'], frame['frame']
        result.paste(im.crop((s['x'], s['y'], s['x'] + s['w'], s['y'] + s['h'])), (r['x'], r['y']))
        replacements[name] = {'file': str((PKG / row['file']).relative_to(ROOT)), 'sha256': sha(data), 'originalSha256': row['source_sha256']}
    encoded = io.BytesIO(); result.save(encoded, format='WEBP', lossless=True, exact=True, method=6)
    packed = encoded.getvalue(); decoded = Image.open(io.BytesIO(packed)).convert('RGBA')
    assert decoded.tobytes() == result.tobytes(), 'WebP encode/decode changed RGBA'
    before, after = {}, {}
    for name, frame in layout['frames'].items():
        a, b = canvas(old, frame), canvas(decoded, frame)
        before[name], after[name] = sha(a.tobytes()), sha(b.tobytes())
        if name in replacements:
            wanted = Image.open(ROOT / replacements[name]['file']).convert('RGBA')
            assert b.tobytes() == wanted.tobytes(), f'replacement differs: {name}'
        else: assert a.tobytes() == b.tobytes(), f'out-of-scope frame changed: {name}'
    changed = sorted(k for k in before if before[k] != after[k])
    assert changed == sorted(replacements) and len(before) == 81
    report = {'package': PKG.name, 'baselineCommit': BASE, 'baselineAtlasSha256': sha(raw), 'atlasSha256': sha(packed),
              'size': list(decoded.size), 'decodedBytes': decoded.width * decoded.height * 4, 'webpBytes': len(packed),
              'baselineWebpBytes': len(raw), 'frames': len(before), 'replaced': replacements, 'unchangedFrames': 74,
              'layoutSha256': sha((ROOT / LAYOUT).read_bytes()), 'runtimeArtSha256': sha((ROOT / ART).read_bytes()),
              'verified': '7 replacement canvases exact RGBA; all 74 other canvases exact RGBA; original alpha, atlas layout and runtime metadata unchanged; full lossless WebP decode exact',
              'frameRgbaBefore': before, 'frameRgbaAfter': after}
    if write:
        (ROOT / ATLAS).write_bytes(packed); REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps(report, indent=2) + '\n')
    else:
        assert (ROOT / ATLAS).read_bytes() == packed, 'run with --write to apply revision'
        assert json.loads(REPORT.read_text()) == report, 'intake receipt differs'
    print(json.dumps({k:v for k,v in report.items() if k not in ['frameRgbaBefore','frameRgbaAfter','replaced']}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--write', action='store_true'); args = parser.parse_args(); main(args.write)
