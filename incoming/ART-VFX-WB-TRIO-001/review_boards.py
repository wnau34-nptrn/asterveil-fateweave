"""Illustrative 390px VFX staging only; no game state or engine code.

Images are composed with normal alpha. Only the effect overlay is masked;
the original actor sprites and labels are never erased. Mask removal is
reported before/after and is not evidence of naturally clear runtime placement.
"""
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageOps

BEATS=('prepare','peak','settle')
PALETTE={'kragmor':'a','valdrakk':'b','morvane':'c'}
CORE={'kragmor':(520,530),'valdrakk':(414,618),'morvane':(528,362)}
FACES={'kragmor':(330,280,570,435),'valdrakk':(89,520,310,705),'morvane':(495,208,635,305),
       'gold-hero':(195,10,389,205),'shard-crawler':(125,320,215,415),'rift-wisp':(126,310,226,384)}

def font(n=12):return ImageFont.load_default(size=n)

def paste_fx(canvas,im,width,point,pivot):
    z=round(width);tile=im.resize((z,z),Image.Resampling.LANCZOS)
    xy=(round(point[0]-z*pivot[0]/256),round(point[1]-z*pivot[1]/256))
    b=tile.getchannel('A').getbbox()
    assert xy[0]+b[0]>=0 and xy[0]+b[2]<=390 and xy[1]+b[1]>=0 and xy[1]+b[3]<=canvas.height,('overlay outside board',xy,b)
    canvas.alpha_composite(tile,xy)
    return {'anchor_xy':list(point),'width':width,'pivot':pivot,'paste_xy':list(xy)}

def mask_overlay(overlay,protected):
    a=np.array(overlay.getchannel('A'));union=Image.new('L',overlay.size);dr=ImageDraw.Draw(union);by_type={}
    for entry in protected:
        box=entry['xyxy'];dr.rectangle((box[0],box[1],box[2]-1,box[3]-1),fill=255)
        by_type.setdefault(entry['kind'],0)
        by_type[entry['kind']]+=int((a[box[1]:box[3],box[0]:box[2]]>0).sum())
    mask=np.array(union)>0;arr=np.array(overlay);before=int((a>0).sum());hidden=int(((a>0)&mask).sum());arr[mask]=0
    after=arr[:,:,3];remaining=int(((after>0)&mask).sum());assert remaining==0
    return Image.fromarray(arr),{'overlay_pixels_before':before,'masked_pixels':hidden,'masked_fraction':hidden/max(1,before),
      'before_overlap_by_kind_sum_may_double_count':by_type,'remaining_overlap':remaining,'protected_rects':protected}

class Boards:
    def __init__(self,asset,records):self.asset=asset;self.records=records

    def actor(self,board,name,cell_xy,size,protected,label=None,intent=None,opacity=1,pose=None):
        key='seed-'+PALETTE[name] if name in PALETTE else name
        im=self.asset(pose or 'seeds/'+key+'.png');tile=im.resize((size,size),Image.Resampling.LANCZOS)
        if opacity!=1:tile.putalpha(tile.getchannel('A').point(lambda a:round(a*opacity)))
        x,y=cell_xy;board.alpha_composite(tile,(round(x),round(y)));b=im.getchannel('A').getbbox();source=1024 if name in PALETTE else 512
        top=round(y+b[1]*size/source);d=ImageDraw.Draw(board)
        # Fixture labels sit above the actor's actual painted top, as the game does.
        label_w=min(86,size-8);label_x=round(x+size/2-label_w/2);label_x=max(7,min(383-label_w,label_x))
        hp=(label_x,top-12,label_x+label_w,top-5);nm=(label_x,top-28,label_x+label_w,top-14)
        d.text((nm[0]+2,nm[1]+1),label or name,font=font(10),fill='#f3e5c9')
        d.rounded_rectangle(hp,radius=2,fill='#111c2b',outline='#92a5bc');d.rectangle((hp[0]+2,hp[1]+2,hp[2]-2,hp[3]-2),fill='#66b89c')
        protected.extend([{'actor':label or name,'kind':'name','xyxy':list(nm)},{'actor':label or name,'kind':'hp','xyxy':list(hp)}])
        if intent:
            box=(max(7,round(x+size/2-83)),top-47,min(383,round(x+size/2+83)),top-30)
            d.text((box[0]+2,box[1]+2),intent,font=font(10),fill='#b9d9e9');protected.append({'actor':name,'kind':'intent','xyxy':list(box)})
        f=({'kragmor':(310,180,610,460),'valdrakk':(64,400,330,830),'morvane':(470,180,650,320)}.get(name,FACES[name]) if pose else FACES[name]);face=[round(x+f[0]*size/source),round(y+f[1]*size/source),round(x+f[2]*size/source),round(y+f[3]*size/source)]
        protected.append({'actor':label or name,'kind':'face','xyxy':face})
        if name in CORE:
            cx,cy=CORE[name]
            if pose:
                roi={'kragmor':(380,330,640,690),'valdrakk':(300,420,650,820),'morvane':(380,290,650,500)}[name]
                arr=np.array(im.crop(roi)).astype(float);rr,gg,bb,aa=[arr[:,:,i] for i in range(4)];weights=np.maximum(0,gg-rr)*(gg>130)*(bb>130)*(aa>64)
                if weights.sum()>0:
                    yy,xx=np.indices(weights.shape);cx=roi[0]+float((xx*weights).sum()/weights.sum());cy=roi[1]+float((yy*weights).sum()/weights.sum())
        else:cx,cy=256,300
        return {'chest':(x+cx*size/source,y+cy*size/source),'feet':(x+size/2,y+(896/1024 if name in CORE else 497/512)*size),
                'cell_xy':(x,y),'size':size,'source_size':source}

    def scene(self,board,top):
        bg=ImageOps.fit(self.asset('seeds/battle_riftline.webp'),(390,420),method=Image.Resampling.LANCZOS)
        board.alpha_composite(bg,(0,top));board.alpha_composite(Image.new('RGBA',(390,420),(8,18,34,155)),(0,top))

    def storyboard(self,design):
        ident=design['id'];base=design.get('base',ident);boss=design['boss'];board=Image.new('RGBA',(390,1372),'#0b1425');d=ImageDraw.Draw(board)
        d.text((12,9),design['name'],font=font(18),fill='#f7e7d1')
        flags=design['route'].upper()+(' / UNSTOPPABLE' if design.get('unstoppable') else '')+(' / BREAKABLE' if design.get('breakable') else '')
        d.text((12,34),flags,font=font(11),fill='#abd8e5');d.text((12,53),'Illustrative poses / normal blend / masked labels',font=font(10),fill='#b5c2d4')
        checks=[]
        for j,beat in enumerate(BEATS):
            top=78+j*430;self.scene(board,top);protected=[];d=ImageDraw.Draw(board)
            d.text((10,top+8),beat.upper(),font=font(12),fill='#f7e7d1')
            # Boss has the actual world-boss cell ratio: ~160px painted height.
            pose_file=f'seeds/poses/{base}.png' if beat=='peak' else None
            caster=self.actor(board,boss,(175,top+108),216,protected,intent=design['name'].replace(' R2',''),pose=pose_file)
            targets=[];summons={}
            if design['route']=='all':
                for i,(x,y) in enumerate([(10,top+134),(70,top+134),(130,top+134),(40,top+250),(102,top+250)]):
                    targets.append((f'h{i+1}',self.actor(board,'gold-hero',(x,y),64,protected,label=f'H{i+1}')))
            else:targets=[('h1',self.actor(board,'gold-hero',(19,top+169),108,protected,label='H1'))]
            if design['route']=='summon':
                d.text((10,top+282),'Restored-slot detail; not field formation',font=font(10),fill='#adc7da')
                for slot,name,x in [('f2','shard-crawler',16),('f3','shard-crawler',145),('b2','rift-wisp',274)]:
                    summons[slot]=self.actor(board,name,(x,top+298),100,protected,label=slot,opacity=.35 if beat=='prepare' and slot!='f3' else 1)
            overlay=Image.new('RGBA',board.size);r=self.records[(ident,beat)];im=self.asset(r['file']);instances=[]
            def put(actor_id,point):
                info=paste_fx(overlay,im,r['width_390'],point,r['pivot_px']);instances.append({'actor_id':actor_id,**info})
            anchor=r['anchor']
            if anchor.startswith('summoned_slot'):
                # Fixture: f2 and b2 were fallen; f3 already standing gets NO cue.
                for slot in ['f2','b2']:
                    x,y=summons[slot]['chest'];put(slot,(x,y+7))
            elif anchor.startswith('whole_hero_side'):
                for target_id,p in targets:put(target_id,p['feet'] if 'feet' in anchor else p['chest'])
            elif anchor.startswith('target.'):
                target_id,p=targets[0];put(target_id,p['feet'] if 'feet' in anchor else p['chest'])
            else:
                x,y=caster['chest']
                if anchor.endswith('.feet'):x,y=caster['feet']
                elif 'lower_hands' in anchor:x,y=175+530*216/1024,top+108+510*216/1024
                elif 'upper_hands_safe' in anchor:x,y=175+200*216/1024,top+108+165*216/1024
                elif 'wing_base' in anchor:x,y=175+485*216/1024,top+108+475*216/1024
                elif 'upper_back' in anchor:x,y=175+600*216/1024,top+108+400*216/1024
                elif 'forward_chest' in anchor:
                    x-=60
                if 'left_shoulder_core' in anchor:x+=12
                put('f1',(x,y))
            safe,report=mask_overlay(overlay,protected);board.alpha_composite(safe);report.update(beat=beat,instances=instances,route=design['route'],anchor=anchor,fixture_actual_targets=[t for t,_ in targets] if design['route']=='all' else ['f2','b2'] if design['route']=='summon' else ['h1'] if design['route']=='single' else ['f1'])
            report['body_pose']=pose_file or 'seeds/seed-'+PALETTE[boss]+'.png';report['caster_chest_xy']=list(caster['chest'])
            checks.append(report);d=ImageDraw.Draw(board);d.text((10,top+400),f"masked {report['masked_pixels']}px | remaining 0px",font=font(10),fill='#c8deeb')
        return board,{'design':ident,'file':f'storyboards/{ident}-390.png','panels':checks,'runtime_capture':False}

    def waiting(self):
        board=Image.new('RGBA',(390,780),'#0b1425');d=ImageDraw.Draw(board)
        d.text((10,10),'ACTUAL WAITING-HOLD SELECTION',font=font(17),fill='#f7e7d1')
        d.text((10,38),'Fixture only; no damage, no invented extra turn',font=font(11),fill='#b8cbdf')
        checks=[]
        for i,(boss,pose,key,title) in enumerate([
            ('kragmor','titan-gathering','mountain-fall','Titan -> Mountain Fall / RIGID'),
            ('valdrakk','wing-gathering','wing-gathering','Wing Gathering / BREAKABLE')]):
            top=76+i*346;self.scene(board,top);protected=[]
            d=ImageDraw.Draw(board);d.text((10,top+7),title,font=font(12),fill='#f7e7d1')
            caster=self.actor(board,boss,(175,top+80),216,protected,intent=title.split(' / ')[0],pose=f'seeds/poses/{pose}.png')
            self.actor(board,'gold-hero',(19,top+126),108,protected,label='H1')
            x,y=caster['chest'];x+=-60 if boss=='kragmor' else 12
            overlay=Image.new('RGBA',board.size);r=self.records[key,'prepare'];info=paste_fx(overlay,self.asset(r['file']),80,(x,y),[128,128])
            safe,report=mask_overlay(overlay,protected);board.alpha_composite(safe);report.update(charge=pose,hold_layer=r['file'],placement=info)
            checks.append(report)
        return board,checks

    def overview(self,designs):
        ds=[d for d in designs if not d.get('alternative')]
        board=Image.new('RGBA',(390,78+((len(ds)+1)//2)*184),'#0b1425');dr=ImageDraw.Draw(board)
        dr.text((10,10),'WORLD-BOSS VFX / 13 PRIMARY PEAKS',font=font(16),fill='#f7e7d1')
        dr.text((10,37),'Actual proposed widths / normal blend / R2 separate',font=font(10),fill='#b7cadd')
        for i,d in enumerate(ds):
            x=(i%2)*195;y=70+(i//2)*184;dr=ImageDraw.Draw(board)
            dr.rounded_rectangle((x+6,y,x+189,y+176),radius=6,fill='#142139')
            dr.text((x+12,y+7),d['name'],font=font(12),fill='#eee2d0')
            dr.text((x+12,y+25),d['boss']+' / '+d['route'],font=font(10),fill='#abc7d8')
            r=self.records[d['id'],'peak'];b=r['alpha_bbox'];pivot=[(b[0]+b[2])/2,(b[1]+b[3])/2]
            paste_fx(board,self.asset(r['file']),r['width_390'],(x+97,y+103),pivot)
            dr=ImageDraw.Draw(board);dr.text((x+12,y+160),str(r['width_390'])+'px canvas',font=font(10),fill='#a9bdcf')
        return board

    def contrast(self,designs,boss):
        ds=[d for d in designs if d['boss']==boss];board=Image.new('RGBA',(390,64+len(ds)*326),'#0b1425');d=ImageDraw.Draw(board)
        d.text((10,8),boss.upper()+' / NORMAL BLEND',font=font(16),fill='#f7e7d1');d.text((10,34),'navy above / original gold armour below',font=font(11),fill='#adbed2')
        armor=self.asset('seeds/gold-hero.png').crop((340,180,490,405)).resize((118,126),Image.Resampling.LANCZOS)
        metrics=[]
        for row,des in enumerate(ds):
            top=62+row*326;d=ImageDraw.Draw(board);d.text((10,top),des['name'],font=font(13),fill='#e2d9ed')
            for col,beat in enumerate(BEATS):
                r=self.records[(des['id'],beat)];im=self.asset(r['file']);x=8+col*127;w=r['width_390'] if beat!='peak' else min(130,r['width_390'])
                d.rectangle((x,top+24,x+118,top+150),fill='#142139');board.alpha_composite(armor,(x,top+168))
                for y in [top+87,top+231]:paste_fx(board,im,w,(x+59,y),[(r['alpha_bbox'][0]+r['alpha_bbox'][2])/2,(r['alpha_bbox'][1]+r['alpha_bbox'][3])/2])
                d=ImageDraw.Draw(board);d.text((x+3,top+302),beat,font=font(10),fill='#abc2d9')
                for surface,bg in [('navy',Image.new('RGBA',(256,256),'#142139')),('gold',armor.resize((256,256),Image.Resampling.LANCZOS))]:
                    original=np.array(bg.convert('RGB')).astype(int);com=Image.alpha_composite(bg.convert('RGBA'),im).convert('RGB');delta=np.abs(np.array(com).astype(int)-original).max(axis=2);a=np.array(im.getchannel('A'));ink=a>8
                    changed=int(((delta>6)&ink).sum());metrics.append({'design':des['id'],'beat':beat,'surface':surface,'visible_delta_gt6_pixels':changed,'ink_pixels_alpha_gt8':int(ink.sum()),'visible_fraction':changed/max(1,int(ink.sum()))})
        return board,metrics

    def compare(self,keys,title,subtitle,widths):
        board=Image.new('RGBA',(390,90+len(keys)*192),'#101d30');d=ImageDraw.Draw(board);d.text((10,10),title,font=font(16),fill='#f7e7d1');d.text((10,37),subtitle,font=font(10),fill='#bdcddd')
        armor=self.asset('seeds/gold-hero.png').crop((340,180,490,405)).resize((118,112),Image.Resampling.LANCZOS)
        for i,(ident,beat,label) in enumerate(keys):
            top=72+i*192;im=self.asset(self.records[ident,beat]['file']) if (ident,beat) in self.records else self.asset(ident);d=ImageDraw.Draw(board);d.text((10,top),label,font=font(12),fill='#dfd8ed');board.alpha_composite(armor,(231,top+27))
            paste_fx(board,im,widths[i],(105,top+86),(128,128));paste_fx(board,im,widths[i],(290,top+86),(128,128))
        return board
