"""Atlas registration, lossless encoding and review composition; no artwork redrawing."""
from pathlib import Path
import json
from PIL import Image, ImageOps, ImageDraw

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
IDS = ['meadow_fox','thicket_piglet','rift_crystal_moth','fort_gargoyle_pup','forest_lantern_owl','gate_starveil_slime']
POSES = ['idle_a','idle_b','assist','happy']
R = Image.Resampling.LANCZOS
source = Image.open(OUT/'sprite_source.png').convert('RGBA')
COL_EDGES = [0,280,530,800,1024]
ROW_X = [
    [(10,270),(280,520),(530,795),(800,1024)],
    [(20,265),(280,520),(535,790),(800,1024)],
    [(20,270),(280,515),(530,790),(800,1024)],
    [(15,270),(280,520),(520,790),(800,1024)],
    [(15,260),(275,510),(510,800),(800,1024)],
    [(5,275),(280,520),(530,780),(790,1024)],
]
ROW_EDGES = [25,285,505,755,975,1220,1480]
atlas = Image.new('RGBA',(1024,1536))
frames = {}
cells = []
for row, pet in enumerate(IDS):
    crops = []
    for col in range(4):
        left,right=ROW_X[row][col]
        cell = source.crop((left,ROW_EDGES[row],right,ROW_EDGES[row+1]))
        # Ignore near-zero matte noise for bounding-box measurement only. Preserve alpha.
        box = cell.getchannel('A').point(lambda a:255 if a>=32 else 0).getbbox()
        crops.append(cell.crop(box))
    scale = min(216/max(c.width for c in crops),216/max(c.height for c in crops))
    for col, (pose,crop) in enumerate(zip(POSES,crops)):
        art = crop.resize((round(crop.width*scale),round(crop.height*scale)),R)
        cell = Image.new('RGBA',(256,256))
        cell.alpha_composite(art,((256-art.width)//2,241-art.height))
        atlas.alpha_composite(cell,(col*256,row*256))
        frames[f'{pet}_{pose}']={'x':col*256,'y':row*256,'w':256,'h':256,'footY':240}
        cells.append(cell)
atlas.save(OUT/'pets.webp',lossless=True,exact=True)
(OUT/'pets.json').write_text(json.dumps({'image':'pets.webp','width':1024,'height':1536,'facing':'right','rows':IDS,'columns':POSES,'baselineConvention':'footY is local to each frame; moth uses a virtual hover baseline','frames':frames},indent=2)+'\n')
portrait_source=Image.open(OUT/'portrait_source.png').convert('RGB')
portraits=Image.new('RGB',(768,512))
pf={}
for i,pet in enumerate(IDS):
    portrait=portrait_source.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512)).resize((256,256),R)
    portraits.paste(portrait,((i%3)*256,(i//3)*256))
    pf[pet]={'x':(i%3)*256,'y':(i//3)*256,'w':256,'h':256}
portraits.save(OUT/'pet_portraits.webp',lossless=True)
(OUT/'pet_portraits.json').write_text(json.dumps({'image':'pet_portraits.webp','width':768,'height':512,'frames':pf},indent=2)+'\n')

board=Image.new('RGBA',(1536,1320),(19,26,40,255))
d=ImageDraw.Draw(board)
units=Image.open(ROOT/'public/assets/art/units.webp').convert('RGBA')
knight=units.crop((0,0,512,512)).resize((100,100),R)
foe=ImageOps.mirror(units.crop((0,1024,512,1536))).resize((100,100),R)
ruins=Image.open(ROOT/'public/assets/art/ruins.webp').convert('RGBA')
lobby=Image.open(ROOT/'public/assets/lobby/lobby_bg.webp').convert('RGBA')
fire=Image.open(ROOT/'public/assets/lobby/lobby_firepit.webp').convert('RGBA')
tiles=Image.open(ROOT/'public/assets/world/tileset.webp').convert('RGBA')
tf=json.loads((ROOT/'src/content/world/tileset.json').read_text())

def put(im,cx,base):
    board.alpha_composite(im,(round(cx-im.width/2),round(base-im.height)))

def pet_size(cell,height):
    # Frame scaling is shared with baseline; transparent margins remain intact.
    return cell.resize((height,height),R)

for i,pet in enumerate(IDS):
    x=(i%3)*512; y=(i//3)*660
    d.text((x+12,y+8),pet,fill='white')
    board.alpha_composite(ImageOps.fit(ruins,(500,155)),(x+6,y+30))
    board.alpha_composite(knight,(x+45,y+70))
    put(pet_size(cells[i*4],52),x+174,y+170)
    board.alpha_composite(foe,(x+380,y+70))
    d.text((x+12,y+188),'BATTLE: Knight 100 px frame / pet ~44 px art',fill='white')
    f=tf.get(['meadow_0','thicket_0','scar_0','wall_inner','thicket_1','sanctum_0'][i],tf['meadow_0'])
    tile=tiles.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
    for t,ox in [(128,14),(48,170),(64,258)]:
        board.alpha_composite(tile.resize((t,t),R),(x+ox,y+235))
        put(pet_size(cells[i*4],round(t*.72)),x+ox+t/2,y+235+t-3)
        d.text((x+ox,y+218),f'{t} px tile',fill='white')
    d.text((x+355,y+218),'44 px reading',fill='white')
    for col in range(4):
        put(pet_size(cells[i*4+col],52),x+380+(col%2)*75,y+290+(col//2)*65)
    board.alpha_composite(ImageOps.fit(lobby,(500,160)),(x+6,y+400))
    p=pet_size(cells[i*4+3],60)
    put(p,x+178,y+548); put(ImageOps.mirror(p),x+334,y+548)
    ff=fire.copy();ff.thumbnail((60,60),R);put(ff,x+256,y+548)
    d.text((x+12,y+565),'CAMP: happy/rest pose, 60 px frame; right mirrored',fill='white')
    portrait=portraits.crop(((i%3)*256,(i//3)*256,(i%3+1)*256,(i//3+1)*256)).convert('RGBA')
    board.alpha_composite(portrait.resize((48,48),R),(x+20,y+600))
    circle=portrait.resize((40,40),R);mask=Image.new('L',(40,40));ImageDraw.Draw(mask).ellipse((0,0,39,39),fill=255);circle.putalpha(mask)
    board.alpha_composite(circle,(x+85,y+604))
    d.text((x+140,y+617),'Portrait: 48 px / circle 40 px',fill='white')
board.convert('RGB').save(OUT/'preview.png')
# Alpha-aware contact sheet on a contrasting solid background for visual QA.
qa=Image.new('RGBA',atlas.size,(38,57,69,255));qa.alpha_composite(atlas);qa.convert('RGB').save(OUT/'atlas_review.png')
checks={'pets.webp':list(atlas.size),'pet_portraits.webp':list(portraits.size),'preview.png':list(board.size),'frames':24,'footY':240,'transparent_corner_pixels':True,'sourceAlphaExtrema':source.getchannel('A').getextrema()}
decoded=Image.open(OUT/'pets.webp').convert('RGBA')
assert decoded.size==(1024,1536)
for f in frames.values():
    assert decoded.getpixel((f['x'],f['y']))[3]==0
    assert f['footY']==240
(OUT/'validation.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks))
