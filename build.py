#!/usr/bin/env python3
"""Merge research JSON (data/*.json) into data/venues.js for the static explorer.
Run: python3 build.py   (needs network once for walking-route geometry; cached in data/legs_cache.json)"""
import json, re, os, sys, glob, time, urllib.request, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data')
CHECKED = '2026-10-09'

HOTEL = {"name": "JR East Hotel Mets Premier Akihabara", "address": "1-17-4 Sotokanda, Chiyoda (JR Akihabara, Electric Town South exit, 1 min)",
         "lat": 35.6981, "lng": 139.7722, "gmaps_query": "JR East Hotel Mets Premier Akihabara"}

# transit from the hotel per area (from data/transport.json, Yahoo!乗換案内 checked 2026-10-09; 'approx' where not looked up)
TRANSIT = {
 "Roppongi":    {"short": "Hibiya line direct 23 min · ¥209", "long": "Tokyo Metro Hibiya line from Akihabara straight to Roppongi, 23 min, ¥209 (IC). Last direct back 23:55", "taxi": "¥4.5-5.5k night"},
 "Nishi-Azabu": {"short": "Hibiya line 23 min + walk ~11 min", "long": "Hibiya line to Roppongi (23 min, ¥209), then ~11 min walk down Roppongi-dori to the Nishi-Azabu crossing", "taxi": "¥4.5-5.5k night"},
 "Azabu-Juban": {"short": "~28 min · ¥377 (or Roppongi + 13 min walk)", "long": "About 28 min, ¥377 (JR + Namboku line); or Hibiya line to Roppongi and ~13 min walk downhill", "taxi": "~¥5k night"},
 "Azabudai":    {"short": "Hibiya line to Kamiyacho 20 min · ¥209", "long": "Hibiya line from Akihabara to Kamiyacho (20 min, ¥209); Azabudai Hills is connected to the station", "taxi": "~¥4-5k night"},
 "Toranomon":   {"short": "Hibiya line to Toranomon Hills 18 min · ¥178", "long": "Hibiya line from Akihabara to Toranomon Hills station, 18 min, ¥178", "taxi": "~¥3.5-4.5k night"},
 "Ginza":       {"short": "Hibiya line direct 12 min · ¥178", "long": "Hibiya line from Akihabara to Ginza, 12 min, ¥178. Last direct back 00:06", "taxi": "¥2.5-3.2k night"},
 "Marunouchi":  {"short": "JR to Tokyo/Yurakucho ~5-8 min (approx)", "long": "JR Yamanote / Keihin-Tohoku from Akihabara to Tokyo or Yurakucho, roughly 5-8 min (approx, not looked up)", "taxi": "~¥2-3k night"},
 "Yaesu":       {"short": "JR to Tokyo Stn ~5 min (approx)", "long": "JR Yamanote / Keihin-Tohoku to Tokyo station (approx 5 min), Yaesu side", "taxi": "~¥2-2.5k night"},
 "Nihonbashi":  {"short": "JR/Metro ~5-10 min (approx)", "long": "Short ride (approx 5-10 min) or ~20-25 min walk", "taxi": "~¥2k night"},
 "Hibiya":      {"short": "Hibiya line ~10 min (approx)", "long": "Hibiya line from Akihabara to Hibiya, about 10 min (approx)", "taxi": "~¥2.5-3k night"},
 "Shibuya":     {"short": "JR Yamanote 30 min · ¥253", "long": "JR Yamanote line from Akihabara to Shibuya, ~30 min, ¥253. Last back 00:13", "taxi": "¥6-7.5k night"},
 "Ebisu":       {"short": "Hibiya line direct ~30 min (approx)", "long": "Hibiya line runs direct Akihabara-Ebisu (about 30 min, approx) or JR Yamanote. Last JR back 00:15", "taxi": "¥6-7.5k night"},
 "Aoyama":      {"short": "Ginza line ~20 min (approx)", "long": "Ginza line from Suehirocho (5 min walk from hotel) to Omotesando/Gaienmae, about 20 min (approx)", "taxi": "~¥5-6k night"},
 "Shinjuku":    {"short": "JR Chuo/Sobu 16-20 min · ¥209", "long": "JR Chuo-Sobu line from Akihabara to Shinjuku, 16-20 min, ¥209. Last back 00:15", "taxi": "¥5-6k night"},
 "Akihabara":   {"short": "walk", "long": "Walk from the hotel", "taxi": "-"},
 "Kanda":       {"short": "walk ~10-15 min", "long": "Walk from the hotel or 1 stop on JR", "taxi": "-"},
 "Jimbocho":    {"short": "walk ~20 min / taxi", "long": "~20 min walk or short taxi", "taxi": "~¥1.5k"},
 "Ueno":        {"short": "JR 1-2 stops (approx 3 min)", "long": "JR Yamanote/Keihin-Tohoku 2 stops (approx)", "taxi": "~¥1.5k"},
 "Ochanomizu":  {"short": "JR 1 stop / walk ~15 min", "long": "JR Chuo-Sobu 1 stop or ~15 min walk", "taxi": "~¥1.5k"},
}
RANK = {'maduro-grand-hyatt':9,'roku-nana-roppongi':8,'two-rooms-aoyama':8,'the-sg-club':8,'gold-bar-edition-toranomon':8,'oak-door-bar-grand-hyatt':7,'ce-la-vi-tokyo':7,'punch-room-edition-ginza':7,'zouk-tokyo':6,'new-york-bar-park-hyatt':6,'bar-benfiddich':6,'janu-bar-azabudai':5,'bar-trench':5,'ritz-carlton-the-bar':5,'andaz-rooftop-bar':5,'bar-high-five':5,'orchard-night-kanda':4,'cocktail-works-jimbocho':4,'1oak-tokyo':4,'bvlgari-bar-tokyo':4,'peter-the-bar-peninsula':3,'r3-club-lounge':2,'the-roof-edition-ginza':2}
AREA_ORDER = ["Roppongi","Nishi-Azabu","Azabu-Juban","Azabudai","Toranomon","Ginza","Hibiya","Marunouchi","Yaesu","Nihonbashi","Shibuya","Ebisu","Aoyama","Shinjuku","Akihabara","Kanda","Jimbocho","Ochanomizu","Ueno"]
AREA_ALIAS = {"Yurakucho":"Marunouchi","Omotesando":"Aoyama","Azabudai Hills":"Azabudai","Kamiyacho":"Azabudai","Toranomon Hills":"Toranomon",
              "Nishiazabu":"Nishi-Azabu","Azabujuban":"Azabu-Juban","Kabukicho":"Shinjuku","Nishi-Shinjuku":"Shinjuku","Shinjuku 3-chome":"Shinjuku",
              "Higashi-Ginza":"Ginza","Tokyo Station":"Yaesu","Kanda-Jimbocho":"Jimbocho","Jinbocho":"Jimbocho","Hiroo":"Nishi-Azabu"}

HM = re.compile(r'(\d{1,2}):(\d{2})\s*(?:-|–|—|~|〜|to)\s*(\d{1,2}):(\d{2})')
def parse_hours(s):
    if not s: return None
    out = []
    for a, b, c, d in HM.findall(s):
        st = int(a) * 60 + int(b); en = int(c) * 60 + int(d)
        if st < 6 * 60: st += 1440
        if en <= st: en += 1440
        while en - st > 1440: en -= 1440
        out.append([st, en])
    return out or None

def load_venues():
    vs, seen = [], set()
    for f in sorted(glob.glob(os.path.join(DATA, '*.json'))):
        name = os.path.basename(f)
        if name in ('transport.json', 'routes.json', 'areas.json', 'legs_cache.json'): continue
        try:
            arr = json.load(open(f, encoding='utf-8'))
        except Exception as e:
            print('!! bad json', name, e); continue
        if isinstance(arr, dict): arr = arr.get('venues', [])
        for v in arr:
            if v.get('exclude') or v['id'] in seen: continue
            seen.add(v['id'])
            v['area'] = AREA_ALIAS.get(v.get('area', ''), v.get('area', ''))
            v['open'] = parse_hours(v.get('hours_friday', ''))
            v['transit'] = TRANSIT.get(v['area'])
            v['rank'] = RANK.get(v['id'], 3)
            ph = []
            for p in v.get('photos') or []:
                fp = os.path.join(ROOT, p.get('file', ''))
                if p.get('file') and os.path.exists(fp) and os.path.getsize(fp) > 8000: ph.append(p)
                else: print('  missing photo', v['id'], p.get('file'))
            v['photos'] = ph
            for k in ('lat', 'lng'):
                v[k] = float(v[k])
            vs.append(v)
    return vs

def foot(a, b, cache):
    key = f"{a[0]:.5f},{a[1]:.5f};{b[0]:.5f},{b[1]:.5f}"
    if key in cache: return cache[key]
    url = f"https://routing.openstreetmap.de/routed-foot/route/v1/driving/{a[1]},{a[0]};{b[1]},{b[0]}?overview=full&geometries=geojson"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "tokyo-night-explorer/1.0 (personal trip page)"})
        r = json.load(urllib.request.urlopen(req, timeout=20))
        rt = r['routes'][0]
        res = {"geom": [[c[1], c[0]] for c in rt['geometry']['coordinates']], "m": round(rt['distance']), "min": round(rt['duration'] / 60)}
        time.sleep(1)
    except Exception as e:
        print('  foot route failed', key, e); res = {"geom": [list(a), list(b)], "m": None, "min": None}
    cache[key] = res
    return res

def main():
    venues = load_venues()
    byid = {v['id']: v for v in venues}
    transport = json.load(open(os.path.join(DATA, 'transport.json'), encoding='utf-8'))
    areas = json.load(open(os.path.join(DATA, 'areas.json'), encoding='utf-8')) if os.path.exists(os.path.join(DATA, 'areas.json')) else {"areas": [], "verdict": ""}
    routes = json.load(open(os.path.join(DATA, 'routes.json'), encoding='utf-8')) if os.path.exists(os.path.join(DATA, 'routes.json')) else []
    cpath = os.path.join(DATA, 'legs_cache.json')
    cache = json.load(open(cpath)) if os.path.exists(cpath) else {}
    for r in routes:
        legs = []
        for lg in r.get('legs_def', []):
            a = byid[lg['from']] if lg['from'] != 'hotel' else HOTEL
            b = byid[lg['to']] if lg['to'] != 'hotel' else HOTEL
            pa, pb = (a['lat'], a['lng']), (b['lat'], b['lng'])
            if lg['mode'] == 'walk':
                fr = foot(pa, pb, cache); legs.append({"mode": "walk", "geom": fr['geom'], "m": fr['m'], "min": fr['min']})
            else:
                legs.append({"mode": lg['mode'], "geom": [list(pa), list(pb)]})
        r['legs'] = legs
        for s in r['steps']:
            if s.get('venue') and s['venue'] not in byid: print('!! route', r['id'], 'unknown venue', s['venue'])
    json.dump(cache, open(cpath, 'w'))
    out = {"generated": datetime.datetime.now().strftime('%Y-%m-%d %H:%M JST'), "checked": CHECKED, "night_date": "2026-10-09",
           "hotel": HOTEL, "area_order": AREA_ORDER, "venues": venues, "transport": transport,
           "areas": areas.get('areas', []), "verdict": areas.get('verdict', ''), "routes": routes}
    open(os.path.join(DATA, 'venues.js'), 'w', encoding='utf-8').write('window.NIGHT=' + json.dumps(out, ensure_ascii=False) + ';\n')
    print(f"venues: {len(venues)}  routes: {len(routes)}  photos: {sum(len(v['photos']) for v in venues)}")
    for v in venues:
        print(f"  {v['id']:32} {v['area']:12} {v['category']:9} open={v['open']} photos={len(v['photos'])}")

if __name__ == '__main__':
    main()
