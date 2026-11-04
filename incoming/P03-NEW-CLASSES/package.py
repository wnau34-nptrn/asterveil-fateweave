"""P03 intake: append Kael/Wynne/Astrid stills, portraits, 18 skill icons and three weapons to the runtime atlases.
Deterministic crop/normalisation only; no painting. Sources: incoming/ART-CHAR-CLASS-NEW-002 (owner-approved 2026-10-31)
and incoming/ART-CHAR-CLASS-NEW-003 (Kael proportion fix; picked by Claude under the owner's 2026-11-04 delegation).
Run from the repository root: python incoming/P03-NEW-CLASSES/package.py  (Pillow, numpy, scipy)
Old decoded atlas cells are asserted pixel-identical; atlases are lossless WebP.
"""
from pathlib import Path
import hashlib, importlib.util, io, json, math, subprocess
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BASE = '522f6f60bc8563c2491cb971d83da82e0412cdc3'
NEW2 = REPO / 'incoming/ART-CHAR-CLASS-NEW-002'
NEW3 = REPO / 'incoming/ART-CHAR-CLASS-NEW-003'
IDS = ['kael', 'wynne', 'astrid']
SKILLS = ['gatherfist', 'releasefist', 'flowfist', 'circlefist', 'storedfist', 'perfectfist',
          'threadhex', 'lifetoll', 'wovenhex', 'longthread', 'tollring', 'knothex',
          'deflectfate', 'turncycle', 'starneedle', 'crossing', 'readorbit', 'doubledial']
FIRST_FRAME = 10  # units_mercs/portraits_mercs: frames 0-9 exist (two columns of 512 px cells)
WEAPON_CELLS = {'kael': (2, 8), 'wynne': (3, 8), 'astrid': (4, 8)}  # free cells of the 10x9 gear atlas
RESAMPLE = Image.Resampling.LANCZOS

def dump(path, value): path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
def old_bytes(path): return subprocess.check_output(['git', 'show', f'{BASE}:{path}'], cwd=REPO)
def old_image(path, mode='RGBA'): return Image.open(io.BytesIO(old_bytes(path))).convert(mode)
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def source(kind, ident):
    p = NEW3 / kind / f'{ident}.png'
    return p if p.exists() else NEW2 / kind / f'{ident}.png'

def main():
    checks, validation, sources = {}, {}, {}
    units = []
    for ident in IDS:
        path = source('unit', ident); sources[f'unit/{ident}'] = str(path.relative_to(REPO))
        u = Image.open(path).convert('RGBA'); assert u.size == (512, 512), (ident, u.size)
        a = np.asarray(u)[:, :, 3]; ys, xs = np.where(a > 40)
        assert ys.max() == 496 and xs.min() >= 16 and xs.max() <= 496, (ident, ys.max(), xs.min(), xs.max())
        validation[ident] = {'opaqueBounds': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1], 'footY': 496}
        units.append(u)
    portraits = []
    for ident in IDS:
        path = source('portrait', ident); sources[f'portrait/{ident}'] = str(path.relative_to(REPO))
        portraits.append(Image.open(path).convert('RGBA').resize((512, 512), RESAMPLE))
    for name, frames, mode in [('units_mercs', units, 'RGBA'), ('portraits_mercs', portraits, 'RGB')]:
        path = f'public/assets/art/{name}.webp'; old = old_image(path, mode)
        rows = math.ceil((FIRST_FRAME + len(frames)) / 2)
        atlas = Image.new(mode, (1024, rows * 512)); atlas.paste(old, (0, 0))
        for i, frame in enumerate(frames, FIRST_FRAME):
            cell = frame if mode == 'RGBA' else Image.alpha_composite(Image.new('RGBA', frame.size, (0, 0, 0, 255)), frame).convert('RGB')
            atlas.paste(cell, (i % 2 * 512, i // 2 * 512))
        atlas.save(REPO / path, lossless=True, method=6, exact=True)
        out = Image.open(REPO / path).convert(mode)
        assert np.array_equal(np.asarray(old), np.asarray(out.crop((0, 0, *old.size))))
        checks[name] = f'first {FIRST_FRAME} cells identical; rows {rows}'
    spec = importlib.util.spec_from_file_location('c1_icons', REPO / 'incoming/ART-SKILL-ICON-003/package_icons.py')
    norm = importlib.util.module_from_spec(spec); spec.loader.exec_module(norm)
    icons = []
    for skill in SKILLS:
        icon = norm.normalize(NEW2 / 'icons' / f'{skill}.png'); icons.append(icon)
        a = np.asarray(icon)[:, :, 3]; ys, xs = np.where(a > 0); oy, ox = np.where(a >= 128)
        radius = float(np.sqrt((xs - 127.5) ** 2 + (ys - 127.5) ** 2).max()); extent = int(max(ox.max() - ox.min() + 1, oy.max() - oy.min() + 1))
        assert radius <= 112 and 185 <= extent <= 205, (skill, radius, extent)
        validation[skill] = {'alphaRadius': round(radius, 2), 'opaqueExtent': extent}
    old_meta = json.loads(old_bytes('src/game/visuals/skill_icons.json'))
    assert not set(SKILLS) & set(old_meta['order'])
    order = old_meta['order'] + SKILLS; rows = math.ceil(len(order) / old_meta['cols'])
    old = old_image('public/assets/ui/skill_icons.webp'); atlas = Image.new('RGBA', (1536, rows * 256)); atlas.paste(old, (0, 0))
    for i, icon in enumerate(icons, len(old_meta['order'])): atlas.paste(icon, (i % 6 * 256, i // 6 * 256))
    atlas.save(REPO / 'public/assets/ui/skill_icons.webp', lossless=True, method=6, exact=True)
    out = Image.open(REPO / 'public/assets/ui/skill_icons.webp').convert('RGBA')
    for i in range(len(old_meta['order'])):
        box = (i % 6 * 256, i // 6 * 256, (i % 6 + 1) * 256, (i // 6 + 1) * 256)
        assert np.array_equal(np.asarray(old.crop(box)), np.asarray(out.crop(box))), i
    checks['skill_icons'] = f'first {len(old_meta["order"])} cells identical; rows {rows}'
    dump(REPO / 'src/game/visuals/skill_icons.json', {**old_meta, 'rows': rows, 'order': order})
    gear = old_image('public/assets/ui/equip/gear_items.webp'); meta = json.loads(old_bytes('src/game/visuals/equip/gear_items.json'))
    taken = {(v['x'] // 128, v['y'] // 128) for v in meta.values()}
    for ident, (col, row) in WEAPON_CELLS.items():
        assert (col, row) not in taken and gear.getchannel('A').crop((col * 128, row * 128, col * 128 + 128, row * 128 + 128)).getbbox() is None
        w = Image.open(NEW2 / 'weapon' / f'{ident}.png').convert('RGBA'); assert w.size == (128, 128)
        gear.paste(w, (col * 128, row * 128)); meta[f'weapon_{ident}'] = {'x': col * 128, 'y': row * 128, 'w': 128, 'h': 128}
    before = old_image('public/assets/ui/equip/gear_items.webp')
    gear.save(REPO / 'public/assets/ui/equip/gear_items.webp', lossless=True, method=6, exact=True)
    out = np.asarray(Image.open(REPO / 'public/assets/ui/equip/gear_items.webp').convert('RGBA')).copy(); prev = np.asarray(before).copy()
    for col, row in WEAPON_CELLS.values(): out[row * 128:row * 128 + 128, col * 128:col * 128 + 128] = 0; prev[row * 128:row * 128 + 128, col * 128:col * 128 + 128] = 0
    assert np.array_equal(out, prev); checks['gear_items'] = 'all old cells identical; three weapons in free row-8 cells'
    dump(REPO / 'src/game/visuals/equip/gear_items.json', meta)
    dump(HERE / 'validation.json', {'base': BASE, 'sources': sources, 'checkedOldPixels': checks, 'frames': validation,
        'unitFrames': {ident: FIRST_FRAME + i for i, ident in enumerate(IDS)}, 'skillOrder': SKILLS,
        'runtime': {ident: sha(REPO / p)[:8] for ident, p in [('gear_items', 'public/assets/ui/equip/gear_items.webp'), ('skill_icons', 'public/assets/ui/skill_icons.webp')]}})
    print(json.dumps(checks, indent=1))

if __name__ == '__main__': main()
