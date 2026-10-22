"""Mechanical export and preview compositor. Requires Pillow with RAQM and Tahoma.
Usage: python export.py MAP_SOURCE FOG_SOURCE
AI painting and cloud pixels are never procedurally repainted here.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent
W, H = 1080, 2340
NAMES = ['ซากชายแดน','เส้นทางป่าทึบ','แนวรอยแยก','ทะเลสาบเงาจันทร์','เหมืองผลึกร้าง','บึงหมอกพิษ','ป้อมเถ้าถ่าน','นครลอยฟ้าที่ล่มสลาย','ทุ่งดาวตก','บัลลังก์รอยแยก']
# Surveyed against the final painting, not the proposed generation coordinates.
CENTERS = [(315,2225),(665,1815),(329,1510),(677,1383),(430,1142),(696,850),(443,723),(720,520),(506,355),(703,192)]
VIA = [
 [(440,2170),(465,2100),(405,2010),(310,1985),(465,1915)],
 [(570,1770),(530,1700),(460,1640),(365,1600)],
 [(440,1470),(500,1420),(560,1400)],
 [(610,1340),(590,1290),(530,1240),(455,1200)],
 [(570,1080),(635,1020),(575,970),(505,930),(610,880)],
 [(625,800),(540,770)],
 [(535,695),(590,640),(640,600),(690,550)],
 [(675,505),(610,460),(450,430),(430,395)],
 [(580,320),(650,285),(640,240)],
]

def write_json(name, data):
    (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def font(size, bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/'+('tahomabd.ttf' if bold else 'tahoma.ttf'),size)

def main():
    src = Image.open(sys.argv[1])
    painting = src.convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
    painting.save(OUT/'region_ch1.webp',quality=91,method=6,icc_profile=src.info.get('icc_profile',b''))
    fog_src = Image.open(sys.argv[2]).convert('RGBA')
    assert fog_src.getchannel('A').getextrema()[0] == 0, 'Fog must have real transparency'
    fog = fog_src.resize((W,H),Image.Resampling.LANCZOS)
    fog.save(OUT/'region_ch1_fog.webp',quality=85,alpha_quality=100,method=6)
    # Adjacent nonoverlapping reveal territories. Shared boundaries meet exactly;
    # composite the fog once, then mask the union of locked territories.
    bounds=[H]+[round((CENTERS[i][1]+CENTERS[i+1][1])/2) for i in range(9)]+[0]
    nodes=[]
    for i, ((x,y),name) in enumerate(zip(CENTERS,NAMES)):
        nodes.append({'id':i+1,'name':name,'x':x,'y':y,
          'clearGround':{'x':x-60,'y':y-60,'width':120,'height':120},
          'fogRect':{'x':0,'y':bounds[i+1],'width':W,'height':bounds[i]-bounds[i+1]}})
    routes=[]
    for i,via in enumerate(VIA):
        routes.append({'from':i+1,'to':i+2,'points':[dict(x=x,y=y) for x,y in [CENTERS[i],*via,CENTERS[i+1]]]})
    data={'version':1,'image':{'file':'region_ch1.webp','width':W,'height':H,'origin':'top-left','units':'image pixels'},
      'nodes':nodes,'camp':{'x':130,'y':2205,'name':'ค่ายทหารรับจ้าง'},'route':routes,
      'fog':{'file':'region_ch1_fog.webp','width':W,'height':H,'composite':'source-over','mask':'union of fogRect for locked nodes; feather only outer union boundary by 32 image pixels'},
      'hudSafeRects':[{'x':0,'y':0,'width':230,'height':190},{'x':850,'y':2150,'width':230,'height':190}],
      'previewState':{'cleared':[1],'current':2,'unlocked':[1,2,3],'fogged':[4,5,6,7,8,9,10]}}
    write_json('region_ch1.json',data)
    # Unfogged review verifies marker placement even on currently hidden places.
    review=painting.copy()
    rd=ImageDraw.Draw(review)
    for i,(x,y) in enumerate(CENTERS):
        rd.rectangle((x-60,y-60,x+60,y+60),outline='#74d4ef',width=3)
        rd.text((x,y),str(i+1),anchor='mm',font=font(30,True),fill='white',stroke_width=3,stroke_fill='#08121f')
    review.resize((540,1170),Image.Resampling.LANCZOS).save(OUT/'node_review.png')
    files=[]
    for name in ['region_ch1.webp','region_ch1_fog.webp','node_review.png']:
        im=Image.open(OUT/name)
        files.append({'file':name,'size':list(im.size),'mode':im.mode,'bytes':(OUT/name).stat().st_size,
          'alphaRange':list(im.getchannel('A').getextrema()) if im.mode=='RGBA' else None})
    assert len(nodes)==10 and len(routes)==9
    assert all(r['points'][0]=={'x':nodes[i]['x'],'y':nodes[i]['y']} and r['points'][-1]=={'x':nodes[i+1]['x'],'y':nodes[i+1]['y']} for i,r in enumerate(routes))
    write_json('validation.json',{'files':files,'routeEndpointsMatch':True,'generatedMapSourceSize':list(src.size),'generatedFogSourceSize':list(fog_src.size)})
    print(json.dumps(files,indent=2))

if __name__=='__main__':
    main()
