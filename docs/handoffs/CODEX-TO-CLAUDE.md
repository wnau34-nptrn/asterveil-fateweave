# Codex → Claude handoff

## 2026-10-18 — Thorn Matriarch faces left

- Owner reported the Thorn Matriarch (ราชินีหนาม) facing right in battle. Party units must face right and enemies left.
- Base: `feature/fateweave-initial-prototype` at `d2f311c3f6cd8725980607dc7320401e15ebbeaa`. Fix branch: `codex/fix-thorn-queen-facing`.
- Cause: incoming `foe_matriarch.png` and its portrait already face left. Intake mirrored both in the runtime atlases, making them face right. The earlier intake report incorrectly described the originals as right-facing.
- Fix: add `foe_matriarch` to `mirroredArt`, which BattleScene applies by art key (not enemy slot). Flip its cropped `.portrait` wrapper in CSS so every DOM portrait matches. Other actors retain their existing orientation.
- No artwork files, gameplay rules, encounters, saves, dependencies or balance values changed. Placement rules and the intake report now document the correction.
- If rebuilding the Matriarch runtime frames from the incoming originals, omit the intake mirror and remove **both** runtime display corrections to prevent a double flip.

### Validation

- Passed: `npm run typecheck`, `npm run lint`, `npm test` (407/407), `npm run build`, `git diff --check`. Build retains the existing Phaser chunk-size warning.
- Visually inspected incoming PNG/WebP and the shipped foes atlas; confirmed the direction discrepancy.
- In-game screenshot validation **pending**: the sandbox prevented the Playwright web server from starting; the request for network permission was cancelled. Browser extension automation tools were not exposed, so the repository's Playwright workflow was attempted.
- Resume with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser -- --grep 'new Veil Frontier foes'` where a local server is permitted. Inspect `foes-thicket.png` on desktop and a portrait phone; confirm the Matriarch and Mycon face left, allies face right, and selecting/attacking the Matriarch still works.
- No merge or deployment performed by Codex.
