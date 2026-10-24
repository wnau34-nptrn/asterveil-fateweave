from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
import re
P=Path(__file__).resolve().parents[1]
f=TTFont('/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf');g=f.getGlyphSet();c=f.getBestCmap();u=f['head'].unitsPerEm
s=(P/'title/logo.source.svg').read_text()
def replace(m):
 attrs,text=m.groups();size=float(re.search(r'font-size="([^"]+)',attrs).group(1));y=float(re.search(r'y="([^"]+)',attrs).group(1));spacing=float(re.search(r'letter-spacing="([^"]+)',attrs).group(1));scale=size/u
 total=sum(g[c[ord(ch)]].width*scale for ch in text)+spacing*(len(text)-1);x=350-total/2;body=''
 fill=re.search(r'fill="([^"]+)',attrs).group(1)
 for ch in text:
  glyph=g[c[ord(ch)]];pen=SVGPathPen(g);glyph.draw(pen)
  body+=f'<path d="{pen.getCommands()}" transform="translate({x:.3f} {y}) scale({scale:.5f} {-scale:.5f})"/>'
  x+=glyph.width*scale+spacing
 return '<g fill="'+fill+'">'+body+'</g>'
s=re.sub(r'<text ([^>]+)>([^<]+)</text>',replace,s)
(P/'title/logo.svg').write_text(s)
