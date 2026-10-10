#!/usr/bin/env python3
"""Build ginza.html (Saturday 10.10 Ginza plan) from data/sat-ginza-*.json + data/sat-ginza-plan.json."""
import json, os, html, urllib.parse, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(ROOT, 'data')
e = lambda s: html.escape(str(s or ''))
q = lambda s: urllib.parse.quote(str(s or ''))

venues = []
for f in ('jp-posh-bars.json', 'jp-posh-clubs.json', 'jp-house-tonight.json', 'sat-ginza-clubs.json', 'sat-ginza-bars.json'):
    p = os.path.join(D, f)
    if os.path.exists(p):
        for v in json.load(open(p, encoding='utf-8')):
            if 'venue' in v and 'name_en' not in v:
                v['name_en'] = v['venue']; v['category'] = 'club'
                v['tonight_event'] = ' · '.join((', '.join(x) if isinstance(x, list) else str(x)) for x in (v.get('event_name'), v.get('djs'), v.get('genre')) if x)
                v['hours_saturday'] = f"{v.get('door_time','')}-{v.get('close_time','')}"
                v['entry_fee'] = v.get('door_price'); v['music'] = ', '.join(v['genre']) if isinstance(v.get('genre'), list) else v.get('genre'); v['address_en'] = v.get('address')
            if not any(x['id'] == v['id'] for x in venues):
                venues.append(v)
plan = json.load(open(os.path.join(D, 'sat-ginza-plan.json'), encoding='utf-8'))
order = {vid: i for i, vid in enumerate(plan['order'])}

notes = plan.get('notes', {})

CAT = {'club': ('Клуб', '#ff5fa2'), 'lounge': ('Лаунж', '#b48cff'), 'rooftop': ('Руфтоп', '#5cc8ff'),
       'cocktail': ('Коктейль-бар', '#e8b86b'), 'hotel-bar': ('Отельный бар', '#ffd27a')}

def card(i, v):
    cat, col = CAT.get(v.get('category'), CAT['club'] if 'club' in str(v.get('category','')) else ('Бар', '#e8b86b'))
    ph = v.get('photo_file')
    img = f'<img loading="lazy" src="{e(ph)}" alt="{e(v["name_en"])}">' if ph and os.path.exists(os.path.join(ROOT, ph)) else '<div class="noph">Фото нет - смотри Instagram / Google Maps</div>'
    gq = v.get('gmaps_query') or f"{v['name_en']} {v.get('address_en','')}"
    ig = v.get('instagram') or ''
    igv = v.get('instagram_verified')
    igok = (igv is True) or (isinstance(igv, dict) and igv.get('verified')) or (isinstance(igv, str) and igv.lower().startswith(('true', 'yes', 'verified')))
    n = notes.get(v['id'], {})
    rows = [('Сегодня', v.get('hours_saturday')), ('Последний вход', v.get('last_entry')), ('Событие', v.get('tonight_event')),
            ('Вход', v.get('entry_fee')), ('Напитки', v.get('drink_prices')), ('Дресс-код', v.get('dress_code')),
            ('Музыка', v.get('music')), ('Публика', v.get('crowd')), ('Адрес', ' / '.join(x for x in (v.get('address_en'), v.get('address_ja')) if x))]
    kv = ''.join(f'<div class="k">{e(k)}</div><div>{e(val)}</div>' for k, val in rows if val)
    src = ' · '.join(f'<a href="{e(s if isinstance(s,str) else s.get("url"))}" target="_blank" rel="noopener">{i2+1}</a>' for i2, s in enumerate(v.get('sources') or []))
    return f'''<article class="card" id="{e(v['id'])}">
 <div class="ph">{img}<span class="badge" style="background:{col}">{e(cat)}</span><span class="num">{i}</span></div>
 <div class="bd">
  <h2>{e(v['name_en'])}</h2><div class="ja">{e(v.get('name_ja'))}</div>
  {f'<div class="why">{e(n.get("why"))}</div>' if n.get('why') else ''}
  {f'<div class="note">{e(v.get("fit_reason"))}</div>' if v.get('fit_reason') and not n.get('why') else ''}
  <div class="btns">
   {f'<a class="btn ig" href="{e(ig)}" target="_blank" rel="noopener">Instagram{"" if igok else " (?)"}</a>' if ig else ''}
   <a class="btn pri" href="https://www.google.com/maps/search/?api=1&query={q(gq)}" target="_blank" rel="noopener">Google Maps</a>
  </div>
  <div class="btns">
   <a class="btn sm" href="https://www.google.com/maps/dir/?api=1&destination={q(gq)}&travelmode=walking" target="_blank" rel="noopener">🚶 Пешком</a>
   <a class="btn sm" href="https://www.google.com/maps/dir/?api=1&destination={q(gq)}&travelmode=driving" target="_blank" rel="noopener">🚕 Такси</a>
   {f'<a class="btn sm" href="{e(v.get("website"))}" target="_blank" rel="noopener">Сайт</a>' if v.get('website') else ''}
  </div>
  <div class="kv">{kv}</div>
  {f'<div class="warn">{e(v.get("caveats"))}</div>' if v.get('caveats') else ''}
  {f'<div class="small">Фото: {e(v.get("photo_credit"))}</div>' if ph else ''}
  <div class="small">Источники: {src} · проверено 10.10.2026</div>
 </div></article>'''

secs = plan.get('sections', [])
cards = ''
k = 0
for sec in secs:
    cards += f'<h2 class="sech">{sec["title"]}</h2><div class="sub">{sec.get("sub","")}</div>'
    for vid in sec['ids']:
        v = next((x for x in venues if x['id'] == vid), None)
        if v: k += 1; cards += card(k, v)
trains = ''.join(f'<tr><td class="t">{e(a)}</td><td>{b}</td></tr>' for a, b in plan['trains'])
steps = ''.join(f'<li>{s}</li>' for s in plan['steps'])
out = f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#0b0d12"><title>Ginza · суббота</title>
<style>
:root{{--bg:#0b0d12;--card:#171b25;--card2:#1e2330;--ink:#eef0f5;--mute:#9aa2b4;--line:#2a3040;--acc:#e8b86b;--warn:#ff8a7a}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}}
.wrap{{max-width:720px;margin:0 auto;padding:14px 16px 40px}}h1{{font-size:24px;margin:6px 0 2px}}.sub{{color:var(--mute);font-size:13px}}
a{{color:#7cc4ff}}.box{{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;margin:12px 0}}
.box h3{{margin:0 0 6px;font-size:16px;color:var(--acc)}}ol{{margin:0;padding-left:20px}}li{{margin:4px 0}}
table{{width:100%;border-collapse:collapse;font-size:14px}}td{{padding:6px 4px;border-bottom:1px solid var(--line);vertical-align:top}}td.t{{color:var(--acc);font-weight:700;white-space:nowrap}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;margin:16px 0}}
.ph{{position:relative;height:210px;background:var(--card2)}}.ph img{{width:100%;height:100%;object-fit:cover;display:block}}
.noph{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--mute);font-size:13px}}
.badge{{position:absolute;left:10px;top:10px;color:#111;font-weight:700;font-size:12px;padding:4px 9px;border-radius:999px}}
.num{{position:absolute;right:10px;top:10px;background:var(--acc);color:#111;font-weight:800;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center}}
.bd{{padding:12px 14px 14px}}h2{{margin:0;font-size:20px}}.ja{{color:var(--mute);font-size:13px}}
.why{{margin:8px 0;font-size:15px}}.note{{margin:8px 0;font-size:14px;color:var(--ink)}}
.btns{{display:flex;gap:8px;margin-top:8px}}.btn{{flex:1;display:flex;align-items:center;justify-content:center;min-height:46px;border-radius:12px;border:1px solid var(--line);background:var(--card2);color:var(--ink);text-decoration:none;font-weight:600}}
.btn.pri{{background:var(--acc);border-color:var(--acc);color:#1a1205}}.btn.ig{{background:linear-gradient(45deg,#f58529,#dd2a7b,#8134af);border:0;color:#fff}}.btn.sm{{min-height:40px;font-weight:500;font-size:14px}}
.kv{{display:grid;grid-template-columns:105px 1fr;gap:6px 10px;font-size:14px;margin-top:12px}}.k{{color:var(--mute)}}
.warn{{border-left:3px solid var(--warn);background:var(--card2);padding:8px 10px;border-radius:8px;font-size:13px;margin-top:10px}}
.sech{{font-size:21px;margin:26px 0 2px;color:var(--acc)}}.small{{font-size:12px;color:var(--mute);margin-top:6px}}
</style></head><body><div class="wrap">
<h1>Ginza · суббота 10.10</h1><div class="sub">Где познакомиться, house, не джаз · план на ~22:00 · данные проверены {e(plan['checked'])}</div>
<div class="box"><h3>План</h3><ol>{steps}</ol></div>
<div class="box"><h3>🚇 Поезда (суббота, Yahoo!乗換案内)</h3><table>{trains}</table></div>
{cards}
<div class="box"><h3>⚠️ Важно</h3><ol>{''.join(f'<li>{w}</li>' for w in plan['warnings'])}</ol></div>
<div class="sub">Instagram (?) = аккаунт не удалось подтвердить по официальному сайту. Публика и возраст - впечатления из обзоров, не статистика. <a href="./">← карта и все места Токио</a></div>
</div></body></html>'''
open(os.path.join(ROOT, 'ginza.html'), 'w', encoding='utf-8').write(out)
print('ginza.html', len(venues), 'venues', datetime.datetime.now().strftime('%H:%M'))
