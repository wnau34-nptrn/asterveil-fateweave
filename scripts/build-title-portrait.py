"""Portrait title background: crop the centre of the 1920x1080 title art (the part a phone frame shows), upscale 2x with Lanczos
and a light unsharp mask so the browser does not stretch 499 source px over a 1170 px wide screen. Lossy WebP q88.
Usage: python3 -I scripts/build-title-portrait.py <src webp> <out webp>   (raw art is not modified)."""
import sys
from PIL import Image, ImageFilter
src, out = sys.argv[1:3]
im = Image.open(src).convert('RGB'); w, h = im.size
cw = round(h * 0.625)                      # 0.625 = widest portrait frame (480x768)
box = ((w - cw) // 2, 0, (w - cw) // 2 + cw, h)
c = im.crop(box).resize((cw * 2, h * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
c.save(out, 'WEBP', quality=88, method=6)
print(c.size)
