#!/usr/bin/env python3
"""Build the synchronized W2 comparison at the relative in-game draw scales."""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

from warp_idle import FRAME_MS, FRAMES, save_loop


def build(root, aegis_path):
    allies = ("lyra", "eira", "seren")
    with Image.open(aegis_path) as aegis:
        if aegis.n_frames != FRAMES:
            raise ValueError("Expected the eight-frame Aegis W1b preview")
        slides = []
        for index in range(FRAMES):
            aegis.seek(index)
            sprites = [aegis.convert("RGBA")]
            for ally in allies:
                folder = root / ally
                scale = json.loads((folder / "strips.json").read_text())["game_seed_scale"]
                height = round(111 * scale / 0.360)
                with Image.open(folder / "frames" / f"{index:03}.png") as image:
                    sprites.append(image.resize((height, height), Image.Resampling.LANCZOS))

            panel = Image.new("RGBA", (sum(sprite.width + 12 for sprite in sprites),
                                       max(sprite.height for sprite in sprites) + 32), "#29374a")
            label = ImageDraw.Draw(panel)
            left = 6
            for name, sprite in zip(("Aegis W1b", "Lyra", "Eira", "Seren"), sprites):
                label.text((left, 5), name, fill="white")
                panel.alpha_composite(sprite, (left, panel.height - sprite.height - 6))
                left += sprite.width + 12
            slides.append(panel.convert("RGB"))
    save_loop(root / "allies-idle-111px.webp", slides, FRAME_MS)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--aegis", type=Path, required=True)
    args = parser.parse_args()
    build(Path(__file__).resolve().parents[2], args.aegis)
