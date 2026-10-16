"""Mechanical atlas packing, alpha/anchor normalization and review assembly.

Painting is produced with image_gen; this script does not synthesize characters.
Raw image_gen masters are retained under provenance/generated for review.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageCms
import numpy as np
from scipy import ndimage
import hashlib, json, subprocess

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
RAW=OUT/'provenance/generated'
IDS=['smith','broker','trainer','keeper','herbalist','scout']
RES=Image.Resampling.LANCZOS
ICC=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()

def clean(im):
    im=im.convert('RGBA')
    a=np.array(im.getchannel('A'))
    labels,n=ndimage.label(a>=40)
    sizes=np.bincount(labels.ravel()); sizes[0]=0
    keep=sizes>=max(12,sizes.max()*.004)
    valid=ndimage.binary_dilation(keep[labels],iterations=1)
    a[~valid]=0; a[a<32]=0
    im.putalpha(Image.fromarray(a))
    return im

def cut_grid(im,cols,rows):
    return [im.crop((round(c*im.width/cols),round(r*im.height/rows),round((c+1)*im.width/cols),round((r+1)*im.height/rows))) for r in range(rows) for c in range(cols)]

def normalize(im,height=460):
    im=clean(im); im=im.crop(im.getbbox())
    ratio=min(476/im.width,height/im.height)
    im=im.resize((round(im.width*ratio),round(im.height*ratio)),RES)
    im.putalpha(im.getchannel('A').point(lambda x:0 if x<32 else x))
    im=im.crop(im.getbbox())
    a=np.array(im.getchannel('A'));lower=a[-35:]>100
    labels,n=ndimage.label(lower);sizes=np.bincount(labels.ravel());sizes[0]=0
    keep=sizes>sizes.max()*.30
    xs=np.where(keep[labels])[1]
    centre=(int(xs.min())+int(xs.max()))/2
    xpos=round(256-centre)
    xpos=max(8,min(xpos,504-im.width))
    out=Image.new('RGBA',(512,512));out.alpha_composite(im,(xpos,497-im.height))
    return out

def save(im,path,quality=68):
    if str(path).startswith('npc/') and str(path).endswith('.webp'):
        alpha=im.getchannel('A').point(lambda v:0 if v<32 else 255 if v>224 else round(v/17)*17)
        im=im.convert('RGB').resize((im.width*3//4,im.height*3//4),RES).resize(im.size,RES).convert('RGBA')
        im.putalpha(alpha)
    im.save(OUT/path,icc_profile=ICC,**({'quality':quality,'method':4,'exact':True} if str(path).endswith('.webp') else {}))

def frame(id,index=0):
    im=Image.open(OUT/'npc'/f'npc_{id}.webp').convert('RGBA')
    c=index%4;r=index//4
    return im.crop((c*512,r*512,(c+1)*512,(r+1)*512))

def boot_mask(strip):
    a=np.array(strip.getchannel('A'));labels,n=ndimage.label(a>=100)
    sizes=np.bincount(labels.ravel());sizes[0]=0
    keep=sizes>=sizes.max()*.30
    return ndimage.binary_dilation(keep[labels],iterations=1)

def build(sprites_only=False):
    mapping={}
    for id in IDS:
        cells=cut_grid(Image.open(RAW/f'{id}.png'),4,3)
        frames=[normalize(c) for c in cells[:11]]
        # Planted lower legs remain identical, removing raster-generation foot jitter.
        planted=frames[0].crop((0,464,512,512))
        # Retain the two boots, excluding grounded staff tips or other slender tools.
        a=np.array(planted.getchannel('A'));valid=boot_mask(planted)
        a[~valid]=0;planted.putalpha(Image.fromarray(a))
        for f in frames:
            strip=f.crop((0,464,512,512));a=np.array(strip.getchannel('A'))
            a[ndimage.binary_dilation(boot_mask(strip),iterations=3)]=0;strip.putalpha(Image.fromarray(a))
            strip.alpha_composite(planted);f.paste(strip,(0,464))
        # Ping-pong intermediate guarantees the fourth pose closes naturally.
        frames[3]=frames[1].copy();frames[7]=frames[5].copy()
        sheet=Image.new('RGBA',(2048,1536))
        for i,f in enumerate(frames):sheet.alpha_composite(f,((i%4)*512,(i//4)*512))
        save(sheet,f'npc/npc_{id}.webp')
        mapping[id]={'frame':512,'footY':496,'rows':{'idle':[0,1,2,3],'work':[4,5,6,7],'greet':[8,9],'cheer':[10]},'footYByFrame':[496]*11+[None],'fps':8,'empty':[11]}
    (OUT/'npc/npc_frames.json').write_text(json.dumps(mapping,indent=2)+'\n')
    stations=Image.new('RGBA',(1536,1024))
    source=Image.open(RAW/'stations.png')
    # Generated groups are not on exact equal-cell boundaries; preserve their full extents.
    cuts=[(0,0,568,520),(568,0,1024,520),(1024,0,1536,520),(0,520,568,1024),(568,520,1024,1024),(1024,520,1536,1024)]
    for i,box in enumerate(cuts):
        c=Image.open(RAW/f'station_{IDS[i]}.png') if i in [3,4] else source.crop(box)
        stations.alpha_composite(normalize(c,400),((i%3)*512,(i//3)*512))
    save(stations,'props/npc_stations.webp')
    if sprites_only:return
    busts=Image.new('RGB',(1536,1024))
    for i,c in enumerate(cut_grid(Image.open(RAW/'busts.png'),3,2)):
        busts.paste(c.convert('RGB').resize((512,512),RES),((i%3)*512,(i//3)*512))
    save(busts,'busts/npc_busts.webp',85)

def reviews():
    npc=[frame(id) for id in IDS]
    units=Image.open(ROOT/'public/assets/art/units.webp').convert('RGBA')
    mercs=Image.open(ROOT/'public/assets/art/units_mercs.webp').convert('RGBA')
    heroes=[units.crop((c*512,r*512,(c+1)*512,(r+1)*512)) for r in range(2) for c in range(2)]
    hires=[mercs.crop((c*512,r*512,(c+1)*512,(r+1)*512)) for r in range(3) for c in range(2)]
    lineup=Image.new('RGBA',(8*256,280),'#14243a')
    for i,im in enumerate(npc+[heroes[0],hires[5]]):lineup.alpha_composite(im.resize((256,256),RES),(i*256,12))
    save(lineup,'review/npc-lineup.png')
    silhouettes=Image.new('RGBA',(16*110,110),'#f4f7fc')
    for i,im in enumerate(npc+heroes+hires):
        im=im.crop(im.getbbox());im=im.resize((round(im.width*90/im.height),90),RES)
        black=Image.new('RGBA',im.size,'black');black.putalpha(im.getchannel('A'))
        silhouettes.alpha_composite(black,(i*110+(110-im.width)//2,10))
    save(silhouettes,'review/npc-silhouettes.png')
    # Every stored frame paired with its mirror, for directional and alpha review.
    mirror=Image.new('RGBA',(11*192,6*192),'#14243a')
    for r,id in enumerate(IDS):
        for i in range(11):
            im=frame(id,i).resize((96,96),RES)
            mirror.alpha_composite(im,(i*192,r*192+48));mirror.alpha_composite(ImageOps.mirror(im),(i*192+96,r*192+48))
    save(mirror,'review/npc-mirror-check.png')
    for w,h,rect in [(390,844,(12,84,366,153)),(1366,768,(285,86,796,169))]:
        save(mock(w,h,rect),f'review/camp-{"phone" if w==390 else "desktop"}.png')
    animation=[]
    for k in range(8):
        page=Image.new('RGBA',(6*160,320),'#14243a')
        for i,id in enumerate(IDS):
            for row in range(2):page.alpha_composite(frame(id,row*4+k%4).resize((160,160),RES),(i*160,row*160))
        animation.append(page.convert('RGB'))
    animation[0].save(OUT/'review/npc-loops.gif',save_all=True,append_images=animation[1:],duration=[120,130]*4,loop=0,disposal=2)

def mock(w,h,rect):
    page=Image.new('RGBA',(w,h),'#0d1c2e');d=ImageDraw.Draw(page)
    x,y,bw,bh=rect
    for box in [(x,12,x+bw,74),(x,y+bh+10,x+bw,h-82),(x,h-64,x+bw,h-12)]:d.rounded_rectangle(box,12,outline='#d9bf86',width=1)
    d.rectangle((x+12,y+bh+22,x+bw-12,y+bh+64),outline='#8d7855',width=1)
    bg=Image.open(ROOT/'public/assets/lobby/lobby_bg.webp').convert('RGBA')
    scene=ImageOps.fit(bg,(bw,bh),method=RES,centering=(.5,.78))
    stations=cut_grid(Image.open(OUT/'props/npc_stations.webp').convert('RGBA'),3,2)
    # Existing HUD and scene bands stay fixed. Two depth rows accommodate six staff.
    placements=[(0,.10,.88),(3,.22,.99),(2,.33,.76),(1,.66,.76),(4,.80,.88),(5,.92,.99)]
    size=round(bh*.49)
    for index,xx,baseline in placements:
        yy=round(bh*baseline);flip=xx>.5
        station=stations[index];actor=frame(IDS[index]);sign=-1 if flip else 1
        if flip:station=ImageOps.mirror(station);actor=ImageOps.mirror(actor)
        ps=round(size*.89)
        cx=round(bw*xx)
        scene.alpha_composite(station.resize((ps,ps),RES),(cx+sign*round(size*.38)-ps//2,yy-round(ps*496/512)))
        scene.alpha_composite(actor.resize((size,size),RES),(cx-size//2,yy-round(size*496/512)))
    heroes=Image.open(ROOT/'public/assets/lobby/lobby_poses_heroes.webp').convert('RGBA')
    for row,xx,flip in [(0,.43,False),(1,.57,True)]:
        im=heroes.crop((0,row*512,512,(row+1)*512))
        if flip:im=ImageOps.mirror(im)
        hs=round(size*1.10)
        scene.alpha_composite(im.resize((hs,hs),RES),(round(bw*xx)-hs//2,round(bh*.98)-round(hs*496/512)))
    pit=Image.open(ROOT/'public/assets/lobby/lobby_firepit.webp').convert('RGBA')
    ps=round(bh*.20);scene.alpha_composite(pit.resize((ps,ps),RES),(bw//2-ps//2,round(bh*.98)-ps))
    # Flame is a review-only code-drawn placeholder, never a runtime painting.
    d=ImageDraw.Draw(scene);cx=bw//2;fy=round(bh*.89)
    d.polygon([(cx-6,fy),(cx-9,fy-7),(cx-2,fy-21),(cx,fy-11),(cx+5,fy-17),(cx+8,fy-6),(cx+5,fy)],fill='#ffad4a')
    d.polygon([(cx-3,fy),(cx-4,fy-5),(cx+1,fy-12),(cx+3,fy)],fill='#fff3c4')
    fg=Image.open(ROOT/'public/assets/lobby/lobby_fg.webp').convert('RGBA')
    scene.alpha_composite(ImageOps.fit(fg,(bw,bh),method=RES,centering=(.5,.78)))
    page.alpha_composite(scene,(x,y));ImageDraw.Draw(page).rectangle((x,y,x+bw-1,y+bh-1),outline='#d9bf86',width=1)
    return page

def validate():
    runtime=sorted(OUT.rglob('*.webp'));total=sum(p.stat().st_size for p in runtime)
    assert len(runtime)==8 and total<=2400000,total
    images={}
    for p in runtime:
        im=Image.open(p);assert im.info.get('icc_profile')
        expected=(2048,1536) if p.parent.name=='npc' else (1536,1024)
        assert im.size==expected,(p,im.size)
        if p.parent.name!='busts':assert im.mode=='RGBA'
        images[str(p.relative_to(OUT))]={'bytes':p.stat().st_size,'size':list(im.size),'mode':im.mode}
    for id in IDS:
        im=Image.open(OUT/'npc'/f'npc_{id}.webp').convert('RGBA')
        frames=cut_grid(im,4,3)
        assert frames[11].getbbox() is None
        for f in frames[:11]:assert f.getbbox()[3]==497,(id,f.getbbox())
        soles=[]
        for f in frames[:11]:
            strip=f.crop((0,464,512,512));a=np.array(strip.getchannel('A'));a[~boot_mask(strip)]=0
            soles.append(a.tobytes())
        assert len(set(soles))==1,id
    for prop in cut_grid(Image.open(OUT/'props/npc_stations.webp').convert('RGBA'),3,2):
        assert prop.getbbox()[3]==497
    for name,size in [('camp-phone.png',(390,844)),('camp-desktop.png',(1366,768))]:
        assert Image.open(OUT/'review'/name).size==size
    protected=sorted(set((ROOT/'public/assets/art').glob('units*.webp'))|set((ROOT/'public/assets/art').glob('portraits*.webp'))|set((ROOT/'public/assets/lobby').glob('*.webp')))
    hashes={}
    for p in protected:
        rel=str(p.relative_to(ROOT));digest=hashlib.sha256(p.read_bytes()).hexdigest()
        assert hashlib.sha256(subprocess.check_output(['git','show','HEAD:'+rel],cwd=ROOT)).hexdigest()==digest
        hashes[rel]=digest
    report={'runtime_bytes':total,'images':images,'protected_sha256':hashes,'base_commit':'e3643672e0bbc89bea46b014fca87a8cb947cfd3'}
    (OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    import sys
    if '--validate' not in sys.argv:build();reviews()
    validate()
