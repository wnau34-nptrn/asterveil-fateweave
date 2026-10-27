"""Pack selected floor projections, unchanged source paintings and shared phase transforms."""
from pathlib import Path
from PIL import Image
import json
import hashlib

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
boards = json.loads((ROOT/'docs/combat-presentation/healing-storyboards/manifest.json').read_text())
cell_w, cell_h, gutter, cols, baseline, density = 384, 96, 4, 6, 84, 3
items, provenance = [], []
for board in boards:
    variants = [(board['skill'], board, None)]
    if board['skill'] == 'rouse':
        variants = [('rouse_protector', board, 'left'), ('rouse_ally', board, 'right')]
    if board.get('tick'):
        variants.append((board['skill']+'_tick', board['tick'], None))
    if board['skill'] == 'bless':
        # A quiet cyan seed acknowledges a real barrier, never the healing blossom.
        variants.append(('barrier', board, None))
    for name, art, half in variants:
        source = (ROOT/'docs/combat-presentation/healing-storyboards'/art['source']).resolve()
        image = Image.open(source).convert('RGBA')
        fx = art['width']/art['frameMax'][0]*density
        fy = art['height']/art['frameMax'][1]*density
        for phase, frame in zip(['prepare', 'peak', 'tail'], art['frames']):
            x, y, w, h = frame['cell']; ax, ay = frame['anchor']
            left, right = 0, w
            if half == 'left':
                right = w//2; ax = w*.25
            if half == 'right':
                left = w//2; ax = w*.75
            piece = image.crop((x+left, y, x+right, y+h)).resize((round((right-left)*fx), round(h*fy)), Image.Resampling.LANCZOS)
            layer = Image.new('RGBA', (cell_w, cell_h))
            layer.paste(piece, (round(cell_w/2+(left-ax)*fx), round(baseline-ay*fy)))
            # Same protected floor band as the selected 390px review; no clothing/HP paint.
            projected = Image.new('RGBA', layer.size)
            projected.paste(layer.crop((0, 27, cell_w, 90)), (0, 27))
            items.append((name+'_'+phase, projected))
        provenance.append(dict(strip=name, source=str(source.relative_to(ROOT)), sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
            scaleX=fx, scaleY=fy, half=half, frames=art['frames']))
stride_w, stride_h = cell_w+2*gutter, cell_h+2*gutter
rows = (len(items)+cols-1)//cols
atlas = Image.new('RGBA', (cols*stride_w, rows*stride_h)); frames = {}
for i, (name, image) in enumerate(items):
    x, y = i%cols*stride_w+gutter, i//cols*stride_h+gutter
    atlas.paste(image, (x, y))
    frames[name] = dict(frame=dict(x=x, y=y, w=cell_w, h=cell_h), rotated=False, trimmed=False,
        sourceSize=dict(w=cell_w, h=cell_h), spriteSourceSize=dict(x=0, y=0, w=cell_w, h=cell_h))
out = ROOT/'public/assets/fx'
atlas.save(out/'healing_fx.webp', quality=92, method=6, exact=True)
(out/'healing_fx.json').write_text(json.dumps(dict(frames=frames, meta=dict(app='ART-VFX-HEALING-001', image='healing_fx.webp',
    size=dict(w=atlas.width, h=atlas.height), scale='1', baseline=baseline/cell_h, density=density)), indent=2)+'\n')
(HERE/'production-sources.json').write_text(json.dumps(provenance, indent=2)+'\n')
print(f'{len(items)} frames; {atlas.size}; {(out/"healing_fx.webp").stat().st_size} bytes')
