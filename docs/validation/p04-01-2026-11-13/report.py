#!/usr/bin/env python3
"""Tables for P04-01 from results.json (model.py). Usage: python3 report.py [--input results.json] [--output TABLES_TH.md]"""
import argparse
import json

SCHEDULES = ['3/wk', '4/wk', '5/wk', 'irregular 1-2/wk', 'returner (4 wk off then 3/wk)']
SHORT = {'3/wk': '3', '4/wk': '4', '5/wk': '5', 'irregular 1-2/wk': '1–2', 'returner (4 wk off then 3/wk)': 'กลับมา'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', default='results.json')
    ap.add_argument('--output', default='TABLES_TH.md')
    a = ap.parse_args()
    data = json.load(open(a.input))
    rows = {(r['u_session'], r['first_grant'], r['shop_week'], r['basket'], r['schedule'], r['favourite_at']): r for r in data['rows']}
    keys = sorted({k[:3] for k in rows})
    fmt = lambda v: '—' if v >= 999 else str(v)
    out = [f"# P04-01 ตาราง (สร้างจาก results.json · {data['players']} บัญชีต่อกรณี · seed {data['seed']})", '',
           'หน่วย: ครั้งเล่น (หนึ่งเที่ยวเดินทาง) · ค่ามัธยฐาน (p50) และเปอร์เซ็นไทล์ 90 (p90) · “—” = ไม่ถึงภายใน 80 ครั้ง',
           'คอลัมน์: u = เศษกลางต่อครั้งเล่น (10 = ตัวซ้ำหนึ่งตัว) · F = เศษกลางต่อการผ่านครั้งแรก (6 ครั้ง) · ร้าน = ตัวซ้ำต่อสัปดาห์ที่ซื้อได้ (30 ทอง)', '']
    for basket in ('standard', 'thin'):
        out += [f'## รายได้แบบ {basket}', '',
                '| u | F | ร้าน | คนโปรด ★5 p50 (ได้ตัวครั้งที่ 3) ตามครั้ง/สัปดาห์ ' + ' / '.join(SHORT[s] for s in SCHEDULES) + ' | p90 แย่สุด | คนโปรด ★5 p50 (มีตั้งแต่เริ่ม, 4/สัปดาห์) | ทีมห้า ★5 p50 / p90 (4/สัปดาห์) |',
                '|---|---|---|---|---|---|---|']
        for u, f, sh in keys:
            fav = [rows[(u, f, sh, basket, s, 3)]['fav_p50'] for s in SCHEDULES]
            p90 = max(rows[(u, f, sh, basket, s, at)]['fav_p90'] for s in SCHEDULES for at in (0, 3))
            start = rows[(u, f, sh, basket, '4/wk', 0)]['fav_p50']
            core = rows[(u, f, sh, basket, '4/wk', 3)]
            out.append(f"| {u} | {f} | {sh} | {' / '.join(fmt(v) for v in fav)} | {fmt(p90)} | {fmt(start)} | {fmt(core['core_p50'])} / {fmt(core['core_p90'])} |")
        out.append('')
    open(a.output, 'w').write('\n'.join(out))
    print('wrote', a.output)


if __name__ == '__main__':
    main()
