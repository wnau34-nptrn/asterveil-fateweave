"""Deterministic export/compositing only. Run with Pillow; sources are self-contained."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import hashlib, json, shutil, subprocess

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
GEN = Path('C:/Users/Warunyu.N/.codex/generated_images/01a1625b-0edc-74b3-9ad4-aea13201ee8c')
L = Image.Resampling.LANCZOS
# id, full-body generation, portrait generation, maximum sprite bounds, portrait crop top
SPECS = [
 ('dew_slime','4cfc2e70-900f-4eb5-8524-6aae2e5cadaf','33f5ea47-df9e-4b75-9869-65482a85bf61',(350,320),.25),
 ('ember_slime','23c8773b-1927-47ac-98e1-e53f29a12dfb','dbaaef10-0b82-4e37-9208-26bd64efa582',(350,300),.22),
 ('ruin_bat','3f25a6d5-2103-4c29-8d3a-2dd32a3bc6fd','bf6ef4ce-4a9b-4cad-959e-a95356b243c9',(440,340),.22),
 ('vargoth_guard','22423c45-0839-418f-afed-5a26b7bb98bd','a5d6f56b-9914-4f50-9174-0e976c63b600',(480,470),.12),
 ('thorn_beetle','0860abe0-a1f3-43c3-a98c-068ca180e55e','3d031c7e-f361-47a1-8a20-53b7a94fb99f',(440,390),.26),
 ('spore_puff','cece79ba-7885-4768-9770-299ebd6d18a9','ed02d098-025f-4473-9a78-83a54d2b7f43',(380,390),.28),
 ('rift_channeler','55c0b7af-f6e6-4146-960d-a282f315f5a8','5c3d9c14-fd5c-4942-abf3-33c1d78477e4',(480,470),.10),
 ('rift_wisp','d278c658-d69e-4ba8-98b5-1951a619cd84','6724a1f0-68f3-46a0-8ee7-1d45852f45a1',(350,370),.30),
 ('shard_crawler','2bb38707-7211-4182-a263-cca51ff7f38f','a32cfb62-e1fc-4ce5-95e5-b0f4eeca9ba7',(460,400),.24),
]
for folder in ['sources','foes','portraits']:
 (ROOT/folder).mkdir(exist_ok=True)
units=Image.new('RGBA',(1024,2560))
portraits=Image.new('RGB',(1024,2560))
frames={}; sprites={}; busts={}; report={}
for i,(key,unit,portrait,limits,top) in enumerate(SPECS):
 for suffix,source in [('',unit),('_portrait',portrait)]:
  target=ROOT/'sources'/(key+suffix+'.png')
  if not target.exists(): shutil.copy2(GEN/('exec-'+source+'.png'),target)
 src=Image.open(ROOT/'sources'/(key+'.png')).convert('RGBA')
 assert src.getchannel('A').getextrema()[0]==0
 # Ignore near-invisible generator alpha dust when measuring crop bounds.
 bounds=src.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
 crop=src.crop(bounds); crop.thumbnail(limits,L)
 crop=crop.crop(crop.getbbox())
 frame=Image.new('RGBA',(512,512)); frame.alpha_composite(crop,((512-crop.width)//2,497-crop.height))
 assert frame.getbbox()[3]==497
 assert frame.getbbox()[0]>=8 and frame.getbbox()[2]<=504
 raw=Image.open(ROOT/'sources'/(key+'_portrait.png')).convert('RGB')
 side=round(raw.width*(1-top)); x=round(raw.width*.06)
 bust=raw.crop((x,round(raw.height*top),x+side,round(raw.height*top)+side)).resize((512,512),L)
 for im,folder,name in [(frame,'foes',key),(bust,'portraits','portrait_'+key)]:
  im.save(ROOT/folder/(name+'.png'))
  im.save(ROOT/folder/(name+'.webp'),quality=85,method=6)
 x=(i%2)*512; y=(i//2)*512
 units.alpha_composite(frame,(x,y)); portraits.paste(bust,(x,y))
 frames[key]=dict(x=x,y=y,w=512,h=512,footY=496)
 sprites[key]=frame; busts[key]=bust
 report[key]=dict(bounds=frame.getbbox(),unitSource=unit,portraitSource=portrait,portraitCropTop=top)
units.save(ROOT/'units_foes2.webp',quality=85,method=6)
portraits.save(ROOT/'portraits_foes2.webp',quality=85,method=6)
for name in ['units_foes2','portraits_foes2']:
 (ROOT/(name+'.json')).write_text(json.dumps(frames,indent=2)+'\n')
heroes=Image.open(REPO/'public/assets/art/units.webp').convert('RGBA')
def hero(i):
 return heroes.crop(((i%2)*512,(i//2)*512,(i%2+1)*512,(i//2+1)*512))
def actor(canvas,frame,x,y,size):
 canvas.alpha_composite(frame.resize((size,size),L),(round(x-size/2),round(y-496*size/512)))
def phone(foes):
 canvas=Image.new('RGBA',(390,844),'#111728')
 bg=ImageOps.fit(Image.open(REPO/'public/assets/art/ruins.webp').convert('RGBA'),(390,520),method=L)
 canvas.alpha_composite(bg,(0,90))
 for i,x,y in [(2,58,300),(0,145,360),(3,58,450),(1,145,510)]: actor(canvas,hero(i),x,y,100)
 for key,x,y,size in foes: actor(canvas,sprites[key],x,y,size)
 return canvas.convert('RGB')
p1=phone([('ember_slime',334,300,100),('ruin_bat',334,450,100),('dew_slime',265,390,100)])
p3=phone([('rift_wisp',334,280,100),('shard_crawler',334,440,100),('rift_channeler',260,350,150),('rift_channeler',260,510,150)])
p1.save(ROOT/'preview_map1.png'); p3.save(ROOT/'preview_map3.png')
preview=Image.new('RGB',(780,844)); preview.paste(p1,(0,0));preview.paste(p3,(390,0));preview.save(ROOT/'preview.png')
ladder=Image.new('RGBA',(780,310),'#a2a4ad')
for key,x,size in [('dew_slime',130,160),('thorn_beetle',390,180),('rift_channeler',650,240)]: actor(ladder,sprites[key],x,280,size)
ladder.convert('RGB').save(ROOT/'scale_ladder.png')
review=Image.new('RGBA',(900,1020),'#a2a4ad')
for i,(key,*_) in enumerate(SPECS):
 x=(i%3)*300; y=(i//3)*340
 actor(review,sprites[key],x+150,y+240,240)
 review.alpha_composite(busts[key].convert('RGBA').resize((40,40),L),(x+45,y+270))
 sm=sprites[key].resize((64,64),L);sil=Image.new('RGBA',(64,64),'black');sil.putalpha(sm.getchannel('A'))
 review.alpha_composite(sil,(x+120,y+260))
 review.alpha_composite(sm,(x+210,y+260))
review.convert('RGB').save(ROOT/'review.png')
hashes={}
for folder in ['public/assets/art','incoming/ART-CHAR-BOSS-RUINS-001']:
 for path in (REPO/folder).glob('*'):
  if path.is_file() and path.suffix in ['.webp','.png']:
   rel=path.relative_to(REPO).as_posix(); data=path.read_bytes()
   assert data==subprocess.check_output(['git','show','HEAD:'+rel],cwd=REPO)
   hashes[rel]=hashlib.sha256(data).hexdigest()
runtime=sum((ROOT/name).stat().st_size for name in ['units_foes2.webp','portraits_foes2.webp'])
allwebp=sum(p.stat().st_size for p in ROOT.rglob('*.webp'))
assert allwebp<=2_000_000
reopen=Image.open(ROOT/'units_foes2.webp').convert('RGBA')
assert reopen.size==(1024,2560) and reopen.crop((512,2048,1024,2560)).getbbox() is None
for key,rect in frames.items():
 cell=reopen.crop((rect['x'],rect['y'],rect['x']+512,rect['y']+512))
 assert cell.getbbox()[3]==497
(ROOT/'validation.json').write_text(json.dumps(dict(frames=report,runtimeAtlasBytes=runtime,allWebpBytes=allwebp,referenceSHA256=hashes,checks=dict(atlasSize=[1024,2560],frameSize=[512,512],footY=496,lastUnitCellEmpty=True,referenceBytesUnchanged=True,previewSize=[780,844],phoneFrames=[390,844])),indent=2)+'\n')
print(json.dumps(dict(runtimeAtlasBytes=runtime,allWebpBytes=allwebp,frames=len(frames))))
