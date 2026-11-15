#!/usr/bin/env python3
"""Rebuild delivery from immutable raw; or verify a downloaded delivery."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageStat
P = Path(__file__).resolve().parent
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def pair(im, p):
    im.save(p.with_suffix('.png'))
    im.save(p.with_suffix('.webp'), lossless=True, exact=True)
def checks():
    result = {}
    for rev in ('R1','R2'):
        im=Image.open(P/rev/'banner_worldboss.png').convert('RGB')
        assert im.size==(1080,360)
        lum=[]
        for rgb in im.crop((0,0,540,360)).getdata():
            c=[v/255 for v in rgb]; c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]
            lum.append(sum(a*b for a,b in zip(c,(.2126,.7152,.0722))))
        contrast=1.05/(max(lum)+.05); assert contrast>=4.5
        e=Image.open(P/rev/'emblem_worldboss.png'); assert e.size==(256,256) and e.mode=='RGBA'
        assert e.getchannel('A').getextrema()==(0,255)
        assert e.getpixel((0,0))[3]==0
        for stem in ('banner_worldboss','emblem_worldboss'):
            a=Image.open(P/rev/(stem+'.png')).convert('RGBA'); b=Image.open(P/rev/(stem+'.webp')).convert('RGBA')
            assert a.tobytes()==b.tobytes()
        result[rev]={'white_contrast_min_left_half':contrast,'alpha_extrema':[0,255],'png_webp_pixel_equal':True}
    return result
def build():
    sheet=Image.open(P/'raw/banner_sheet.png').convert('RGB'); w,h=sheet.size
    emblem=Image.open(P/'raw/emblem.png').convert('RGBA').resize((256,256),Image.Resampling.LANCZOS)
    font='/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf'
    f=ImageFont.truetype(font,14); small=ImageFont.truetype(font,11)
    preview=Image.new('RGB',(390,610),'#08121f'); d=ImageDraw.Draw(preview)
    for n,rev in enumerate(('R1','R2')):
        (P/rev).mkdir(exist_ok=True)
        im=sheet.crop((700,n*h//2,1786,(n+1)*h//2)).resize((1080,360),Image.Resampling.LANCZOS)
        # Clamp left-half brightness uniformly without changing the right-hand boss.
        px=im.load()
        for y in range(360):
            for x in range(540):
                r,g,b=px[x,y]; px[x,y]=(min(r,40),min(g,48),min(b,64))
        pair(im,P/rev/'banner_worldboss'); pair(emblem,P/rev/'emblem_worldboss')
        y=20+n*300
        d.text((16,y),('แบบ ๑' if n==0 else 'แบบ ๒')+' · บอสโลก',font=f,fill='#f2d596')
        preview.paste(im.resize((360,120),Image.Resampling.LANCZOS),(15,y+28))
        d.text((27,y+42),'บอสประจำสัปดาห์',font=small,fill='white')
        d.text((27,y+63),'ผู้คุมรอยแยก',font=f,fill='white')
        d.text((27,y+88),'ทั้งเซิร์ฟเวอร์ร่วมสู้',font=small,fill='white')
        preview.paste(emblem.resize((40,40),Image.Resampling.LANCZOS),(20,y+165),emblem.resize((40,40),Image.Resampling.LANCZOS))
        d.text((70,y+175),'ตราผู้คุม ขนาด ๔๐ พิกเซล',font=small,fill='white')
        d.text((20,y+225),'ภาพจำลองการ์ด · ยังไม่ได้นำเข้าเกม',font=small,fill='#bbcadb')
    preview.save(P/'preview_390.png')
    report={'schema':1,'approval':'pending owner selection; technical checks are not approval','checks':checks(),'hash_policy':'Every delivery file except validation.json (self hash is impossible); remote verification report is external.','files':{}}
    for p in sorted(P.rglob('*')):
        if p.is_file() and p.name!='validation.json' and '__pycache__' not in str(p):
            entry={'sha256':digest(p),'bytes':p.stat().st_size}
            if p.suffix.lower() in ('.png','.webp'):
                with Image.open(p) as img: img.load(); entry.update(size=list(img.size),mode=img.mode)
            report['files'][str(p.relative_to(P))]=entry
    (P/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
def verify():
    report=json.loads((P/'validation.json').read_text())
    for n in ('banner_sheet','emblem'):
        parts=sorted((P/'raw').glob(n+'.png.part*'))
        if parts:
            data=b''.join(x.read_bytes() for x in parts)
            assert hashlib.sha256(data).hexdigest()==report['files']['raw/'+n+'.png']['sha256']
            if not (P/'raw'/(n+'.png')).exists() or (P/'raw'/(n+'.png')).stat().st_size==0:
                (P/'raw'/(n+'.png')).write_bytes(data)
    for name,item in report['files'].items():
        p=P/name; assert digest(p)==item['sha256'],name
        if p.suffix in ('.png','.webp'):
            with Image.open(p) as im: im.load()
    checks(); print('SHA-256, Pillow decode, contrast, alpha, lossless pairs: PASS')
if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--verify',action='store_true'); args=parser.parse_args()
    verify() if args.verify else build()
