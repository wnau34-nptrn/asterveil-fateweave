"""Deterministic review-board layout only; AI artwork is never redrawn here."""
from pathlib import Path
from collections import deque
import json
from PIL import Image, ImageOps, ImageDraw

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
NAMES = ['01_meadow_fox', '02_thicket_piglet', '03_rift_crystal_moth',
         '04_fort_gargoyle_pup', '05_forest_lantern_owl', '06_gate_starveil_slime']
BG = (250, 245, 234, 255)

def cutout(im):
    """Flood only the pale exterior of an opaque concept, retaining enclosed paint."""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    seen = set()
    q = deque([(x, y) for x in range(w) for y in (0,h-1)] +
              [(x,y) for y in range(h) for x in (0,w-1)])
    while q:
        x,y = q.popleft()
        if (x,y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x,y))
        r,g,b,a = px[x,y]
        if min(r,g,b) < 202 or max(r,g,b)-min(r,g,b) > 47:
            continue
        px[x,y] = (r,g,b,0)
        q.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    return im.crop(im.getbbox())

def fit(im, w, h):
    im = im.copy()
    im.thumbnail((w,h), Image.Resampling.LANCZOS)
    return im

def put(board, im, cx, baseline):
    board.alpha_composite(im, (round(cx-im.width/2), round(baseline-im.height)))

source = Image.open(OUT/'concept_source.png').convert('RGBA')
sx,sy = source.width/1672, source.height/941
boxes = [(8,4,548,373),(611,32,1095,373),(1120,3,1667,373),
         (11,481,546,813),(608,479,1103,813),(1156,490,1659,813)]
pets = [cutout(source.crop(tuple(round(v*(sx if j%2==0 else sy)) for j,v in enumerate(b)))) for b in boxes]
sheet = Image.new('RGBA',(2048,1152), BG)
checks = {'concept_sheet': [2048,1152], 'silhouettes': [], 'scale_preview': {}}
for i,pet in enumerate(pets):
    cx = (i%3)*682+341
    y = (i//3)*576
    put(sheet, fit(pet,540,390), cx, y+423)
    for size,dx in [(32,-64),(64,64)]:
        small = pet.resize((max(1,round(pet.width*size/pet.height)),size), Image.Resampling.LANCZOS)
        alpha = small.getchannel('A').point(lambda a:255 if a>=128 else 0)
        silhouette = Image.new('RGBA',small.size,(35,30,34,255))
        silhouette.putalpha(alpha)
        put(sheet,silhouette,cx+dx,y+532)
        checks['silhouettes'].append({'pet':NAMES[i],'box':list(small.size)})
sheet.convert('RGB').save(OUT/'concept_sheet.png')

units = Image.open(ROOT/'public/assets/art/units.webp').convert('RGBA')
knight = units.crop((0,0,512,512))
foe = units.crop((0,1024,512,1536))
tiles = Image.open(ROOT/'public/assets/world/tileset.webp').convert('RGBA')
frames = json.loads((ROOT/'src/content/world/tileset.json').read_text())
preview = Image.new('RGBA',(1536,1152),BG)
ruins = Image.open(ROOT/'public/assets/art/ruins.webp').convert('RGBA')
lobby = Image.open(ROOT/'public/assets/lobby/lobby_bg.webp').convert('RGBA')
for i,pet in enumerate(pets):
    x=(i%3)*512
    y=(i//3)*576
    # Real 100 px runtime Knight frame and legacy enemy (mirrored as in game).
    preview.alpha_composite(ImageOps.fit(ruins,(504,180)),(x+4,y+8))
    preview.alpha_composite(knight.resize((100,100),Image.Resampling.LANCZOS),(x+52,y+71))
    put(preview,fit(pet,52,44),x+174,y+168)
    preview.alpha_composite(ImageOps.mirror(foe).resize((100,100),Image.Resampling.LANCZOS),(x+370,y+66))
    # Actual map tiles, no enlarged fake pixels: 48 px and supplementary 64 px.
    tilekey=['meadow_0','thicket_0','scar_0','wall_inner','thicket_1','sanctum_0'][i]
    if tilekey not in frames:
        tilekey='rift_0' if 'rift_0' in frames else 'meadow_0'
    f=frames[tilekey]
    tile=tiles.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
    for t,ox in [(48,60),(64,280)]:
        oy=y+219
        for yy in range(3):
            for xx in range(3):
                preview.alpha_composite(tile.resize((t,t),Image.Resampling.LANCZOS),(x+ox+xx*t,oy+yy*t))
        put(preview,fit(pet,round(t*.82),round(t*.76)),x+ox+1.5*t,oy+1.94*t)
    # Lobby-facing check: identical artwork, mirrored only on right of fire.
    preview.alpha_composite(ImageOps.fit(lobby,(504,128)),(x+4,y+437))
    camp=Image.open(ROOT/'public/assets/lobby/lobby_firepit.webp').convert('RGBA')
    camp=fit(camp,64,64)
    put(preview,camp,x+256,y+560)
    p=fit(pet,55,46)
    put(preview,p,x+168,y+558)
    put(preview,ImageOps.mirror(p),x+344,y+558)
    checks['scale_preview'][NAMES[i]]={'knight_frame_px':100,'pet_battle_max_px':[52,44], 'map_tile_px':[48,64]}
preview.convert('RGB').save(OUT/'scale_preview.png')
for name in NAMES:
    path=OUT/(name+'_turnaround.png')
    if path.exists():
        im=Image.open(path)
        if im.size != (1024,1024):
            normalized = Image.new('RGB',(1024,1024),BG[:3])
            art = ImageOps.contain(im.convert('RGB'),(1024,1024),Image.Resampling.LANCZOS)
            normalized.paste(art,((1024-art.width)//2,(1024-art.height)//2))
            normalized.save(path)
checks['files']={p.name:list(Image.open(p).size) for p in OUT.glob('*.png')}
(OUT/'validation.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks['files'],indent=2))
