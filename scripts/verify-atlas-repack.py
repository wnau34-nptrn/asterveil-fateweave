# W8: checks every frame of the repacked atlases against the shipped originals at a base commit (default 7dcace8):
# RGBA-identical wherever visible, transparent elsewhere. usage: python3 scripts/verify-atlas-repack.py
import json,subprocess,io,sys
sys.path.insert(0,'scripts')
import importlib.util
spec=importlib.util.spec_from_file_location('r','scripts/repack-atlas-lossless.py');r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
from PIL import Image
def git(path):return subprocess.run(['git','show',f'7dcace8:{path}'],capture_output=True,check=True).stdout
pairs=[]
for f in 'bolt execute ward blade projectile defense alchemy earth saint_dance boss_signature foe_signature'.split():
  pairs.append((f'public/assets/fx/{f}_fx.json',f'public/assets/fx/{f}_fx.webp',f'public/assets/fx/{f}_fx.json',f'public/assets/fx/{f}_fx.webp'))
old=json.loads(git('src/game/visuals/unit-atlases.json'));new=json.load(open('src/game/visuals/unit-atlases.json'))
for u in ['lyra','lalin','lio']:
  pairs.append(('public/assets/units/'+old[u]['atlas'],'public/assets/units/'+old[u]['image'],'public/assets/units/'+new[u]['atlas'],'public/assets/units/'+new[u]['image']))
out=[]
for oj,oi,nj,ni in pairs:
  od=json.loads(git(oj));oimg=Image.open(io.BytesIO(git(oi))).convert('RGBA')
  nd=json.load(open(nj));nimg=Image.open(ni).convert('RGBA')
  of=dict(r.frames_of(od));nf=dict(r.frames_of(nd))
  assert set(of)==set(nf),nj
  for k in of:
    a=r.source_canvas(oimg,of[k]);b=r.source_canvas(nimg,nf[k])
    assert a.size==b.size and r.same_render(b,a),(nj,k)
  out.append({'atlas':nj,'frames':len(of),'renderIdentical':True})
  print(nj,len(of),'ok')
json.dump(out,open('docs/validation/w8-field-audit/repack-verify.json','w'),indent=1)
