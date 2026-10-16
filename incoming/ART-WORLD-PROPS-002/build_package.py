"""Mechanical packing and review composition for image_gen-painted artwork.

No game code or existing assets are changed. Requires Pillow, NumPy and SciPy.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageCms
from scipy import ndimage
import numpy as np
import json, hashlib, subprocess

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[1]
RAW=OUT/'provenance/generated'
BASE='aad45b854500ea6885982d912ea4d22274e90539'
IDS=['herb','event_bandits','event_shrine','event_merchant','event_traveller','event_rift','herb_glow','spare']
PROTECTED=['public/assets/world/'+n+'.webp' for n in ['tileset','decor','chests','puzzle']]+['public/assets/lobby/lobby_firepit.webp']
RES=Image.Resampling.LANCZOS
ICC=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
NAVY='#0d1c2e'
FONT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)

def save(im,path):
    im.save(OUT/path,icc_profile=ICC,**({'quality':85,'method':6,'exact':True} if str(path).endswith('.webp') else {}))

def grid(im,cols,rows):
    return [im.crop((round(c*im.width/cols),round(r*im.height/rows),round((c+1)*im.width/cols),round((r+1)*im.height/rows))) for r in range(rows) for c in range(cols)]

def clean(im,light=False):
    im=im.convert('RGBA');a=np.array(im.getchannel('A'))
    labels,n=ndimage.label(a>=(12 if light else 64));sizes=np.bincount(labels.ravel());sizes[0]=0
    keep=sizes>=max(4,sizes.max()*(.00015 if light else .002))
    mask=ndimage.binary_dilation(keep[labels],iterations=1)
    a[~mask]=0;a[a<(8 if light else 32)]=0
    im.putalpha(Image.fromarray(a));return im.crop(im.getbbox())

def prop_frame(im):
    im=clean(im)
    # 75% tile width, with a completely clear top fifth for event badges.
    h=min(90,round(im.height*96/im.width));im=im.resize((96,h),RES)
    im.putalpha(im.getchannel('A').point(lambda v:0 if v<24 else v))
    im=im.crop(im.getbbox())
    frame=Image.new('RGBA',(128,128));frame.alpha_composite(im,((128-im.width)//2,117-im.height));return frame

def flame_frame(im):
    im=clean(im,light=True);ratio=min(128/im.width,154/im.height)
    im=im.resize((round(im.width*ratio),round(im.height*ratio)),RES)
    im.putalpha(im.getchannel('A').point(lambda v:0 if v<16 else v));im=im.crop(im.getbbox())
    a=np.array(im.getchannel('A'));xs=np.where(a[-12:]>=64)[1]
    centre=(int(xs.min())+int(xs.max()))/2
    x=max(8,min(round(128-centre),248-im.width))
    frame=Image.new('RGBA',(256,256));frame.alpha_composite(im,(x,201-im.height));return frame

def market_frame(im):
    im=clean(im);ratio=min(104/im.width,104/im.height)
    im=im.resize((round(im.width*ratio),round(im.height*ratio)),RES)
    im.putalpha(im.getchannel('A').point(lambda v:0 if v<24 else v));im=im.crop(im.getbbox())
    frame=Image.new('RGBA',(128,128));frame.alpha_composite(im,((128-im.width)//2,(128-im.height)//2));return frame

def build():
    source=Image.open(RAW/'props.png');rows=[0,536,source.height]
    props=[prop_frame(source.crop((c*512,rows[r],(c+1)*512,rows[r+1]))) for r in range(2) for c in range(3)]
    glow=Image.open(RAW/'glow.png').convert('RGBA');a=glow.getchannel('A').point(lambda v:0 if v<3 else v)
    glow.putalpha(a);glow=glow.crop(glow.getbbox()).resize((90,90),RES)
    glow.putalpha(glow.getchannel('A').point(lambda v:0 if v<3 else round(v*112/255)))
    light=Image.new('RGBA',(128,128));light.alpha_composite(glow,(19,27))
    props.extend([light,Image.new('RGBA',(128,128))])
    atlas=Image.new('RGBA',(512,256));mapping={}
    for i,(id,im) in enumerate(zip(IDS,props)):
        x=i%4*128;y=i//4*128;atlas.alpha_composite(im,(x,y))
        mapping[id]={'x':x,'y':y,'w':128,'h':128,'footY':116}
    save(atlas,'props/map_props.png');save(atlas,'props/map_props.webp')
    (OUT/'props/map_props.json').write_text(json.dumps(mapping,indent=2)+'\n')
    flames=[flame_frame(im) for im in grid(Image.open(RAW/'flame.png'),3,2)]
    strip=Image.new('RGBA',(1536,256))
    for i,im in enumerate(flames):strip.alpha_composite(im,(i*256,0))
    save(strip,'flame/camp_flame.png');save(strip,'flame/camp_flame.webp')
    (OUT/'flame/camp_flame.json').write_text(json.dumps({'frames':6,'w':256,'h':256,'baseY':200},indent=2)+'\n')
    icons=[market_frame(im) for im in grid(Image.open(RAW/'market.png'),2,1)]
    atlas=Image.new('RGBA',(256,128));mapping={}
    for i,(id,im) in enumerate(zip(['contract','gearbox'],icons)):
        atlas.alpha_composite(im,(i*128,0));mapping[id]={'x':i*128,'y':0,'w':128,'h':128}
    save(atlas,'market/market.png');save(atlas,'market/market.webp')
    (OUT/'market/market.json').write_text(json.dumps(mapping,indent=2)+'\n')

def checker(size):
    im=Image.new('RGBA',size,'#b4bec9');d=ImageDraw.Draw(im)
    for y in range(0,size[1],16):
        for x in range(0,size[0],16):
            if (x//16+y//16)%2:d.rectangle((x,y,x+15,y+15),fill='#dce2e9')
    return im

def label(im,pos,text):ImageDraw.Draw(im).text(pos,text,font=FONT,fill='#f4f7fc')

def map_patch(zone,T,props):
    im=Image.new('RGBA',(7*T,5*T));tiles=Image.open(ROOT/'public/assets/world/tileset.webp').convert('RGBA')
    row={'meadow':0,'thicket':1,'scar':2}[zone]
    for r in range(5):
        for c in range(7):
            variant=(r*3+c*7+r*c)%4
            tile=tiles.crop((variant*128,row*128,(variant+1)*128,(row+1)*128)).resize((T,T),RES)
            im.alpha_composite(tile,(c*T,r*T))
    places={'meadow':[(0,1,2),(4,3,1),(3,5,3)],'thicket':[(1,2,2),(2,5,1)],'scar':[(5,3,2),(0,5,3)]}[zone]
    for index,c,r in sorted(places,key=lambda v:v[2]):
        x=c*T;y=round((r+1)*T-116*T/128)
        if index==0:im.alpha_composite(props[6].resize((T,T),RES),(x,y))
        im.alpha_composite(props[index].resize((T,T),RES),(x,y))
    return im

def reviews():
    props=grid(Image.open(OUT/'props/map_props.webp').convert('RGBA'),4,2)
    sheet=Image.new('RGBA',(4*192,2*184+112),NAVY)
    for i,(id,im) in enumerate(zip(IDS,props)):
        x=i%4*192+32;y=i//4*184+10
        tile=checker((128,128));tile.alpha_composite(im);sheet.alpha_composite(tile,(x,y));label(sheet,(x-8,y+136),id)
    grass=Image.open(ROOT/'public/assets/world/decor.webp').convert('RGBA').crop((0,0,128,128))
    label(sheet,(16,374),'Herb vs existing decorative grass; 36 px frames')
    for i,im in enumerate([props[0],grass]):sheet.alpha_composite(im.resize((36,36),RES),(24+i*144,410))
    save(sheet,'review/props-sheet.png')
    save(ImageOps.grayscale(sheet).convert('RGB'),'review/props-gray.png')
    patchsheet=Image.new('RGBA',(3*448+4*16,320+52),NAVY)
    for i,zone in enumerate(['meadow','thicket','scar']):
        x=16+i*(448+16);label(patchsheet,(x,8),zone+' / 7 x 5 / 64 px');patchsheet.alpha_composite(map_patch(zone,64,props),(x,36))
    save(patchsheet,'review/props-in-map.png')
    sizes=Image.new('RGBA',(3*448+4*16,sum(5*T+44 for T in [36,48,64])+16),NAVY);y=12
    for T in [36,48,64]:
        for i,zone in enumerate(['meadow','thicket','scar']):
            x=16+i*(448+16);label(sizes,(x,y),zone+' / tile '+str(T)+' px');sizes.alpha_composite(map_patch(zone,T,props),(x,y+26))
        y+=5*T+44
    save(sizes,'review/props-sizes.png')
    flames=grid(Image.open(OUT/'flame/camp_flame.webp').convert('RGBA'),6,1)
    pit=Image.open(ROOT/'public/assets/lobby/lobby_firepit.webp').convert('RGBA')
    review=Image.new('RGBA',(1536,396),NAVY)
    for i,im in enumerate(flames):
        composite=pit.copy();composite.alpha_composite(im);review.alpha_composite(composite,(i*256,24));label(review,(i*256+10,4),'Frame '+str(i+1))
    label(review,(16,290),'90 px frame scale, existing firepit + new flame')
    composite=pit.copy();composite.alpha_composite(flames[0]);review.alpha_composite(composite.resize((90,90),RES),(16,308))
    save(review,'review/flame-strip.png')
    animation=[]
    for im in flames:
        page=Image.new('RGBA',(256,256),NAVY);page.alpha_composite(pit);page.alpha_composite(im);animation.append(page.convert('RGB'))
    animation[0].save(OUT/'review/flame-loop.gif',save_all=True,append_images=animation[1:],duration=[120,130]*3,loop=0,disposal=2)
    market=grid(Image.open(OUT/'market/market.webp').convert('RGBA'),2,1)
    sheet=Image.new('RGBA',(640,192),NAVY)
    for i,(id,im) in enumerate(zip(['contract','gearbox'],market)):
        x=i*320;label(sheet,(x+12,8),id+' / 128, 48, 32 px')
        for size,dx,dy in [(128,8,40),(48,152,80),(32,224,88)]:sheet.alpha_composite(im.resize((size,size),RES),(x+dx,dy))
    save(sheet,'review/market-icons.png')

def validate():
    expected={'props/map_props.webp':(512,256),'flame/camp_flame.webp':(1536,256),'market/market.webp':(256,128)}
    images={}
    for path,size in expected.items():
        p=OUT/path;im=Image.open(p);assert im.size==size and im.mode=='RGBA';assert im.info.get('icc_profile')
        assert im.getchannel('A').getextrema()[0]==0
        images[path]={'bytes':p.stat().st_size,'size':list(size),'mode':im.mode}
    props=grid(Image.open(OUT/'props/map_props.webp').convert('RGBA'),4,2)
    mapping=json.loads((OUT/'props/map_props.json').read_text());assert list(mapping)==IDS
    boxes=[]
    for i,im in enumerate(props):
        assert mapping[IDS[i]]=={'x':i%4*128,'y':i//4*128,'w':128,'h':128,'footY':116}
        box=im.getbbox();boxes.append(list(box) if box else None)
        if i<7:assert box and box[1]>=26 and box[3]<=117,(IDS[i],box)
        if i<6:assert box[3]==117 and 89<=box[2]-box[0]<=103,(IDS[i],box)
        if i==7:assert box is None
    images['props/map_props.webp']['alpha_bounds']=boxes
    flames=grid(Image.open(OUT/'flame/camp_flame.webp').convert('RGBA'),6,1)
    for im in flames:assert im.getbbox()[3]==201 and im.getbbox()[1]>=38
    assert json.loads((OUT/'flame/camp_flame.json').read_text())=={'frames':6,'w':256,'h':256,'baseY':200}
    assert len({im.tobytes() for im in flames})>=4
    visible=[]
    for im in flames:
        a=np.array(im).astype(float);a[:,:,:3]*=a[:,:,3:4]/255;visible.append(a)
    deltas=[float(np.abs(visible[i]-visible[(i+1)%6]).mean()) for i in range(6)]
    assert deltas[-1]<=max(deltas[:-1])*1.1
    images['flame/camp_flame.webp']['visible_frame_deltas_including_wrap']=deltas
    market=json.loads((OUT/'market/market.json').read_text())
    assert market=={id:{'x':i*128,'y':0,'w':128,'h':128} for i,id in enumerate(['contract','gearbox'])}
    for im in grid(Image.open(OUT/'market/market.webp').convert('RGBA'),2,1):
        x0,y0,x1,y1=im.getbbox();assert min(x0,y0,128-x1,128-y1)>=8
    files=list(OUT.rglob('*.webp'));assert len(files)==3
    total=sum(p.stat().st_size for p in files);assert total<=400000,total
    hashes={}
    for path in PROTECTED:
        digest=hashlib.sha256((ROOT/path).read_bytes()).hexdigest();hashes[path]=digest
        assert digest==hashlib.sha256(subprocess.check_output(['git','show',BASE+':'+path],cwd=ROOT)).hexdigest(),path
    report={'base_commit':BASE,'runtime_bytes':total,'runtime_webps':3,'quality':85,'images':images,'protected_sha256':hashes}
    (OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'runtime_bytes':total,'runtime_files':3,'protected_hashes_unchanged':True}))

if __name__=='__main__':
    import sys
    if '--validate' not in sys.argv:build();reviews()
    validate()
