"""Render concise Thai tables from results.json without changing its results."""
import argparse
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def value(x):
    return 'censored' if x is None else str(x)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input', type=Path, default=HERE/'results.json')
    p.add_argument('--output', type=Path, default=HERE/'TABLES_TH.md')
    args = p.parse_args()
    payload = json.loads(args.input.read_text())
    results = payload['results']
    meta = payload['metadata']
    lines = ['# ตารางผล G01 (สร้างด้วย report.py)', '',
             f"{len(results)} cases × {meta['players']} บัญชี × {meta['days']} วัน; seed{meta['seed']}. **Draft simulation ไม่ใช่ผลผู้เล่นจริง.**", '',
             'censored = ประชากรยังไม่ถึงquantileนั้นในขอบเขต; ไม่ใช่0/ค่าของผู้สำเร็จเท่านั้น. หน่วยวัน/ครั้งตามหัวตาราง; ที่มาวิธีและข้อจำกัดดู [README](README_TH.md).', '',
             '## คนโปรดและกลยุทธ์', '',
             '| case | ได้เป้าวัน median/P90 | ได้เป้าครั้ง median/P90 | ★5ครั้งจากเริ่ม median/P90/P99 | ★5หลังได้ตัวครั้ง median/P90 | ★5ภายใน10ครั้ง (%) |',
             '|---|---|---|---|---|---:|']
    for r in results:
        e = r['events']
        def pair(name):
            return '/'.join(value(e[name][q]) for q in ['median', 'p90'])
        triple = '/'.join(value(e['favorite5_sessions'][q]) for q in ['median', 'p90', 'p99'])
        lines.append(f"| {r['case']['label']} | {pair('target_days')} | {pair('target_sessions')} | {triple} | {pair('favorite5_after_acquisition_sessions')} | {r['favorite5_by_session10_pct']} |")
    lines += ['', '## สะสมและคอขวด', '',
              '| case | ทีม5สมาชิกครั้ง median/P90 | ทีม5งบproxyครั้ง median/P90 | ครบ15วัน median/P90 | 15คน★5วัน median/P90 | censored 15คน★5 (บัญชี) | เคยติดแร่ (%) |',
              '|---|---|---|---|---|---:|---:|']
    for r in results:
        e = r['events']
        def pair(name):
            return '/'.join(value(e[name][q]) for q in ['median', 'p90'])
        lines.append(f"| {r['case']['label']} | {pair('five_owned_sessions')} | {pair('five_budget_proxy_sessions')} | {pair('collection_days')} | {pair('all5_days')} | {e['all5_days']['censored']} | {r['accounts_ore_blocked_pct']} |")
    lines += ['', 'ทีม5งบproxyไม่พิสูจน์item/dust/tomeหรือความพร้อมผ่านบอส. all5วัด15คนตั้งต้น; cohortที่เต็มตั้งแต่แรกไม่ได้หมายถึงปั้นใหม่ใน1วัน.', '',
              '## ยอดคงเหลือ/กำลังผลิตสมมติ วัน365', '',
              '| case | ตั๋วได้สะสม | pull | ตั๋วเก็บ | แต้มmedian | กลางmedian | ★5median | poolปัจจุบัน | เต็มทั้งpool (%) |',
              '|---|---:|---:|---:|---:|---:|---:|---:|---:|']
    for r in results:
        if r['case']['label'] not in ['80_80_favorite', '80_96_favorite', '100_96_favorite',
                                     '80_96_monthly40', '80_96_monthly_packs100',
                                     '80_96_veteran_star3', '80_96_returner_star3',
                                     '80_96_full_roster_spend', '80_96_full_roster_hoard',
                                     '80_96_growth1_per90', '80_96_growth2_per90']:
            continue
        s = r['snapshots'][str(meta['days'])]
        lines.append(f"| {r['case']['label']} | {s['earned_tickets']} | {s['pulls']} | {s['tickets']} | {s['marks_median']} | {s['universal_median']} | {s['star5_median']} | {s['active_pool']} | {s['all_current5_pct']} |")
    lines += ['', 'growthเพิ่มเฉพาะในmodel ไม่ใช่อนุมัติเพิ่มตัว. ไม่มีตัวเลขใดรับรองรายได้ธุรกิจ/retention. แต้มค้างเมื่อเต็มไม่ใช่ข้อผิดพลาดและไม่ควรถูกยึดเพื่อระบายสต็อก.', '',
              '## พลังฟรี/จ่ายที่เวลาเล่นเท่ากัน (คนใหม่ เล่น3ครั้ง/สัปดาห์)', '',
              '| case | วัน | ★5median | คนโปรด★5 (%) | แต้มmedian |',
              '|---|---:|---:|---:|---:|']
    for r in results:
        if r['case']['label'] not in ['80_96_favorite', '80_96_monthly40', '80_96_monthly_packs100']:
            continue
        for day in ['14', '28', '90']:
            if day not in r['snapshots']:
                continue
            s = r['snapshots'][day]
            lines.append(f"| {r['case']['label']} | {day} | {s['star5_median']} | {s['favorite5_pct']} | {s['marks_median']} |")
    args.output.write_text('\n'.join(lines)+'\n')


if __name__ == '__main__':
    main()
