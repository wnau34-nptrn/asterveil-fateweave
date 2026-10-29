import json,hashlib,subprocess
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2]; out=Path(__file__).resolve().parent
items=[('garran','heroes','mercs',0,'right'),('brann','heroes','mercs',4,'right'),('foe_tusker','foes','foes',0,'left'),('foe_stalker','foes','foes',2,'left'),('foe_thorn_beetle','foes','foes2',4,'left')]
seeds=[]
for name,group,sheet,idx,facing in items:
    for folder in ['seeds','templates','source-sheets','raw']: (out/group/folder).mkdir(parents=True,exist_ok=True)
    atlas=root/f'public/assets/art/units_{sheet}.webp'; im=Image.open(atlas).convert('RGBA'); x=idx%2*512;y=idx//2*512
    seed=im.crop((x,y,x+512,y+512)); rel=f'{group}/seeds/{name}-seed.png'; seed.save(out/rel)
    seeds.append(dict(identity=name,file=rel,atlas=str(atlas.relative_to(root)),atlas_git_blob=subprocess.check_output(['git','rev-parse',f'HEAD:{atlas.relative_to(root)}'],cwd=root,text=True).strip(),cell=idx,crop_xyxy=[x,y,x+512,y+512],facing=facing,sole_y=497,sha256=hashlib.sha256((out/rel).read_bytes()).hexdigest(),rgba_sha256=hashlib.sha256(seed.tobytes()).hexdigest()))
    for rows in [1,2,3,4]:
        canvas=Image.new('RGBA',(1536,1024)); scaled=seed.resize((192,192),Image.Resampling.LANCZOS);canvas.alpha_composite(scaled,(32,64));canvas.save(out/group/'templates'/f'{name}-{rows}row-edit-canvas.png')
contact=Image.new('RGB',(5*256,300),'#192b31');d=ImageDraw.Draw(contact)
for i,(name,group,*_) in enumerate(items):
    seed=Image.open(out/group/'seeds'/f'{name}-seed.png');seed.thumbnail((256,256));contact.paste(seed,(i*256,24),seed);d.text((i*256+8,280),name,fill='white')
contact.save('/tmp/a5-seeds-contact.png')
(out/'seeds.json').write_text(json.dumps({'base_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'seeds':seeds},indent=2)+'\n')
print(out)
