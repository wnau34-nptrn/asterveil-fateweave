"""Mechanical source slicing and annotated concept boards; never paints VFX pixels."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import hashlib
import json

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
BASE = '8616ad3155a179e05210fe6aa552e6d234c9bd24'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n): return ImageFont.truetype(FONT, n)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p, value): p.write_text(json.dumps(value, indent=2) + '\n')

MOVES = {
    'taunt': ('Brann / Warden', ['prepare', 'peak-pulse', 'peak-motes', 'settle-mark']),
    'challenge': ('Aegis / Knight', ['prepare', 'peak-crest', 'peak-thread', 'settle-crest']),
    'warcry': ('Garran / Spear', ['prepare', 'peak-cone', 'peak-impact', 'settle-wisps']),
}
TIMES = {'taunt': [[0, 140], [140, 320], [320, 520]],
         'challenge': [[0, 100], [100, 220], [220, 420]],
         'warcry': [[0, 120], [120, 280], [280, 460]]}
ANCHORS = {
    'taunt': ['caster.chest', 'caster.chest -> foe-side corridor', 'pulse centre', 'caster.chest'],
    'challenge': ['caster.shield_front', 'caster.shield_front', 'caster.shield_front -> resolved foe.chest', 'caster.shield_top'],
    'warcry': ['caster.chest_forward', 'caster.chest_forward -> foe-side corridor', 'resolved counter target.chest', 'caster.chest_forward'],
}

manifest = {'schema': 1, 'delivery': 'ART-VFX-COMMAND-001', 'baseCommit': BASE,
            'status': 'art proposals; owner selection and runtime review pending',
            'canvas': [256, 256], 'alpha': 'straight RGBA; normal blend recommended',
            'coordinates': 'pixels from top-left; normalized pivots = pixels / 256',
            'orientation': 'caster left, foe side right; R1 challenge thread flipX=true',
            'timing': {'suggestedMs': TIMES, 'note': 'art suggestions only; adapt to existing presentation beats'},
            'sources': [], 'layers': [], 'storyboards': []}
images = {}
for rev in ['R1', 'R2']:
    src = ROOT / 'source' / f'{rev}-sheet.png'
    sheet = Image.open(src).convert('RGBA')
    assert sheet.size == (1536, 1024)
    manifest['sources'].append({'path': str(src.relative_to(ROOT)), 'sha256': sha(src), 'size': list(sheet.size)})
    atlas = Image.new('RGBA', (1024, 768))
    contact = Image.new('RGB', (390, 472), '#101b29')
    cd = ImageDraw.Draw(contact)
    cd.text((16, 10), f'{rev} / COMMAND LAYERS', font=font(15), fill='#fff0cb')
    for row, (move, (_, names)) in enumerate(MOVES.items()):
        for col, name in enumerate(names):
            box = [col * 384, round(row * 1024 / 3), (col + 1) * 384, round((row + 1) * 1024 / 3)]
            # Generated layouts are approximate: isolate complete paintings rather
            # than importing a neighbouring thread/wake into another layer.
            if rev == 'R1' and move == 'challenge' and col == 2: box = [790, 350, 1235, 680]
            if rev == 'R1' and move == 'challenge' and col == 3: box = [1250, 350, 1536, 680]
            if rev == 'R2' and move == 'taunt' and col == 0: box = [35, 0, 305, 341]
            if rev == 'R2' and move == 'taunt' and col == 1: box = [320, 0, 768, 350]
            tile = sheet.crop(box)
            tile.thumbnail((224, 200), Image.Resampling.LANCZOS)
            layer = Image.new('RGBA', (256, 256))
            off = ((256 - tile.width) // 2, (256 - tile.height) // 2)
            layer.alpha_composite(tile, off)
            path = ROOT / rev / 'layers' / f'{move}_{name}.png'
            layer.save(path)
            images[rev, move, name] = layer
            atlas.alpha_composite(layer, (col * 256, row * 256))
            # All pivots are in the delivered padded 256-square texture.
            pivot = [128, 128]
            if move == 'warcry' and col == 1: pivot = [35, 128]
            if move == 'challenge' and col == 2: pivot = [24, 128]
            item = {'revision': rev, 'move': move, 'beat': 'prepare' if col == 0 else 'settle' if col == 3 else 'peak',
                    'role': name, 'path': str(path.relative_to(ROOT)), 'sha256': sha(path),
                    'size': [256, 256], 'pivotPx': pivot, 'pivot': [v / 256 for v in pivot],
                    'anchor': ANCHORS[move][col], 'source': str(src.relative_to(ROOT)), 'sourceRect': box,
                    'packTransform': {'size': list(tile.size), 'offset': list(off)},
                    'alphaBounds': list(layer.getchannel('A').getbbox()),
                    'flipX': move == 'challenge' and col == 2 and rev == 'R1',
                    'route': 'only actual War cry counter target; never on cast' if move == 'warcry' and col == 2 else 'cast cue; no damage implied'}
            manifest['layers'].append(item)
            thumb = layer.resize((90, 90), Image.Resampling.LANCZOS)
            x, y = col * 96 + 4, 38 + row * 140
            contact.paste(thumb, (x, y), thumb)
            cd.text((x + 3, y + 91), move, font=font(10), fill='#fff0cb')
            cd.text((x + 3, y + 105), name, font=font(9), fill='#91aaa9')
    atlas.save(ROOT / rev / 'layer-sheet.png')
    contact.save(ROOT / rev / 'layers-390.png')

def unit(name):
    sheet, idx = {'brann': ('units_mercs', 4), 'garran': ('units_mercs', 0),
                  'aegis': ('units', 0), 'foe': ('units', 4)}[name]
    im = Image.open(REPO / 'public/assets/art' / f'{sheet}.webp').convert('RGBA')
    return im.crop(((idx % 2) * 512, (idx // 2) * 512, (idx % 2 + 1) * 512, (idx // 2 + 1) * 512))

def place(canvas, layer, xy, size, pivot=(128,128), opacity=1, flip=False):
    im = ImageOps.mirror(layer) if flip else layer.copy()
    im = im.resize(size, Image.Resampling.LANCZOS)
    if opacity != 1: im.putalpha(im.getchannel('A').point(lambda v: round(v * opacity)))
    canvas.alpha_composite(im, (round(xy[0] - pivot[0] * size[0] / 256), round(xy[1] - pivot[1] * size[1] / 256)))

PROTECTED = [(62, 63, 112, 102)] + [(x-17, 95, x+17, 125) for x in [242, 300, 352]] + [(14, 168, 378, 191)]
board_anchors = {'width': 390, 'stageHeight': 216, 'casterChest': [87, 125], 'shieldFront': [115, 131],
                 'shieldTop': [115, 112], 'foeChests': [[242, 136], [300, 136], [352, 136]],
                 'protectedRects': PROTECTED, 'note': 'Illustrative art board coordinates, not measured runtime anchors; actor sprites are existing repository reference art.'}
dump(ROOT / 'storyboards' / 'anchors.json', board_anchors)

def stage(rev, move, beat):
    bg = Image.new('RGBA', (390,216), '#101b29')
    d = ImageDraw.Draw(bg)
    d.line((16, 164, 374, 164), fill='#253746', width=1)
    caster = {'taunt': 'brann', 'challenge': 'aegis', 'warcry': 'garran'}[move]
    place(bg, unit(caster), (87, 163), (104,104), pivot=(256/2, 248))
    for i,x in enumerate([242,300,352]):
        place(bg, unit('foe'), (x,163), (67,67), pivot=(128,248), flip=True)
        d.rounded_rectangle((x-23,172,x+23,187), radius=3, fill='#172c36')
        d.text((x-18,173), 'HP  /  --', fill='#afccca', font=font(9))
    d.rounded_rectangle((55,172,119,187), radius=3, fill='#172c36')
    d.text((64,173), 'HP  /  --', fill='#afccca', font=font(9))
    fx = Image.new('RGBA', bg.size)
    get = lambda name: images[rev,move,name]
    if beat == 0:
        place(fx, get('prepare'), (87 if move=='taunt' else 110,126), (60,60))
    elif beat == 1:
        if move == 'taunt':
            place(fx, get('peak-pulse'), (169,124), (88,88))
            place(fx, get('peak-motes'), (193,135), (69,38), opacity=.65)
        elif move == 'challenge':
            place(fx, get('peak-crest'), (124,132), (59,59))
            place(fx, get('peak-thread'), (204,136), (155,24), flip=rev=='R1')
        else:
            place(fx, get('peak-cone'), (115,133), (127,66), pivot=(35,128))
    elif beat == 2:
        if move == 'taunt': place(fx,get('settle-mark'), (87,125), (42,42))
        elif move == 'challenge': place(fx,get('settle-crest'), (123,114), (25,25))
        else: place(fx,get('settle-wisps'), (135,137), (65,35), opacity=.6)
    else:
        # Later physical-hit counter example: exactly one actual affected foe.
        place(fx,get('peak-impact'), (300,144), (56,56))
    # Board-only readability mask. Production layers remain intact RGBA.
    a=fx.getchannel('A'); ad=ImageDraw.Draw(a)
    for rect in PROTECTED: ad.rectangle(rect,fill=0)
    fx.putalpha(a); bg.alpha_composite(fx)
    return bg.convert('RGB'), fx

for rev in ['R1','R2']:
    boards=[]
    for move,(actor,_) in MOVES.items():
        n = 4 if move=='warcry' else 3
        h = 118 + 242*n
        board = Image.new('RGB',(390,h),'#0b1420'); d=ImageDraw.Draw(board)
        d.text((18,17),f'{rev}  /  {move.upper()}',font=font(22),fill='#fff0cb')
        d.text((18,47),actor,font=font(12),fill='#9cbbb9')
        d.text((18,68),'ART CONCEPT / 390px / illustrative staging',font=font(10),fill='#7c929f')
        titles = ['01  PREPARE', '02  PEAK', '03  SETTLE', 'LATER  /  RESOLVED COUNTER EXAMPLE']
        captions = {'taunt':['Chest gathers pressure','Pulse rolls toward foe side','Brief chest mark remains'],
                    'challenge':['Gather at shield front','Crest flash / line to selected foe','Small crest above shield'],
                    'warcry':['Chest gathers breath','Directional cue / no cast damage','Wisps fade / counter stance armed','One impact on actual counter target']}[move]
        for beat in range(n):
            y=90+242*beat
            d.text((18,y+2),titles[beat],font=font(11),fill='#d7b06d' if move!='warcry' else '#7ccfc8')
            panel,fx=stage(rev,move,beat)
            board.paste(panel,(0,y+26))
            pd=ImageDraw.Draw(board)
            pd.text((18,y+222),captions[beat],font=font(10),fill='#a9c0c2')
            # Confirm zero effect alpha in protected face and HP rectangles.
            for rect in PROTECTED: assert fx.getchannel('A').crop(rect).getbbox() is None
        d=ImageDraw.Draw(board)
        d.text((18,h-20),'Normal alpha / no floor ring / no runtime changes',font=font(10),fill='#7c929f')
        path=ROOT/'storyboards'/f'{rev}-{move}-390.png';board.save(path);boards.append(board)
        manifest['storyboards'].append({'path':str(path.relative_to(ROOT)), 'size':list(board.size), 'sha256':sha(path)})
    overview=Image.new('RGB',(390,sum(b.height for b in boards)))
    y=0
    for b in boards: overview.paste(b,(0,y));y+=b.height
    path=ROOT/'storyboards'/f'{rev}-390.png';overview.save(path)
    manifest['storyboards'].append({'path':str(path.relative_to(ROOT)),'size':list(overview.size),'sha256':sha(path)})

dump(ROOT/'layers.json',manifest)
files=sorted(p for p in ROOT.rglob('*') if p.is_file() and p.name not in ['SHA256SUMS','push-verification.json'] and '__pycache__' not in p.parts)
(ROOT/'SHA256SUMS').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in files))
print(f'Packaged {len(manifest["layers"])} layers, {len(manifest["storyboards"])} storyboards; protected face/HP checks passed.')
