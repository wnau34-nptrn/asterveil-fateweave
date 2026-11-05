# ART-UI-LANGUAGE-001 · review revision R2

Design-only. Start with [index.html](index.html), [SPEC_TH.md](SPEC_TH.md), and [NOTES.md](NOTES.md). PR #171 stays open and unmerged.

The revised map/battle HUD is live DOM/CSS over a **HUD-free scene plate**. Close/back use the original 24px line SVGs. Camp navigation retains icons/count badges. NPC portrait/dialogue disclosures are restored. All four potion cards fit at 390×844, including expanded NPC dialogue.

There is one PNG set: `export/` contains after images; `before/` contains the unique before references and six scene plates. Before/after and R1/R2 comparisons are **portable HTML** which reuses those PNGs. There are no duplicate raster comparison boards or duplicate component sheets. Full source DOM evidence is losslessly gzipped.

From the repository root (Node 24, locked npm dependencies, Chromium, Pillow, beautifulsoup4):

```sh
# Optional full before refresh; the copied audit fixes the original Tomes selector.
UI_AUDIT=incoming/ART-UI-LANGUAGE-001/before npx playwright test --config incoming/ART-UI-LANGUAGE-001/audit.config.cjs --reporter=dot
# Capture clean scenery and temporary per-actor hidden-body frames for real pixel bounds.
CAPTURE_HUD=1 UI_AUDIT=incoming/ART-UI-LANGUAGE-001/before npx playwright test --config incoming/ART-UI-LANGUAGE-001/audit.config.cjs --reporter=dot
python incoming/ART-UI-LANGUAGE-001/measure_character_bounds.py
python incoming/ART-UI-LANGUAGE-001/build_handoff.py
node incoming/ART-UI-LANGUAGE-001/render.cjs
python incoming/ART-UI-LANGUAGE-001/compact_package.py
node incoming/ART-UI-LANGUAGE-001/verify.cjs
python incoming/ART-UI-LANGUAGE-001/package_manifest.py
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` overrides `/usr/bin/chromium`. The capture uses temporary presentation instrumentation (visibility only, no game-state changes) inside the browser; no game source file changes. `character-bounds.html` shows the before images with the measured bounds.

The verifier checks the original ten criteria plus icon size ≥20px, opaque HUD/body intersections, no HUD text wrapping, actual 12px/11px numeral fonts and nonzero PNG differences, NPC/nav preservation, four visible potion cards, no duplicate comparison PNGs, and package size <100 MB. Explicit single-line enemy-name ellipses are documented in NOTES and verification records. No device or visual approval is inferred.

After normal git push, fetch the art ref and run:

```sh
python incoming/ART-UI-LANGUAGE-001/verify_remote.py origin/art/art-ui-language-001
```

The manifest does not claim a circular self-hash: `SHA256SUMS` covers the payload plus `validation.json`; remote verification compares both manifest files byte-for-byte, checks the exact file set and every hash, and fully decodes every PNG with Pillow.

Do not merge this art branch or ship screenshot panels. Owner Q1–Q4 choices precede separate DOM/CSS integration PRs.
