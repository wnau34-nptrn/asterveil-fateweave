from pathlib import Path
import json
from PIL import Image
import numpy as np
p=Path(__file__).resolve().parents[1]
root=p.parents[1]
import os
os.chdir(root)
meta=json.loads((p/'skills_atlas.json').read_text())
assert meta==json.loads(Path('src/game/visuals/skill_icons.json').read_text())
assert len(set(meta['order']))==61
assert (p/'skills_atlas.webp').read_bytes()==Path('public/assets/ui/skill_icons.webp').read_bytes()
atlas=Image.open(p/'skills_atlas.webp').convert('RGBA')
for i,id in enumerate(meta['order']):
 source=p/'png'/f'{id}.png' if i>=34 else Path('incoming/ART-SKILL-ICON-002/png/attack.png') if id=='attack' else Path('incoming/ART-SKILL-ICON-001-R1/png')/f'{id}.png'
 cell=atlas.crop((i%6*256,i//6*256,i%6*256+256,i//6*256+256))
 assert np.array_equal(np.asarray(cell)[:,:,3],np.asarray(Image.open(source).convert('RGBA'))[:,:,3]),id
for i in range(61,66):
 assert atlas.crop((i%6*256,i//6*256,i%6*256+256,i//6*256+256)).getbbox() is None
for name in ['tree-390.png','battle-dock-390.png']:
 assert Image.open(p/'qa'/name).size==(390,844)
print('Verified 61 unique cells, exact alpha, five empty cells, matching runtime/delivery metadata and bytes, and two 390x844 screenshots.')
