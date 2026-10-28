"""Mechanical PNG extraction and 390px review boards; never writes outside this intake.

No keying, repainting, alpha thresholding or atlas/runtime generation.
Run: python incoming/ART-VFX-ARCANE-SEAL-001/package.py
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ART = Path(__file__).resolve().parent
MOVES = ('mark', 'sigil', 'storm', 'dispel')
BEATS = ('prepare', 'peak', 'settle')
ROW_Y = (0, 362, 700, 1090, 1448)
FONT = '/usr/share/fonts/truetype/open-sans/OpenSans-Regular.ttf'


def font(size):
    return ImageFont.truetype(FONT, size)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def paste_fit(canvas, effect, width, anchor, pivot=(.5, .5)):
    # Uniform scaling only; padding and original alpha remain intact.
    size = round(width)
    effect = effect.resize((size, size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(effect, (round(anchor[0]-size*pivot[0]),
                                    round(anchor[1]-size*pivot[1])))


def storyboard(revision, layers):
    board = Image.new('RGBA', (390, 1110), '#091323')
    d = ImageDraw.Draw(board)
    d.text((16, 13), f'ARCANE / SEAL   {revision}', font=font(20), fill='#f4e9da')
    d.text((16, 44), 'Painted layer study / 390px', font=font(12), fill='#a6b3d3')
    d.text((16, 64), 'Anchor silhouettes only; not runtime footage', font=font(11), fill='#a6b3d3')
    names = ('Mark / Duelist', 'Sigil Bind / Mage', 'Arcane Storm / Mage', 'Dispel / Mage')
    for row, move in enumerate(MOVES):
        top = 98 + row*238
        d = ImageDraw.Draw(board)
        d.text((16, top), names[row], font=font(15), fill='#eebecb' if row == 0 else '#c6b7ff')
        for col, beat in enumerate(BEATS):
            left = 12 + col*126
            cx = left + 57
            d.rounded_rectangle((left, top+29, left+114, top+220), radius=10,
                                fill='#101f35', outline='#2c3b59')
            d.text((left+8, top+37), ('01 Prepare', '02 Peak', '03 Settle')[col],
                   font=font(11), fill='#c2cce0')
            # Neutral anchor diagram, deliberately separate from delivered art.
            face_y, foot_y = top+87, top+181
            d.ellipse((cx-9, face_y-10, cx+9, face_y+8), fill='#8291ad')
            d.line((cx, face_y+10, cx, foot_y-25), fill='#52627e', width=10)
            d.line((cx, foot_y-25, cx-11, foot_y), fill='#52627e', width=7)
            d.line((cx, foot_y-25, cx+11, foot_y), fill='#52627e', width=7)
            d.line((cx, face_y+25, cx-21, face_y+40), fill='#52627e', width=5)
            effect = layers[move, beat]
            if beat == 'prepare':
                paste_fit(board, effect, 44, (cx-24, face_y+42))
            elif move == 'mark':
                paste_fit(board, effect, 62 if beat == 'peak' else 30,
                          (cx+2 if beat == 'peak' else cx+29, face_y+50))
            elif move == 'sigil':
                paste_fit(board, effect, 99, (cx, foot_y),
                          (.5, .72 if beat == 'peak' else .76))
            elif move == 'storm':
                if beat == 'peak':
                    paste_fit(board, effect, 81, (cx+24, face_y+52))
                else:
                    # Small second sample denotes instancing per affected foe.
                    paste_fit(board, effect, 68, (cx, foot_y), (.5, .76))
            else:
                paste_fit(board, effect, 91 if beat == 'peak' else 88, (cx, face_y+54))
            # HP belongs above the entire effect region and stays legible.
            d = ImageDraw.Draw(board)
            d.text((left+23, top+60), 'HP 999', font=font(11), fill='#e2edf7')
            d.line((left+22, top+76, left+92, top+76), fill='#87c5bd', width=2)
            d.text((left+8, top+198), ('caster hand' if beat == 'prepare' else
                   'enemy side' if move == 'storm' and beat == 'peak' else
                   'target feet' if move in ('sigil', 'storm') else 'target centre'),
                   font=font(9), fill='#9cabc8')
    d = ImageDraw.Draw(board)
    d.text((16, 1061), 'Storm: repeat peak over enemy side;', font=font(11), fill='#adbada')
    d.text((16, 1078), 'one settle flash per affected foe. No HP result shown.', font=font(10), fill='#adbada')
    board.convert('RGB').save(ART/f'storyboard-{revision}-390.png')


def main():
    records = []
    for revision in ('R1', 'R2'):
        src = ART/'source'/f'{revision}.png'
        source = Image.open(src).convert('RGBA')
        assert source.size == (1086, 1448)
        layers = {}
        out = ART/revision
        out.mkdir(exist_ok=True)
        for row, move in enumerate(MOVES):
            for col, beat in enumerate(BEATS):
                rect = (col*362, ROW_Y[row], (col+1)*362, ROW_Y[row+1])
                cell = source.crop(rect)
                # Fit whole rectangle into 240 square, retaining its proportions.
                cell.thumbnail((240, 240), Image.Resampling.LANCZOS)
                effect = Image.new('RGBA', (256, 256))
                offset = ((256-cell.width)//2, (256-cell.height)//2)
                effect.alpha_composite(cell, offset)
                path = out/f'{move}_{beat}.png'
                effect.save(path)
                layers[move, beat] = effect
                # Foot-ring contact and crystal contact sit below geometric centre.
                pivot = [.5, .5]
                if move == 'sigil' and beat != 'prepare':
                    pivot = [.5, .72 if beat == 'peak' else .76]
                if move == 'storm' and beat == 'settle':
                    pivot = [.5, .76]
                alpha = effect.getchannel('A')
                bright = alpha.point(lambda a: 255 if a >= 64 else 0).getbbox()
                records.append(dict(revision=revision, move=move, beat=beat,
                    file=path.relative_to(ART).as_posix(), source=f'source/{revision}.png',
                    source_rect=list(rect), size=[256, 256], pivot=pivot,
                    alpha_bbox=list(alpha.getbbox()), bright_bbox=list(bright),
                    sha256=sha(path)))
        storyboard(revision, layers)
    manifest = dict(format='RGBA PNG; straight alpha; sRGB',
                    source_dimensions=[1086, 1448],
                    note='Mechanical crop/fit only. Pivots are normalized art anchor suggestions, not battle coordinates.',
                    sources={r: sha(ART/'source'/f'{r}.png') for r in ('R1','R2')},
                    layers=records)
    (ART/'layers.json').write_text(json.dumps(manifest, indent=2)+'\n')
    for record in records:
        im = Image.open(ART/record['file'])
        assert im.mode == 'RGBA' and im.size == (256, 256)
        a = im.getchannel('A')
        low, high = a.getextrema()
        assert low == 0 and high >= 128
        assert not a.crop((0, 0, 256, 8)).getbbox()
        assert not a.crop((0, 248, 256, 256)).getbbox()
        assert not a.crop((0, 0, 8, 256)).getbbox()
        assert not a.crop((248, 0, 256, 256)).getbbox()
    print('Validated 24 RGBA layers, 256x256, clear alpha and visible cores, 8px transparent gutters; 2 boards at 390x1110.')


if __name__ == '__main__':
    main()
