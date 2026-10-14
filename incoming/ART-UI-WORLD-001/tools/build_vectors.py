from pathlib import Path
import json, math, random
P=Path(__file__).resolve().parents[1]
S=P/'tools'/'vectors';S.mkdir(exist_ok=True)
def svg(name,body,w=128,h=128):
 defs='''<defs><linearGradient id="stone" x2=".6" y2="1"><stop stop-color="#7395a0"/><stop offset=".35" stop-color="#536a79"/><stop offset="1" stop-color="#223345"/></linearGradient><linearGradient id="face" x2="0" y2="1"><stop stop-color="#394e62"/><stop offset="1" stop-color="#182837"/></linearGradient><linearGradient id="gold" x2=".7" y2="1"><stop stop-color="#fff0bc"/><stop offset=".45" stop-color="#d9bf86"/><stop offset="1" stop-color="#8d7855"/></linearGradient><radialGradient id="veil"><stop stop-color="#183047"/><stop offset="1" stop-color="#08121f"/></radialGradient><radialGradient id="shadow"><stop stop-color="#01080e" stop-opacity=".65"/><stop offset="1" stop-color="#01080e" stop-opacity="0"/></radialGradient><linearGradient id="fog"><stop stop-color="#0d1c2e" stop-opacity=".96"/><stop offset=".35" stop-color="#14243a" stop-opacity=".78"/><stop offset="1" stop-color="#14243a" stop-opacity="0"/></linearGradient></defs>'''
 (S/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{defs}{body}</svg>')
# Transparent edges with explored side fading out; corners are rotated matching masks.
svg('fog_tile','<rect width="128" height="128" fill="url(#veil)"/><path d="M-20 42Q32 18 80 43T148 31M-20 93Q36 68 84 96T148 83" fill="none" stroke="#74d4ef" stroke-opacity=".035" stroke-width="15"/>')
for direction,angle in [('n',0),('e',90),('s',180),('w',270)]:svg('fog_edge_'+direction,f'<g transform="rotate({angle} 64 64)"><rect width="128" height="128" fill="url(#fog)" transform="rotate(90 64 64)"/></g>')
# Use edges inside explored tiles. Direction states point TOWARD opaque fog neighbor.
for d,a in [('ne',0),('se',90),('sw',180),('nw',270)]:
 svg('fog_corner_'+d,f'<defs><radialGradient id="corner" cx="1" cy="0" r="1"><stop stop-color="#14243a" stop-opacity=".92"/><stop offset=".28" stop-color="#14243a" stop-opacity=".62"/><stop offset="1" stop-color="#14243a" stop-opacity="0"/></radialGradient></defs><g transform="rotate({a} 64 64)"><rect width="128" height="128" fill="url(#corner)"/></g>')
svg('token_frame','<ellipse cx="64" cy="110" rx="44" ry="12" fill="url(#shadow)"/><circle cx="64" cy="58" r="43" fill="none" stroke="#07131f" stroke-width="10"/><circle cx="64" cy="58" r="43" fill="none" stroke="url(#gold)" stroke-width="5"/><circle cx="64" cy="58" r="37" fill="none" stroke="#74d4ef" stroke-opacity=".5" stroke-width="1.5"/><path d="M57 12L64 5L71 12L64 19Z" fill="url(#gold)"/><path d="M54 102L64 110L74 102" fill="none" stroke="url(#gold)" stroke-width="3"/>')
svg('step_hint','<rect x="10" y="10" width="108" height="108" rx="24" fill="#74d4ef" fill-opacity=".08"/><path d="M12 40V26Q12 12 26 12H40M88 12H102Q116 12 116 26V40M116 88V102Q116 116 102 116H88M40 116H26Q12 116 12 102V88" fill="none" stroke="#bdf3ff" stroke-width="4" stroke-linecap="round"/><path d="M57 65L64 58L71 65" fill="none" stroke="#f2d596" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>')
# Animated fire and dust: precisely stable origin, four authored states in a single strip.
for i in range(4):
 b=f'<ellipse cx="64" cy="105" rx="26" ry="9" fill="#f4bd65" opacity=".12"/><path d="M46 93Q36 74 55 {43-i*3}Q49 68 67 62Q69 {34+i*2} 76 54Q99 77 83 96Z" fill="#f89559"/><path d="M53 96Q48 79 63 65Q62 79 72 70Q84 83 75 96Z" fill="#ffe8ac"/>'
 svg('camp_fire_'+str(i),b)
 b=''
 for j in range(7):
  angle=j*math.pi/3.5;rx=12+i*8;x=64+math.cos(angle)*rx;y=106+math.sin(angle)*rx*.24-i*3
  b+=f'<ellipse cx="{x}" cy="{y}" rx="{7-i*.8}" ry="{4-i*.45}" fill="#eadbb6" opacity="{.55-i*.12}"/>'
 svg('step_dust_'+str(i),b)
# Nine-slice painted accents; centre is intentionally transparent (CSS glass underneath).
svg('panel_frame_9slice','<rect x="2" y="2" width="124" height="124" rx="16" fill="none" stroke="#d9bf86" stroke-opacity=".35"/><path d="M4 24V16Q4 4 16 4H24M104 4H112Q124 4 124 16V24M124 104V112Q124 124 112 124H104M24 124H16Q4 124 4 112V104" fill="none" stroke="url(#gold)" stroke-width="1.5"/><path d="M9 19L19 9M109 9L119 19M119 109L109 119M19 119L9 109" stroke="#d9bf86" stroke-opacity=".65"/>')
# Logo is the only runtime image that contains lettering.
logo='''<defs><linearGradient id="lg" x2="0" y2="1"><stop stop-color="#fff5d0"/><stop offset=".5" stop-color="#f2d596"/><stop offset="1" stop-color="#be9560"/></linearGradient></defs><path d="M335 43L350 16L365 43L350 70Z" fill="none" stroke="#f2d596" stroke-width="1.5"/><path d="M350 24V62M341 43H359M164 43H303M397 43H536" stroke="#d9bf86" stroke-width="1"/><text x="350" y="137" text-anchor="middle" fill="url(#lg)" font-family="Liberation Serif,serif" font-size="86" letter-spacing="6">ASTERVEIL</text><text x="350" y="194" text-anchor="middle" fill="#e2eff7" font-family="Liberation Serif,serif" font-size="29" letter-spacing="12">FATEWEAVE</text><path d="M130 174H202M498 174H570" stroke="#d9bf86"/>'''
# SVG text converted to paths by browser font-free outline process downstream.
(P/'title'/'logo.source.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="224" viewBox="0 0 700 224">'+logo+'</svg>')
icons={
'up':'M6 14l6-6 6 6','down':'M6 10l6 6 6-6','left':'M14 6l-6 6 6 6','right':'M10 6l6 6-6 6',
'camp':'M2 19L12 4l10 15ZM9 19l3-7 3 7M5 8h4','rest':'M6 17c-3-5 3-6 2-10 5 2 7 4 6 7 2-1 3-3 3-4 4 6 2 9-3 10M4 22h16',
'flag':'M5 22V3h14l-3 4 3 4H5',
'gate':'M4 21V10a8 8 0 0116 0v11M8 21V10a4 4 0 018 0v11M3 21h18M10 5h4',
'star':'M12 3l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z',
'danger':'M12 3L2 21h20ZM12 9v5M12 17h.01',
'safe-shield':'M12 2l8 3v7c0 5-8 10-8 10S4 17 4 12V5ZM8 12l3 3 5-6',
'boss':'M7 9L3 3v10M17 9l4-6v10M7 9a6 6 0 0110 0v5l-2 3v4H9v-4l-2-3ZM9 12h1M14 12h1M11 18h2',
'map':'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16',
'footprints':'M7 3c-2 0-3 4-2 6s4 1 4-1 0-5-2-5ZM5 12v3h4v-3ZM17 9c-2 0-3 4-2 6s4 1 4-1 0-5-2-5ZM15 18v3h4v-3Z',
'info':'M12 11v6M12 7h.01','close':'M6 6l12 12M18 6L6 18',
'settings':'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM15 12a3 3 0 11-6 0 3 3 0 016 0',
'check':'M5 12l4 4L19 6','circle':'',
'attack':'M5 19L19 5l-1 7-6 6M3 16l5 5M4 20l3-3',
'guard':'M12 3l8 3v6c0 4-8 9-8 9s-8-5-8-9V6ZM12 6v11',
'bash':'M5 20l9-9M12 6l6-3 4 4-3 6ZM9 15l-3-3M3 22l2-2',
'mark':'M12 2v4M12 18v4M2 12h4M18 12h4M12 8l4 4-4 4-4-4Z',
'precision-strike':'M4 20L19 5M15 3l6 1-1 6M12 7l5 5M3 8l4 1M15 17l1 4',
'arcane-bolt':'M14 2L5 14h6l-1 8 9-13h-6ZM3 5l2 1M19 19l2 1',
'ward':'M12 2l8 3v7c0 5-8 10-8 10S4 17 4 12V5ZM12 7l2 4 4 1-4 1-2 4-2-4-4-1 4-1Z',
'heal':'M9 3h6v6h6v6h-6v6H9v-6H3V9h6ZM19 3v3M17 4.5h4',
'talk':'M5 18l-1 4 5-3h7a6 6 0 006-6V9a6 6 0 00-6-6H8a6 6 0 00-6 6v4a6 6 0 003 5ZM7 11h.01M12 11h.01M17 11h.01',
'prayer':'M7 21l-2-9 3-8 4 11M17 21l2-9-3-8-4 11M9 21h6M12 2v3'
}
for name,d in icons.items():
 extra='<circle cx="12" cy="12" r="9"/>' if name in ['info','circle'] else ''
 (P/'icons'/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{extra}<path d="{d}"/></svg>')
(P/'ui'/'meter_danger.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 12" fill="none"><rect width="160" height="12" rx="6" fill="#24384b"/><rect width="80" height="12" rx="6" fill="currentColor"/><path d="M40 3v6M80 3v6M120 3v6" stroke="#08121f" stroke-opacity=".45"/></svg>''')
print('Authored vector assets:',len(list(S.glob('*.svg'))),'icons:',len(icons))
