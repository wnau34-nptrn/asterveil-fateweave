#!/usr/bin/env python3
"""Remove duplicate raster comparisons and unused before images; losslessly compress retained evidence."""
from pathlib import Path
from PIL import Image
import json,gzip,shutil
D=Path(__file__).resolve().parent
pages=json.loads((D/'pages.json').read_text());used={p['source'] for p in pages if p.get('source')}
for folder in ['export/before-after','export/r1-r2']:
 for p in (D/folder).glob('*.png'):p.unlink()
(D/'export/components_sheet.png').unlink(missing_ok=True)
for p in (D/'before').glob('*/*.png'):
 if p.stem not in used and not p.stem.endswith('-scene'):p.unlink()
for p in (D/'before').glob('*/*.json'):
 if p.stem=='metrics' or p.stem.endswith(('-geometry','-model')):continue
 # Full original DOM is retained losslessly; gzip avoids repeating the large hidden map DOM.
 q=p.with_suffix('.json.gz');q.write_bytes(gzip.compress(p.read_bytes(),compresslevel=9,mtime=0));p.unlink()
for folder in ['audit-test-results','__pycache__','before/capture-work']:shutil.rmtree(D/folder,ignore_errors=True)
for p in D.rglob('*.png'):
 with Image.open(p) as im:
  im.load();im.save(p,optimize=True,compress_level=9)
size=sum(p.stat().st_size for p in D.rglob('*') if p.is_file());print(json.dumps({'bytes':size,'MB':size/1e6,'under100MB':size<100_000_000,'png':len(list(D.rglob('*.png')))}));assert size<100_000_000,'Package exceeds 100 MB'
