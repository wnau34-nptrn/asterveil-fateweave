#!/usr/bin/env python3
"""Build static reference pages from captured real DOM. Requires beautifulsoup4.
Run from any cwd. Does not import, write or execute game rules.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import json,re,html,hashlib
D=Path(__file__).resolve().parent
R=D.parent.parent
P=D/'prototypes'
P.mkdir(exist_ok=True)
BASE='dd99b38d'
art_rules=[]; arts={}; sources=[]; pages=[]
def esc(v):return html.escape(str(v),quote=True)
def soup(n):return BeautifulSoup(json.loads((D/'before/390x844'/f'{n}.json').read_text())['html'],'html.parser')
def txt(e):return e.get_text(' ',strip=True) if e else ''
def pick(n,sel):
 e=soup(n).select_one(sel)
 if not e:raise ValueError((n,sel))
 return e
def text(n,sel):return txt(pick(n,sel))
def art(e):
 if e is None:e=soup('32-quest-board').select_one('.side-quest svg')
 if e.name=='svg':
  e=BeautifulSoup(str(e),'html.parser').svg
  for node in [e,*e.find_all(True)]:
   for attr in ['fill','stroke']:
    if node.get(attr,'').startswith('#'):node[attr]='currentColor'
   if node.has_attr('stroke-width'):node['stroke-width']='var(--icon-stroke)'
  return '<span class="art art-icon" aria-hidden="true">'+str(e).replace('viewbox=','viewBox=')+'</span>'
 if e.select_one('.equip-sprite'):e=e.select_one('.equip-sprite')
 style=e.get('style','');img=e.select_one('img')
 if '--atlas:' in style:
  url=re.search(r'--atlas:url\(([^)]+)',style)[1];cols=re.search(r'--cols:([\d.]+)',style)[1];rows=re.search(r'--rows:([\d.]+)',style)[1];x=re.search(r'--ax:([\d.]+%)',style)[1];y=re.search(r'--ay:([\d.]+%)',style)[1];size=f'{float(cols)*100:g}% {float(rows)*100:g}%';pos=f'{x} {y}'
 elif img:
  url=img['src'];prefix='portrait' if 'portrait' in e.get('class',[]) else 'art';x=float(re.search(r'--'+prefix+r'-x:([\d.]+)',style)[1]);y=float(re.search(r'--'+prefix+r'-y:([\d.]+)',style)[1]);rows=float(re.search(r'--'+prefix+r'-rows:([\d.]+)',style)[1]);size=f'200% {rows*100:g}%';pos=f'{x*100:g}% {y/(rows-1)*100:g}%'
 else:return '<span class="art" aria-hidden="true"></span>'
 url=url.replace('/assets/','../../public/assets/')
 key=(url,size,pos)
 if key not in arts:
  name=f'art-{len(arts)+1}';arts[key]=name
  art_rules.append(f'.{name}'+'{'+f'--art-image:url("{url}");--art-size:{size};--art-pos:{pos}'+'}')
 return f'<span class="art {arts[key]}" aria-hidden="true"></span>'
def button(label,kind='secondary',href=None,extra=''):
 if href:return f'<a class="button {kind}" href="{href}.html" {extra}>{esc(label)}</a>'
 return f'<button type="button" class="{kind}" {extra}>{esc(label)}</button>'
def card(name,details='',image=None,price='',action=None,kind='secondary',href=None,badge=''):
 return f'<article class="card">{art(image)}<div class="copy"><b>{esc(name)}</b><small>{esc(details)}</small>{badge}</div>'+ (f'<div class="card-end"><span class="price">{esc(price)}</span>{button(action,kind,href) if action else ""}</div>' if price or action else '')+'</article>'
def fold(label,body,opened=False):return f'<details class="fold" {"open" if opened else ""}><summary>{esc(label)}</summary><div class="stack">{body}</div></details>'
def para(t,cl=''):return f'<p class="{cl}">{esc(t)}</p>'
def panel(t):return f'<div class="info-panel">{esc(t)}</div>'
def ledger(e,star=False):
 rows=[]
 for row in e.select('tbody tr'):
  cells=[txt(c) for c in row.find_all(['th','td'],recursive=False)]
  if star:cells.insert(3,'0')
  rows.append('<tr><th>'+esc(cells[0])+'</th>'+''.join('<td>'+esc(c)+'</td>' for c in cells[1:])+'</tr>')
 return '<table class="ledger"><caption>ทรัพยากร · ก่อนยืนยัน</caption><thead><tr>'+''.join(f'<th>{x}</th>' for x in ['หน่วย','มี','ใช้','ได้รับ','หลังทำ'])+'</tr></thead><tbody>'+''.join(rows)+'</tbody></table>'
def table(e):
 s=BeautifulSoup(str(e),'html.parser')
 for el in s.find_all(True):
  el.attrs={}
 s.table['class']='ledger'
 return str(s)
def copied_details(n,sel):
 e=pick(n,sel);label=txt(e.select_one('summary'));body=''
 for el in e.find_all(['p','table'],recursive=False):body+=table(el) if el.name=='table' else para(txt(el),'caption')
 return fold(label,body)
def tabs(items,active):
 return '<nav class="tabs" aria-label="ส่วนของหน้าต่าง">'+''.join(button(label,'secondary',href,extra='aria-current="page"' if href==active else '') for label,href in items)+'</nav>'
def nav():return '<nav class="navigation" aria-label="ค่าย">'+''.join(button(t,'secondary',h) for t,h in [('ทีม','c-team'),('จ้าง','c-hire'),('กระเป๋า','c-bag'),('ฟาร์ม','c-farm'),('ช่าง','e-tasks'),('ยา','c-brew')])+'</nav>'
def page(id,title,body,source=None,group='C',sub='',back=None,primary=None,secondary=None,tab='',review=False,variant='r1',sizes=None,kind='sheet',preserves=None):
 cls='window'+(' review' if review else '')+(' dialog' if kind=='dialog' else '')
 header=f'<header class="window-head {"has-back" if back else ""}">'+(f'<a class="button icon-button back" href="{back}.html" aria-label="ย้อนกลับ">‹</a>' if back else '')+f'<div class="title-block"><h1>{esc(title)}</h1><small>{esc(sub)}</small></div><a class="button icon-button close" href="b-camp.html" aria-label="ปิด">×</a></header>'
 dock=''
 if primary:
  label,href=primary
  dock='<footer class="dock">'+(button(secondary[0],'secondary',secondary[1]) if secondary else '')+button(label,'primary',href)+'</footer>'
 app=f'<main id="app" class="{variant}"><section class="{cls}" aria-label="{esc(title)}">{header}{tab}<div class="scroll">{body}</div>{dock}</section>'+ (nav() if variant in ['r2-q1','r2-all'] else '')+'</main>'
 write_page(id,title,app)
 pages.append(dict(id=id,title=title,source=source,group=group,variant=variant,sizes=sizes or ([[390,844],[320,568]] if variant!='r1' else [[390,844],[390,650],[320,568]]),kind=kind,back=bool(back),primary=bool(primary),preserves=preserves or []))
 return dict(title=title,body=body,source=source,group=group,sub=sub,back=back,primary=primary,secondary=secondary,tab=tab,review=review,kind=kind,preserves=preserves)
def write_page(id,title,app):
 (P/f'{id}.html').write_text(f'<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} · Asterveil Fateweave</title><link rel="stylesheet" href="../components.css"></head><body>{app}</body></html>')
# C — all card text and bank totals from the fresh audit DOM.
brew=''
for e in pick('26-brew','.brew-list').find_all('li',recursive=False):
 lines=e.select('small');cost=txt(e.button).split(' · ',1)[1]
 brew+=card(txt(e.b),txt(lines[0]),e.select_one('.potion-art'),cost,'ปรุง',badge=f'<span class="badge count">{esc(txt(lines[1]))}</span>')
brew=panel('แร่ดาว 640 · ฝุ่นดาว 120')+para('ออกเดินทางแล้วพายาไปอย่างละไม่เกิน 3 ขวด ที่เหลือเก็บไว้ที่ค่าย','caption')+brew+copied_details('26-brew','.lobby-help')
brew_spec=page('c-brew','นักปรุงยา',brew,'26-brew',sub='เฟิร์น · นักปรุงยา')
for id,n,active in [('c-hire','20-hire-board','c-hire'),('c-market','22-market','c-market')]:
 body=panel(text(n,'.hire-cost'))
 for e in pick(n,'.hire-list').find_all('li',recursive=False):
  name=txt(e.find('b'));small=e.find_all('small');detail=' · '.join(txt(t) for t in small if not t.find_parent('select'))
  action=e.select_one('[data-lobby="hire"], [data-lobby="buy"]')
  body+=card(name,detail,e.select_one('.hero-art,.potion-art,.gear-art'),txt(action),'จ้าง' if id=='c-hire' else 'ซื้อ')
  if e.select_one('select'):
   sel=e.select_one('select');opts=''.join(f'<option>{esc(txt(o))}</option>' for o in sel.select('option'));body+=f'<label class="field">ให้<select>{opts}</select></label>'
 page(id,'ป้ายจ้างทหารรับจ้าง',body,n,sub='พีโน่ · นายหน้าจ้างทหาร',tab=tabs([('ป้ายจ้าง','c-hire'),('ตลาด','c-market')],active))
# Bag — one action on card, remaining actions disclosed.
s=soup('23-bag');gearlist=s.select_one('.gear-list') or s.select_one('.equipment-list')
if gearlist is None:
 gearlist=s.select_one('[data-lobby="salvage"]').find_parent('ul') if s.select_one('[data-lobby="salvage"]') else s.select_one('.inventory-list')
# Find actual list by painted gear child to avoid matching filter lists.
if gearlist is None:
 gearlist=next(e for e in s.select('.lobby-content ul') if e.select_one('.gear-art'))
bag=panel('คลัง 6/90 · รอจัด 0')+fold('กรองเพิ่มเติม / เรียงรายการ',para('ทุกประเภท · ทุกช่อง · ทุกระดับ · ความหายาก','caption'))
for e in gearlist.find_all('li',recursive=False):
 name=txt(e.select_one('b,strong'));detail=' · '.join(txt(x) for x in e.select('small'))
 bag+=card(name,detail,e.select_one('.gear-art'),action='ดู/เปรียบเทียบ',href='d-overview')+fold('เพิ่มเติม',button('พัฒนา','secondary','e-tasks')+button('ล็อก')+button('แยก','danger'))
bag+=fold('จัดการคลัง · รีไซเคิล · ขยาย',para('เลือกหลายชิ้นเพื่อรีไซเคิล · เว้นของบอส ของล็อก ของลงทุน และของถ่ายโอนแล้ว','caption')+button('เลือกของปลอดภัยที่แสดง')+button('รีไซเคิลที่เลือก (0)','danger',extra='disabled aria-describedby="empty-reason"')+'<small id="empty-reason">ยังไม่ได้เลือกอุปกรณ์</small>'+fold('ขยายคลังถาวร · เหรียญทอง 2480',para('เพิ่ม 30 ช่อง · ใช้ 400 เหรียญทอง · ปัจจุบัน 90 ช่อง')))
page('c-bag','อุปกรณ์',bag,'23-bag',sub='คลัง 6/90',back='c-team')
# Selected team: selection context before deployed list; formation is retained verbatim behind a disclosure.
s=soup('14-team-member-picked');member=s.select_one('.member-panel')
team=card('เอกิส','Lv10 (เลเวลค่าย) · ตัวซ้ำที่เก็บไว้ 4',s.select_one('.portrait[data-actor="guardian"]'),action='ดูตัวละคร',href='d-overview',badge='<span class="badge count">เลือกเอกิสแล้ว</span>')
team+=para('เลือกเอกิสแล้ว · แตะคนหรือช่องว่างในกลุ่มอื่นเพื่อสลับ แตะซ้ำเพื่อยกเลิก','caption')
for head,selector in [('ลงสนาม','.team-deployed'),('สำรอง','.team-reserve')]:
 team+=f'<h3>{head}</h3>'
 # Actual controls carry IDs; dedupe by actor.
 nodes=s.select('[data-lobby="pick"]');seen=set()
 for e in nodes:
  id=e.get('data-hero') or e.get('data-id') or e.get('id')
  if id in seen or not e.select_one('b'):continue
  if head=='ลงสนาม' and len(seen)>=5:continue
  if head=='สำรอง' and len(seen)<5:seen.add(id);continue
  if head=='สำรอง' and len(seen)>=8:continue
  seen.add(id);team+=card(txt(e.b),' · '.join(txt(x) for x in e.select('small')),e.select_one('.portrait'),action='เลือก',extra=None) if False else card(txt(e.b),' · '.join(txt(x) for x in e.select('small')),e.select_one('.portrait'),action='เลือก')
team+='<h3>ในค่าย · ไม่ได้เข้าด่านรอบนี้</h3>'
for e in nodes:
 if e.select_one('b') and txt(e.b)=='เซรีส':team+=card(txt(e.b),' · '.join(txt(x) for x in e.select('small')),e.select_one('.portrait'),action='เลือก')
formation=s.select_one('.formation') or s.select_one('.formation-plan')
if formation:team+=fold('แผนการยืน · ใช้ทุกศึก',para(txt(formation),'caption'))
team+=fold('จัดการสมาชิก',button('เลิกจ้าง','danger'))
page('c-team','จัดทีม',team,'14-team-member-picked',sub='ถือครอง 9/15 · เลเวลค่าย Lv10')
# Quest board is an extra to evidence the preserved in-card claim affordance.
s=soup('32-quest-board');quest=panel('รับได้ 1')
for e in s.select('.side-quest'):
 quest+=card(txt(e.select_one('h3,b,strong')),' · '.join(txt(x) for x in e.select('.side-quest-from,.side-quest-ask,.side-quest-head small')),image=e.select_one('svg'),price=txt(e.select_one('.side-quest-reward')),action='รับรางวัล' if e.select_one('button:not([disabled])') else None,kind='primary' if e.select_one('button:not([disabled])') else 'secondary')
if quest==panel('รับได้ 1'):
 for e in s.select('.lobby-content li'):
  if e.find('button'):quest+=card(txt(e.select_one('b,h3')),' · '.join(txt(x) for x in e.select('p,small')),action=txt(e.button))
page('c-quests','กระดานเควสต์',quest,'32-quest-board',sub='การ์ดเควสต์ · รับรางวัลในการ์ด',preserves=['quest-card-claim'])
# Farm exact output text, grouped as disclosure to keep primary task readable.
farm=''
e=pick('25-farm-plan','.hunt-settings')
for child in e.find_all(recursive=False):
 if child.name in ['h3','h4']:farm+=f'<h3>{esc(txt(child))}</h3>'
 elif child.name=='label' and child.select_one('select'):
  labelname=''.join(str(t) for t in child.find_all(string=True,recursive=False)).strip()
  farm+=f'<label class="field">{esc(labelname)}<select>'+''.join(f'<option>{esc(txt(o))}</option>' for o in child.select('option'))+'</select></label>'
 elif child.name=='p':farm+=para(txt(child),'caption')
 elif child.name=='button':farm+=button(txt(child),'secondary',extra='disabled aria-describedby="farm-reason"')
 elif child.name=='section':farm+=fold(txt(child.select_one('h3')),''.join(para(txt(c),'caption') for c in child.select('p')))
farm+='<small id="farm-reason">เลือกอย่างเดียวยังไม่บันทึก</small>'
page('c-farm','แผนฟาร์ม',farm,'25-farm-plan')
# D — overview, skills, star review.
dtabs=lambda active:tabs([('ภาพรวม','d-overview'),('อุปกรณ์','c-bag'),('สกิล','d-skills'),('พัฒนา','d-star-review')],active)
s=soup('16-character-overview');overview='<figure class="hero-figure">'+art(s.select_one('.hero-art'))+'</figure>'+panel('เอกิส · Lv10 · ★3 · อัศวิน · แนวหน้า')
overview+='<div class="stats">'
for e in s.select('.character-stat'):
 overview+=fold(txt(e.summary),para(txt(e.p),'caption'))
overview+='</div>'+para(text('16-character-overview','.camp-note'),'caption')
page('d-overview','เอกิส · Lv10 · ★3',overview,'16-character-overview',group='D',back='c-team',tab=dtabs('d-overview'))
s=soup('16-character-skills');skills=panel('สกิลที่ติดตั้ง · 2/3 ช่อง')
for e in s.select('.skills-slots button'):skills+=button(txt(e),'secondary',extra=f'aria-pressed="{e.get("aria-pressed","false")}"')
skills+=para('เปลี่ยนชุดฟรี ไม่ใช้ตำราหรือแต้ม','caption')+tabs([('ติดตั้ง / เพิ่ม Lv','d-skills'),('ผังสกิล','d-tree'),('ตำรา','d-tomes')],'d-skills')
for e in s.select('.character-skills>li'):
 skills+=card(txt(e.select_one('b')),txt(e.select_one('small')),action='ตรวจรายการเพิ่ม Lv')
 for d in e.select('details'):skills+=fold(txt(d.summary),''.join(para(txt(p),'caption') for p in d.select('p')))
page('d-skills','เอกิส · สกิล',skills,'16-character-skills',group='D',back='d-overview',tab=dtabs('d-skills'))
for id,n,label in [('d-tree','17-character-skills-tree','ผังสกิล'),('d-tomes','17b-character-tome-trade','ตำรา')]:
 e=pick(n,'.skills-section');body=''
 if id=='d-tree':
  body=panel(txt(e.select_one('.tree-head')))
  for node in e.select('.talent-node'):
   label_text=node.get('aria-label',txt(node));body+=card(label_text.split(' ขั้น')[0],label_text,image=node.select_one('svg'),action='ดูโหนด')
  body+=fold('รายละเอียดโหนดที่เลือก',''.join(para(txt(p),'caption') for p in e.select('p')))
 else:
  for child in e.find_all(recursive=False):
   if child.name in ['h3','h4']:body+=f'<h3>{esc(txt(child))}</h3>'
   elif child.name=='p':body+=para(txt(child),'caption')
   else:body+=fold(txt(child.select_one('h3,h4')) or 'ตำราศึก',para(txt(child),'caption'),True)
 page(id,'เอกิส · '+label,body,n,group='D',back='d-skills',tab=dtabs('d-skills'))
s=soup('18b-star-review');star='<span class="review-tag">ยังไม่ใช้ทรัพยากร · ยืนยันเพิ่มครั้งละ 1 ดาว</span>'+panel('เอกิส · Lv10 · 3 → 4 ดาว')+ledger(s.select_one('.star-ledger'),True)
star+=para('ใช้ตัวซ้ำก่อน · ตราเติมส่วนขาดได้ไม่เกิน 2 จาก 3 · ต้องมีตัวซ้ำอย่างน้อย 1','caption')+para('ใช้ตัวซ้ำที่สะสมของคนนี้ ไม่ใช้สมาชิกคนอื่นเป็นวัตถุดิบ','caption')+table(s.select_one('.star-stats'))
star+=para('แต้มผังความถนัด +1 · ระบบปัจจุบัน','caption')+para('คงเลเวลค่าย อุปกรณ์ บาดแผล และการจัดทีมเดิม · สกิล/พาสซีฟปลดในผังความถนัด','caption')
page('d-star-review','ตรวจรายการอัปดาว',star,'18b-star-review',group='D',back='d-overview',review=True,primary=('ยืนยันอัปดาว เอกิส',None),secondary=('กลับไปแก้ไข','d-overview'),preserves=['star-review','ledger'])
# E — task catalogue, craft ready + review use real guaranteed output (there is NO random craft roll).
s=soup('27-forge-tasks');tasks=para('เลือกสิ่งที่ต้องการทำ · การเปิดดูยังไม่ใช้ทรัพยากร','caption')+panel('แร่ 640 · ฝุ่น 120 · ตรา 3')
for e in s.select('[data-forge="task"]'):
 tasks+=card(txt(e.select_one('b,strong')) or txt(e).split(' ')[0],txt(e.select_one('small,p')),image=e.select_one('svg'),action='เลือกงาน',href='e-craft' if e.get('data-task')=='craft' else None)
page('e-tasks','เลือกงานโรงตีเหล็ก',tasks,'27-forge-tasks',group='E')
s=soup('29-forge-craft-review');item=s.select_one('.forge-item-head');info=item.select_one('b');sm=item.select('small')
craft=card(txt(info),' · '.join(txt(x) for x in sm[1:]),item.select_one('.gear-art'))
craft+=para('ผลที่รับประกัน · ไม่สุ่ม','review-tag')+para('คลัง 6/90 ชิ้น · ของรอรับ 0 ชิ้น','caption')
craft+=ledger(s.select_one('#forge-cost'))
craft+=fold('ค่าสถานะ ผลต่อผู้สวม และการคืนทุน',''.join(para(txt(p),'caption') for p in s.select('.forge-secondary-details>p,.forge-secondary-details>ul'))+''.join(table(t) for t in s.select('.forge-secondary-details table')))
craft+=para('ยังไม่ใช้วัสดุ · ตรวจรายการก่อนยืนยัน','caption')
review_spec=page('e-craft-review','ตรวจรายการสร้างอาวุธ',craft,'29-forge-craft-review',group='E',sub='อัศวิน · เอกิส · Lv3 · 1 ชิ้น',back='e-craft',primary=('ยืนยันสร้างอาวุธ 1 ชิ้น',None),secondary=('กลับไปแก้ไข','e-craft'),review=True,preserves=['forge-review','guaranteed-v-random','ledger'])
s=soup('28-forge-craft');ready=''
for label in s.select('.forge-craft-selectors label'):
 sel=label.select_one('select');labelname=''.join(str(t) for t in label.find_all(string=True,recursive=False)).strip()
 ready+=f'<label class="field">{esc(labelname)}<select>'+''.join(f'<option {"selected" if o.has_attr("selected") else ""}>{esc(txt(o))}</option>' for o in sel.select('option'))+'</select></label>'
# ready capture is Lv1; do not mix its values with the Lv3 review.
ready+=card(txt(s.select_one('.forge-item-head b')),' · '.join(txt(x) for x in s.select('.forge-item-head small')),s.select_one('.forge-item-head .gear-art'))+ledger(s.select_one('#forge-cost'))
page('e-craft','สร้างอาวุธ',ready,'28-forge-craft',group='E',back='e-tasks',primary=('ตรวจรายการสร้างอาวุธ','e-craft-review'))
# F — real bag, entrance/withdraw and code-defined event/draft without fabricated state totals.
for id,n,title in [('f-pack','42-map-pack','กระเป๋า'),('f-pack-gear','43-map-pack-tab2','กระเป๋า · อุปกรณ์')]:
 s=soup(n);e=s.select_one('#pack-content');body=''
 # Retain all rules and available state in collapsible sections, with card/potion list first.
 for el in e.select('li'):
  if el.find_parent('li'):continue
  name=txt(el.select_one('b,strong'))
  if name:body+=card(name,' · '.join(txt(x) for x in el.select('small')),el.select_one('.portrait,.potion-art,.gear-art'),action=txt(el.button) if el.button else None)
 if id=='f-pack-gear':
  for p in e.select('p'):
   if 'ไม่มี' in txt(p) or '0/0' in txt(p):body+=panel(txt(p))
 body+=fold('ข้อมูลสัมภาระและการจัดทีม',para(txt(e),'caption'))
 page(id,title,body,n,group='F',back='f-map-hud',tab=tabs([('สมาชิก / ยา','f-pack'),('อุปกรณ์','f-pack-gear')],id),kind='dialog')
for id,n,title in [('f-entrance','45-map-camp','ทางเข้าด่าน'),('f-withdraw','46-map-withdraw-confirm','ยืนยันถอนตัว')]:
 s=soup(n);e=s.select_one('#camp-content');withdraw=e.select_one('.withdraw-section')
 body=panel(txt(withdraw.select_one('p')))
 team_section=e.select_one('.team-section')
 if team_section:body+=fold('ข้อมูลทีม',para(txt(team_section),'caption'))
 page(id,title,body,n,group='F',back='f-map-hud',primary=('ยืนยันถอนตัว' if id=='f-withdraw' else 'ถอนตัวกลับค่าย','g-summary' if id=='f-withdraw' else 'f-withdraw'),secondary=('เดินทางต่อ','f-map-hud'),kind='dialog',preserves=['withdraw-existing-confirmation'])
event=para('กลุ่มโจรตั้งด่านขวางทาง พวกมันเฝ้าของที่ปล้นมา')+card('สู้','สู้กับโจรที่แข็งกว่าโซนนี้ 1 เลเวล · ชนะแล้วได้อุปกรณ์แน่นอน',action='สู้')+card('ลอบผ่าน','ไม่ต้องสู้ แต่ศัตรูในโซนจะตื่นตัวเต็มที่',action='ลอบผ่าน')+para('ปิดหน้าต่างเพื่อเดินต่อ กลับมาตัดสินใจทีหลังได้','caption')
page('f-event','ด่านโจร',event,None,group='F',back='f-map-hud',kind='dialog')
# Draft is mandatory, so it intentionally has no dismiss action. Selection remains required.
# It is not part of the representative acceptance set and has no invented recruit/price.
draft=para('ทหารรับจ้างที่หนีภัยจากป้อมอื่นมาขอเข้าร่วมค่าย · เลือกคนที่ 1 จาก 2')
for e in soup('20-hire-board').select('.hire-list>li')[:2]:
 draft+=card(txt(e.b),txt(e.select_one('small')),e.select_one('.hero-art'),action='รับเข้าทีม')
page('f-draft','รับสมัครทหารรับจ้าง',draft,None,group='F',kind='mandatory')
p=P/'f-draft.html';p.write_text(re.sub(r'<a class="button icon-button close".*?</a>','',p.read_text()))

# G — current summary and rewards.
s=soup('47-run-summary');e=s.select_one('.summary-view');summary=''
for p in e.select('header p'):summary+=para(txt(p),'caption')
summary+='<div class="stats">'
for li in e.select('.summary-stats>li'):summary+='<div class="info-panel"><h3>'+esc(txt(li.b))+'</h3><small>'+esc(txt(li.small))+'</small></div>'
summary+='</div>'
for ul in e.select('.summary-body>ul:not(.summary-stats)'):
 for li in ul.find_all('li',recursive=False):summary+=card(txt(li.select_one('small')) or txt(li.select_one('b')),txt(li),li.select_one('.gear-art'))
if e.select_one('.summary-none'):summary+=panel(txt(e.select_one('.summary-none')))
page('g-summary',txt(e.select_one('h2')),summary,'47-run-summary',group='G',primary=('กลับค่าย','b-camp'),preserves=['summary-bottom-return'])
s=soup('55-battle-rewards');e=s.select_one('.battle-rewards');rewards=''
for li in e.select('.reward-members>li,.reward-resources>li,.reward-items>li'):rewards+=panel(txt(li))
page('g-rewards',txt(e.h2),rewards,'55-battle-rewards',group='G',sub='รางวัลการต่อสู้',primary=('ไปต่อ →','f-map-hud'))
page('g-defeat','ทีมล้มทั้งหมด',para('เก็บทรัพยากรได้ครึ่งเดียว · อุปกรณ์เก็บได้แค่ชิ้นที่ดีที่สุด · สมุนไพรหายไป · เลเวลยังอยู่'),None,group='G',primary=('กลับค่าย','b-camp'),preserves=['summary-bottom-return'])
# H — actual help text; disclosure and dialogs retain the same header geometry.
for id,n,title,sel in [('h-info','53-battle-menu','ข้อมูลการต่อสู้','#game-info'),('h-skill','51-battle-skill-help','คำอธิบายสกิล','#skill-popover')]:
 s=soup(n);e=s.select_one(sel)
 if e is None:e=s.select_one('dialog[open]') or s.select_one('[role="dialog"]')
 body=''
 if e:
  for d in e.select('details'):body+=fold(txt(d.summary),''.join(para(txt(p),'caption') for p in d.select('p')))
  for p in e.select('p'):
   if not p.find_parent('details'):body+=para(txt(p))
  if not body:body=panel(txt(e))
 page(id,title,body,n,group='H',back='h-battle-hud',kind='dialog')
# HUDs retain captured control anchors. Only the canvas is raster; every HUD label is live DOM.
for id,n,group,title in [('f-map-hud','40-map-hud','F','แผนที่เดินทาง'),('h-battle-hud','50-battle','H','HUD ต่อสู้')]:
 for variant in ['r1','r2-q4']:
  hud=''
  for w,h in [[390,844],[390,650],[320,568]]:
   size=f'{w}x{h}';data=json.loads((D/'before'/size/f'{n}-geometry.json').read_text());content=f'<img src="../before/{size}/{n}-scene.png" alt="ฉากจริงจากฐาน dd99b38d ไม่มี HUD"/>'
   count=0
   def place(x,y,ww,hh):
    global count
    count+=1;key=f'geo-{id}-{size}-{count}'
    art_rules.append('.'+key+'{'+f'--hud-x:{x:g}px;--hud-y:{y:g}px;--hud-w:{ww:g}px;--hud-h:{hh:g}px'+'}')
    return key
   for e in data['texts']:
    t=e['text'];cl=e['parent']
    if n=='50-battle' and cl not in ['beat-chip','turn-title','queue-hint','turn-speed','field-unit-name','field-hp-value']:continue
    if e['x']<0 or e['x']>=w or e['y']>=h:continue
    font=max(e['px'],12);ww=min(w-e['x'],max(e['w']*font/e['px']+8,32));hh=max(e['h'],18)
    if len(t)>20:ww=min(w-e['x'],max(ww,200))
    if cl=='field-unit-name':ww=min(w-e['x'],max(ww,100));hh=36
    cls=place(e['x'],e['y'],ww,hh)
    numeric=' numeric' if re.fullmatch(r'[\d/% .]+',t) else ''
    content+=f'<span class="hud-label{numeric} {cls}">{esc(t)}</span>'
   if n=='50-battle':
    # Intent panel anchor from the source, with local text reflow at 12px.
    intent=[t for t in data['texts'] if t['parent']=='' and t['y']>h*.65 and t['y']<h*.78 and (t['text'] in ['→','เอกิส','เปลวดาว · พลังงาน','13'] or t['text'].startswith('Lv10 วิญญาณ'))]
    if intent:
     first=intent[0];content+=f'<span class="hud-label {place(first["x"],first["y"],w-first["x"]-64,36)}">'+esc(' '.join(t['text'] for t in intent if t['px']!=19))+'</span>'
   for i,e in enumerate(data['buttons']):
    if e['x']<0 or e['x']+e['w']>w+1 or e['y']+e['h']>h+1:continue
    ar=e.get('aria') or '';t=e.get('text','').strip();href=None
    if n=='40-map-hud':
     if 'เลือด' in ar:
      m=re.match(r'(.+?) (\d) ดาว เลเวล (\d+) เลือด (\d+) จาก (\d+) ความล้า (\d+)',ar)
      if m:t=f'{m[1]}'+(f' ★{m[2]}' if int(m[2])>1 else '')+f'\n{m[4]}/{m[5]}\nล้า {m[6]}'
      href='d-overview'
     elif 'เดิน' in ar and not t:t={'เดินขึ้น':'↑','เดินซ้าย':'‹','เดินขวา':'›','เดินลง':'↓'}.get(ar,'ⓘ')
     elif 'กระเป๋า' in ar:t='กระเป๋า\nแร่ดาว 0';href='f-pack'
     elif 'เป้าหมาย' in ar:t='ไปถึงแคมป์ · 1/5'
     elif 'ข้อมูล' in ar:t='ⓘ';href='h-info'
     elif 'ทางเข้าด่าน' in ar:t='ทางออก';href='f-entrance'
    else:
     if 'SPD' in ar:t='';
     elif 'ใช้โจมตี' in ar:t='';
     elif 'HP' in t:
      name=re.search(r'(?:FRONT|BACK)\s*.*?(เอกิส|ไลรา|ไอรา|เซเรน|เคล)HP\s*([\d /]+)',t)
      if name:t=f'{name[1]}\n{name[2].strip()}'
     elif t.startswith('1'):t='โจมตี\nพลัง 20'
     elif t.startswith('2'):t='ติดตรา\nโบนัส +22'
     elif t.startswith('3'):t='ฟันเจาะจุด\nพลัง 36'
     if 'คำอธิบาย' in ar:href='h-skill'
     elif 'ข้อมูล' in ar:href='h-info'
    cls=place(e['x'],e['y'],e['w'],e['h']);label=esc(ar or t or 'ดูข้อมูล');text_html='<span class="hud-readout">'+''.join(('<span class="numeric">'+esc(line)+'</span>' if re.fullmatch(r'[\d/% .]+',line) else esc(line))+'<br>' for line in t.split('\n')).removesuffix('<br>')+'</span>' if t else ''
    if n=='40-map-hud' and 'เลือด' in ar:
     bs=BeautifulSoup(e['html'],'html.parser');text_html=art(bs.select_one('.portrait'))+text_html;cls+=' hud-party'
    if n=='50-battle' and e['text'].strip().startswith(('1โจมตี','2ติดตรา','3ฟันเจาะจุด')):cls+=' hud-command'
    # Queue portraits keep their original atlas art, read from captured button markup.
    bs=BeautifulSoup(e['html'],'html.parser');portrait_el=bs.select_one('.portrait')
    if not t and portrait_el:text_html=''  # Original portrait is in unchanged scene context; overlay is only a hit target.
    tag='a' if href else 'button';attrs=f'href="{href}.html"' if href else 'type="button"'
    content+=f'<{tag} {attrs} class="button hud-control {cls}" data-original="{e['x']},{e['y']},{e['w']},{e['h']}" aria-label="{label}">{text_html}</{tag}>'
   if n=='40-map-hud':
    original=json.loads((D/'before'/size/f'{n}.json').read_text())
    for e in original['texts']:
     if e['cls']=='world-talent-badge' and e['w']>0:content+=f'<span class="hud-label {place(e["x"],e["y"],min(36,w-e["x"]),18)}">+แต้ม</span>'
   if n=='50-battle':
    for e in data['texts']:
     if e['text']=='13':content+=f'<span class="hud-label hud-power {place(e["x"],e["y"],32,30)}">13</span>'
     if e['text']=='พลังโจมตี':content+=f'<span class="hud-label {place(w-56,e["y"],56,18)}">พลังโจมตี</span>'
   hud+=f'<div class="hud-scene" data-size="{size}" hidden>{content}</div>'
  pid=id if variant=='r1' else id+'-r2-q4'
  write_page(pid,title,f'<main id="app" class="{variant}">{hud}</main><script src="../preview.js"></script>')
  pages.append(dict(id=pid,title=title,source=n,group=group,variant=variant,sizes=[[390,844],[390,650],[320,568]],kind='hud',back=False,primary=False,preserves=['hud-anchors','battle-team-commands'] if group=='H' else ['hud-anchors']))
# Camp context: original painted composition and NPC positions remain unchanged; DOM nav overlays original nav.
camp='<div class="hud-scene">'
for w,h in [[390,844],[390,650],[320,568]]:camp+=f'<img data-size="{w}x{h}" hidden src="../before/{w}x{h}/11-camp.png" alt="ฉากค่ายและ NPC เดิม"/>'
camp+='</div>'+nav()
write_page('b-camp','ค่ายทหารรับจ้าง',f'<main id="app">{camp}</main><script src="../preview.js"></script>')
pages.append(dict(id='b-camp',title='ค่ายทหารรับจ้าง',source='11-camp',group='B',variant='r1',sizes=[[390,844],[390,650],[320,568]],kind='context',back=False,primary=False,preserves=['camp-scene-npcs-nav']))

# R2 all four questions together, plus isolated question variants to avoid conflating choices.
for id,spec in [('c-brew',brew_spec),('e-craft-review',review_spec)]:
 for v in ['all','q1','q2','q3','q4']:
  page(id+'-r2-'+v,**spec,variant='r2-'+v)
# Shared component states; only literal numbers in token definitions.
components=f'''<main class="gallery"><header><small>ASTER VEIL · FATEWEAVE / ART-UI-LANGUAGE-001</small><h1>ภาษาภาพร่วม · Luminous Veil</h1><p>R1 · ตัวอักษรขั้นต่ำ 12px · DOM/CSS อ้างอิงสำหรับเจ้าของเลือกแบบ</p></header><div class="gallery-grid">
<section class="info-panel"><h2>01 / หัวหน้าต่างและแท็บ</h2><header class="window-head has-back"><button class="icon-button back" aria-label="ย้อนกลับ">‹</button><div class="title-block"><h1>ตรวจรายการสร้างอาวุธ</h1><small>อัศวิน · เอกิส · Lv3</small></div><button class="icon-button close" aria-label="ปิด">×</button></header>{dtabs('d-overview')}</section>
<section class="info-panel"><h2>02 / การ์ดรายการ</h2>{card('ยาฟื้นแผล','ฟื้นเลือด 40% ให้สมาชิกที่ยังยืนอยู่ 1 คน',pick('26-brew','.potion-art'),'แร่ 6 · ผง 2','ปรุง')}{card('ดาบอัศวินดี','Lv3 · ดี · คุณภาพ 100%',pick('29-forge-craft-review','.gear-art'),action='ดู/เปรียบเทียบ')}</section>
<section class="info-panel"><h2>03 / ปุ่มและสถานะ</h2><small>ปกติ</small>{button('ยืนยันสร้างอาวุธ 1 ชิ้น','primary')}<small>กด</small>{button('ปรุง','secondary demo-pressed')}<small>โฟกัส</small>{button('ปรุง','secondary demo-focus')}<small>ปิดใช้พร้อมเหตุผล</small>{button('ปรุง','secondary',extra='disabled aria-describedby="why"')}<small id="why">แร่ดาวไม่พอ</small><small>กำลังทำ</small>{button('กำลังทำ','secondary',extra='disabled aria-busy="true"')}{button('ถอนตัว','danger')}<p class="receipt" role="status">บันทึกผลอัปดาวแล้ว</p></section>
<section class="info-panel review"><h2>04 / ราคาและ ledger</h2>{ledger(pick('29-forge-craft-review','#forge-cost'))}<small>ผลที่รับประกัน · ไม่สุ่ม</small></section>
<section class="info-panel"><h2>05 / ป้ายและแถบพับ</h2><div class="row"><span class="badge count">5+3</span><span class="badge notice">✓ มีของให้รับ</span><span class="badge locked">ล็อก · ยังไม่ปลดสกิลนี้</span></div>{fold('จัดการคลัง · รีไซเคิล · ขยาย',para('เลือกหลายชิ้นเพื่อรีไซเคิล'))}{fold('เฟิร์น · ข่าว',para('พกไปได้อย่างละสามขวดนะ อย่าลืม'))}</section>
<section class="info-panel"><h2>06–08 / พื้นทึบและตัวอักษร</h2>{panel('เลือดพร้อมออกเดินทาง 109/109')}<h2>หัวเรื่อง · Kanit 20</h2><h3>ป้าย · Kanit 16</h3><p>เนื้อหา · Noto Sans Thai 14</p><small>ข้อความรอง 12 · เลขตาราง 12 · 640 / 30 / 610</small><p class="receipt">✓ บันทึกผลแล้ว</p></section></div></main>'''
components=re.sub(r'href="([^"/]+)\.html"',r'href="prototypes/\1.html"',components)
(D/'components.html').write_text('<!doctype html><html lang="th"><meta charset="utf-8"><title>Components · Fateweave</title><link rel="stylesheet" href="components.css"><body>'+components+'</body></html>')
(D/'art-tokens.css').write_text('/* Asset coordinates extracted from real captured markup; no new artwork. */\n'+'\n'.join(art_rules)+'\n')
(D/'pages.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2)+'\n')
print('Built',len(pages),'pages;',len(arts),'existing art crops')
# Build the complete 55-surface migration map from the audited selectors, not a hand-counted list.
audit=json.loads((R/'docs/validation/ui-language-audit-2026-11-05/surfaces.json').read_text())['perSurface']['390x844']
css_files=list((R/'src/ui').glob('*.css'))
rows=[]
for name,e in audit.items():
 selectors=[]
 for key in ['close','back','primary']:
  for v in e.get(key,[]):
   if v.get('sel'):selectors.append(v['sel'])
 if e.get('title',{}):selectors.append(e['title'].get('sel',''))
 root_sel='.lobby-sheet' if name[0:2] in ['13','14','15','20','21','22','23','24','25','26','27','28','29','30','31','32'] else '.character-dialog' if 'character' in name or 'star' in name or 'trainer' in name else '.summary-view' if 'summary' in name else '.battle-rewards' if 'rewards' in name else '.world-dialog' if name.startswith(('41','42','43','44','45','46')) else '#app'
 probe=selectors+[root_sel];hits=[]
 for f in css_files:
  content=f.read_text()
  if any((re.search(r'[#.]([\w-]+)',sel) and re.search(r'[#.]([\w-]+)',sel)[0] in content) for sel in probe):hits.append(f.name)
 # Keep mapping precise but scannable; list the root owner's styles first.
 preferred=['lobby-scene.css','styles.css','portrait.css','team-navigation.css'] if root_sel=='.lobby-sheet' else ['skills.css','star-upgrade.css','team-navigation.css','world.css'] if root_sel=='.character-dialog' else ['world.css','battle-skin.css','styles.css','portrait.css']
 hits=sorted(set(hits),key=lambda n:(n not in preferred,n))
 if name.startswith(('01','02','03','04','10')):target='A คงโครงภาพเต็มจอ; ใช้สเกลอักษร/ปุ่มร่วม'
 elif name.startswith(('11','12','49')):target='B คงฉาก/NPC/nav; แผ่นข้อมูลทึบ + ป้ายจำนวน/ชื่อทรัพยากร'
 elif root_sel=='.character-dialog':target='D หัว/แท็บ + การ์ด/แถบพับ; star → review + ledger'
 elif name.startswith(('27','28','29','30')):target='E หัว + การ์ดงาน/อุปกรณ์ + review/ledger; คงรับประกัน/สุ่ม'
 elif name.startswith(('40',)):target='F HUD คงจุดยึด; เปลี่ยนเฉพาะอักษร/ป้าย'
 elif name.startswith(('41','42','43','44','45','46')):target='F ไดอะล็อก + หัว/แท็บ/แถบพับ; คงยืนยันถอนตัว'
 elif name.startswith(('47','48','54','55')):target='G หัว + แผ่นผลลัพธ์ + dock กลับค่าย/ไปต่อ'
 elif name.startswith(('50','52')):target='H HUD คงจุดยึด; เปลี่ยนเฉพาะอักษร/ป้าย'
 elif name.startswith(('51','53')):target='H ไดอะล็อก/คำอธิบาย + หัว + แถบพับ'
 else:target='C หัว/แท็บ + การ์ด + ราคา + ป้าย + แถบพับ'
 rows.append('| '+name+' | '+e['group']+' | `'+root_sel+'`; '+', '.join('`'+s+'`' for s in dict.fromkeys(selectors[:3]))+' | '+', '.join('`src/ui/'+f+'`' for f in hits[:4])+' | '+target+' |')
intro='''# ART-UI-LANGUAGE-001 · สเปกภาษาภาพร่วม

ออกแบบอ้างอิง DOM/CSS เท่านั้น · ฐาน `dd99b38d` (รวม #166 #167 #168 #170) · 5 พฤศจิกายน 2026
การเลือก Q1–Q4 เป็นของเจ้าของ ผล verify ไม่ใช่การอนุมัติภาพ ไม่มีการนำเข้าเกมในชุดนี้

## ทิศทางและแหล่งข้อมูล

Luminous Veil: navy ทึบอ่านง่าย ภาพเดิมเป็นบริบทของเกม ทองระบุการกระทำหลัก/การจ่าย ฟ้าระบุการเลือกและโฟกัส
ใช้ `src/ui/tokens.css` เป็นแหล่งสี ฟอนต์ ระยะ รัศมี และเงา; `tokens-proposal.css` เพิ่มชื่อสำหรับ geometry ที่ขาดโดยไม่เปลี่ยน token เดิม
ภาพ/ตัวอักษรนำมาจากเกมนี้เท่านั้น ไม่มี image generation หรือ artwork ใหม่

อ่าน brief ทั้งฉบับ, README_TH หลักฐาน, surfaces.json, CLAUDE.md, AGENTS.md, UI_INPUT_RULES.md, ANIMATION_PROMPT_QUALITY_TH.md,
CSS/DOM ของ lobby, forge-workbench, character/skills/star, world, summary, rewards, battle และทิศทาง ART-UI-MODERN-001 / ART-UI-WORLD-001
รวมทั้งรายงาน UX 4 พ.ย. บน `origin/codex/ux-ui-audit-2026-11-04` โดยไม่ merge สาขานั้น
ข้อ #8–10 และสิ่งที่ควรรักษานำมาใช้กับสเกลอักษร ชื่อทรัพยากร และโครงร่วม

## โครงมาตรฐานและจุดยึด

วัดจากขอบ `#app` เป็น CSS px ไม่ใช่พิกเซลของ PNG; PNG = DPR 2

| โครง | จุดยึด / พื้นที่ | การเลื่อนและการกระทำ |
|---|---|---|
| แผ่นบริการเต็มจอ | `--ui-max` 480; `--ui-head` 96; หัวเริ่ม x16 หรือ x68 เมื่อมีย้อนกลับ | `.scroll` เลื่อนภายใน; ไม่มีกรอบซ้าย/ขวา; R1 ไม่มี nav เหนือแผ่น |
| review/ยืนยัน | หัวเหมือนแผ่นบริการ; ledger อยู่ในเนื้อหา ไม่ขยาย dock | dock สูง80; ปุ่มหลัก h48, y=H−64, ขอบล่าง16; กลับไปแก้ไขเป็นรอง |
| ไดอะล็อกแผนที่/ต่อสู้ | ใช้หัวและจุดยึดเดียวกัน; `.dialog` ใช้ `--panel-bg` เหนือฉาก | เลื่อนเนื้อหาแยก; Escape/คืน focus เป็นสัญญาสำหรับ integration ไม่ใช่เพิ่มขั้นยืนยัน |

ปิด: x=W−56, y12, 44×44 วงกลม; ย้อนกลับ: x12, y12, 44×44 วงกลม
หัวชิดซ้าย x16 (ไม่มี back) หรือ x68 (มี back), y16; ช่องท้ายเว้น68 ป้องกันทับปิด
หัวคง96 เพื่อรองรับ “ตรวจรายการสร้างอาวุธ” สองบรรทัดที่320px พร้อมคำรอง
แท็บอยู่ใต้หัวอย่างเดียว: หน้าต่างตัวละคร/ป้ายจ้าง/กระเป๋าใช้ grammar เดียวกัน
ทุกหน้ากว้าง320px ใช้ gutter16; พื้นที่เนื้อหา288px; ledger มีพื้นที่ชื่อ28% และคอลัมน์ตัวเลข4ช่อง
ความสูง/ตำแหน่ง dock คงที่ในแต่ละ viewport; หน้าที่เป็นการกระทำในการ์ด (เช่นปรุงยา/เควสต์) ไม่มี dock เปล่า

## component 1–8 และสถานะ

| # | โครงและ token | สถานะ / สัญญา |
|---|---|---|
| 1 หัว + แท็บ | `.window-head`, `.title-block`, `.close`, `.back`, `.tabs`; `--ui-head`, `--ui-title`, `--touch-min`, `--space-3/4`, `--radius-pill` | หัวคงที่; ข้อความไทยห่อบรรทัดได้; active tab มีข้อความและ cyan; ปิด/ย้อนกลับคืน focus ในเกมจริง |
| 2 การ์ดรายการ | `.card`: art56 + copy; แถวราคา/การกระทำด้านล่าง; `--space-3`, `--radius-md`, `--navy-800`; `.dense` ใช้ `--space-2` | ปกติ/เลือก/cyan + ข้อความ; หนึ่ง action; งานรองอยู่ “เพิ่มเติม”; รูปไม่เปลี่ยนตาม rarity |
| 3 ปุ่มหลัก/รอง/อันตราย | primary h48, `--radius-sm`, `--primary-fill`, `--font-heading`, `--type-body`, `--button-shadow`; รอง `--secondary-fill`; อันตราย `--danger-panel` + `--danger-coral` | ปกติ/กด/โฟกัส/ปิดใช้พร้อมเหตุผล/กำลังทำ/สำเร็จ; ปิดใช้ด้วย disabled จริง ไม่มีลด opacity จนอ่านไม่ได้; หนึ่ง primary ที่เปิดใช้ในช่วงที่เห็น |
| 4 ราคา / ledger | `.price`, `.ledger`; หน่วย/มี/ใช้/ได้รับ/หลังทำ; `--type-caption`, tabular-nums; สีเดิมจาก token | แยกยอดก่อนจ่าย/receipt; star เติมคอลัมน์ได้รับ0เพราะไม่มีรับทรัพยากร ไม่ใช่เพิ่มรางวัล; ค่าอื่นตรง DOM |
| 5 ป้าย | `.badge.count` pill + เลข; `.notice` มุม6 + ✓/ข้อความ; `.locked` มุม6 + เหตุผล | จำนวนไม่ใช้แทนแจ้งเตือน; สีมีข้อความ/รูปทรงคู่เสมอ; ขาด/เต็มไม่ซ่อนเหตุผล |
| 6 แถบพับ | `details.fold > summary + .stack`; `--touch-min`, `--space-3`, `--radius-sm`, `--navy-900` | ข่าว NPC/จัดการคลัง/ตัวกรอง/คำอธิบายยาว; คีย์บอร์ดเปิดได้; ไม่มีขั้นจ่ายใหม่ |
| 7 แผ่นข้อมูลทึบ | `.info-panel`, `.hud-label`, `.receipt`; `--navy-900/950`, `--hud-shadow`, `--text/text-muted` | แผ่นเล็กอยู่หลังข้อความบนภาพ; HUD เก็บ anchor เดิมจาก geometry.json; success มีข้อความบันทึกผล ไม่แต่งยอด |
| 8 ตัวอักษร | หัว20 Kanit600; ป้าย16; เนื้อหา14 Noto; รอง/ตาราง/HUD12; line-height1.45 (หัว1.2) | R1 ขั้นต่ำ12ทั้ง DOM; R2 Q4 เฉพาะป้ายตัวเลขล้วน11; ชื่อ/ข้อความกติกาไม่ลด |

`components.html` แสดงทั้ง6สถานะ รวม disabled พร้อมเหตุผล, busy, receipt; ต้นแบบเป็น static gallery ไม่จำลองการจ่ายหรือเขียนเซฟ
ภาพอุปกรณ์/ยา/ตัวละครตัดจาก atlas เดิมด้วย CSS เท่านั้น; `art-tokens.css` เก็บตำแหน่ง crop ที่อ่านจาก markup ไม่ใช่ semantic token ใหม่
ฟอนต์อ้างไฟล์เดิม `public/assets/fonts` โดยตรง ไม่คัดลอกฟอนต์
motion ใช้ `--sheet-ms`180ms ease เมื่อ integration เปิดแผ่น; แกลเลอรีคงนิ่ง ไม่มีแอนิเมชันใหม่
reduced-motion ไม่มีการเคลื่อนไหว; focus outline3px offset3px ใช้ `--focus`

## R1/R2 ที่เจ้าของเลือก

R1: แผ่นเต็มจอ/ซ่อน nav, หัวชิดซ้าย, ทองเฉพาะ review ledger/ปุ่มหลัก, DOMขั้นต่ำ12
R2 `-r2-all`: ทุกข้อพร้อมกัน; `-r2-q1…q4`: แยกทีละคำถามเพื่อดูสาเหตุของความต่าง
ปรุงยาและ review สร้างอาวุธมี R2 ที่390×844และ320×568ครบ
Q1 ลดพื้นที่แผ่นลง72pxเพื่อคง nav; จุดยึดหัวเดิม แต่ dock ยกขึ้น72pxตามขอบแผ่น เป็นความต่างที่ตั้งใจจาก R1
Q2 เปลี่ยนเฉพาะ alignment หัว; Q3 ไม่มีเส้นทองที่ ledger/หัวตาราง แต่คงปุ่มทอง
Q4 ไม่มีป้าย HUD บนปรุงยา/review จึงหน้าตาเท่าR1เมื่อแยกข้อนี้ — ห้ามสร้างป้ายตัวเลขแปลกปลอมขึ้นมาให้ต่าง
มี `f-map-hud-r2-q4` และ `h-battle-hud-r2-q4` เพิ่มเพื่อให้เห็นผล11/12จริงที่ทั้ง3ขนาด

## ข้อมูลจริงและสิ่งที่คงไว้

- ปรุงยา: ยาฟื้นแผลแร่6/ผง2; ฟื้นหมู่10/4; ไล่อสูร8/3; ฟื้นความเหนื่อย8/2; ขวด3/2/1/1 ตาม fixture audit
- review สร้างอาวุธ: ดาบอัศวินดี Lv3 คุณภาพ100%; แร่640−30=610; ฝุ่น120−6=114; คลัง6/90; รับ1ชิ้น ไม่สวมอัตโนมัติ **ผลรับประกัน ไม่สุ่ม**
- ไม่เพิ่มผลสุ่มในงาน craft ที่ไม่มี RNG; งานสุ่มคุณสมบัติในเกมจริงต้องแยกผลสุ่มและห้ามใช้ผล preview เป็นผลบันทึก
- อัปดาว: ตัวซ้ำ4−3=1; ตรา3−0=3; แร่640−70=570; เลือด109→115; attack14→15; SPD80→80; ข้อความใช้ตัวซ้ำของคนนี้คงอยู่
- หน้าสร้างพร้อมทำจากภาพก่อนเป็นLv1 ส่วน review เป็นLv3ตาม audit แต่ละหน้าเป็นตัวอย่างอิสระ ไม่ใช่การจำลอง flow ที่เปลี่ยนยอดเอง
- ถอนตัวมีสถานะก่อนยืนยัน/ยืนยันเดิมสองสถานะ ไม่เพิ่มขั้น; สรุปเดินทางและทีมล้มมีปุ่มกลับค่ายติดล่าง
- เควสต์คงการ์ดและปุ่มรับในการ์ด; หน้าค่ายเป็นบริบทภาพเดิมและ nav เดิม6ตำแหน่ง ไม่ออกแบบฉาก/NPC ใหม่
- HUD map/battle ใช้ภาพฉากจากเกมโดยเอาตัวอักษรออกก่อน แล้วซ้อนข้อความ DOM + hit target ที่ anchor เดิม; ไม่ใช้ PNG เหล่านี้เป็น UI runtime
- draft ไม่มีปิดตาม `world-ui.ts` (mandatory choice); แสดงโครง first pick จาก poolจริง lio/brann/sefa/toma ไม่แต่งราคา/HP/SPD
- event/draft/ทีมล้มไม่มีภาพก่อนใน audit; ช่องbeforeระบุชัดว่าไม่มีภาพก่อน ใช้โครง/ข้อความจาก world-ui.ts/th.ts/summary-ui.ts
- ภาพก่อนDPR2จับใหม่จากฐานที่ merge ครบ ไม่ใช่นำภาพDPR1มาขยาย

## การตรวจและขอบเขตผล

`render.cjs` export ทุกหน้าและภาพbefore-after ป้ายชื่ออยู่นอกกรอบเกม; `verify.cjs` ตรวจเกณฑ์1–10จาก DOM/computed style แบบ topmost,
พื้นที่แตะ/โฟกัสจริง, statesเลื่อนบน/กลาง/ล่างและแถบพับเปิด, literal CSS, style families, ภาพ/ฟอนต์โหลด และ preservation manifest
contrast ใช้ภาพ Chromium ที่ซ่อนตัวอักษรแล้ว sample พื้นจริงใต้แต่ละบรรทัดผ่าน Pillow 3จุด/บรรทัด ไม่ใช่ประเมินด้วยตา
ตรวจเฉพาะจุดตัวอย่างที่ระบุในverification.json; ผลไม่ครอบคลุมทุกpixelบนทุกฉากของเกมจริง
R1 ใช้เกณฑ์10ข้อเต็ม; R2 รายงานgeometry/style/contrastแยกพร้อมความต่างที่ตั้งใจ ไม่เอาQ1/Q4มาปนเกณฑ์R1
ผลตรวจเทคนิคไม่ใช่การทดสอบผู้เล่น ไม่มีSafari/iPhone/Androidจริง ไม่มีการรับรองscreen readerหรือtext zoom200%

## ตารางนำเข้าครบ55ผิวหน้า

selector มาจาก audit computed DOM; ไฟล์ CSS ระบุจากการค้น selector จริงในฐาน เพื่อให้ผู้ integrate ตรวจจุดที่จะย้ายมาใช้ component ร่วม
A/B/HUD ตั้งใจคงโครง ไม่บังคับเป็นหน้าต่างบริการ; ตารางนี้เป็นแผนนำเข้า ไม่ใช่การแก้ไฟล์เหล่านั้นใน PR นี้

| ผิวหน้าเดิม | กลุ่ม audit | selector เดิมที่จะย้าย/รักษา | ไฟล์ CSS ปัจจุบัน | component ใหม่ / ข้อยกเว้น |
|---|---|---|---|---|
'''
end='''
## ลำดับนำเข้าที่เสนอ (Claude หลังเจ้าของเลือก)

1. บันทึกคำเลือก Q1–Q4 ของเจ้าของเอง; เพิ่ม token geometry โดยไม่เปลี่ยน token เดิม แล้วทำหัว/ปุ่ม/สเกลอักษร
2. C บริการ: ปรุงยา → จ้าง/ตลาด → คลัง/ทีม/เควสต์; รักษา actual state/action และชื่อทรัพยากร
3. E งานช่าง: การ์ดงาน → พร้อมทำ → review/ledger → receipt; รักษา stale/repeat guard และส่วนสุ่ม
4. D ตัวละคร: หัว/แท็บ → ภาพรวม/สกิล → star review/receipt; ไม่ใช้สมาชิกอื่นเป็นวัตถุดิบ
5. F/G/H ไดอะล็อก สรุป รางวัล และสเกล HUD; คงตำแหน่ง HUD/ฉาก/คำสั่ง/ขั้นถอนตัว
6. PR แยกต่อกลุ่ม รัน audit ก่อน/หลังบนทั้ง3ขนาดและ gameplay browser checks; เจ้าของตรวจ390pxก่อนขยาย

ไม่ merge สาขา art ทั้งก้อนเข้าเกม; ย้าย DOM/CSS ตามจริง ไม่ใช้ PNG เป็นแผง
งานนี้ไม่แก้ src/tests/public/.github หรือ docs เดิม; บันทึกส่งต่ออยู่ใน NOTES.md แทนเพราะขอบเขตเฉพาะincomingจากคำสั่งผู้ใช้มีลำดับเหนือกว่ากฎบันทึกทั่วไป
'''
(D/'SPEC_TH.md').write_text(intro+'\n'.join(rows)+'\n'+end)
# Portable gallery, grouped by game surface and decision variant.
groups=[]
for group in ['B','C','D','E','F','G','H']:
 links=''.join(f'<li><a href="prototypes/{p["id"]}.html">{esc(p["title"])} · {p["variant"]}</a><small>{p["id"]}</small></li>' for p in pages if p['group']==group)
 groups.append(f'<section class="info-panel"><h2>กลุ่ม {group}</h2><ul class="stack">{links}</ul></section>')
(D/'index.html').write_text('<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ART-UI-LANGUAGE-001 · Gallery</title><link rel="stylesheet" href="components.css"><body><main class="gallery"><header><h1>ภาษาภาพร่วม · Fateweave</h1><p>งานออกแบบอ้างอิง · R1/R2 สำหรับเจ้าของเลือก · ไม่มีการจ่ายหรือเปลี่ยนเซฟ</p><nav><a href="components.html">Component 8 ชิ้นและสถานะ</a><a href="export/r1-r2/c-brew-r2-all-390x844.png">เทียบ R1/R2 ปรุงยา</a><a href="export/r1-r2/e-craft-review-r2-all-390x844.png">เทียบ R1/R2 review</a><a href="SPEC_TH.md">สเปกภาษาไทย</a><a href="verification.json">ผลวัดเกณฑ์ 1–10</a></nav></header><div class="gallery-grid">'+''.join(groups)+'</div></main></body></html>')
