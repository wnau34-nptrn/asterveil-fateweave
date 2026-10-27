"""Pack selected paintings with one scale/bottom anchor per authored layer; never repaint them."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
boards = json.loads((ROOT/'docs/combat-presentation/defense-storyboards/manifest.json').read_text())
cell, gutter, cols, baseline = 256, 4, 6, 240
stride = cell+gutter*2
items, profiles, provenance = [], {}, []
rally_command = None
for b in boards:
    source = HERE/'source'/f'{b["skill"]}.png'
    im = Image.open(source).convert('RGBA')
    factor = 224/max(b['frameMax'])
    for phase, (x,y,w,h) in zip(['prepare','peak','tail'],b['frames']):
        piece = im.crop((x,y,x+w,y+h)).resize((max(1,round(w*factor)),max(1,round(h*factor))),Image.Resampling.LANCZOS)
        frame = Image.new('RGBA',(cell,cell))
        frame.paste(piece,((cell-piece.width)//2,baseline-piece.height))
        items.append((f'{b["skill"]}_{phase}',frame))
    profiles[b['skill']] = {k:b[k] for k in ['width','height','dx','dy','placement']}
    profiles[b['skill']].update(anchor=b.get('anchor','body'),fit=min(b['width']/(b['frameMax'][0]*factor),b['height']/(b['frameMax'][1]*factor)))
    if b['skill'] == 'rally':
        c = b['command']; cf = 224/max(c['frameMax'])
        for phase,(x,y,w,h) in zip(['prepare','peak','tail'],c['frames']):
            piece = im.crop((x,y,x+w,y+h)).resize((max(1,round(w*cf)),max(1,round(h*cf))),Image.Resampling.LANCZOS)
            frame = Image.new('RGBA',(cell,cell));frame.paste(piece,((cell-piece.width)//2,baseline-piece.height))
            items.append((f'rally_command_{phase}',frame))
        rally_command = {k:c[k] for k in ['width','height','dx','dy','anchor']}
        rally_command['fit'] = min(c['width']/(c['frameMax'][0]*cf),c['height']/(c['frameMax'][1]*cf))
        provenance.append(dict(skill='rally_command',source=str(source.relative_to(ROOT)),sha256=hashlib.sha256(source.read_bytes()).hexdigest(),scale=cf,frames=c['frames']))
    provenance.append(dict(skill=b['skill'],source=str(source.relative_to(ROOT)),sha256=hashlib.sha256(source.read_bytes()).hexdigest(),scale=factor,frames=b['frames']))
# A neutral pearl deflection/contact from this repository's approved blade paintings.
# Absorption has no barrier-owner metadata; do not falsely label it Aegis or Stone Armour.
for name, original in [('absorb','deflect'),('counter_contact','contact_00')]:
    piece = Image.open(ROOT/f'incoming/ART-VFX-BLADE-001/png/{original}.png').convert('RGBA')
    items.append((name,piece.resize((cell,cell),Image.Resampling.LANCZOS)))
rows=(len(items)+cols-1)//cols
atlas=Image.new('RGBA',(cols*stride,rows*stride)); preview=Image.new('RGBA',atlas.size,'#101c36'); frames={}
for i,(name,piece) in enumerate(items):
    x=(i%cols)*stride+gutter;y=(i//cols)*stride+gutter
    atlas.paste(piece,(x,y));preview.alpha_composite(piece,(x,y))
    ImageDraw.Draw(preview).text((x+8,y+243),name,fill='white')
    frames[name]=dict(frame=dict(x=x,y=y,w=cell,h=cell),rotated=False,trimmed=False,sourceSize=dict(w=cell,h=cell),spriteSourceSize=dict(x=0,y=0,w=cell,h=cell))
out=ROOT/'public/assets/fx';atlas.save(out/'defense_fx.webp',quality=90,method=6,exact=True)
(out/'defense_fx.json').write_text(json.dumps(dict(frames=frames,meta=dict(app='ART-VFX-DEFENSE-001',image='defense_fx.webp',size=dict(w=atlas.width,h=atlas.height),scale='1',baseline=baseline/cell,profiles=profiles,rallyCommand=rally_command)),indent=2)+'\n')
(ROOT/'src/game/visuals/defense-art.json').write_text(json.dumps(dict(baseline=baseline/cell,profiles=profiles,rallyCommand=rally_command),indent=2)+'\n')
preview.convert('RGB').save(HERE/'atlas-preview.png')
(HERE/'production-sources.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(f'{len(items)} frames, {atlas.size}, {(out/"defense_fx.webp").stat().st_size} bytes')
