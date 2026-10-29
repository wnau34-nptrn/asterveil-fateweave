import { saveGame, type Game } from '../../src/core/save/expedition-save';

// UI fixtures exercise the current rules. Historical envelopes belong in migration tests.
export function currentSave(game: Game): string {
  let raw = '';
  if (!saveGame({ getItem: () => null, setItem: (_key, value) => { raw = value; } }, game)) {
    throw new Error('Could not serialize browser fixture');
  }
  return raw;
}
