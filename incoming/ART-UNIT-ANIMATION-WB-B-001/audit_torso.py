#!/usr/bin/env python3
"""Independent torso-only QA, excluding wings, tail, head and moving paws.

python3 -I incoming/ART-UNIT-ANIMATION-WB-B-001/audit_torso.py
Requires the pinned requirements.txt. This is a conservative feature-based proxy
for torso length, not a skeleton or owner acceptance. Missing spatial coverage
is NOT a pass. No pixels/transforms are modified by this script.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
spec = json.loads((ROOT/'strips.json').read_text())
seed = Image.open(ROOT/'seeds/seed-b.png').convert('RGBA')
polygon = np.array([[355,585],[480,570],[625,600],[740,625],[770,690],[650,710],[480,685],[360,670]])
mask = np.zeros((1024,1024),dtype=np.uint8)
cv2.fillPoly(mask,[polygon],255)

def gray(im):
    a = np.asarray(im).astype(float)
    a = a[:,:,:3]*a[:,:,3:]/255 + (1-a[:,:,3:]/255)*30
    return cv2.cvtColor(a.astype(np.uint8),cv2.COLOR_RGB2GRAY)

sift = cv2.SIFT_create()
k0,d0 = sift.detectAndCompute(gray(seed),mask)
rows = []
for move in spec['moves']:
    sheet = Image.open(ROOT/move['file']).convert('RGBA')
    for i in range(move['frame_count']):
        cell = sheet.crop((i*1024,0,(i+1)*1024,1024))
        row = {'move':move['move'],'frame':i,'scale':None,'inliers':0,'seed_inlier_span_x':0,'posterior_inliers':0,'status':'not-measured'}
        if cell.tobytes() == seed.tobytes():
            row.update(scale=1.0,inliers=len(k0),seed_inlier_span_x=415,posterior_inliers=None,status='seed-exact')
        else:
            k,d = sift.detectAndCompute(gray(cell),None)
            good = [] if d is None else [a for a,b in cv2.BFMatcher().knnMatch(d0,d,k=2) if a.distance < .75*b.distance]
            if len(good)>=6:
                src = np.float32([k0[m.queryIdx].pt for m in good])
                dst = np.float32([k[m.trainIdx].pt for m in good])
                matrix,inliers = cv2.estimateAffinePartial2D(src,dst,ransacReprojThreshold=6)
                if matrix is not None:
                    xs = src[inliers[:,0]>0,0]
                    scale = float(np.hypot(matrix[0,0],matrix[1,0]))
                    row.update(scale=scale,inliers=int(inliers.sum()),seed_inlier_span_x=float(np.ptp(xs)),posterior_inliers=int((xs>610).sum()),matrix=matrix.tolist())
                    # Core-only matches cannot measure shoulder-to-posterior length.
                    measured = row['inliers']>=12 and row['seed_inlier_span_x']>=180 and row['posterior_inliers']>=3 and .5<scale<2
                    if measured:
                        row['status'] = 'within-4pct-proxy' if abs(scale-1)<=.04 else 'drift'
        rows.append(row)
summary = {status:sum(r['status']==status for r in rows) for status in sorted({r['status'] for r in rows})}
report = {'task':ROOT.name,'method':'SIFT similarity constrained by spatial torso coverage; seed mask excludes wings/tail/head/feet. Scale of torso texture across shoulder AND posterior is a proxy for body length, not full skeletal measurement.',
          'seed_mask_polygon':polygon.tolist(),'tolerance':.04,'min_inliers':12,'min_seed_x_span':180,'min_posterior_inliers':3,
          'not_measured_policy':'Never passed. Owner/artist must compare torso length with seed; do not import on the basis of technical verification alone.',
          'summary':summary,'rows':rows}
(ROOT/'torso-audit.json').write_text(json.dumps(report,indent=2)+'\n')
im = seed.copy()
draw = ImageDraw.Draw(im)
draw.line([tuple(p) for p in polygon]+[tuple(polygon[0])],fill='#ffcb47',width=3)
im.save(ROOT/'previews/torso-reference-mask.png')
print(summary)
