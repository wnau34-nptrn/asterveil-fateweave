# Executed by build_handoff.py with its shared component helpers.
def build_native_huds():
 for id,n,group,title in [('f-map-hud','40-map-hud','F','แผนที่เดินทาง'),('h-battle-hud','50-battle','H','HUD ต่อสู้')]:
  source=soup(n)
  for variant in ['r1','r2-q4']:
   stages=[]
   for w,h in [[390,844],[390,650],[320,568]]:
    size=f'{w}x{h}';model=json.loads((D/'before'/size/f'{n}-model.json').read_text());geo=json.loads((D/'before'/size/f'{n}-geometry.json').read_text());bodies=model['characters'];seq=0
    def place(role,r):
     nonlocal seq
     seq+=1;cls=f'native-{id}-{size}-{seq}'
     art_rules.append('.'+cls+'{'+f'--hud-x:{r["x"]:g}px;--hud-y:{r["y"]:g}px;--hud-w:{r["w"]:g}px;--hud-h:{r["h"]:g}px'+'}')
     return 'hud-block '+role+' '+cls
    def rect(x,y,ww,hh):return dict(x=x,y=y,w=ww,h=hh)
    def orig(r):return f'data-original="{r["x"]},{r["y"]},{r["w"]},{r["h"]}"'
    content=f'<img class="scene-plate" src="../before/{size}/{n}-scene.png" alt="ฉากจากเกม ไม่มี HUD หรือข้อความ baked-in"/>'
    if n=='50-battle':
     content+=f'<header class="{place("battle-heading",rect(12,0,w-24,44))}"><span class="round-chip">รอบ <span class="numeric">1</span></span><b>เทิร์นของคุณ · ไลรา</b><a class="button hud-info" href="h-info.html" aria-label="ข้อมูลการต่อสู้">{line_icon("info")}</a></header>'
     queue=''
     for e in source.select('#turn-order li'):
      aria=e.button.get('aria-label','');speed=txt(e.select_one('.turn-speed'))
      queue+=f'<li class="queue-slot"><button class="queue-icon" aria-label="{esc(aria)}">{art(e.select_one(".portrait"))}<span class="queue-speed numeric">{esc(speed)}</span></button></li>'
     content+=f'<section class="{place("hud-queue painted-surface",model["regions"]["#turn-phase"])}"><div class="queue-caption">คิว <span class="numeric">8</span> · เลื่อนดู {line_icon("right")}</div><ol class="queue-items">{queue}</ol></section>'
     # Place health at the feet; names use free space around their own actor, never over another figure.
     def intersects(a,b):return a['x']<b['x']+b['w'] and a['x']+a['w']>b['x'] and a['y']<b['y']+b['h'] and a['y']+a['h']>b['y']
     health=[]
     for e in model['enemyHealth']:
      actor=next(a for a in bodies if a['id']==e['id']);ww=max(e['w'],44);r=rect(min(e['x'],w-8-ww),max(e['y'],actor['y']+actor['h']+2),ww,22)
      for _ in range(8):
       hit=next((b for b in bodies if intersects(r,b)),None)
       if not hit:break
       r['y']=hit['y']+hit['h']+2
      health.append(r)
      content+=f'<div class="{place("field-health painted-surface",r)}" aria-label="HP {esc(e["hp"])}"><span class="numeric">{esc(e["hp"])}</span><span class="hp-track"><i></i></span></div>'
     placed=[]
     for e,owner in zip(model['enemyLabels'],model['enemyHealth']):
      actor=next(a for a in bodies if a['id']==owner['id']);original=rect(e['x'],min(e['y'],actor['y']-22),e['w'],20);adjusted=dict(original)
      for other in bodies:
       if intersects(adjusted,other):adjusted['x']=other['x']+other['w']+2
      adjusted['w']=min(adjusted['w'],w-8-adjusted['x'])
      candidates=[adjusted,rect(actor['x']+actor['w']+4,actor['y']+4,min(e['w'],w-8-actor['x']-actor['w']-4),20),rect(actor['x'],actor['y']-22,e['w'],20)]
      r=next((c for c in candidates if c['w']>=44 and c['x']>=8 and c['x']+c['w']<=w-8 and not any(intersects(c,o) for o in bodies+health+placed)),None)
      if r is None:raise ValueError(('No safe name label position',size,e))
      placed.append(r)
      content+=f'<span class="{place("field-name painted-surface",r)}" title="{esc(e["name"])}" data-allow-ellipsis="true">{esc(e["name"])}</span>'
     intent=f'<div class="intent-copy"><strong>Lv10 วิญญาณรอยแยก → เอกิส</strong><small>เปลวดาว · พลังงาน · ถึงแนวหลังได้</small></div><div class="intent-power"><strong>13</strong><small>พลังโจมตี</small></div>'
     content+=f'<section class="{place("hud-intent painted-surface",model["regions"]["#intent"])}" aria-label="เจตนาศัตรู">{intent}</section>'
     heroes=''
     for e in source.select('#party .hero-card'):
      name=txt(e.select_one('.hero-copy>strong'));hp=re.sub(r'\s+','',txt(e.select_one('.hp-amount')).replace('HP',''));selected=e.get('aria-pressed')=='true'
      heroes+=f'<button class="team-mini {"selected" if selected else ""}" aria-label="{esc(name+" HP "+hp)}"><b>{esc(name)}</b><span class="numeric">{esc(hp)}</span><span class="hp-track"><i></i></span></button>'
     content+=f'<section class="{place("hud-roster",model["regions"]["#party"])}" aria-label="ทีมของคุณ">{heroes}</section>'
     # Actual command/hit target rectangles, without any screenshot-painted backing.
     for e in geo['buttons']:
      t=e.get('text','').strip();ar=e.get('aria') or ''
      if t.startswith(('1โจมตี','2ติดตรา','3ฟันเจาะจุด')):
       i=int(t[0]);label=['โจมตี','ติดตรา','ฟันเจาะจุด'][i-1];metric=['พลัง 20','โบนัส +22','พลัง 36'][i-1];icon_name=['attack','mark','precision-strike'][i-1]
       content+=f'<button class="{place("hud-command native-command"+(" selected" if i==1 else ""),e)}" {orig(e)} aria-label="{esc(label+" "+metric)}"><span class="command-key numeric">{i}</span>{line_icon(icon_name)}<strong>{label}</strong><span class="command-metric">{metric}</span></button>'
      elif 'ใช้โจมตี' in ar:
       content+=f'<button class="{place("field-hit",e)}" {orig(e)} aria-label="{esc(ar)}"></button>'
     info=next(e for e in geo['buttons'] if 'คำอธิบายสกิล' in (e.get('aria') or ''))
     content+=f'<a class="button {place("hud-help",info)}" href="h-skill.html" aria-label="คำอธิบายสกิล">{line_icon("info")}</a>'
    else:
     reg=model['regions'];loc=reg['.hud-location'];content+=f'<section class="{place("map-location painted-surface",loc)}">{line_icon("map")}<div><small>แนวรอยแยก</small><h1>ทุ่งชายแดน</h1><span>Lv6</span></div></section>'
     content+=f'<section class="{place("map-danger painted-surface",reg["#danger-chip"])}">{line_icon("safe-shield")}<b class="numeric">0%</b><span class="hp-track"><i></i></span></section>'
     for e in geo['buttons']:
      ar=e.get('aria') or '';t=e.get('text','').strip();bs=BeautifulSoup(e['html'],'html.parser')
      if 'เลือด' in ar:
       m=re.match(r'(.+?) (\d) ดาว เลเวล (\d+) เลือด (\d+) จาก (\d+) ความล้า (\d+)',ar);name=m[1]+(' ★'+m[2] if int(m[2])>1 else '')
       content+=f'<a class="button {place("map-member painted-surface",e)}" {orig(e)} href="d-overview.html" aria-label="{esc(ar)}">{art(bs.select_one(".portrait"))}<b>{esc(name)}</b><span class="numeric">{m[4]}/{m[5]}</span><small>ล้า <span class="numeric">{m[6]}</span></small><span class="talent-notice">+แต้ม</span></a>'
      elif ar in ['เดินขึ้น','เดินซ้าย','เดินขวา','เดินลง']:
       icon_name={'เดินขึ้น':'up','เดินซ้าย':'left','เดินขวา':'right','เดินลง':'down'}[ar]
       content+=f'<button class="{place("map-move painted-surface",e)}" {orig(e)} aria-label="{esc(ar)}">{line_icon(icon_name)}</button>'
      elif 'กระเป๋า' in ar:content+=f'<a class="button {place("map-tool painted-surface",e)}" {orig(e)} href="f-pack.html" aria-label="{esc(ar)}">{line_icon("pack")}<span>แร่ดาว <span class="numeric">0</span></span></a>'
      elif 'เป้าหมาย' in ar:content+=f'<button class="{place("map-tool painted-surface",e)}" {orig(e)} aria-label="{esc(ar)}">{line_icon("gate")}<span>ไปถึงแคมป์</span><b class="numeric">1/5</b></button>'
      elif 'ทางเข้าด่าน' in ar:content+=f'<a class="button {place("map-context painted-surface",e)}" {orig(e)} href="f-entrance.html" aria-label="{esc(ar)}">{line_icon("flag")}<span>ทางออก</span></a>'
      elif 'ข้อมูล' in ar:content+=f'<a class="button {place("map-info painted-surface",e)}" {orig(e)} href="h-info.html" aria-label="{esc(ar)}">{line_icon("info")}</a>'
     msg=dict(reg['#world-message']);actor=bodies[0];msg['y']=max(msg['y'],actor['y']+actor['h']+8)
     content+=f'<aside class="{place("map-message painted-surface",msg)}">แตะช่องที่ไฮไลต์หรือใช้ลูกศรเพื่อเดิน</aside>'
    stages.append(f'<div class="hud-stage" data-size="{size}" hidden>{content}</div>')
   pid=id if variant=='r1' else id+'-r2-q4'
   write_page(pid,title,f'<main id="app" class="native-hud {variant}" data-hud-kind="{"battle" if group=="H" else "map"}">'+''.join(stages)+'</main><script src="../preview.js"></script>')
   pages.append(dict(id=pid,title=title,source=n,group=group,variant=variant,sizes=[[390,844],[390,650],[320,568]],kind='hud',back=False,primary=False,preserves=['hud-anchors','battle-team-commands'] if group=='H' else ['hud-anchors']))
