import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';

// Token economy (owner 2026-11-04): CLAUDE.md is loaded into every Claude Code session and AGENTS.md into every
// Codex session, so they hold lasting rules only. Dated release notes go to the handoff log; history to
// docs/handoffs/archive/. These limits stop the files from silently growing back (CLAUDE.md went 14 → 37 KB
// between 2026-10-22 and 2026-11-04). See docs/context/TOKEN_ECONOMY_TH.md.
const LIMITS: Record<string, number> = {
  'CLAUDE.md': 24_000,
  'AGENTS.md': 2_500,
  'CURRENT_STATE.md': 6_000,
  'docs/handoffs/CODEX-TO-CLAUDE.md': 60_000,
  'docs/handoffs/NEW-CHAT-HANDOFF-TH.md': 2_000,
};
const MOVE_HINT = 'move dated/historical text verbatim to docs/handoffs/archive/<date>/ and keep a pointer';

describe('agent context files', () => {
  for (const [path, limit] of Object.entries(LIMITS)) {
    it(`${path} stays under ${limit} bytes`, () => {
      const size = statSync(path).size;
      expect(size, `${path} is ${size} bytes; ${MOVE_HINT}`).toBeLessThanOrEqual(limit);
    });
  }

  it('CLAUDE.md keeps the rules every session depends on', () => {
    const text = readFileSync('CLAUDE.md', 'utf8');
    for (const marker of [
      'Standing authorization: finish requested work without repeated approval',
      'asterveil-rise-beyond',
      'Never commit secrets',
      'Development rules',
      'Current architecture',
      'OD-13',
      'OD-14',
      'ม่านเวล',
      'feature/fateweave-initial-prototype',
      'CURRENT_STATE.md',
      'docs/context/UI_INPUT_RULES.md',
    ]) expect(text, `CLAUDE.md lost "${marker}"`).toContain(marker);
  });

  it('CLAUDE.md does not collect release notes again', () => {
    const headings = readFileSync('CLAUDE.md', 'utf8').split('\n').filter(line => line.startsWith('## '));
    const releaseHeadings = headings.filter(h => /published|merged|PR #\d+|\(PR/i.test(h));
    expect(releaseHeadings, 'release notes belong in docs/handoffs/CODEX-TO-CLAUDE.md').toEqual([]);
  });

  it('linked context documents exist', () => {
    for (const path of [
      'CURRENT_STATE.md',
      'docs/context/UI_INPUT_RULES.md',
      'docs/context/TOKEN_ECONOMY_TH.md',
      'docs/handoffs/archive/2026-11-04/CLAUDE.md',
      'docs/handoffs/archive/2026-11-04/CODEX-TO-CLAUDE.md',
      'docs/handoffs/archive/2026-11-04/NEW-CHAT-HANDOFF-TH.md',
      'docs/handoffs/archive/2026-11-04/CLAUDE-TO-CODEX-DEV-TH.md',
    ]) expect(existsSync(path), path).toBe(true);
  });
});
