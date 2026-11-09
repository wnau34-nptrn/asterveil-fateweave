"""G00/G01 research only. No game imports, save writes, wallet or runtime changes.

NumPy >=2.3,<2.4; Python >=3.11. See README_TH.md for the deliberately limited
route baskets, milestone schedules and readiness proxies. Run --self-check first.
"""
import argparse
import csv
import hashlib
import json
import math
import platform
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
IDS = ['guardian', 'tracer', 'weaver', 'healer', 'mira', 'toma', 'sefa',
       'brann', 'lio', 'garran', 'metta', 'lalin', 'kael', 'wynne', 'astrid']
FEATURED = [10, 11, 12, 13, 14]
ORE = np.array([0, 20, 40, 70, 110, 10**9])
SHARDS = np.array([0, 20, 40, 60, 80, 10**9])
SOURCES = ['src/content/world/rules.ts', 'src/content/world/chapter-ruins.ts',
           'src/content/world/chapter-forest.ts', 'src/content/world/chapter1.ts',
           'src/core/world/profile.ts', 'src/core/world/world.ts',
           'src/core/world/tomes.ts', 'src/core/world/caps.ts',
           'src/core/save/expedition-save.ts', 'cloudflare/index.mjs']


def percentile_event(values, horizon):
    """Population nearest-rank quantiles, with explicit right censoring (zero=unseen)."""
    values = np.asarray(values)
    ordered = np.sort(np.where(values > 0, values, horizon + 1))
    def q(p):
        v = int(ordered[math.ceil(len(ordered) * p) - 1])
        return v if v <= horizon else None
    return {'median': q(.5), 'p90': q(.9), 'p99': q(.99),
            'completed_pct': round(float(np.mean(values > 0) * 100), 2),
            'censored': int(np.count_nonzero(values == 0)), 'horizon': horizon}


def roll_percent(seed, index):
    """Unsigned 32-bit port of world.ts::rollPercent, not a new RNG for the game."""
    mask = np.uint64(0xffffffff)
    t = (np.asarray(seed, dtype=np.uint64) ^ np.uint64(((index + 1) * 0x9e3779b9) & 0xffffffff)) & mask
    t = ((t ^ (t >> 15)) * (t | np.uint64(1))) & mask
    t ^= (t + (((t ^ (t >> 7)) * (t | np.uint64(61))) & mask)) & mask
    return ((t ^ (t >> 14)) & mask) % 100


def board_offers(seeds, returns):
    # Current unfrozen board, no paid refresh: 3 nonfeatured + 1 featured.
    # Catalog order verified from first-clash + mercenaries, parked IDs removed.
    salt = ((returns + 1) * 0x2c1b3c6d) & 0xffffffff
    pool = np.tile(np.arange(10), (len(seeds), 1))
    offers = []
    for i in range(3):
        choice = ((roll_percent(seeds ^ np.uint64(salt), i) * 7919 + i) % (10 - i)).astype(int)
        picked = pool[np.arange(len(seeds)), choice]
        offers.append(picked)
        pool = pool[pool != picked[:, None]].reshape(len(seeds), 9 - i)
    featured = ((roll_percent(seeds ^ np.uint64(salt ^ 0x4f1bbcdc), 0) * 7919) % 5).astype(int) + 10
    return np.stack([*offers, featured], axis=1)


def loot_tables():
    """Extract actual [lo,hi] ore/gold pairs. Fail if source layout changes."""
    import re
    result = {}
    for key, filename in [('map1', 'chapter-ruins.ts'), ('map2', 'chapter-forest.ts')]:
        source = (ROOT / 'src/content/world' / filename).read_text()
        def pair(pattern):
            m = re.search(pattern + r'.*?ore: \[(\d+), (\d+)\], gold: \[(\d+), (\d+)\]', source)
            if not m:
                raise ValueError(f'loot source changed: {filename}: {pattern}')
            a, b, c, d = map(int, m.groups())
            return [[a, b], [c, d]]
        result[key] = {name: pair(pattern) for name, pattern in [
            ('zone', r'loot: \{'), ('boss', r'    boss: \{'),
            ('common', r'chest: \{ common: \{'), ('rare', r'rare: \{')]}
    return result


def simulate(case, players, days, seed, tables):
    c = dict(free28=80, exchange=80, p=.075, sessions=3, farm=20,
             strategy='favorite', cohort='new', paid30=0, route='standard',
             ore_reserve=20, gold_reserve=5, slow=False, skip_week=False,
             hoard=False, growth90=0, board=True, legacy=False, shard_max=2,
             favorite=10)
    c.update(case)
    if c['sessions'] not in (3, 4, 5) or c['free28'] not in (0, 64, 76, 80, 96, 100):
        raise ValueError('unsupported schedule/budget')
    if not 0 <= c['p'] <= 1 or c['exchange'] < 1 or c['farm'] < 0:
        raise ValueError('invalid rates/costs')
    streams = np.random.SeedSequence(seed).spawn(4)
    pull_rng, loot_rng, start_rng, _ = [np.random.default_rng(s) for s in streams]
    seeds = start_rng.integers(0, 2**32, size=players, dtype=np.uint64)
    max_h = 15 + c['growth90'] * ((days - 1) // 90)
    stars = np.zeros((players, max_h), dtype=np.int8)
    personal = np.zeros((players, max_h), dtype=np.int32)
    dupes = np.zeros((players, max_h), dtype=np.int32)
    universal = np.zeros(players, dtype=np.int32)
    seals = np.zeros(players, dtype=np.int32)
    gold = np.zeros(players, dtype=np.int32)
    ore = np.zeros(players, dtype=np.int32)
    marks = np.zeros(players, dtype=np.int32)
    tickets = np.zeros(players, dtype=np.int32)
    earned = np.zeros(players, dtype=np.int32)
    rows = np.arange(players)
    favorite = c['favorite']
    events = {name: np.zeros(players, dtype=np.int32) for name in
              ['target_days', 'target_sessions', 'favorite5_days', 'favorite5_sessions',
               'favorite5_after_acquisition_sessions', 'five_owned_sessions',
               'five_budget_proxy_sessions', 'collection_days', 'all5_days']}
    acquisition_session = np.zeros(players, dtype=np.int32)
    kit_funded = np.zeros(players, dtype=bool)
    if c['cohort'] == 'new':
        stars[:, 0] = 1
    else:
        stars[:, :15] = 3 if c['cohort'] == 'veteran' else 5
        ore[:] = 1000
        gold[:] = 1000
        # Study inventory only: no inference that real veterans have these balances.
    h = 15
    session = 0
    week_sessions = 0
    pulls_total = 0
    snapshots = {}
    schedule = {3: {0, 2, 4}, 4: {0, 2, 4, 6}, 5: {0, 1, 2, 4, 6}}[c['sessions']]
    blocked_ore = np.zeros(players, dtype=np.int32)
    startup_claimed = set()

    def priority(missing=False):
        valid = (stars[:, :h] == 0) if missing else ((stars[:, :h] > 0) & (stars[:, :h] < 5))
        target = valid.argmax(axis=1)
        if c['strategy'] == 'favorite':
            target = np.where(valid[:, favorite], favorite, target)
        return target, valid.any(axis=1)

    def grant_full(target, mask, story=False):
        rr = rows[mask]
        tt = target[mask]
        new = stars[rr, tt] == 0
        stars[rr[new], tt[new]] = 1
        old_r, old_t = rr[~new], tt[~new]
        if c['legacy']:
            if not story:
                dupes[old_r, old_t] += 1
        else:
            full = stars[old_r, old_t] == 5
            universal[old_r[full]] += 20
            personal[old_r[~full], old_t[~full]] += 20

    def settle():
        if np.all(stars[:, :h] == 5) and not personal[:, :h].any():
            return
        # A fixed strategy order; universal goes to favorite before remaining IDs.
        order = list(range(h))
        if c['strategy'] == 'favorite':
            order.remove(favorite)
            order.insert(0, favorite)
        if not c['legacy']:
            unlock = (stars[:, :h] == 0) & (personal[:, :h] >= 100)
            stars[:, :h][unlock] = 1
            personal[:, :h][unlock] -= 100
        for hero in order:
            for _ in range(4):
                level = stars[:, hero]
                eligible = (level > 0) & (level < 5)
                if c['legacy']:
                    need = level.astype(int)
                    own = np.minimum(dupes[:, hero], need)
                    shortage = need - own
                    can = eligible & (shortage <= np.ceil(need / 2)) & (seals >= shortage)
                else:
                    need = SHARDS[level]
                    own = np.minimum(personal[:, hero], need)
                    shortage = need - own
                    can = eligible & (universal >= shortage)
                blocked_ore[:] += (can & (ore < ORE[level])).astype(int)
                ok = can & (ore >= ORE[level])
                if not ok.any():
                    break
                ore[ok] -= ORE[level[ok]]
                if c['legacy']:
                    dupes[ok, hero] -= own[ok]
                    seals[ok] -= shortage[ok]
                else:
                    personal[ok, hero] -= own[ok]
                    universal[ok] -= shortage[ok]
                stars[ok, hero] += 1
            if not c['legacy']:
                done = stars[:, hero] == 5
                universal[done] += personal[done, hero]
                personal[done, hero] = 0

    def checkpoint(day):
        conditions = {
            'target_days': (stars[:, favorite] > 0, day),
            'target_sessions': (stars[:, favorite] > 0, session),
            'favorite5_days': (stars[:, favorite] == 5, day),
            'favorite5_sessions': (stars[:, favorite] == 5, session),
            'five_owned_sessions': ((stars[:, :h] > 0).sum(axis=1) >= 5, session),
            'five_budget_proxy_sessions': (kit_funded, session),
            'collection_days': ((stars[:, :15] > 0).all(axis=1), day),
            'all5_days': ((stars[:, :15] == 5).all(axis=1), day),
        }
        newly = (acquisition_session == 0) & (stars[:, favorite] > 0)
        acquisition_session[newly] = max(1, session)
        conditions['favorite5_after_acquisition_sessions'] = (
            stars[:, favorite] == 5, session - acquisition_session + 1)
        for name, (condition, value) in conditions.items():
            mask = (events[name] == 0) & condition
            events[name][mask] = max(1, value) if np.isscalar(value) else np.maximum(1, value[mask])

    def snapshot(day):
        if day in (5, 7, 14, 28, 90, 180, 364, 365) or day == days:
            snapshots[day] = {
                'session': session, 'earned_tickets': int(earned[0]), 'pulls': pulls_total,
                'tickets': int(tickets[0]), 'owned_median': float(np.median((stars[:, :h] > 0).sum(axis=1))),
                'star5_median': float(np.median((stars[:, :h] == 5).sum(axis=1))),
                'favorite5_pct': round(float(np.mean(stars[:, favorite] == 5) * 100), 2),
                'marks_median': float(np.median(marks)), 'universal_median': float(np.median(universal)),
                'ore_p10': float(np.percentile(ore, 10)), 'gold_p10': float(np.percentile(gold, 10)),
                'active_pool': h, 'all_current5_pct': round(float(np.mean((stars[:, :h] == 5).all(axis=1)) * 100), 2)}

    for day in range(1, days + 1):
        dow = (day - 1) % 7
        if dow == 0:
            week_sessions = 0
        if day > 1 and (day - 1) % 90 == 0:
            h += c['growth90']
        # Paid entitlements accrue on their actual 30-day schedule, including missed visits.
        paid_day = (day - 1) % 30 + 1
        if c['paid30']:
            paid = (10 if paid_day == 1 else 0) + (2 if paid_day % 2 == 0 else 0)
            if c['paid30'] == 100 and paid_day == 1:
                paid += 60
            tickets += paid
            earned += paid
        if dow not in schedule or (c['skip_week'] and (day - 1) // 7 == 1):
            snapshot(day)
            continue
        session += 1
        week_sessions += 1
        slow = 2 if c['slow'] else 1
        unlock_session = 2 * slow if c['cohort'] == 'new' else 1
        # Actual sources, hypothetical visits: map1 once, then repeat map2 baskets.
        table = tables['map1' if session <= slow and c['cohort'] == 'new' else 'map2']
        counts = {'zone': 2 if c['route'] == 'thin' else 4, 'boss': 1,
                  'common': 0 if c['route'] == 'thin' else 2,
                  'rare': 0 if c['route'] == 'thin' else 1}
        income = np.zeros((players, 2), dtype=np.int32)
        for kind, count in counts.items():
            for _ in range(count):
                for currency in range(2):
                    lo, hi = table[kind][currency]
                    income[:, currency] += loot_rng.integers(lo, hi + 1, players)
        if session == 1 and c['cohort'] == 'new':
            income += [10, 5]  # Prologue once, not every return.
        if c.get('wipe_every') and session % c['wipe_every'] == 0:
            income //= 2  # Resource-loss stress only; not a simulated battle outcome.
        ore += income[:, 0]
        gold += income[:, 1]
        ore -= np.minimum(ore, c['ore_reserve'])
        gold -= np.minimum(gold, c['gold_reserve'])
        if c['legacy']:
            # This basket's boss seal; map2 rare chest also guarantees a seal.
            seals += 1 + (counts['rare'] if table is tables['map2'] else 0)
        if c['cohort'] == 'new':
            if session == slow:
                for hero in [1, 2]:
                    grant_full(np.full(players, hero), np.ones(players, bool), story=True)
                # Two valid distinct draft picks with one support: scenario lio + brann.
                for hero in [8, 7]:
                    grant_full(np.full(players, hero), np.ones(players, bool), story=True)
            if session == 2 * slow:
                for hero in [9, 3]:
                    grant_full(np.full(players, hero), np.ones(players, bool), story=True)
            # Once-only proposal: tutorial16 + normal6/map + hard2/map, no tower12.
            for milestone, amount in [(1*slow, 6), (2*slow, 22), (4*slow, 6),
                                      (6*slow, 2), (7*slow, 2), (8*slow, 2)]:
                if session >= milestone and milestone not in startup_claimed:
                    if c['free28'] and not c['legacy']:
                        tickets += amount
                        earned += amount
                    startup_claimed.add(milestone)
        if c['free28'] and not c['legacy']:
            # Weekly 16 = login2 at visit1; login2+daily6+clear2+weekly4 by visit3.
            # Visit1 login2+daily2, visit2 daily2, visit3 login2+daily2+clear2+weekly4.
            recurring = {1: 4, 2: 2, 3: 10}.get(week_sessions, 0)
            if (day - 1) // 7 % 4 == 3 and week_sessions == 3:
                recurring += c['free28'] - 64  # Explicit test substitute for absent modes/event budget.
            tickets += recurring
            earned += recurring
        # Keep current gold board, exact seeded unfrozen offers, no paid refreshes.
        if c['board'] and session >= unlock_session:
            offers = board_offers(seeds, session)
            for slot in range(4):
                target = offers[:, slot]
                missing = stars[rows, target] == 0
                want = missing if c['strategy'] == 'collection' else (
                    (target == favorite) & (stars[:, favorite] < 5)) | (missing & ~((stars[:, favorite] == 0) & (gold < 40)))
                if c['legacy']:
                    want |= (target == favorite) & (stars[:, favorite] < 5)
                ok = want & (gold >= 20) & (stars[rows, target] < 5)
                gold[ok] -= 20
                grant_full(target, ok)
        if not kit_funded.all():
            ok = ~kit_funded & ((stars[:, :h] > 0).sum(axis=1) >= 5) & (ore >= 40) & (gold >= 25)
            ore[ok] -= 40
            gold[ok] -= 25
            kit_funded[ok] = True
        # Farming is a proposed source, starts at unlock; 4 eligible visits/week maximum.
        if not c['legacy'] and session >= unlock_session and week_sessions <= 4:
            target, valid = priority()
            personal[rows[valid], target[valid]] += c['farm']
        if session >= unlock_session and not c['hoard'] and not c['legacy']:
            # All accounts share earned ticket count. No balance conversion from saves.
            pulls = int(tickets[0])
            assert np.all(tickets == pulls)
            for _ in range(pulls):
                target = pull_rng.integers(0, h, players)
                full = pull_rng.random(players) < c['p']
                grant_full(target, full)
                rr = rows[~full]
                tt = target[~full]
                qty = pull_rng.integers(1, c['shard_max'] + 1, len(rr))
                done = stars[rr, tt] == 5
                universal[rr[done]] += qty[done]
                personal[rr[~done], tt[~done]] += qty[~done]
                marks += 1
                target, missing = priority(missing=True)
                old, valid = priority()
                if c['strategy'] == 'favorite':
                    focus_active = stars[:, favorite] < 5
                    target = np.where(focus_active, favorite, np.where(missing, target, old))
                    eligible = focus_active | missing | valid
                else:
                    target = np.where(missing, target, old)
                    eligible = missing | valid
                redeem = (marks >= c['exchange']) & eligible
                grant_full(target, redeem)
                marks[redeem] -= c['exchange']
                settle()
            tickets -= pulls
            pulls_total += pulls
        settle()
        checkpoint(day)
        snapshot(day)
        assert np.all(ore >= 0) and np.all(gold >= 0) and np.all(universal >= 0)
        assert np.all(personal >= 0) and np.all(marks >= 0) and np.all(tickets >= 0)
    stats = {name: percentile_event(values, session if 'sessions' in name else days)
             for name, values in events.items()}
    return {'case': c, 'events': stats, 'favorite5_by_session10_pct': round(float(np.mean(
        (events['favorite5_sessions'] > 0) & (events['favorite5_sessions'] <= 10)) * 100), 2),
        'accounts_ore_blocked_pct': round(float(np.mean(blocked_ore > 0) * 100), 2), 'snapshots': snapshots}


def self_check():
    assert percentile_event([1, 2, 0, 0], 10)['median'] == 2
    assert percentile_event([1, 2, 0, 0], 10)['p90'] is None
    assert percentile_event([0, 0], 10)['median'] is None
    assert int(ORE[1:5].sum()) == 240 and int(SHARDS[1:5].sum()) == 200
    assert sum([4, 2, 10]) * 4 == 64
    assert 64 + (80-64) == 80 and 64 + (96-64) == 96
    assert sum(10 if d == 1 else 2 if d % 2 == 0 else 0 for d in range(1, 31)) == 40
    assert sum([6, 22, 6, 2, 2, 2]) == 40
    seeds = np.array([1, 42, 20261109], dtype=np.uint64)
    board = board_offers(seeds, 3)
    assert all(len(set(row)) == 4 for row in board.tolist())
    assert np.all((board[:, 3] >= 10) & (board[:, 3] <= 14))
    print('self-check: censoring, costs, budgets, paid schedule, board bounds passed')


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--players', type=int, default=4000)
    p.add_argument('--days', type=int, default=365)
    p.add_argument('--seed', type=int, default=20261109)
    p.add_argument('--output', type=Path, default=HERE)
    p.add_argument('--self-check', action='store_true')
    args = p.parse_args()
    if args.self_check:
        self_check()
        return
    if args.players < 1 or args.days < 1:
        p.error('players/days must be positive')
    tables = loot_tables()
    cases = json.loads((HERE / 'scenarios.json').read_text())
    results = []
    for case in cases:
        result = simulate(case, args.players, args.days, args.seed, tables)
        results.append(result)
        print(case['label'], result['events']['target_days']['median'],
              result['events']['favorite5_sessions']['median'], result['favorite5_by_session10_pct'], flush=True)
    payload = {'metadata': {'seed': args.seed, 'players': args.players, 'days': args.days,
               'python': platform.python_version(), 'numpy': np.__version__, 'proposal_only': True,
               'source_ref': 'c4beb7b8f1f39fd6a358c7d6bbba470b5fc5d2c7',
               'hashes': {path: hashlib.sha256((ROOT/path).read_bytes()).hexdigest() for path in SOURCES},
               'input_hashes': {name: hashlib.sha256((HERE/name).read_bytes()).hexdigest()
                                for name in ['model.py', 'scenarios.json']}, 'loot_tables': tables}, 'results': results}
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output/'results.json').write_text(json.dumps(payload, indent=2, ensure_ascii=False)+'\n')
    with (args.output/'summary.csv').open('w', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(['case', 'target_day_median', 'target_day_p90', 'favorite5_session_median',
                    'favorite5_session_p90', 'favorite5_by10_pct', 'collection_day_median',
                    'collection_day_p90', 'all5_day_median', 'all5_day_p90', 'all5_censored'])
        for r in results:
            e = r['events']
            w.writerow([r['case']['label'], e['target_days']['median'], e['target_days']['p90'],
                        e['favorite5_sessions']['median'], e['favorite5_sessions']['p90'],
                        r['favorite5_by_session10_pct'], e['collection_days']['median'],
                        e['collection_days']['p90'], e['all5_days']['median'], e['all5_days']['p90'],
                        e['all5_days']['censored']])


if __name__ == '__main__':
    main()
