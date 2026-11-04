"""Mechanical alpha cleanup, common-scale normalization and review compositing.
Run: python incoming/ART-UI-POTION-CALM-001/build_assets.py ATLAS_PATH
Only writes inside this package. Requires Pillow and numpy.
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent
def save(im, name):
    im.save(ROOT / name, optimize=True)

def build(atlas_path):
    atlas = Image.open(atlas_path).convert('RGBA')
    assert atlas.size == (640, 128)
    crops = []
    for i in range(1, 4):
        arr = np.array(Image.open(ROOT / f'raw/R{i}.png').convert('RGBA'))
        # Generated masters contain detached alpha<=8 noise outside the item.
        arr[arr[:, :, 3] <= 8] = 0
        im = Image.fromarray(arr)
        crops.append(im.crop(im.getbbox()))
    scale = 108 / max(max(im.size) for im in crops)
    frames = []
    normal = []
    for i, im in enumerate(crops, 1):
        size = tuple(round(v * scale) for v in im.size)
        im = im.resize(size, Image.Resampling.LANCZOS)
        arr = np.array(im)
        arr[arr[:, :, 3] <= 8] = 0
        im = Image.fromarray(arr)
        frame = Image.new('RGBA', (128, 128))
        frame.alpha_composite(im, ((128-size[0])//2, (128-size[1])//2))
        save(frame, f'calm-R{i}.png')
        frames.append(frame)
        bbox = frame.getbbox()
        assert min(bbox[0],bbox[1],128-bbox[2],128-bbox[3]) >= 6
        assert 104 <= max(bbox[2]-bbox[0],bbox[3]-bbox[1]) <= 108
        normal.append({'variant':f'R{i}', 'trimmed_source_size':list(crops[i-1].size), 'resized_size':list(size), 'alpha_bbox':list(bbox)})
    save(frames[0], 'calm.png')
    preview = Image.new('RGBA', (768,128))
    preview.paste(atlas,(0,0))
    preview.paste(frames[0],(640,0))
    assert preview.crop((0,0,640,128)).tobytes() == atlas.tobytes()
    save(preview, 'potion_items_preview.png')
    (ROOT/'calm.json').write_text(json.dumps({'potion_calm':{'x':640,'y':0,'w':128,'h':128}},indent=2)+'\n')
    sheet = Image.new('RGB',(390,860),'#0f1a2e')
    d = ImageDraw.Draw(sheet)
    bottles = [atlas.crop((i*128,0,(i+1)*128,128)) for i in range(3)]
    for r, frame in enumerate(frames):
        top = 14+r*280
        d.text((18,top),f'R{r+1}   salve / tonic / repel / calm',fill='#d8e9ef')
        for row,(size,grey) in enumerate([(44,False),(28,False),(44,True),(28,True)]):
            y=top+24+row*55
            d.text((12,y+12),str(size)+(' G' if grey else ''),fill='#93aab7')
            for j,im in enumerate(bottles+[frame]):
                if grey:
                    a=im.getchannel('A');im=ImageOps.grayscale(im).convert('RGBA');im.putalpha(a)
                icon=im.resize((size,size),Image.Resampling.LANCZOS)
                x=65+j*78
                d.rectangle((x,y,x+size-1,y+size-1),outline='#356459')
                sheet.paste(icon,(x,y),icon)
    save(sheet,'review-390.png')
    variants=Image.new('RGBA',(390,150),'#0f1a2e')
    vd=ImageDraw.Draw(variants)
    for i,frame in enumerate(frames):
        variants.alpha_composite(frame,(i*130,0));vd.text((i*130+52,132),f'R{i+1}',fill='#d8e9ef')
    save(variants,'variants-390.png')
    (ROOT/'normalization.json').write_text(json.dumps({'common_scale':scale,'alpha_cleanup_threshold':8,'anchor':'cell centre','variants':normal},indent=2)+'\n')
    print(json.dumps(normal))

def validate():
    files = {}
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or path.name=='validation.json' or '__pycache__' in path.parts:
            continue
        data=path.read_bytes()
        entry={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'dimensions':None,'mode':None}
        if path.suffix=='.png':
            with Image.open(path) as im:
                im.load();entry.update(dimensions=list(im.size),mode=im.mode)
        files[str(path.relative_to(ROOT))]=entry
    (ROOT/'validation.json').write_text(json.dumps({'schema':1,'scope':'All package files except this self-referential manifest; text files have null dimensions/mode.','files':files},indent=2)+'\n')
    print(f'Validated {len(files)} files')

if __name__=='__main__':
    if len(sys.argv)>1:
        build(sys.argv[1])
    validate()
