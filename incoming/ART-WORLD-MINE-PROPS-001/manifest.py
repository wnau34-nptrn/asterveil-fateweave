"""Record the exact bytes and verify every image decodes at handoff."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent


def write_metadata(path, payload):
    (ROOT / path).write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n')


def manifest(**info):
    files = {}
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or path.name == 'validation.json' or '__pycache__' in path.parts:
            continue
        entry = {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size}
        if path.suffix in ('.png', '.webp', '.gif'):
            with Image.open(path) as image:
                for i in range(getattr(image, 'n_frames', 1)):
                    image.seek(i)
                    image.load()
                entry.update(size=list(image.size), mode=image.mode, frames=getattr(image, 'n_frames', 1))
        files[str(path.relative_to(ROOT))] = entry
    write_metadata('validation.json', dict(info, files=files))
