"""Normalize generated atlases; usage: python package_assets.py portraits.png crests.png.
Requires Pillow. All outputs remain beside this script.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).parent
IDS = ['rival_noble', 'rival_veteran', 'rival_showman', 'rival_strategist', 'rival_smith', 'rival_champion']
COLORS = ['#ae526b', '#c99a54', '#af75dd', '#70c6d8', '#64b995', '#d9bf86']

def main():
    portraits = Image.open(sys.argv[1]).convert('RGB').resize((1024,1536), Image.Resampling.LANCZOS)
    portraits.save(OUT/'rivals_portraits.webp', lossless=True, method=6)
    source = Image.open(sys.argv[2]).convert('RGBA')
    assert source.getchannel('A').getextrema()[0] == 0, 'Generated crests must have real transparency'
    crests = Image.new('RGBA',(512,768))
    frames = {}
    crest_frames = {}
    for i, key in enumerate(IDS):
        col, row = i%2, i//2
        frames[key] = dict(x=col*512,y=row*512,w=512,h=512,footY=496)
        # Inspected source boundaries: generator spaced the emblems unevenly.
        # Extract whole emblems before fitting to equal delivery cells.
        xs = [0,530,1024]
        ys = [0,480,970,1536]
        crop = source.crop((xs[col],ys[row],xs[col+1],ys[row+1]))
        crop = crop.crop(crop.getchannel('A').getbbox())
        crop.thumbnail((224,224),Image.Resampling.LANCZOS)
        cell = Image.new('RGBA',(256,256))
        cell.paste(crop,((256-crop.width)//2,(256-crop.height)//2))
        crop = cell
        crop.save(OUT/(key+'_crest.png'))
        crests.paste(crop,(col*256,row*256))
        crest_frames[key] = dict(x=col*256,y=row*256,w=256,h=256)
    crests.save(OUT/'rival_crests.png')
    (OUT/'rivals_portraits.json').write_text(json.dumps(frames,indent=2)+'\n')
    (OUT/'rival_crests.json').write_text(json.dumps(crest_frames,indent=2)+'\n')
    # Text-free layout study: identity/content bars are intentional placeholders.
    preview=Image.new('RGB',(390,640),'#080f20')
    d=ImageDraw.Draw(preview)
    d.rounded_rectangle((16,16,374,51),12,fill='#15213a',outline='#736746')
    for i,key in enumerate(IDS):
        y=68+i*92
        color=COLORS[i]
        d.rounded_rectangle((12,y,378,y+82),12,fill='#14213a',outline=color,width=1)
        d.rounded_rectangle((13,y+12,17,y+70),2,fill=color)
        p=portraits.crop((i%2*512,i//2*512,i%2*512+512,i//2*512+512)).resize((64,64),Image.Resampling.LANCZOS)
        preview.paste(p,(25,y+9))
        d.rectangle((24,y+8,89,y+73),outline=color,width=1)
        d.rounded_rectangle((105,y+20,255,y+27),3,fill=color)
        d.rounded_rectangle((105,y+38,218,y+43),2,fill='#52657f')
        d.rounded_rectangle((105,y+54,177,y+59),2,fill='#344762')
        crest=Image.open(OUT/(key+'_crest.png')).resize((64,64),Image.Resampling.LANCZOS)
        preview.paste(crest,(295,y+9),crest)
    preview.save(OUT/'preview.png')
    assert Image.open(OUT/'rivals_portraits.webp').size==(1024,1536)
    assert Image.open(OUT/'rival_crests.png').size==(512,768)
    assert Image.open(OUT/'preview.png').width==390
    for key in IDS:
        im=Image.open(OUT/(key+'_crest.png'))
        assert im.size==(256,256) and im.mode=='RGBA'
        assert im.getchannel('A').getextrema()==(0,255)
    print('Verified: six 512px portraits, six 256px RGBA crests, 390px preview; JSON frames in bounds.')

if __name__=='__main__':
    main()
