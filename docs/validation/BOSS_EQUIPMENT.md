# Boss equipment validation — 2026-10-21

Owner scope: three boss charms in existing slots, with the same normal-set pool/chance as ordinary items. Defaults: Aegis/Lantern barrier floor6, Focus primary marked hit+4, first-win guarantee then25%/hard4. No new currency, combat turns, map layout or workflow.

## Deterministic combat matrix

`tests/boss-balance.test.ts` compares the three boss powers with Renewal, Mark Hunter and Last Stand. Ten classes at ★3/Lv6, item Lv11 with100% qualities, +0/+10, full/60% carried HP, three ungeared teaching companions, no set and each of the six full normal sets. Each configuration fights seven encounters at Lv11, including Rift Warden, through the existing teaching advisor. Total11760 fights,1960 per build. Matched configurations use identical affixes/qualities/enhancement; only the charm's special/boss identity changes.

| Charm power | Victories / fights | Mean party HP remaining / maximum |
|---|---:|---:|
| Renewal | 1957 /1960 | 76.35% |
| Mark Hunter | 1960 /1960 | 74.79% |
| Last Stand | 1955 /1960 | 74.43% |
| Aegis | 1956 /1960 | 74.82% |
| Focus | 1960 /1960 | 74.62% |
| Lantern | 1955 /1960 | 74.50% |

All fights terminate within the command bound. HP stays within0..max and barrier remains nonnegative. For each boss power there is a matched class/budget/set/entry where an ordinary special matches or beats retained HP. These are scoped regression results, not proof of optimal human play, universal balance or real-device performance. Aggregate win counts do not mean a power is best for each individual class. Numeric changes remain tunable content.

Rule tests separately verify primary-vs-splash, no Mark bonus on an unmarked hit, post-hit shield/death/full absorption, per-round use/reset, actual healing of another ally, larger shields/Afterglow, Leech including the bonus, preview/replay equality, normal2/4-piece sets, and legacy battle replay. No extra action, hit-chain or permanent stat bonus is introduced.

## Loot and economy

For p25% with hard4, post-first-reward probabilities are25%,18.75%,14.0625%,42.1875%; expected wins2.734375 per item, long-run rate≈36.5714%. A12000-victory deterministic stream sample using the actual generator produces4376 bonuses (36.4667%), mean2.74223 wins/item, maximum gap4. Of those2649 carry a normal set (60.5347%), consistent with the content's60% chance.

This sample excludes the first-win gift, defeats, lost finds, travel time, gear selection and development spending. Recycling every sample bonus at legendary base salvage would add4.376 ore and5.47 dust per boss victory, before any paid-capital refund; this is additional income, not a refund of manufacture cost. Existing shop/craft loot cannot trigger a boss reward or advance its pity. Human expedition/farm-time tuning remains unmeasured.

Actual-victory tests compare new and legacy runs: the three ordinary items, ordinary RNG counter and class-weapon pity are byte-for-byte equal. Only the optional independent bonus differs. Found items obey existing wipe retention and safe overflow; owned finds start locked. Tests cover a101-find save crossing the old99 validation boundary and exactly-once reload behavior.

## Validation surface

- Typecheck, lint and494 unit tests passed locally; Pages build passed.
- Six new production-subpath browser flows passed at320×568/390×844 Chromium touch emulation and1366×768 PC, followed by21 boss/shared-character/affix-transfer/storage/targeted-loot cases. Actual narrow/PC screenshots inspected. New input uses existing modal/rotation/repeat guards; readonly inspection cannot write a save.
- Browser plugin not available; repository Playwright used. Browser checks include real canvas-backed boss victory and actual reward persistence, not only a mock page. Initial Escape test left focus inside a select; corrected the test to focus the action button/use Close, retaining the game input policy.
- Evidence and full simulation JSON stay outside source control in this task's visualization workspace (`boss-equipment-qa`, `boss-equipment-regression`, `boss-balance.json`). CI and live publication outcomes are appended to the handoff after completion.
- Physical iPhone/Safari, the earlier audible SFX report and human farm-time playtesting remain unverified. No claim is made that the audio issue is fixed.
