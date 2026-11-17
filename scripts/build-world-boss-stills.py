"""Derive static fallback/portraits from approved existing art; no painting.

Run from repository root with Python/Pillow. Inputs are read only.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZE = 256
SOURCES = [
    ('kragmor', 'incoming/ART-UNIT-ANIMATION-WB-A-001/references/seed-a.png', (260, 165, 650, 555)),
    ('valdrakk', 'incoming/ART-UNIT-ANIMATION-WB-B-001/seeds/seed-b.png', (72, 405, 512, 845)),
    ('morvane', 'incoming/ART-UNIT-ANIMATION-WB-C-001/seeds/seed-c.png', (310, 112, 710, 512)),
]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    units = Image.new('RGBA', (SIZE * 2, SIZE * 2))
    portraits = Image.new('RGBA', units.size)
    atlases = json.loads((ROOT / 'src/game/visuals/unit-atlases.json').read_text())
    manifest = {'cellSize': SIZE, 'soleOrigin': .875, 'displayRatio': 2,
                # Preserve the established field/HP layout; source trim bounds own caption avoidance.
                'layoutRise': (497 - 5) / 512, 'actors': {}}
    proof = {'method': 'Ready frame 0 reconstructed and resampled; portraits cropped from existing approved seeds. Lossless WebP.', 'sources': {}, 'outputs': {}}
    for i, (name, seed, crop) in enumerate(SOURCES):
        entry = atlases[name]
        atlas_path = ROOT / 'public/assets/units' / entry['atlas']
        image_path = ROOT / 'public/assets/units' / entry['image']
        frame = json.loads(atlas_path.read_text())['frames']['0']
        assert not frame['rotated']
        rect, trim, source = frame['frame'], frame['spriteSourceSize'], frame['sourceSize']
        still = Image.new('RGBA', (source['w'], source['h']))
        with Image.open(image_path) as atlas:
            still.paste(atlas.crop((rect['x'], rect['y'], rect['x'] + rect['w'], rect['y'] + rect['h'])), (trim['x'], trim['y']))
        still = still.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        # Normalise invisible RGB without changing visible pixels.
        invisible = still.getchannel('A').point(lambda a: 255 if a == 0 else 0)
        still.paste((0, 0, 0, 0), mask=invisible)
        with Image.open(ROOT / seed) as image:
            portrait = image.convert('RGBA').crop(crop).resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        at = (i % 2 * SIZE, i // 2 * SIZE)
        units.paste(still, at)
        portraits.paste(portrait, at)
        bbox = still.getbbox()
        assert bbox and 0 < bbox[0] < bbox[2] < SIZE and 0 < bbox[1] < bbox[3] < SIZE
        manifest['actors']['foe_' + name] = {'frame': i, 'bounds': {key: trim[key] * SIZE / source['w' if key in ('x', 'w') else 'h'] for key in ('x', 'y', 'w', 'h')}}
        proof['sources'][name] = {'seed': seed, 'seedSha256': sha(ROOT / seed), 'portraitCrop': crop,
                                  'atlas': str(atlas_path.relative_to(ROOT)), 'atlasSha256': sha(atlas_path),
                                  'image': str(image_path.relative_to(ROOT)), 'imageSha256': sha(image_path), 'readyFrame': frame,
                                  'stillAlphaBounds': bbox, 'stillEmptyMargins': [bbox[0], bbox[1], SIZE-bbox[2], SIZE-bbox[3]],
                                  'portraitAlphaBounds': portrait.getbbox()}
    for kind, sheet in [('units', units), ('portraits', portraits)]:
        path = ROOT / f'public/assets/art/{kind}_worldboss.webp'
        sheet.save(path, lossless=True, exact=True, method=6)
        with Image.open(path) as decoded:
            assert decoded.convert('RGBA').tobytes() == sheet.tobytes()
        digest = sha(path)
        manifest[kind + 'Revision'] = digest[:12]
        proof['outputs'][str(path.relative_to(ROOT))] = {'sha256': digest, 'size': sheet.size, 'bytes': path.stat().st_size,
                                                       'decodedBytes': SIZE*SIZE*4*4, 'alphaRange': sheet.getchannel('A').getextrema(),
                                                       'emptyFourthCell': sheet.crop((SIZE, SIZE, SIZE*2, SIZE*2)).getbbox() is None}
    (ROOT / 'src/game/visuals/world-boss-stills.json').write_text(json.dumps(manifest, indent=2) + '\n')
    report = ROOT / 'docs/validation/wb-stills-portraits'
    report.mkdir(parents=True, exist_ok=True)
    (report / 'assets.json').write_text(json.dumps(proof, indent=2) + '\n')

if __name__ == '__main__':
    main()
