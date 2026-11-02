"""Package the isolated prototype and its existing visual dependencies; no game files changed."""
from pathlib import Path
import sys
import zipfile

package = Path(__file__).resolve().parent.parent
output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/fateweave-enhancement-prototype-05.zip')
output.parent.mkdir(parents=True, exist_ok=True)
paths = [package / 'prototype-05' / name for name in
         ['index.html', 'app.js', 'fixtures.js', 'fixtures.json', 'icons.js', 'base-layout.css', 'prototype.css']]
paths += list((package / 'layout-02/assets').glob('*'))
paths += [package / 'material-03/material.css', package / 'decor-04/decor.css']
paths += list((package / 'decor-04/assets').glob('*.svg'))
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for path in paths:
        content = path.read_bytes()
        if path.name == 'index.html':
            text = content.decode().replace(
                '<p><a href="../PROTOTYPE_05_TH.md">สเปกและข้อจำกัด</a> · <a href="../decor-04/index.html">แบบภาพขั้นที่4</a></p>',
                '<p><a href="../README_TH.md">วิธีเปิดต้นแบบและข้อจำกัด</a></p>')
            content = text.encode()
        archive.writestr(str(path.relative_to(package)), content)
    archive.write(package / 'prototype-05/PORTABLE_README_TH.md', 'README_TH.md')
print(output)
