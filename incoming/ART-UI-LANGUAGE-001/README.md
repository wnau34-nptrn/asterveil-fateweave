# ART-UI-LANGUAGE-001

Design references only. Start with [index.html](index.html), [SPEC_TH.md](SPEC_TH.md), and [NOTES.md](NOTES.md).

- R1: complete C–H references, all three CSS sizes, DPR 2.
- R2: brew and weapon review, combined and isolated Q1–Q4, 390×844 / 320×568. Q4 HUD examples are also supplied.
- [components.html](components.html): all eight primitives and six states.
- `before/`: freshly captured base evidence and source DOM, not resized old screenshots.
- `export/`: after PNGs and `before-after/` pairs with labels outside the game frame.
- `verification.json`: measurements, **not owner approval**.

From the repository root (Node 24, locked npm dependencies, Chromium, Pillow and beautifulsoup4):

```sh
UI_AUDIT=incoming/ART-UI-LANGUAGE-001/before npx playwright test --config incoming/ART-UI-LANGUAGE-001/audit.config.cjs --reporter=dot
CAPTURE_HUD=1 UI_AUDIT=incoming/ART-UI-LANGUAGE-001/before npx playwright test --config incoming/ART-UI-LANGUAGE-001/audit.config.cjs --reporter=dot
python incoming/ART-UI-LANGUAGE-001/build_handoff.py
node incoming/ART-UI-LANGUAGE-001/render.cjs
node incoming/ART-UI-LANGUAGE-001/verify.cjs
python incoming/ART-UI-LANGUAGE-001/package_manifest.py
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE` overrides `/usr/bin/chromium`. Both capture and export use DPR 2. `runtime.cjs` serves local files and maps `/assets/` to the existing `public/assets/`; it does not modify the game.

The copy of the audit fixes the Tomes selector to `data-section="tomes"`; `capture-tomes.spec.ts` is the focused recapture used to correct that surface. No original test file was changed.

After normal git push, fetch the art ref explicitly and run `verify_remote.py` against that fetched ref. The manifest excludes its own hash and `SHA256SUMS` to avoid a circular hash claim; `SHA256SUMS` covers `validation.json`, and remote verification compares both files byte-for-byte as well as checking every payload hash and decoding every PNG.

Do not merge this art branch or ship screenshots as UI panels. Owner Q1–Q4 choices precede separate DOM/CSS integration PRs.
