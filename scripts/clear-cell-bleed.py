#!/usr/bin/env python3
"""Clear pieces of a figure that cross into a neighbouring cell of a 512px unit sheet (2026-11-04, units.webp).
A connected alpha piece belongs to the cell holding most of it; its pixels in other cells (and their faint
alpha<=8 fringe) are cleared. Every other pixel stays identical; the output is lossless WebP.
Usage: python3 scripts/clear-cell-bleed.py IN.webp OUT.webp   (needs numpy, scipy, Pillow)"""
from PIL import Image
from scipy import ndimage
src,dst=sys.argv[1],sys.argv[2]; cell=512; thr=8
im=Image.open(src).convert('RGBA'); px=np.array(im)
a=px[:,:,3]; H,W=a.shape; cols=W//cell
lab,n=ndimage.label(a>thr, structure=np.ones((3,3)))
cy,cx=np.indices(a.shape); cid=(cy//cell)*cols+(cx//cell)
remove=np.zeros(a.shape,bool)
for k in range(1,n+1):
    m=lab==k
    cells,counts=np.unique(cid[m],return_counts=True)
    if len(cells)>1:
        own=cells[counts.argmax()]
        remove|= m & (cid!=own)
# the faint fringe (alpha<=thr) touching a removed piece in the same foreign cell goes too
grown=ndimage.binary_dilation(remove,iterations=3) & (a<=thr) & (a>0)
remove|=grown
print('pixels cleared', int(remove.sum()))
px[remove]=0
Image.fromarray(px).save(dst,'WEBP',lossless=True,quality=100,method=6,exact=True)
keep=~remove
chk=np.array(Image.open(dst).convert('RGBA'))
print('untouched pixels identical', bool((chk[keep]==np.array(im)[keep]).all()))
