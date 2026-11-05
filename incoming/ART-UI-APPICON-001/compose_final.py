from PIL import Image, ImageFilter, ImageChops
import numpy as np
bg=Image.open('public/assets/lobby/lobby_bg.webp').convert('RGB')
side=800; x0=980  # floating castle, waterfalls and tents
sq=bg.crop((x0,0,x0+side,side)).resize((1024,1024),Image.Resampling.LANCZOS)
# darken toward the centre so the gold star reads; keep the camp colours at the edges
yy,xx=np.mgrid[0:1024,0:1024]; r=np.hypot(xx-512,yy-500)/512
dark=np.clip(1-r,0,1)**1.4*.55
a=np.array(sq).astype(float); navy=np.array([10,20,50.])
a=a*(1-dark[...,None])+navy*dark[...,None]; base=Image.fromarray(a.astype('uint8'))
src=Image.open('incoming/ART-UI-APPICON-001/icon-r1-1024.png').convert('RGB'); s=np.array(src).astype(float)
alpha=np.clip((s[...,0]-50)/90,0,1); m=Image.fromarray((alpha*255).astype('uint8'))
star=src.copy(); star.putalpha(m)
bb=m.getbbox(); cx,cy=(bb[0]+bb[2])//2,(bb[1]+bb[3])//2
k=1.1  # a little bigger for legibility; still inside the central 80% circle
star=star.resize((round(1024*k),)*2,Image.Resampling.LANCZOS); m2=star.getchannel('A')
ox,oy=round(512-cx*k),round(500-cy*k)
layer=Image.new('RGBA',(1024,1024),(0,0,0,0)); layer.alpha_composite(star,(ox,oy))
am=layer.getchannel('A')
glow=Image.new('RGBA',(1024,1024),(255,214,120,0)); glow.putalpha(am.filter(ImageFilter.GaussianBlur(38)).point(lambda v:min(255,int(v*1.1))))
cyan=Image.new('RGBA',(1024,1024),(90,210,240,0)); cyan.putalpha(am.filter(ImageFilter.GaussianBlur(90)).point(lambda v:min(255,int(v*.9))))
out=base.convert('RGBA'); out.alpha_composite(cyan); out.alpha_composite(glow); out.alpha_composite(layer)
out=out.convert('RGB'); out.save('incoming/ART-UI-APPICON-001/final-r1-camp-1024.png')
bbx=layer.getchannel('A').point(lambda v:255 if v>60 else 0).getbbox();print('star bbox',bbx)
