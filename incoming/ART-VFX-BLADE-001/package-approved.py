"""Pack selected three-phase blade artwork; retain original painted pixels/alpha and shared strip scale."""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib
import json

here = Path(__file__).resolve().parent
root = here.parents[1]
art = root / 'incoming/ART-VFX-BLADE-STORYBOARD-001/source'
boards = json.loads((root / 'docs/combat-presentation/blade-storyboards/manifest.json').read_text(encoding='utf-8'))
cell, gutter, cols = 256, 4, 6
stride = cell + 2*gutter
items, provenance = [], []
for board in boards:
    skill = board['skill']
    source = art / f'{skill}.png'
    im = Image.open(source).convert('RGBA')
    factor = 224 / max(max(frame[2:]) for frame in board['frames'])
    for phase, (x, y, w, h) in zip(['prepare', 'peak', 'tail'], board['frames']):
        piece = im.crop((x, y, x+w, y+h)).resize((max(1,round(w*factor)), max(1,round(h*factor))), Image.Resampling.LANCZOS)
        items.append((f'{skill}_{phase}', piece))
    provenance.append({'skill':skill, 'source':str(source.relative_to(root)).replace('\\','/'), 'sha256':hashlib.sha256(source.read_bytes()).hexdigest(), 'sharedStripScale':factor, 'phases':board['frames']})
for name in [f'contact_{i:02}' for i in range(4)] + ['glint', 'flecks', 'deflect', 'pass']:
    items.append((name, Image.open(here/'png'/f'{name}.png').convert('RGBA')))
rows = (len(items)+cols-1)//cols
atlas = Image.new('RGBA',(cols*stride,rows*stride))
preview = Image.new('RGBA',atlas.size,'#101c36')
frames = {}
(here/'production').mkdir(exist_ok=True)
for i,(name,piece) in enumerate(items):
    x=(i%cols)*stride+gutter+(cell-piece.width)//2
    y=(i//cols)*stride+gutter+(cell-piece.height)//2
    atlas.paste(piece,(x,y))
    preview.alpha_composite(piece,(x,y))
    ImageDraw.Draw(preview).text(((i%cols)*stride+8,(i//cols)*stride+246),name,fill='white')
    frames[name]={'frame':{'x':x,'y':y,'w':piece.width,'h':piece.height},'rotated':False,'trimmed':False,'sourceSize':{'w':piece.width,'h':piece.height},'spriteSourceSize':{'x':0,'y':0,'w':piece.width,'h':piece.height}}
    piece.save(here/'production'/f'{name}.png')
out=root/'public/assets/fx'
atlas.save(out/'blade_fx.webp',quality=90,method=6,exact=True)
(out/'blade_fx.json').write_text(json.dumps({'frames':frames,'meta':{'app':'ART-VFX-BLADE-001 R4','image':'blade_fx.webp','size':{'w':atlas.width,'h':atlas.height},'scale':'1','alphaMode':'straight'}},indent=2)+'\n')
preview.convert('RGB').save(here/'preview.png')
(here/'production-sources.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(f'{len(items)} frames -> {atlas.size}, {(out/"blade_fx.webp").stat().st_size} bytes')
