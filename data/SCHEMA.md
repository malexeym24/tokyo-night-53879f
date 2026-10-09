# Venue JSON schema (one JSON array per agent file)
Each venue object:
{
 "id": "kebab-id",                       // unique, e.g. "maduro-grand-hyatt"
 "name_en": "", "name_ja": "",
 "area": "Roppongi|Ginza|Nishi-Azabu|Azabu-Juban|Azabudai|Toranomon|Shibuya|Ebisu|Aoyama|Shinjuku|Akihabara|Kanda|Ueno|Marunouchi|Nihonbashi",
 "category": "cocktail|lounge|club|rooftop|live|hotel-bar",   // primary
 "tags": ["jazz","dj","view","speakeasy",...],
 "address_en": "", "address_ja": "",
 "lat": 0.0, "lng": 0.0,                 // from Google Maps / official map; state source in coord_source
 "coord_source": "",
 "website": "", "instagram": "",
 "gmaps_query": "",                      // exact text for https://www.google.com/maps/search/?api=1&query=...
 "hours_friday": "e.g. 18:00-02:00 (L.O. 01:30)",  "hours_verified": true|false,
 "last_entry": "",
 "entry_fee": "", "drink_prices": "", "min_spend": "", "cover_charge": "",
 "price_level": 1-4,                     // 1=<¥2k/drink ... 4=¥4k+/drink or ¥5k+ entry
 "dress_code": "",
 "music": "",
 "age_crowd": "",                        // only if a source supports it, else "impression: ..."
 "atmosphere": "",
 "lively": 1-5,                          // 1 quiet ... 5 packed/loud
 "luxury": 1-5,
 "solo": 1-5,                            // solo-visitor suitability
 "social": 1-5,                          // ease of meeting people
 "reservation": "",
 "special": "",                          // 1-2 sentence what makes it special
 "why_you": "",                          // why a 43yo solo man wanting upscale + meeting people would like it
 "caveats": "",                          // e.g. foreigner pricing, table-charge, closed on X, tourist-heavy
 "status_2026": "",                      // evidence it is operating in 2026 (latest post/review date)
 "photos": [ {"file":"img/<id>-1.jpg","credit":"Official site <url>","src":"<original url>"} ],
 "sources": [ {"label":"Official site","url":"","checked":"2026-10-09"} ],
 "verified_notes": "",                   // which fields are verified from what
 "estimates_notes": ""                   // which fields are estimates/impressions
}
OPEN-NOW: hours strings must use HH:MM-HH:MM 24h (after-midnight end like 05:00 is fine).
