"""Deterministic atlas packaging; no invented artwork. Run with --portraits PATH."""
from PIL import Image, ImageOps
from pathlib import Path
import json, hashlib, argparse

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SOURCE = ROOT.parent / 'boss-ch1-work/incoming/ART-CHAR-BOSS-CH1-001'
IDS = ['lake_spirit','crystal_giant','swamp_witch','flame_general','ancient_guardian','fate_shadow','vargoth_armoured','vargoth_unleashed']
FILES = ['04_lake_spirit','05_crystal_giant','06_swamp_witch','07_flame_general','08_ancient_guardian','09_fate_shadow','10_vargoth_armoured','10_vargoth_unleashed']

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--portraits')
    args = parser.parse_args()
    atlas = Image.new('RGBA', (1024,2048))
    frames, report = {}, []
    for i,(key,name) in enumerate(zip(IDS,FILES)):
        p = SOURCE / (name+'.png')
        src = Image.open(p).convert('RGBA')
        # Remove near-invisible alpha specks before measuring the visible bounds.
        src.putalpha(src.getchannel('A').point(lambda a: 0 if a < 12 else a))
        box = src.getchannel('A').getbbox()
        figure = src.crop(box)
        figure.thumbnail((480,472), Image.Resampling.LANCZOS)
        frame = Image.new('RGBA',(512,512))
        x = (512-figure.width)//2
        # Lake spirit's lowest curl extends 3 output pixels below its visible sole.
        sole_offset = 3 if key == 'lake_spirit' else 0
        frame.alpha_composite(figure,(x,497-figure.height+sole_offset))
        atlas.alpha_composite(frame,((i%2)*512,(i//2)*512))
        frames[key] = dict(x=(i%2)*512,y=(i//2)*512,w=512,h=512,footY=496)
        report.append(dict(id=key,source=name+'.png',source_sha256=sha(p),bounds=frame.getchannel('A').getbbox()))
    atlas.save(HERE/'units_bosses_ch1.webp',quality=88,method=6,exact=True)
    for kind in ['units','portraits']:
        (HERE/(kind+'_bosses_ch1.json')).write_text(json.dumps(frames,indent=2)+'\n')
    # Eight separate encounter bands, one Knight and one boss per band.
    # Composite uses existing backdrop pixels and unmodified existing Knight.
    backdrop = Image.open(ROOT/'public/assets/art/ruins.webp').convert('RGB')
    knight = Image.open(ROOT/'public/assets/art/units.webp').convert('RGBA').crop((0,0,512,512))
    preview = Image.new('RGB',(390,844))
    for i in range(8):
        top,bottom = round(i*844/8),round((i+1)*844/8)
        band = ImageOps.fit(backdrop,(390,bottom-top),centering=(.5,.65)).convert('RGBA')
        hero = knight.resize((64,64),Image.Resampling.LANCZOS)
        boss = atlas.crop(((i%2)*512,(i//2)*512,(i%2+1)*512,(i//2+1)*512)).resize((96,96),Image.Resampling.LANCZOS)
        band.alpha_composite(hero,(60,band.height-8-round(496*64/512)))
        band.alpha_composite(boss,(225,band.height-8-round(496*96/512)))
        preview.paste(band.convert('RGB'),(0,top))
    preview.save(HERE/'preview.png')
    if args.portraits:
        sheet = Image.open(args.portraits).convert('RGB')
        portraits = Image.new('RGB',(1024,2048))
        for i in range(8):
            x,y=(i%2)*sheet.width//2,(i//2)*sheet.height//4
            cell=sheet.crop((x,y,x+sheet.width//2,y+sheet.height//4)).resize((512,512),Image.Resampling.LANCZOS)
            portraits.paste(cell,((i%2)*512,(i//2)*512))
        portraits.save(HERE/'portraits_bosses_ch1.webp',quality=88,method=6)
    protected = ['units.webp','portraits.webp','units_foes.webp','ruins.webp']
    hashes = {name:sha(ROOT/'public/assets/art'/name) for name in protected}
    (HERE/'validation.json').write_text(json.dumps(dict(frames=report,existing_art_sha256=hashes),indent=2)+'\n')
    for p in HERE.glob('*.webp'):
        im=Image.open(p)
        assert im.size==(1024,2048)
        print(p.name,im.size,im.mode,p.stat().st_size)
    assert preview.size==(390,844)
    print('Preview: 390x844; frame order and footY=496 verified.')

if __name__ == '__main__':
    main()
