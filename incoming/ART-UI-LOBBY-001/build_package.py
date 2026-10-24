"""Deterministic size/anchor normalization and review compositing; no generated painting."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps, ImageCms
import json, hashlib, subprocess
from collections import deque

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
GEN=OUT/'provenance/generated'
ICC=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
RES=Image.Resampling.LANCZOS
def source(name): return Image.open(GEN/name)
def save(im,path):
    if str(path).endswith('.webp') and str(path).startswith('poses/'):
        alpha=im.getchannel('A').point(lambda v:0 if v<32 else 255 if v>224 else round(v/17)*17)
        im=im.convert('RGB').resize((round(im.width*.75),round(im.height*.75)),RES).resize(im.size,RES).convert('RGBA');im.putalpha(alpha)
    im.save(OUT/path,icc_profile=ICC,**({'quality':70,'method':4,'exact':True} if str(path).endswith('.webp') else {}))
def isolate(tile):
    tile=tile.convert('RGBA'); a=tile.getchannel('A'); w,h=tile.size
    data=bytearray(a.point(lambda v:255 if v>=32 else 0).tobytes()); components=[]
    for start in range(w*h):
        if not data[start]: continue
        q=[start];data[start]=0;part=[]
        while q:
            pos=q.pop();part.append(pos);x=pos%w
            for nxt in ([pos-1] if x else [])+([pos+1] if x<w-1 else [])+([pos-w] if pos>=w else [])+([pos+w] if pos<w*(h-1) else []):
                if data[nxt]:data[nxt]=0;q.append(nxt)
        components.append(part)
    largest=max(map(len,components)); mask=bytearray(w*h)
    original=a.tobytes()
    for part in components:
        if len(part)>=largest*.02:
            for pos in part:mask[pos]=original[pos]
    tile.putalpha(Image.frombytes('L',(w,h),bytes(mask)))
    return tile
def normalize(tile,height=460):
    tile=isolate(tile)
    box=tile.getbbox(); tile=tile.crop(box)
    ratio=min(488/tile.width,height/tile.height)
    tile=tile.resize((round(tile.width*ratio),round(tile.height*ratio)),RES)
    tile.putalpha(tile.getchannel('A').point(lambda v:0 if v<32 else v))
    tile=tile.crop(tile.getbbox())
    frame=Image.new('RGBA',(512,512));frame.alpha_composite(tile,((512-tile.width)//2,497-tile.height))
    return frame
def atlas(src,ids,name,rows=None,cols=None):
    w,h=src.size; result=Image.new('RGBA',(1536,len(ids)*512)); mapping={}
    frames=[]
    for r,id in enumerate(ids):
        top,bottom=(rows[r],rows[r+1]) if rows else (round(h*r/len(ids)),round(h*(r+1)/len(ids)))
        cuts=cols[r] if cols else [round(w*c/3) for c in range(4)]
        for c,pose in enumerate(['sit','cheer','idle_alt']):
            frame=normalize(src.crop((cuts[c],top,cuts[c+1],bottom)),420 if c==0 else 470)
            result.alpha_composite(frame,(c*512,r*512));frames.append(frame)
            info=dict(x=c*512,y=r*512,w=512,h=512,footY=496)
            if c==0: info['seatY']=([386,374,384,390] if len(ids)==4 else [365,360,378,380,386,370])[r]
            mapping[id+'_'+pose]=info
    save(result,'poses/'+name+'.png');save(result,'poses/'+name+'.webp')
    (OUT/'poses'/ (name+'.json')).write_text(json.dumps(mapping,indent=2)+'\n')
    return frames

bg=source('exec-90072eb2-157b-430b-9e03-5119fbf80b1a.png').convert('RGB').resize((2400,1000),RES)
fgsrc=source('exec-7a5eab89-b273-4b6d-ab08-a724732bdf03.png').convert('RGBA')
fgsrc=fgsrc.crop(fgsrc.getbbox()).resize((2400,120),RES)
fg=Image.new('RGBA',(2400,1000));fg.alpha_composite(fgsrc,(0,880))
fire=normalize(source('exec-c342cb7a-14d3-42f8-942f-12317616fda7.png'),320).resize((256,256),RES)
for name,im in [('lobby_bg',bg),('lobby_fg',fg),('lobby_firepit',fire)]:
    save(im,'scene/'+name+'.png');save(im,'scene/'+name+'.webp')
heroes=atlas(source('exec-53a687e1-f03a-454f-8563-a0c3aad274cb.png'),['guardian','tracer','weaver','healer'],'lobby_poses_heroes',rows=[0,361,714,1074,1448],cols=[[0,386,730,1086],[0,390,730,1086],[0,390,730,1086],[0,378,727,1086]])
mercfile=(OUT/'provenance/merc-source.txt').read_text().strip()
mercs=atlas(source(mercfile),['merc_spear','merc_archer','merc_alchemist','merc_scout','merc_warden','merc_bard'],'lobby_poses_mercs')

# Reviews sample decoded runtime WebP, not the lossless intermediates.
def runtime_frames(name,n):
    im=Image.open(OUT/'poses'/ (name+'.webp')).convert('RGBA')
    return [im.crop((c*512,r*512,(c+1)*512,(r+1)*512)) for r in range(n) for c in range(3)]
heroes=runtime_frames('lobby_poses_heroes',4);mercs=runtime_frames('lobby_poses_mercs',6)
bg=Image.open(OUT/'scene/lobby_bg.webp').convert('RGBA');fg=Image.open(OUT/'scene/lobby_fg.webp').convert('RGBA');fire=Image.open(OUT/'scene/lobby_firepit.webp').convert('RGBA')
master=Image.open(ROOT/'public/assets/art/units.webp').convert('RGBA')
lineup=Image.new('RGBA',(960,960),'#14243a')
for r in range(4):
    originals=master.crop(((r%2)*512,(r//2)*512,(r%2+1)*512,(r//2+1)*512))
    for c,im in enumerate([originals]+heroes[r*3:r*3+3]):lineup.alpha_composite(im.resize((224,224),RES),(c*240+8,r*240+8))
save(lineup,'review/poses-lineup.png')
sil=Image.new('RGBA',(12*110,110),'#e5e8ee')
mirror=Image.new('RGBA',(6*220,4*220),'#14243a')
for i,im in enumerate(heroes):
    cut=im.crop(im.getbbox());cut=cut.resize((round(cut.width*90/cut.height),90),RES)
    black=Image.new('RGBA',cut.size,'black');black.putalpha(cut.getchannel('A'));sil.alpha_composite(black,(i*110+(110-cut.width)//2,10))
    pair=[im,ImageOps.mirror(im)]
    for j,p in enumerate(pair):mirror.alpha_composite(p.resize((210,210),RES),((i%3)*440+j*220,(i//3)*220))
save(sil,'review/silhouettes.png');save(mirror,'review/mirror-check.png')
ms=Image.new('RGBA',(6*180,6*180),'#14243a')
for i,im in enumerate(mercs):
    for j,p in enumerate([im,ImageOps.mirror(im)]):ms.alpha_composite(p.resize((174,174),RES),((i%3)*360+j*180,(i//3)*180))
save(ms,'review/mercs-mirror-check.png')

def mock(w,h,rect,head,panel,footer):
    page=Image.new('RGBA',(w,h),'#0d1423');d=ImageDraw.Draw(page)
    for box in [head,panel,footer]:d.rounded_rectangle(box,radius=14,outline='#d9bf8680',width=1)
    # Only HUD boundaries; no painted UI/text.
    px,py,pr,pb=panel
    d.rectangle((px+12,py+12,pr-12,py+64),outline='#d9bf8680')
    for row in range(2):
        for c in range(4):
            cw=(pr-px-32)/4
            x=round(px+12+c*cw);y=round(py+94+row*145)
            if y+115<pb:d.rounded_rectangle((x,y,round(x+cw-6),y+115),radius=8,outline='#d9bf8680')
    x,y,bw,bh=rect
    scene=ImageOps.fit(bg,(bw,bh),method=RES,centering=(.5,1))
    # Match current source positions and depth sizes.
    for index,xx,depth,scale in [(0,.18,0,1),(3,.33,1,.92),(7,.67,1,.92),(11,.82,0,1)]:
        size=round(min(210,max(84,.21*h))*scale)
        im=heroes[index]
        if xx>.5:im=ImageOps.mirror(im)
        im=im.resize((size,size),RES)
        baseline=round(bh*(.94 if depth==0 else .88))
        scene.alpha_composite(im,(round(bw*xx-size/2),baseline-round(496/512*size)))
    pit=fire.resize((52,52),RES);scene.alpha_composite(pit,(bw//2-26,bh-51))
    flame=Image.new('RGBA',(46,66));fd=ImageDraw.Draw(flame)
    fd.ellipse((8,5,38,65),fill='#ff9f35');fd.ellipse((15,27,32,63),fill='#ffe6a0')
    scene.alpha_composite(flame,(bw//2-23,bh-85))
    scene.alpha_composite(ImageOps.fit(fg,(bw,bh),method=RES,centering=(.5,1)))
    page.alpha_composite(scene,(x,y));ImageDraw.Draw(page).rounded_rectangle((x,y,x+bw-1,y+bh-1),radius=12,outline='#d9bf86',width=1)
    return page
save(mock(390,844,(12,84,366,186),(12,12,378,74),(12,280,378,740),(12,758,378,812)),'review/lobby-phone.png')
save(mock(1366,768,(285,86,796,169),(285,12,1081,76),(285,266,1081,686),(285,704,1081,756)),'review/lobby-desktop.png')
protected=sorted((ROOT/'public/assets/world').rglob('*'))+[ROOT/'public/assets/art/units.webp',ROOT/'public/assets/art/portraits.webp',ROOT/'public/assets/title/title_bg.webp',ROOT/'public/assets/art/units_mercs.webp']
hashes={str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in protected if p.is_file()}
for path,digest in hashes.items():
    base=subprocess.check_output(['git','show','origin/feature/fateweave-initial-prototype:'+path],cwd=ROOT)
    assert hashlib.sha256(base).hexdigest()==digest,path
(OUT/'provenance/protected-sha256.json').write_text(json.dumps(hashes,indent=2)+'\n')
runtime=sum(p.stat().st_size for p in OUT.rglob('*.webp'));assert runtime<=1600000,runtime
manifest={str(p.relative_to(OUT)).replace('\\','/'):dict(bytes=p.stat().st_size,size=list(Image.open(p).size),mode=Image.open(p).mode) for p in OUT.rglob('*') if p.suffix in ['.png','.webp']}
(OUT/'provenance/validation.json').write_text(json.dumps(dict(runtime_bytes=runtime,images=manifest,protected_hashes_unchanged=True),indent=2)+'\n')
print(json.dumps(dict(runtime_bytes=runtime,images=len(manifest))))
