"""Focused evidence checks; compares board port against original TypeScript bodies.

Uses Node 24 already required by the repository, plus the model's NumPy.
Does not import or modify the game, and does not require npm packages.
"""
import json
import subprocess

import numpy as np

from model import ROOT, board_offers, loot_tables, percentile_event, simulate


def main():
    javascript = r"""
const fs = require('node:fs');
const {stripTypeScriptTypes} = require('node:module');
const world = fs.readFileSync('src/core/world/world.ts', 'utf8');
const profile = fs.readFileSync('src/core/world/profile.ts', 'utf8');
const roll = world.slice(world.indexOf('export function rollPercent'), world.indexOf('export function tileAt'))
 .replace('export ', '').replaceAll(': number', '');
const board = profile.slice(profile.indexOf('export function boardOffers'), profile.indexOf('export function hireReason'))
 .replace('export ', '').replace('(profile: Profile, map: MapDefinition, lookup: EncounterLookup): string[]', '(profile, map, lookup)')
 .replace(': string[]', '');
const ids = ['guardian','tracer','weaver','healer','mira','toma','sefa','brann','lio','garran','metta','lalin','kael','wynne','astrid'];
const hireable = () => ids;
const map = {company:{offers:3,featured:ids.slice(10)}};
const run = new Function('hireable','map','ids', stripTypeScriptTypes(roll + '\n' + board) + `
return [0,1,42,20261109,4294967295].map(seed => [0,1,3,99].map(returns =>
boardOffers({seed,returns,refreshes:0,boardFeatured:ids.slice(10)},map,()=>null).map(id=>ids.indexOf(id))));`);
process.stdout.write(JSON.stringify(run(hireable,map,ids)));
"""
    actual = json.loads(subprocess.check_output(['node', '-e', javascript], cwd=ROOT, text=True))
    seeds = np.array([0, 1, 42, 20261109, 4294967295], dtype=np.uint64)
    for col, returns in enumerate([0, 1, 3, 99]):
        expected = board_offers(seeds, returns).tolist()
        assert expected == [row[col] for row in actual], (returns, expected, actual)
    tables = loot_tables()
    # Determinism + exact period totals (not averaged daily), preserved paid backfill.
    case = {'label': 'verification', 'free28': 96, 'paid30': 40}
    a = simulate(case, 24, 35, 20261109, tables)
    b = simulate(case, 24, 35, 20261109, tables)
    assert a == b
    assert a['snapshots'][28]['earned_tickets'] == 96 + 40 + 38
    missed = simulate({**case, 'skip_week': True}, 24, 35, 20261109, tables)
    assert missed['snapshots'][28]['earned_tickets'] == 96 - 16 + 40 + 38
    # A genuine negative control: counter/farm cannot upgrade with no retained ore.
    poor = simulate({'label': 'poor', 'route': 'thin', 'ore_reserve': 60,
                     'gold_reserve': 20}, 24, 35, 20261109, tables)
    assert poor['events']['favorite5_sessions']['completed_pct'] == 0
    assert poor['events']['favorite5_sessions']['median'] is None
    assert percentile_event([1] * 9 + [0], 10)['p90'] == 1
    assert percentile_event([1] * 8 + [0, 0], 10)['p90'] is None
    print('verify: original board/roll bodies agree for 20 seed/return pairs')
    print('verify: deterministic rerun, 28/30-day totals, missed week, ore negative control, censoring passed')


if __name__ == '__main__':
    main()
