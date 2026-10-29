"""Confirm protected costumes, boots, HP and HUD are pixel-identical in native composites."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
records = json.loads((HERE/'manifest.json').read_text())
count = 0
for record in records:
    ref = Image.open(ROOT/'incoming/ART-VFX-HEALING-001/reference'/f'{record["skill"]}-390.png').convert('RGBA')
    for mode in ['cast', 'tick'] if record.get('tick') else ['cast']:
        for phase in range(3):
            path = HERE/f'{record["skill"]}-{mode}-{phase}-390.png'
            image = Image.open(path).convert('RGBA')
            assert image.size == (390, 844), path
            # The only changed pixels may occupy the two low ground bands.
            for top, bottom in [(0, 301), (322, 635), (656, 844)]:
                box = (0, top, 390, bottom)
                assert image.crop(box).tobytes() == ref.crop(box).tobytes(), (path, box)
            count += 1
assert count == 24
print('24 native390px composites; protected costume/boots/HP/HUD match reference exactly')
