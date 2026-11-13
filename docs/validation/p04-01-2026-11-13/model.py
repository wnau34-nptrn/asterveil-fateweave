#!/usr/bin/env python3
"""P04-01 star/shard pacing model (docs/design/p04/SCOPE_P04_00_TH.md, owner choices OD-15..OD-22).

Analysis only: no game code is imported or changed. Counts in *sessions* (one expedition, 20-30 min, OD-06).
Systems modelled as chosen by the owner on 2026-11-13:
  - stars cost character shards (OD-15); a duplicate is worth D shards; star costs 1/2/3/4 duplicates' worth
  - universal shards may pay 100% of any star (OD-16)
  - universal shard sources (OD-17): one-time first clears, a per-session run reward, a weekly-capped camp shop
    bought with gold, and 5-star duplicates (not reached in this horizon for most cases)
  - stars still cost ore 20/40/70/110 (OD-21)
  - no gacha (P10 is undecided): own shards only from buying the favourite again on the hiring board
Income baskets (ore/gold per session) follow GACHA_G01_ECONOMY_TH.md section 4 (thin/standard), minus the same
routine spend. Everything here is a draft range for the owner to choose from, not a proposal to ship.
Usage: python3 model.py [--players 2000] [--seed 20261113] [--out results.json]
"""
import argparse
import json
import random
import statistics

D = 10                                   # shards per duplicate (a scale only: results are read in duplicates)
STAR_DUPES = [1, 2, 3, 4]                # current starCosts (duplicates) for stars 2..5
STAR_ORE = [20, 40, 70, 110]             # current starCosts (ore), kept by OD-21
CATALOG = 15                             # OD-14: 15 active characters
OFFERS = 3                               # hiring board offers per return
HIRE_GOLD = 20
BASKETS = {                              # (ore, gold) per session after the routine spend (G01 section 4)
    'thin': ((42 - 20, 46 - 20), (18 - 5, 24 - 5)),
    'standard': ((86 - 20, 106 - 20), (38 - 5, 56 - 5)),
}
SCHEDULES = {                            # sessions per week; the weekly shop cap is shared by them
    '3/wk': [3], '4/wk': [4], '5/wk': [5], 'irregular 1-2/wk': [1, 2], 'returner (4 wk off then 3/wk)': 'returner',
}
FIRST_CLEARS = [1, 2, 4, 6, 8, 10]       # session index of the one-time grants (MAP1..3 clears, hard clears)


def week_sessions(schedule, rng, weeks=60):
    """Number of sessions in each week."""
    if schedule == 'returner':
        return [3, 3] + [0, 0, 0, 0] + [3] * (weeks - 6)
    return [rng.choice(schedule) for _ in range(weeks)]


def run(params, schedule, basket, favourite_at, rng, horizon=80):
    """Sessions until the favourite reaches 5 stars and until a core five all do (or None within the horizon)."""
    u_session, first_grant, shop_week, shop_price = params['u_session'], params['first_grant'], params['shop_week'], params['shop_price']
    (ore_lo, ore_hi), (gold_lo, gold_hi) = BASKETS[basket]
    weeks = week_sessions(schedule, rng)
    ore = gold = 0
    universal = 0
    own = {}                             # character -> own shards banked
    stars = {}                           # character -> stars (owned characters only)
    core = ['fav', 'c2', 'c3', 'c4', 'c5']
    joins = {'fav': favourite_at, 'c2': 0, 'c3': 1, 'c4': 2, 'c5': 4}   # starter + story recruits (G01 milestones)
    fav_done = core_done = None
    session = 0
    for week, count in enumerate(weeks):
        shop_left = shop_week
        for _ in range(count):
            session += 1
            if session > horizon:
                return fav_done, core_done
            for c, at in joins.items():
                if at <= session and c not in stars:
                    stars[c] = 1
            ore += rng.randint(ore_lo, ore_hi)
            gold += rng.randint(gold_lo, gold_hi)
            universal += u_session + (first_grant if session in FIRST_CLEARS else 0)
            # Weekly shop: universal shards for gold, up to the cap.
            while shop_left > 0 and gold >= shop_price:
                gold -= shop_price; universal += D; shop_left -= 1
            # Hiring board: buy the favourite again when offered and affordable (an own duplicate = D shards).
            if 'fav' in stars and stars['fav'] < 5 and rng.random() < OFFERS / CATALOG and gold >= HIRE_GOLD:
                gold -= HIRE_GOLD; own['fav'] = own.get('fav', 0) + D
            # Spend: favourite first, then the lowest-star core member (universal shards go where needed).
            progress = True
            while progress:
                progress = False
                order = sorted([c for c in core if c in stars and stars[c] < 5], key=lambda c: (c != 'fav', stars[c]))
                for c in order:
                    need = STAR_DUPES[stars[c] - 1] * D
                    have = own.get(c, 0)
                    if have + universal >= need and ore >= STAR_ORE[stars[c] - 1]:
                        take = min(have, need); own[c] = have - take; universal -= need - take
                        ore -= STAR_ORE[stars[c] - 1]; stars[c] += 1; progress = True
                        break
                    if c == 'fav':
                        break             # save for the favourite instead of spending on others
            if fav_done is None and stars.get('fav') == 5:
                fav_done = session
            if core_done is None and all(stars.get(c) == 5 for c in core):
                core_done = session
                return fav_done, core_done
    return fav_done, core_done


def pct(values, p):
    vals = sorted(v if v is not None else 999 for v in values)
    return vals[min(len(vals) - 1, int(p * len(vals)))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--players', type=int, default=2000)
    ap.add_argument('--seed', type=int, default=20261113)
    ap.add_argument('--out', default='results.json')
    a = ap.parse_args()
    grid = []
    for u_session in (2, 3, 4, 6, 8):               # universal shards per session (D=10: 10 = one duplicate)
        for first_grant in (0, 10, 20):             # per one-time first clear (6 of them)
            for shop_week in (0, 2):                # shop: duplicates' worth per week
                grid.append({'u_session': u_session, 'first_grant': first_grant, 'shop_week': shop_week, 'shop_price': 30})
    rows = []
    for i, params in enumerate(grid):
        for basket in BASKETS:
            for sname, sched in SCHEDULES.items():
                for fav_at in (0, 3):               # favourite from the start, or a recruit from session 3
                    rng = random.Random(f'{a.seed}:{i}:{basket}:{sname}:{fav_at}')
                    out = [run(params, sched, basket, fav_at, rng) for _ in range(a.players)]
                    fav = [o[0] for o in out]; core = [o[1] for o in out]
                    rows.append({**params, 'basket': basket, 'schedule': sname, 'favourite_at': fav_at,
                                 'fav_p50': pct(fav, .5), 'fav_p90': pct(fav, .9), 'core_p50': pct(core, .5), 'core_p90': pct(core, .9)})
    with open(a.out, 'w') as f:
        json.dump({'seed': a.seed, 'players': a.players, 'D': D, 'rows': rows}, f, indent=1, ensure_ascii=False)
    print(len(rows), 'rows written to', a.out)


if __name__ == '__main__':
    main()
