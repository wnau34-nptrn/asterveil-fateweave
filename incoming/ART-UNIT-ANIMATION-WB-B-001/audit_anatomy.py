#!/usr/bin/env python3
"""Run the project's anatomy audit on 512px QA copies, never alter shipping frames.

Use a Python environment containing requirements.txt, from a full game checkout:
python -I incoming/ART-UNIT-ANIMATION-WB-B-001/audit_anatomy.py
Then rebuild the hash manifest with build_handoff.py.
"""
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
AUDIT = REPO/'scripts/unit-anatomy-audit.py'
spec = json.loads((ROOT/'strips.json').read_text())
mapping = []
with tempfile.TemporaryDirectory(prefix='valdrakk-anatomy-') as tmp:
    tmp = Path(tmp)
    cells = tmp/'cells'
    cells.mkdir()
    for move in spec['moves']:
        sheet = Image.open(ROOT/move['file']).convert('RGBA')
        for i in range(move['frame_count']):
            index = len(mapping)
            cell = sheet.crop((i*1024,0,(i+1)*1024,1024)).resize((512,512),Image.Resampling.LANCZOS)
            cell.save(cells/f'{index:03}.png')
            mapping.append({'audit_frame':index,'move':move['move'],'frame':i})
    result = subprocess.run([sys.executable,'-I',str(AUDIT),'--cells',str(cells),'--json',str(tmp/'audit.json')],
                            capture_output=True,text=True,check=False)
    print(result.stdout.strip())
    if result.returncode not in (0,1) or not (tmp/'audit.json').exists():
        raise RuntimeError(result.stderr)
    report = json.loads((tmp/'audit.json').read_text())
    rows = next(iter(report['report'].values()))
    report['report'] = {'valdrakk':rows}
    report['provenance'] = {'script':'scripts/unit-anatomy-audit.py',
        'script_sha256':hashlib.sha256(AUDIT.read_bytes()).hexdigest(),
        'input':'512px QA copies, original normalized frames unchanged',
        'not_measured_policy':'Not a pass; review anatomy manually at play scale.'}
    (ROOT/'anatomy-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    (ROOT/'anatomy-map.json').write_text(json.dumps(mapping,indent=2)+'\n')
