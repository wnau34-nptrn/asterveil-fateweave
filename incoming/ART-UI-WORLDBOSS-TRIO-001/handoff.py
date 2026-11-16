#!/usr/bin/env python3
"""Rebuild static World Boss header art from retained generator outputs; never integrates UI.

python -I incoming/ART-UI-WORLDBOSS-TRIO-001/handoff.py
python -I incoming/ART-UI-WORLDBOSS-TRIO-001/handoff.py --verify
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, features

ROOT = Path(__file__).resolve().parent
BOSSES = ['kragmor','valdrakk','morvane']
NAVY = np.array([8,18,32],dtype=float)
FONT = ROOT/'references/fonts/NotoSansThai-Regular.ttf'
BOLD = ROOT/'references/fonts/NotoSansThai-Bold.ttf'
LATIN = ROOT/'references/fonts/NotoSans-Regular.ttf'
LATIN_BOLD = ROOT/'references/fonts/NotoSans-Bold.ttf'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def write(name,data):
    (ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def pair(im, stem):
    im.save(ROOT/(stem+'.png'),compress_level=9)
    im.save(ROOT/(stem+'.webp'),lossless=True,exact=True,method=6)


def white_contrast(im):
    rgb = np.asarray(im.convert('RGB'),dtype=float)/255
    linear = np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
    lum = linear @ np.array([.2126,.7152,.0722])
    ratios = 1.05/(lum+.05)
    where = np.unravel_index(np.argmin(ratios),ratios.shape)
    return {'white_contrast_min':float(ratios.min()),'max_relative_luminance':float(lum.max()),
        'worst_pixel_xy':[int(where[1]),int(where[0])], 'pixels_checked':int(ratios.size),
        'pixels_below_4_5':int(np.count_nonzero(ratios<4.5))}


def checks():
    report = {'banners':{},'emblems':{}}
    for name in BOSSES+['trio']:
        png = Image.open(ROOT/f'banner_{name}.png'); png.load()
        webp = Image.open(ROOT/f'banner_{name}.webp'); webp.load()
        expected = (1080,288 if name=='trio' else 360)
        assert png.size == expected and png.mode == 'RGB'
        assert webp.mode=='RGB' and webp.size==png.size and webp.tobytes()==png.tobytes()
        native = white_contrast(png.crop((0,0,540,png.height)))
        resized = png.resize((358,round(png.height*358/1080)),Image.Resampling.LANCZOS)
        displayed = white_contrast(resized.crop((0,0,179,resized.height)))
        assert native['white_contrast_min']>=4.5 and native['pixels_below_4_5']==0
        assert displayed['white_contrast_min']>=4.5 and displayed['pixels_below_4_5']==0
        report['banners'][name] = {'size':list(png.size),'mode':'RGB','png_webp_pixel_equal':True,
            'safe_area_xyxy':[0,0,540,png.height],'native_left_half':native,
            'display_358_size':list(resized.size),'display_358_left_half':displayed}
    for name in BOSSES:
        png = Image.open(ROOT/f'emblem_{name}.png'); png.load()
        webp = Image.open(ROOT/f'emblem_{name}.webp').convert('RGBA'); webp.load()
        assert png.size==(256,256) and png.mode=='RGBA'
        assert png.tobytes()==webp.tobytes()
        alpha = png.getchannel('A')
        assert alpha.getextrema()==(0,255)
        assert all(png.getpixel(p)[3]==0 for p in [(0,0),(255,0),(0,255),(255,255)])
        box = alpha.getbbox()
        assert box[0]>=6 and box[1]>=6 and box[2]<=250 and box[3]<=250
        report['emblems'][name] = {'size':[256,256],'mode':'RGBA','alpha_extrema':[0,255],
            'alpha_bbox_xyxy':list(box),'transparent_corners':True,'png_webp_pixel_equal':True,
            'readability_review_size':[40,40]}
    return report


def prepare_banner(name):
    source = Image.open(ROOT/'source'/f'{name}.png').convert('RGB')
    if name=='trio':
        # Preserve every crown/face: uniform height fit, right aligned; extend ONLY empty navy sky left.
        h = 288
        w = round(source.width*h/source.height)
        assert w <= 1080
        tile = source.resize((w,h),Image.Resampling.LANCZOS)
        arr = np.asarray(tile)
        pad = 1080-w
        out = np.empty((h,1080,3),dtype=np.uint8)
        out[:,:pad] = arr[:,:1]
        out[:,pad:] = arr
        image = Image.fromarray(out)
        framing = {'method':'uniform height fit, right alignment, empty sky edge extended left',
            'source_size':list(source.size),'resize':[w,h],'paste_xy':[pad,0],
            'character_crop':'none; generated group includes natural portrait occlusion'}
    else:
        assert source.width/source.height==3
        image = source.resize((1080,360),Image.Resampling.LANCZOS)
        framing = {'method':'uniform full-image resize, no crop/no mirror','source_size':list(source.size),
            'resize':[1080,360],'paste_xy':[0,0]}
    arr = np.asarray(image,dtype=float)
    x = np.arange(1080,dtype=float)
    t = np.clip((x-540)/180,0,1)
    smooth = t*t*(3-2*t)
    opacity = .72*(1-smooth)
    # Darken all x<540 consistently, smoothly releasing the veil from x540 to720.
    arr = arr*(1-opacity[None,:,None])+NAVY*opacity[None,:,None]
    result = Image.fromarray(np.clip(np.rint(arr),0,255).astype(np.uint8),'RGB')
    return result, framing


def prepare_emblems():
    original = Image.open(ROOT/'source/emblems.png').convert('RGBA')
    array = np.array(original)
    array[array[:,:,3]<=8] = 0
    sheet = Image.fromarray(array)
    ink = np.asarray(sheet.getchannel('A')).sum(axis=0)
    cuts = [0]
    for i in (1,2):
        lo,hi=int((i-.18)*sheet.width/3),int((i+.18)*sheet.width/3)
        zeros=np.flatnonzero(ink[lo:hi]==0)+lo
        assert len(zeros), 'no transparent emblem gutter'
        cuts.append(int(min(zeros,key=lambda x:abs(x-i*sheet.width/3))))
    cuts.append(sheet.width)
    records = {}
    for i,name in enumerate(BOSSES):
        cell = sheet.crop((cuts[i],0,cuts[i+1],sheet.height))
        b = cell.getchannel('A').getbbox()
        figure = cell.crop(b)
        scale = min(240/figure.width,240/figure.height)
        size=(round(figure.width*scale),round(figure.height*scale))
        figure=figure.resize(size,Image.Resampling.LANCZOS)
        out=Image.new('RGBA',(256,256))
        xy=(round((256-size[0])/2),round((256-size[1])/2))
        out.alpha_composite(figure,xy)
        # Lossless RGBA pairing includes invisible RGB, so canonicalize alpha0 RGB too.
        a=np.array(out);a[a[:,:,3]==0]=0;out=Image.fromarray(a)
        pair(out,f'emblem_{name}')
        records[name]={'source':'source/emblems.png','source_crop_xyxy':[cuts[i]+b[0],b[1],cuts[i]+b[2],b[3]],
            'uniform_scale':scale,'resize':list(size),'paste_xy':list(xy),'mirror':False,
            'crop_semantics':'head/neck portraits intentionally omit limbs/lower body',
            'alpha_cleanup':'discard source alpha<=8; clear RGB at output alpha0; no character redraw'}
    return records


def mixed_text(draw, xy, text, fonts, fill=None):
    # Pillow has no automatic font fallback. Keep Thai clusters together for RAQM,
    # use Noto Sans for Latin/digits/punctuation, and share a baseline across runs.
    runs=[]
    for char in text:
        thai = '\u0e00' <= char <= '\u0e7f'
        if runs and runs[-1][0]==thai:
            runs[-1][1]+=char
        else:
            runs.append([thai,char])
    cursor=float(xy[0]); baseline=xy[1]+fonts[0].size
    boxes=[]
    for thai,run in runs:
        face=fonts[0] if thai else fonts[1]
        box=draw.textbbox((cursor,baseline),run,font=face,anchor='ls')
        boxes.append(box)
        if fill is not None:
            draw.text((cursor,baseline),run,font=face,anchor='ls',fill=fill)
        cursor+=draw.textlength(run,font=face)
    return [round(min(b[0] for b in boxes)),round(min(b[1] for b in boxes)),
            round(max(b[2] for b in boxes)),round(max(b[3] for b in boxes))]


def preview():
    assert features.check('raqm'), 'Pillow RAQM support is required for the Thai preview'
    def fonts(size,bold=False):
        return (ImageFont.truetype(str(BOLD if bold else FONT),size),
                ImageFont.truetype(str(LATIN_BOLD if bold else LATIN),size))
    font=fonts(11)
    small=fonts(10)
    tiny=fonts(11)
    bold=fonts(16,True)
    title=fonts(14,True)
    canvas=Image.new('RGB',(390,1000),'#0b1426')
    d=ImageDraw.Draw(canvas)
    mixed_text(d,(16,8),'ภาพจำลองการ์ด 358px · ไม่ใช่หน้าจอเกมจริง',font,'#c5d1e3')
    labels={'kragmor':'ไททันรอยแยก','valdrakk':'อสูรปีกรอยแยก','morvane':'ราชันเงาเหนือรอยแยก','trio':'สามบอสแห่งรอยแยก'}
    positions={}
    y=34
    for name in BOSSES+['trio']:
        mixed_text(d,(16,y),name.upper() if name!='trio' else 'TRIO · หน้าค่าย',title,'#e9d293')
        im=Image.open(ROOT/f'banner_{name}.png').convert('RGB')
        tile=im.resize((358,round(im.height*358/1080)),Image.Resampling.LANCZOS)
        top=y+25
        canvas.paste(tile,(16,top))
        d.rounded_rectangle((16,top,373,top+tile.height-1),radius=4,outline='#81744f')
        texts=[('บอสโลก' if name=='trio' else name.capitalize(),bold,12),
            (labels[name],font,40),
            ('สิทธิ์ 2/5 · เหลือ 4 วัน' if name=='trio' else 'สิทธิ์ 2/5 · ดาเมจ 12,480',tiny,65)]
        rects=[]
        for text,face,dy in texts:
            b=mixed_text(d,(28,top+dy),text,face)
            assert b[2] <= 16+179, (name,text,b)
            assert b[3] < top+tile.height
            mixed_text(d,(28,top+dy),text,face,'#ffffff')
            rects.append({'text':text,'bounds_xyxy':list(b)})
        em_y=top+tile.height+8
        if name=='trio':
            for j,boss in enumerate(BOSSES):
                em=Image.open(ROOT/f'emblem_{boss}.png').convert('RGBA').resize((40,40),Image.Resampling.LANCZOS)
                canvas.paste(em,(20+j*118,em_y),em)
                mixed_text(d,(63+j*118,em_y+12),boss[:1].upper()+boss[1:4],small,'#d7dfec')
        else:
            em=Image.open(ROOT/f'emblem_{name}.png').convert('RGBA').resize((40,40),Image.Resampling.LANCZOS)
            canvas.paste(em,(20,em_y),em)
            mixed_text(d,(70,em_y+12),'emblem ที่ 40px · กรอบโปร่งใส',small,'#c5d1e3')
        positions[name]={'banner_xy':[16,top],'display_size':list(tile.size),'white_text':rects,'text_is_preview_only':True}
        y=em_y+57
    mixed_text(d,(16,y),'ตัวเลขสมมติ · ข้อความวางเพิ่มจำลอง DOM เท่านั้น',small,'#aebed6')
    canvas.crop((0,0,390,y+30)).save(ROOT/'preview_390.png',compress_level=9)
    return positions


def verify():
    report=json.loads((ROOT/'validation.json').read_text())
    names={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file() and p.name!='validation.json' and '__pycache__' not in p.parts}
    assert names==set(report['files'])
    for name,record in report['files'].items():
        p=ROOT/name
        assert sha(p)==record['sha256'] and p.stat().st_size==record['bytes'],name
        if p.suffix in ('.png','.webp'):
            with Image.open(p) as im:
                im.load(); assert list(im.size)==record['size'] and im.mode==record['mode'],name
    actual=checks()
    assert actual==report['checks'], 'contrast/pixel/alpha report differs'
    print(f'PASS: {len(names)} SHA-256/byte lengths, full image decode, 7 lossless pairs, every left-half pixel contrast >=4.5 at native and358px, true-alpha emblems.')
    print('Native contrast minima:',{n:round(r['native_left_half']['white_contrast_min'],4) for n,r in actual['banners'].items()})


def build():
    framing={}
    for name in BOSSES+['trio']:
        im,framing[name]=prepare_banner(name)
        pair(im,f'banner_{name}')
    emblems=prepare_emblems()
    positions=preview()
    references={p.relative_to(ROOT).as_posix():sha(p) for p in sorted((ROOT/'references').rglob('*')) if p.is_file()}
    write('seeds.json',{'schema':1,'base_commit':'cca1c3db38028781306072011d8dc4c0aed438f3',
        'art_reference_commit':'46f366dc931e4994d3a6ccd9ad3951ac444a70cf',
        'prior_ui_reference_commit':'1895f837c02cdfe1d8744a7a98ff1fad0cc2bc32',
        'reference_sha256':references,'banners':framing,'emblems':emblems,
        'text_safe_region':'all x<540, full banner height',
        'navy_veil':{'rgb':[8,18,32],'opacity_x_0_through_540':.72,'smoothstep_release_x':[540,720]},
        'preview':positions,'no_mirror':True,'rng_seed':None,
        'reproducibility':'Retained image outputs make processing deterministic; generator exposes no numeric RNG seed.'})
    report={'schema':1,'task':ROOT.name,'checks':checks(),
        'contrast_method':'WCAG sRGB linearization, Rec.709 luminance, (1.0+0.05)/(L+0.05), white #FFFFFF; exhaustive pixels, not averages',
        'visual_review':{'no_text_logo_ui_heroes_in_assets':True,'seed_identity':'reviewed; final judgement belongs to owner',
            'trio':'A center-back, B group-left, C group-right, entire group on right half after uniform height fit',
            'emblems':'reviewed as distinct faces at40px; portrait crops do not validate hidden limbs'},
        'owner_approval':'pending; technical checks are not approval','runtime_test':'not integrated; preview is offline simulation',
        'self_excluded':True,'self_sha_receipt':'validation.json digest recorded externally in PR description','files':{}}
    for p in sorted(ROOT.rglob('*')):
        if not p.is_file() or p.name=='validation.json' or '__pycache__' in p.parts:
            continue
        record={'sha256':sha(p),'bytes':p.stat().st_size}
        if p.suffix in ('.png','.webp'):
            with Image.open(p) as im:
                im.load();record.update(size=list(im.size),mode=im.mode)
        report['files'][p.relative_to(ROOT).as_posix()]=record
    write('validation.json',report)
    verify()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify',action='store_true')
    args=parser.parse_args()
    verify() if args.verify else build()
