#!/usr/bin/env python3
"""Verify every delivered hash, decode every image, and repeat the fixed-pixel gate."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ALLIES = ("lyra", "eira", "seren")


def verify(root, seeds):
    png_count = 0
    for ally in ALLIES:
        folder = root / ally
        manifest = json.loads((folder / "validation.json").read_text())
        files = manifest["files"]
        actual = {p.relative_to(folder).as_posix() for p in folder.rglob("*") if p.is_file()}
        if actual != set(files) | {"validation.json"}:
            raise ValueError(f"Unexpected delivery inventory for {ally}")

        for name, expected in {**files, **manifest.get("shared_files", {})}.items():
            path = folder / name
            data = path.read_bytes()
            if expected != {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}:
                raise ValueError(f"SHA-256 or byte count mismatch: {path}")
            if path.suffix == ".png":
                with Image.open(path) as image:
                    image.load()
                png_count += 1
            if path.suffix == ".webp":
                with Image.open(path) as image:
                    duration = 200 if path.name == "idle-200ms.webp" else 400
                    if image.n_frames != 8 or image.info["loop"] != 0:
                        raise ValueError(f"Unexpected frame count or loop flag: {path}")
                    for frame in range(image.n_frames):
                        image.seek(frame)
                        image.load()
                        if image.info["duration"] != duration:
                            raise ValueError(f"Unexpected frame duration: {path}, frame {frame}")

        seed_path = seeds / f"{ally}-seed.png"
        if (folder / "frames/000.png").read_bytes() != seed_path.read_bytes():
            raise ValueError(f"Frame 000 differs from the seed for {ally}")
        with Image.open(seed_path) as image:
            seed = np.array(image)
        covered = np.zeros((512, 512), dtype=bool)
        for path in (folder / "masks").glob("*.png"):
            with Image.open(path) as image:
                pixels = np.array(image) > 0
            if path.name == "protected.png":
                protected = pixels
            else:
                covered |= pixels
        if (covered & protected).any() or any(edge.any() for edge in
                                              (covered[0], covered[-1], covered[:, 0], covered[:, -1])):
            raise ValueError(f"Motion mask overlaps protected pixels or canvas edges for {ally}")
        strips = json.loads((folder / "strips.json").read_text())
        for row in strips["frames"]:
            with Image.open(folder / row["file"]) as image:
                if image.mode != "RGBA" or image.size != (512, 512):
                    raise ValueError(f"Unexpected frame format: {folder / row['file']}")
                changed = np.any(np.array(image) != seed, axis=2)
                if (changed & ~covered).any() or changed.sum() != row["changed_pixels"]:
                    raise ValueError(f"Unexpected pixel differences: {folder / row['file']}")
    print(f"Verified all W2 SHA-256 hashes, decoded {png_count} PNGs and every WebP frame, "
          "and repeated the 24-frame seed and mask checks.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seeds", type=Path, required=True)
    args = parser.parse_args()
    verify(Path(__file__).resolve().parents[2], args.seeds)
