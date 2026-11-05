#!/usr/bin/env python3
"""UI-language audit (2026-11-05): summarise tests/browser/ui-language-audit.spec.ts metrics.

Usage: python3 scripts/ui-language-audit.py <UI_AUDIT dir> <out.json>
Reads <dir>/<w>x<h>/metrics.json for 390x844, 390x650 and 320x568 and writes, per surface, the close/back/title/
primary-button geometry, font sizes and text under 12px, plus the button/panel style families at 390x844 and how
many CSS declarations in src/ui/*.css use the Luminous Veil tokens. Evidence only; no game files are changed.
"""
import json,sys,re,collections
base=sys.argv[1]; out=sys.argv[2]
def group(name):
  n=name.split('-',1)[1] if '-' in name else name
  if name[:2] in('01','02','03','04','10'):return 'title/story'
  if name.startswith(('11','12','49')):return 'camp home'
  if name.startswith(('16','17','18','33')):return 'character window'
  if name.startswith(('27','28','29','30')):return 'forge'
  if name.startswith(('13','14','15','20','21','22','23','24','25','26','31','32')):return 'camp service sheet'
  if name.startswith(('40','41','42','43','44','45','46')):return 'map'
  if name.startswith(('47','48')):return 'run summary'
  if name.startswith(('50','51','52','53','54','55')):return 'battle'
  return '?'
res={}
for vp in ['390x844','390x650','320x568']:
  d=json.load(open(f'{base}/{vp}/metrics.json'))['surfaces']
  rows={}
  for name,m in d.items():
    btn=m['buttons']
    def kind(b):
      s=b['sel']; a=(b['aria']+' '+b['text'])
      if 'ปิด' in b['aria'] and ('close' in s or 'round-glass' in s or 'quiet' in s or b['text']=='' ): return 'close'
      if re.search(r'กลับ|ย้อน|เลือกงาน',b['aria']) and b['text']=='' : return 'back'
      if '.primary' in s or 'primary' in s.split('.') : return 'primary'
      if 'role=tab' in s or 'tab' in s.split('.')[0]: return 'tab'
      return 'other'
    close=[b for b in btn if kind(b)=='close']; back=[b for b in btn if kind(b)=='back']
    prim=[b for b in btn if kind(b)=='primary' and not b['disabled']]
    heads=[h for h in m['heads'] if h['sel'].startswith(('h1','h2','h3'))]
    title=heads[0] if heads else None
    small=m['smallCount']; fs=sorted(float(k) for k in m['fontSizes'])
    nav=any('lobby-menu-button' in b['sel'] for b in btn)
    rows[name]={'group':group(name),
      'close':[{k:c[k] for k in('sel','x','y','w','h','radius','bg')} for c in close[:2]],
      'back':[{k:c[k] for k in('sel','x','y','w','h')} for c in back[:2]],
      'title':title and {k:title[k] for k in('sel','text','x','y','font','color')},
      'primary':[{k:p[k] for k in('sel','text','x','y','w','h','font','radius','bgImage','bg','color')} for p in prim[:3]],
      'minFont':fs[0] if fs else None,'fontSizes':fs,'textUnder12':small,'campNavVisible':nav,'hscroll':m['hscroll'],
      'buttonsUnder44':[(b['sel'][:50],b['text'][:20],b['w'],b['h']) for b in btn if b['h']<44 and not b['disabled'] and 'npc-hit' not in b['sel']][:12]}
  res[vp]=rows
# style families across all surfaces (390x844)
d=json.load(open(f'{base}/390x844/metrics.json'))['surfaces']
fam=lambda key,items: collections.Counter(key(i) for i in items)
allb=[(n,b) for n,m in d.items() for b in m['buttons']]
allp=[(n,p) for n,m in d.items() for p in m['panels']]
def bsig(b):
  bg=b['bgImage'][:40] if b['bgImage'] else b['bg']
  return f"r={b['radius']} | bg={bg} | border={b['border']} | font={b['font']}"
def psig(p):
  bg=p['bgImage'][:30] if p['bgImage'] else p['bg']
  return f"r={p['radius']} | bg={bg} | border={p['border']} | shadow={'y' if p['shadow'] else 'n'}"
bfam=collections.defaultdict(set); pfam=collections.defaultdict(set)
for n,b in allb: bfam[bsig(b)].add(group(n))
for n,p in allp: pfam[psig(p)].add(group(n))
radii=collections.Counter(p['radius'] for _,p in allp)+collections.Counter(b['radius'] for _,b in allb)
borders=collections.Counter(p['border'].split(' ',2)[2] for _,p in allp if p['border'].split()[0]!='0px')
fonts=collections.Counter(b['family'] for _,b in allb)
summary={'buttonStyleFamilies':len(bfam),'panelStyleFamilies':len(pfam),'radiusValues':dict(radii.most_common()),'borderColors':dict(borders.most_common(25)),'buttonFonts':dict(fonts),
 'topButtonFamilies':[{'sig':k,'groups':sorted(v)} for k,v in sorted(bfam.items(),key=lambda kv:-len(kv[1]))[:40]],
 'topPanelFamilies':[{'sig':k,'groups':sorted(v)} for k,v in sorted(pfam.items(),key=lambda kv:-len(kv[1]))[:40]]}
import glob,os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css=''.join(open(p,encoding='utf-8').read() for p in sorted(glob.glob(os.path.join(root,'src/ui/*.css'))))
tok={}
for prop in ['border-radius','font-size','box-shadow','background','color','padding','gap']:
  decl=re.findall(r'(?<![-\w])'+prop+r'\s*:\s*([^;}]*)',css); tok[prop]={'declarations':len(decl),'useToken':sum('var(--' in d for d in decl)}
tok['fontSizeLiterals']=dict(collections.Counter(d.strip() for d in re.findall(r'(?<![-\w])font-size\s*:\s*([^;}]*)',css) if 'var(' not in d).most_common(20))
tok['radiusLiterals']=dict(collections.Counter(d.strip() for d in re.findall(r'(?<![-\w])border-radius\s*:\s*([^;}]*)',css) if 'var(' not in d).most_common(20))
tok['uniqueHexColors']=len(set(m.lower() for m in re.findall(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b',css)))
summary['cssTokenUsage']=tok
json.dump({'perSurface':res,'families390x844':summary},open(out,'w'),ensure_ascii=False,indent=1)
