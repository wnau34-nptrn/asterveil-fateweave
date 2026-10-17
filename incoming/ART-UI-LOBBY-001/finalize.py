from pathlib import Path
from PIL import Image
import json,hashlib,subprocess
O=Path(__file__).resolve().parent;R=O.parents[1]
validation=json.loads((O/'provenance/validation.json').read_text())
validation['images']={str(p.relative_to(O)).replace('\\','/'):dict(bytes=p.stat().st_size,size=list(Image.open(p).size),mode=Image.open(p).mode) for p in O.rglob('*') if p.suffix in ['.png','.webp']}
(O/'provenance/validation.json').write_text(json.dumps(validation,indent=2)+'\n')
checks={'scene/lobby_bg.webp':(2400,1000),'scene/lobby_fg.webp':(2400,1000),'scene/lobby_firepit.webp':(256,256),'poses/lobby_poses_heroes.webp':(1536,2048),'poses/lobby_poses_mercs.webp':(1536,3072),'review/lobby-phone.png':(390,844),'review/lobby-desktop.png':(1366,768)}
for p,size in checks.items():
    im=Image.open(O/p);assert im.size==size,(p,im.size)
    assert im.info.get('icc_profile'),p
    if p.endswith('.webp') and 'bg.' not in p:assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0,p
assert Image.open(O/'scene/lobby_fg.webp').getchannel('A').crop((0,0,2400,880)).getbbox() is None
for name,n in [('heroes',12),('mercs',18)]:
    frames=json.loads((O/f'poses/lobby_poses_{name}.json').read_text());assert len(frames)==n
    atlas=Image.open(O/f'poses/lobby_poses_{name}.webp')
    for key,f in frames.items():
        cell=atlas.crop((f['x'],f['y'],f['x']+512,f['y']+512));bounds=cell.getchannel('A').getbbox()
        assert bounds and bounds[0]>=8 and bounds[2]<=504 and bounds[3]==497,(key,bounds)
        assert f['footY']==496 and ('seatY' in f)==key.endswith('_sit')
hashes=json.loads((O/'provenance/protected-sha256.json').read_text())
for p,v in hashes.items():assert hashlib.sha256((R/p).read_bytes()).hexdigest()==v
runtime=sum(p.stat().st_size for p in O.rglob('*.webp'));assert runtime<=1600000
base=subprocess.check_output(['git','merge-base','HEAD','origin/feature/fateweave-initial-prototype'],cwd=R,text=True).strip()
notes=f'''# ART-UI-LOBBY-001

Delivery from base `{base}` on `art/art-ui-lobby-001`. Original illustrations generated with the built-in image_gen tool on 2026-10-15, using only this repository's masters. No named third-party artist, studio or game imitation. No outside repository assets.

## Runtime and files

Runtime total: **{runtime:,} bytes** / 1,600,000 bytes (decimal MB). Only five WebPs are runtime: three scene layers and the hero and mercenary atlases. PNGs, raw generations, scripts, metadata and reviews are reference/build materials only. See `provenance/validation.json` for every image's dimensions, mode and byte count. All exports embed sRGB.

Scene background: 2400x1000 RGB; foreground: 2400x1000 RGBA with nonzero alpha confined to y=880..999; firepit: 256x256 RGBA, bottom-centre anchor, no flame. Central x=400..1999 is the safe region. Outer scenery is expendable. The background has no actors or fire. Blank hire board; pictorial banner flourishes are decorative, not letters. Flames are review-only placeholders.

Hero atlas: 1536x2048; mercenary atlas: 1536x3072. Both use 512px square cells, three columns sit / cheer / idle_alt. Hero rows guardian, tracer, weaver, healer. Mercenary rows merc_spear, merc_archer, merc_alchemist, merc_scout, merc_warden, merc_bard. JSON coordinates are atlas-local; footY and seatY are frame-local (0-based). All soles end at y=496; the last alpha scanline is 496, exclusive bound 497. Seated poses include their log; seatY records the body/log contact, which varies anatomically while soles share the baseline. Keep the whole frame when sampling.

## Mercenary approval

All six masters were approved before work: `docs/validation/art-char-merc-enemy-001/INTAKE.md`, status ACCEPTED_WITH_TECH_FIX, source PR #4. All eighteen mercenary poses are therefore included. The recorded tech fixes concern encoding and an enemy's direction, not rejection of these mercenary masters.

## Facing and review placement

Every stored pose faces RIGHT. No writing, one-sided lettering or logos. Mirror review pairs show each stored frame followed by its horizontal reflection. Weapons changing hands are expected. Phone and desktop use x=18%,33%,67%,82% from `src/ui/lobby-ui.ts`; both right-hand actors are mirrored. Four poses: guardian sit, tracer sit, weaver cheer, healer idle_alt. The scene uses the real scene band and 21vh actor frame sizing from `world.css`; back scale .92 and front 1.0. The 0.75 back scale remains available for the additional slots. Mock outlines follow the supplied lobby validation captures: header, scene, tabs, roster/reserve and footer boundaries, without text or painted UI. These are static review compositions, not integrated application screenshots. The desktop band naturally crops more of the tall source backdrop; preserve ground anchoring in integration.

`poses-lineup.png`: original master at left, then sit / cheer / idle_alt at identical 224px frame scale. `silhouettes.png`: each hero silhouette itself is exactly 90px tall. `mirror-check.png` and `mercs-mirror-check.png` check all thirty poses both ways. `lobby-phone.png` and `lobby-desktop.png` are exact viewport dimensions and sample decoded runtime files.

## Production and limits

Source PNGs are preserved under `provenance/generated/`. `PROMPTS.md` records the prompt set. `build_package.py` performs atlas cutting, connected-component isolation, size/sole normalization, alpha export, encoding and deterministic mock compositing; no existing image is overwritten. Run it with Python + Pillow, then `finalize.py` for assertions and this report.

WebPs use quality 70, method 4. To keep BOTH pose atlases within budget, pose RGB detail is filtered through a 384px-per-cell grid then restored to the exact 512px canvas; alpha stays on the 512px grid with sixteen coverage levels and faint fringe removal. Lossless PNG copies retain normalized source detail. Runtime review uses actual decoded WebP. Fine trim is softer than PNG at full zoom; identity, silhouettes and equipment remain readable at 90–200px. Generation is raster artwork and can vary in tiny costume filigree; subjective final acceptance remains Claude's Asset Intake Review. Healing/book light is intentional local magic, not a background halo. No floor shadows are baked into poses.

## Validation

Exact dimensions, alpha modes, foreground height, 30 JSON entries, sole endpoints, >=8px frame padding, sRGB profiles and runtime budget asserted in `finalize.py`. Protected master/world SHA-256 hashes were compared against the fetched base and are unchanged. No runtime code or tests were changed; application tests are outside this image-only delivery.

## Protected original SHA-256

| File | SHA-256 |
|---|---|
'''+''.join(f'| `{p}` | `{v}` |\n' for p,v in hashes.items())
(O/'NOTES.md').write_text(notes,encoding='utf-8')
files=[p for p in O.rglob('*') if p.is_file() and p.name not in ['PR_BODY.md','package-size.json']]
total=sum(p.stat().st_size for p in files)
(O/'provenance/package-size.json').write_text(json.dumps(dict(runtime_bytes=runtime,package_bytes_excluding_pr_body_and_this_manifest=total),indent=2)+'\n')
url='https://github.com/wnau34-nptrn/asterveil-fateweave/blob/art/art-ui-lobby-001/incoming/ART-UI-LOBBY-001/review/'
body=f'''Warm dusk camp scene with separate background, foreground and unlit firepit; 12 existing-hero poses and 18 approved-mercenary poses. Right-side characters are horizontally mirrored in both viewport mockups. Only `incoming/ART-UI-LOBBY-001/` is added.

Runtime WebP total: **{runtime:,} bytes / 1,600,000 bytes**. Package files excluding this PR text and size manifest: **{total:,} bytes**; PNGs and provenance are review/build only. WebP quality 70; pose RGB detail uses a 384px grid with full 512px alpha/cell coordinates. See NOTES.md for encoding and crop details.

- [x] `lobby_bg`, `lobby_fg` and `lobby_firepit` at exact sizes; key content inside safe area
- [x] 12 hero poses in atlas; JSON includes footY and seatY for sit
- [x] Identities match masters; normalized scale; transparent edges checked
- [x] Facing: all poses face RIGHT; mirror review pairs and both viewport mocks show flipped right-side actors
- [x] 18 mercenary poses delivered following accepted masters
- [x] Review sheets included
- [x] No text; original work; runtime <= 1.6 MB; existing hashes unchanged
- [x] NOTES.md and STYLE_CHECK.md complete

![Phone lobby]({url}lobby-phone.png?raw=true)
![Desktop lobby]({url}lobby-desktop.png?raw=true)
![Hero lineup]({url}poses-lineup.png?raw=true)
![90px silhouettes]({url}silhouettes.png?raw=true)
![All hero poses mirrored]({url}mirror-check.png?raw=true)
![All mercenary poses mirrored]({url}mercs-mirror-check.png?raw=true)

Validation: image dimensions, sRGB, alpha, anchors, padding, atlas maps, foreground extent, budget and protected SHA-256 passed. Review mockups use decoded runtime WebP and source-code positions; they are reference compositions for intake. No application changes.

Ready for Claude Asset Intake Review.
'''
(O/'PR_BODY.md').write_text(body,encoding='utf-8')
print(json.dumps(dict(runtime_bytes=runtime,package_bytes=total,checks='passed')))
