/* Tokyo Friday Night explorer - static, no build step. Data: data/venues.js (window.NIGHT) */
(function(){
const D = window.NIGHT;
const V = D.venues;
const byId = Object.fromEntries(V.map(v=>[v.id,v]));
const CAT = {
  cocktail:{label:'Cocktail bar',color:'#e8b86b',ic:'C'},
  'hotel-bar':{label:'Hotel bar',color:'#ffd27a',ic:'H'},
  lounge:{label:'Lounge',color:'#b48cff',ic:'L'},
  rooftop:{label:'Rooftop / view',color:'#5cc8ff',ic:'R'},
  club:{label:'Club',color:'#ff5fa2',ic:'N'},
  live:{label:'Live music',color:'#5ad19a',ic:'♪'}
};
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = s => document.querySelector(s);
const yen = n => '¥'.repeat(Math.max(1,Math.min(4,n||1)));

/* ---------- time (JST) ---------- */
function jstParts(){
  const f = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,weekday:'short'});
  const p = Object.fromEntries(f.formatToParts(new Date()).map(x=>[x.type,x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`,h:+p.hour%24,m:+p.minute,wd:p.weekday};
}
// minutes since Friday 00:00; Saturday early hours count as 24:00+
function nowMin(){
  const j=jstParts(); let t=j.h*60+j.m;
  if(j.date===D.night_date){return t;}
  if(j.date>D.night_date || j.h<8){ if(j.h<8) t+=1440; }
  return t;
}
const fmt = t => { t=((t%1440)+1440)%1440; return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0'); };
function isOpen(v,t){ if(!v.open||!v.open.length) return null; return v.open.some(([s,e])=> t>=s && t<e); }

/* ---------- geo ---------- */
function km(a,b,c,d){const R=6371,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r;const h=Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
const H = D.hotel;
V.forEach(v=>{v.dist=km(H.lat,H.lng,v.lat,v.lng);});

/* ---------- links ---------- */
const q = v => encodeURIComponent(v.gmaps_query || `${v.name_en} ${v.address_en||''}`);
const gPlace = v => `https://www.google.com/maps/search/?api=1&query=${q(v)}`;
const gDir = (v,mode) => `https://www.google.com/maps/dir/?api=1&destination=${q(v)}&travelmode=${mode}`;
const gDirFromHotel = (v,mode) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(H.gmaps_query)}&destination=${q(v)}&travelmode=${mode}`;
const gLeg = (a,b,mode) => `https://www.google.com/maps/dir/?api=1&origin=${q(a)}&destination=${q(b)}&travelmode=${mode}`;

/* ---------- header ---------- */
function lastTrainInfo(){
  const lt = (D.transport&&D.transport.last_trains)||[];
  const pref = lt.find(x=>/roppongi/i.test(x.from)) || lt[0];
  return pref;
}
function tick(){
  const j=jstParts(); const t=nowMin();
  $('#clock').textContent = `${j.wd} ${j.date.slice(8)}.${j.date.slice(5,7)} · ${fmt(t)} JST`;
  const lt=lastTrainInfo(); const pill=$('#lastTrainPill');
  if(lt && lt.dep){
    const [hh,mm]=lt.dep.split(':').map(Number); let dep=hh*60+mm; if(hh<6) dep+=1440;
    const left=dep-t;
    if(left>0){ pill.textContent=`🚇 Last ${lt.from} ${lt.dep} · ${Math.floor(left/60)}h${String(left%60).padStart(2,'0')}m`; pill.classList.toggle('hot',left<60); }
    else { pill.textContent=`🚕 Taxi · 1st train ${firstTrain()}`; pill.classList.add('hot'); }
  } else pill.textContent='🚇 Trains & taxis';
}
function firstTrain(){ const f=(D.transport&&D.transport.first_trains)||[]; return f.length? f.map(x=>x.dep).sort()[0] : '~05:00'; }
$('#lastTrainPill').onclick=()=>show('info');

/* ---------- filters ---------- */
const F = {areas:new Set(),cats:new Set(),lux:0,vibe:'any',meet:false,solo:false,at:'any',price:0,dist:0};
const AREAS = [...new Set(V.map(v=>v.area))].sort((a,b)=> (D.area_order.indexOf(a)+99*(D.area_order.indexOf(a)<0)) - (D.area_order.indexOf(b)+99*(D.area_order.indexOf(b)<0)));
function atMin(){ return F.at==='any'?null : F.at==='now'? nowMin() : +F.at; }
function pass(v){
  if(F.areas.size && !F.areas.has(v.area)) return false;
  if(F.cats.size && !F.cats.has(v.category) && !(v.tags||[]).some(t=>F.cats.has(t))) return false;
  if(F.lux && (v.luxury||0)<F.lux) return false;
  if(F.vibe==='quiet' && (v.lively||3)>2) return false;
  if(F.vibe==='lively' && (v.lively||3)<4) return false;
  if(F.meet && (v.social||0)<4) return false;
  if(F.solo && (v.solo||0)<4) return false;
  if(F.price && (v.price_level||2)>F.price) return false;
  if(F.dist && v.dist>F.dist) return false;
  const t=atMin(); if(t!=null){ const o=isOpen(v,t); if(o===false) return false; }
  return true;
}
function chip(label,on,attrs,dot){return `<button class="chip${on?' on':''}" ${attrs}>${dot?`<span class="dot" style="background:${dot}"></span>`:''}${esc(label)}</button>`;}
function renderFilters(){
  const times=[['any','Any time'],['now','Open now']].concat([1260,1320,1380,1440,1500,1560,1620,1680].map(m=>[String(m),'Open at '+fmt(m)]));
  $('#filters').innerHTML = `
  <div class="frow">${chip('All areas',!F.areas.size,'data-f="area" data-v=""')}${AREAS.map(a=>chip(a,F.areas.has(a),`data-f="area" data-v="${esc(a)}"`)).join('')}</div>
  <div class="frow">${Object.entries(CAT).map(([k,c])=>chip(c.label,F.cats.has(k),`data-f="cat" data-v="${k}"`,c.color)).join('')}</div>
  <div class="frow">
    <select class="chip${F.at!=='any'?' on':''}" data-f="at">${times.map(([v,l])=>`<option value="${v}"${F.at===v?' selected':''}>${l}</option>`).join('')}</select>
    ${chip('Meet people',F.meet,'data-f="meet"')}${chip('Solo-friendly',F.solo,'data-f="solo"')}
    ${chip('Quiet',F.vibe==='quiet','data-f="vibe" data-v="quiet"')}${chip('Lively',F.vibe==='lively','data-f="vibe" data-v="lively"')}
    <select class="chip${F.lux?' on':''}" data-f="lux"><option value="0">Luxury: any</option><option value="3"${F.lux==3?' selected':''}>Luxury 3+</option><option value="4"${F.lux==4?' selected':''}>Luxury 4+</option><option value="5"${F.lux==5?' selected':''}>Luxury 5</option></select>
    <select class="chip${F.price?' on':''}" data-f="price"><option value="0">Price: any</option><option value="2"${F.price==2?' selected':''}>Up to ¥¥</option><option value="3"${F.price==3?' selected':''}>Up to ¥¥¥</option></select>
    <select class="chip${F.dist?' on':''}" data-f="dist"><option value="0">Distance: any</option><option value="2"${F.dist==2?' selected':''}>≤ 2 km (walk)</option><option value="5"${F.dist==5?' selected':''}>≤ 5 km</option><option value="8"${F.dist==8?' selected':''}>≤ 8 km</option></select>
    ${chip('Reset','', 'data-f="reset"')}
  </div>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-f]'); if(!b||b.tagName==='SELECT') return;
  const f=b.dataset.f, v=b.dataset.v;
  if(f==='area'){ if(!v) F.areas.clear(); else F.areas.has(v)?F.areas.delete(v):F.areas.add(v); }
  else if(f==='cat'){ F.cats.has(v)?F.cats.delete(v):F.cats.add(v); }
  else if(f==='meet') F.meet=!F.meet;
  else if(f==='solo') F.solo=!F.solo;
  else if(f==='vibe') F.vibe = F.vibe===v?'any':v;
  else if(f==='reset'){ F.areas.clear();F.cats.clear();F.lux=0;F.vibe='any';F.meet=F.solo=false;F.at='any';F.price=0;F.dist=0; }
  else return;
  refresh();
});
document.addEventListener('change',e=>{
  const s=e.target.closest('select[data-f]'); if(!s) return;
  const f=s.dataset.f; if(f==='at') F.at=s.value; else F[f]=+s.value; refresh();
});

/* ---------- cards ---------- */
function openBadge(v){
  const t=atMin()!=null?atMin():nowMin(); const o=isOpen(v,t);
  if(o===null) return `<span class="openb u">hours ?</span>`;
  return o?`<span class="openb y">● open ${F.at!=='any'&&F.at!=='now'?'at '+fmt(t):'now'}</span>`:`<span class="openb n">● closed ${F.at!=='any'&&F.at!=='now'?'at '+fmt(t):'now'}</span>`;
}
function travelLine(v){
  const tr=v.transit; if(!tr) return `${v.dist.toFixed(1)} km`;
  return `${v.dist.toFixed(1)} km · ${esc(tr.short)}`;
}
function card(v){
  const c=CAT[v.category]||CAT.cocktail; const p=(v.photos||[])[0];
  return `<article class="card">
   <div class="ph" data-open="${v.id}">${p?`<img loading="lazy" src="${esc(p.file)}" alt="${esc(v.name_en)}">`:`<div class="nophoto">No verified photo found - tap for details &amp; Google Maps photos</div>`}
     <span class="badge" style="background:${c.color}">${esc(c.label)}</span>${openBadge(v)}</div>
   <div class="bd">
     <h3>${esc(v.name_en)}</h3>
     <div class="ja">${esc(v.name_ja||'')} · ${esc(v.area)}</div>
     <div class="meta"><span><b>${yen(v.price_level)}</b></span><span>🕘 ${esc(v.hours_friday||'hours unverified')}${v.hours_verified?'':' <i class="est">(unverified)</i>'}</span></div>
     <div class="meta"><span>🚇 ${travelLine(v)}</span></div>
     <div class="why">${esc(v.why_you||v.special||'')}</div>
     <div class="scores"><span class="sc">Solo <b>${v.solo||'?'}</b>/5</span><span class="sc">Meet people <b>${v.social||'?'}</b>/5</span><span class="sc">Lively <b>${v.lively||'?'}</b>/5</span><span class="sc">Luxury <b>${v.luxury||'?'}</b>/5</span></div>
     <div class="btns"><button class="btn" data-open="${v.id}">Details</button><a class="btn pri" href="${gDir(v,'transit')}" target="_blank" rel="noopener">Go ➜</a></div>
   </div></article>`;
}
function renderCards(){
  const list=V.filter(pass).sort((a,b)=>(b.rank||0)-(a.rank||0)||a.dist-b.dist);
  $('#count').textContent = `${list.length} of ${V.length} venues${F.at!=='any'?` · open filter uses Friday hours`:''} · scores 1-5 are my assessment from sources`;
  $('#cards').innerHTML = list.map(card).join('') || '<div class="pad">Nothing matches. Tap Reset.</div>';
}

/* ---------- detail sheet ---------- */
function row(k,v,est){ if(!v) return ''; return `<div>${esc(k)}</div><div${est?' class="est"':''}>${esc(v)}</div>`; }
function openSheet(id){
  const v=byId[id]; if(!v) return; const c=CAT[v.category]||CAT.cocktail;
  const ph=(v.photos||[]);
  $('#sheetBody').innerHTML = `
   ${ph.length?`<div class="gal">${ph.map(p=>`<figure><img src="${esc(p.file)}" alt="${esc(v.name_en)}"><figcaption>Photo: ${esc(p.credit||'')}</figcaption></figure>`).join('')}</div>`:''}
   <div class="sb">
    <span class="sc" style="color:${c.color}">${esc(c.label)}</span> <span class="sc">${esc(v.area)}</span> <span class="sc">${yen(v.price_level)}</span> ${openBadge(v).replace('openb','sc openb')}
    <h2>${esc(v.name_en)}</h2><div class="ja">${esc(v.name_ja||'')}</div>
    <p>${esc(v.special||'')}</p>
    ${v.why_you?`<div class="note"><b>Why you might like it:</b> ${esc(v.why_you)}</div>`:''}
    ${v.caveats?`<div class="warn"><b>Heads-up:</b> ${esc(v.caveats)}</div>`:''}
    <div class="travel">
      <a class="pri" href="${gDir(v,'transit')}" target="_blank" rel="noopener"><b>🚇 Train</b>from here</a>
      <a href="${gDir(v,'walking')}" target="_blank" rel="noopener"><b>🚶 Walk</b>from here</a>
      <a href="${gDir(v,'driving')}" target="_blank" rel="noopener"><b>🚕 Taxi</b>${v.transit&&v.transit.taxi?esc(v.transit.taxi):'route'}</a>
    </div>
    ${v.transit?`<div class="small">From hotel (Akihabara): ${esc(v.transit.long||v.transit.short)}. <a href="${gDirFromHotel(v,'transit')}" target="_blank" rel="noopener">Route from hotel</a></div>`:''}
    <div class="sec">Practical</div>
    <div class="kv">
      ${row('Fri hours',(v.hours_friday||'unknown')+(v.hours_verified?' (verified)':' (unverified - check before going)'),!v.hours_verified)}
      ${row('Last entry',v.last_entry)}
      ${row('Entry / cover',[v.entry_fee,v.cover_charge].filter(Boolean).join(' · '))}
      ${row('Drinks',v.drink_prices)}
      ${row('Min spend',v.min_spend)}
      ${row('Dress code',v.dress_code)}
      ${row('Music',v.music)}
      ${row('Crowd',v.age_crowd,/impression|estimate/i.test(v.age_crowd||''))}
      ${row('Atmosphere',v.atmosphere)}
      ${row('Reservation',v.reservation)}
      ${row('Address',[v.address_en,v.address_ja].filter(Boolean).join(' / '))}
      ${row('Status 2026',v.status_2026)}
    </div>
    <div class="scores"><span class="sc">Solo <b>${v.solo||'?'}</b>/5</span><span class="sc">Meet people <b>${v.social||'?'}</b>/5</span><span class="sc">Lively <b>${v.lively||'?'}</b>/5</span><span class="sc">Luxury <b>${v.luxury||'?'}</b>/5</span></div>
    <div class="small" style="margin-top:6px">Scores = my assessment from the sources below, not official ratings.</div>
    <div class="btns" style="margin-top:12px"><a class="btn" href="${gPlace(v)}" target="_blank" rel="noopener">Google Maps page</a>${v.website?`<a class="btn" href="${esc(v.website)}" target="_blank" rel="noopener">Website</a>`:''}${v.instagram?`<a class="btn" href="${esc(v.instagram)}" target="_blank" rel="noopener">Instagram</a>`:''}</div>
    <div class="sec">Verified vs estimated</div>
    ${v.verified_notes?`<div class="small"><b>Verified:</b> ${esc(v.verified_notes)}</div>`:''}
    ${v.estimates_notes?`<div class="small" style="margin-top:4px"><b>Estimates / impressions:</b> ${esc(v.estimates_notes)}</div>`:''}
    <div class="sec">Sources</div>
    <div class="src">${(v.sources||[]).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label||s.url)}</a> <span class="small">checked ${esc(s.checked||D.checked)}</span>`).join('<br>')}</div>
    <div class="btns" style="margin-top:14px"><button class="btn" data-mapfocus="${v.id}">Show on map</button></div>
   </div>`;
  $('#sheet').classList.remove('hidden'); $('.sheet-inner').scrollTop=0;
}
function closeSheet(){ $('#sheet').classList.add('hidden'); }
$('#sheetClose').onclick=closeSheet;
$('#sheet').addEventListener('click',e=>{ if(e.target.id==='sheet') closeSheet(); });
document.addEventListener('click',e=>{
  const o=e.target.closest('[data-open]'); if(o){ openSheet(o.dataset.open); return; }
  const m=e.target.closest('[data-mapfocus]'); if(m){ closeSheet(); show('map'); const v=byId[m.dataset.mapfocus]; map.setView([v.lat,v.lng],16); peek(v); }
});

/* ---------- map ---------- */
let map, markers={}, routeLayer=null, meMarker=null;
function initMap(){
  map=L.map('map',{zoomControl:false,attributionControl:true,tap:true}).setView([35.672,139.745],12);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,maxNativeZoom:17,attribution:'Tiles © Esri',className:'darktiles'}).addTo(map);
  map.setMaxZoom(19);
  // neighbourhood clusters
  const areaLabels=[];
  (D.areas||[]).forEach(a=>{
    if(!a.lat) return;
    L.circle([a.lat,a.lng],{radius:a.radius||600,color:'#e8b86b',weight:1,opacity:.5,fillOpacity:.05,dashArray:'4 6',interactive:false}).addTo(map);
    areaLabels.push(L.marker([a.lat,a.lng],{icon:L.divIcon({className:'arealabel',html:esc(a.name),iconSize:[130,18],iconAnchor:[65,9]}),interactive:false,zIndexOffset:-1000}));
  });
  const syncLabels=()=>{const z=map.getZoom(); areaLabels.forEach(m=>{ if(z>=14) m.addTo(map); else m.remove(); });};
  map.on('zoomend',syncLabels); setTimeout(syncLabels,0);
  // hotel
  L.marker([H.lat,H.lng],{icon:L.divIcon({className:'',html:'<div class="hotelpin">🏨</div>',iconSize:[34,34],iconAnchor:[17,17]}),zIndexOffset:1000})
    .addTo(map).on('click',()=>{ $('#peek').innerHTML=`<div class="pb"><h4>🏨 ${esc(H.name)}</h4><div class="small">${esc(H.address)} · start point</div><div class="btns"><a class="btn pri" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(H.gmaps_query)}&travelmode=transit" target="_blank" rel="noopener">Back to hotel ➜</a><a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(H.gmaps_query)}&travelmode=driving" target="_blank" rel="noopener">🚕 Taxi</a></div></div>`; $('#peek').classList.remove('hidden'); });
  V.forEach(v=>{
    const c=CAT[v.category]||CAT.cocktail;
    const m=L.marker([v.lat,v.lng],{icon:L.divIcon({className:'',html:`<div class="pin" style="background:${c.color}"><i>${c.ic}</i></div>`,iconSize:[30,30],iconAnchor:[15,30]})}).addTo(map);
    m.on('click',()=>peek(v)); markers[v.id]=m;
  });
  map.on('click',()=>$('#peek').classList.add('hidden'));
  // controls
  const ctl=document.createElement('div'); ctl.className='mapctl';
  ctl.innerHTML='<button id="bLoc" aria-label="My location">◎</button><button id="bFit" aria-label="Show all">⤢</button><button id="bHotel" aria-label="Hotel">🏨</button>';
  $('#view-map').appendChild(ctl);
  const chips=document.createElement('div'); chips.className='mapchips'; chips.id='mapchips'; $('#view-map').appendChild(chips);
  $('#bFit').onclick=fitAll; $('#bHotel').onclick=()=>map.setView([H.lat,H.lng],15);
  $('#bLoc').onclick=()=>{ if(!navigator.geolocation) return; navigator.geolocation.getCurrentPosition(p=>{const ll=[p.coords.latitude,p.coords.longitude]; if(meMarker) meMarker.setLatLng(ll); else meMarker=L.circleMarker(ll,{radius:8,color:'#fff',weight:3,fillColor:'#2f8cff',fillOpacity:1}).addTo(map); map.setView(ll,15);},()=>alert('Location not available'),{enableHighAccuracy:true,timeout:8000}); };
  fitAll();
}
function fitAll(){ const pts=V.filter(pass).map(v=>[v.lat,v.lng]).concat([[H.lat,H.lng]]); map.fitBounds(pts,{padding:[40,40]}); }
function renderMapChips(){
  const el=$('#mapchips'); if(!el) return;
  el.innerHTML = chip('Open now',F.at==='now','data-f="atnow"') + Object.entries(CAT).map(([k,c])=>chip(c.label,F.cats.has(k),`data-f="cat" data-v="${k}"`,c.color)).join('') + chip('Meet people',F.meet,'data-f="meet"');
}
document.addEventListener('click',e=>{ const b=e.target.closest('[data-f="atnow"]'); if(b){ F.at=F.at==='now'?'any':'now'; refresh(); } });
function renderMarkers(){ V.forEach(v=>{ const m=markers[v.id]; if(!m) return; const ok=pass(v); const el=m.getElement(); if(el) el.firstChild.classList.toggle('dim',!ok); m.setZIndexOffset(ok?500:0); }); }
function peek(v){
  const p=(v.photos||[])[0];
  $('#peek').innerHTML=`${p?`<img src="${esc(p.file)}" alt="">`:''}<div class="pb"><h4>${esc(v.name_en)}</h4><div class="small">${esc(v.area)} · ${esc((CAT[v.category]||{}).label||'')} · ${yen(v.price_level)}</div><div class="small">🕘 ${esc(v.hours_friday||'hours ?')}${v.hours_verified?'':' (unverified)'}</div><div class="small">🚇 ${travelLine(v)}</div><div class="btns"><button class="btn" data-open="${v.id}">Details</button><a class="btn pri" href="${gDir(v,'transit')}" target="_blank" rel="noopener">Go ➜</a></div></div>`;
  $('#peek').classList.remove('hidden');
}

/* ---------- routes ---------- */
function renderRoutes(){
  $('#routes').innerHTML = `<div class="note">Three ready-made plans. Tap <b>Show on map</b> to draw the route; every leg has a Google Maps button. Times assume you leave the hotel ~23:00 tonight; shift as needed. Trains stop around midnight - see the Trains tab.</div>` +
  (D.routes||[]).map(r=>`<div class="rt"><h3>${esc(r.title)}</h3><div class="sub">${esc(r.sub)}</div><div class="sub">⏱ ${esc(r.duration)} · 💴 ${esc(r.budget)}</div>
    <ol class="steps">${r.steps.map((s,i)=>{const v=s.venue?byId[s.venue]:null; return `<li><span class="n${v?'':' tr'}">${v?s.n:(s.mode==='walk'?'🚶':s.mode==='taxi'?'🚕':'🚇')}</span>
      <div class="tm">${esc(s.time||'')}</div><div class="st">${v?`<a href="#" data-open="${v.id}">${esc(v.name_en)}</a>`:esc(s.title)}</div><div class="ds">${esc(s.desc||'')}</div>
      ${s.link?`<a class="lk" href="${esc(s.link)}" target="_blank" rel="noopener">${esc(s.linkLabel||'Google Maps ➜')}</a>`:''}${v?` <a class="lk" href="${gDir(v,'transit')}" target="_blank" rel="noopener">Directions ➜</a>`:''}</li>`;}).join('')}</ol>
    <div class="btns"><button class="btn pri" data-route="${r.id}">Show on map</button></div></div>`).join('');
}
document.addEventListener('click',e=>{ const b=e.target.closest('[data-route]'); if(!b) return; e.preventDefault(); drawRoute(b.dataset.route); });
document.addEventListener('click',e=>{ const a=e.target.closest('a[data-open]'); if(a) e.preventDefault(); },true);
function drawRoute(id){
  const r=(D.routes||[]).find(x=>x.id===id); if(!r) return;
  show('map'); if(routeLayer) routeLayer.remove(); routeLayer=L.layerGroup().addTo(map);
  const pts=[[H.lat,H.lng]];
  (r.legs||[]).forEach(l=>{
    const style = l.mode==='walk'?{color:'#e8b86b',weight:5,opacity:.95}:l.mode==='taxi'?{color:'#ff8a7a',weight:4,dashArray:'2 8',opacity:.9}:{color:'#7cc4ff',weight:4,dashArray:'10 8',opacity:.9};
    L.polyline(l.geom,style).addTo(routeLayer); l.geom.forEach(p=>pts.push(p));
  });
  const vpts=[]; const seen={};
  r.steps.filter(s=>s.venue).forEach(s=>{ const v=byId[s.venue]; const k=v.lat.toFixed(4)+','+v.lng.toFixed(4); const dup=seen[k]||0; seen[k]=dup+1;
    L.marker([v.lat,v.lng],{icon:L.divIcon({className:'',html:`<div class="hotelpin" style="background:#e8b86b;border-color:#fff;font-weight:800">${s.n}</div>`,iconSize:[34,34],iconAnchor:[17-38*dup,17]}),zIndexOffset:2000}).addTo(routeLayer).on('click',()=>peek(v)); vpts.push([v.lat,v.lng]); });
  (r.legs||[]).filter(l=>l.mode==='walk').forEach(l=>l.geom.forEach(p=>vpts.push(p)));
  map.fitBounds(vpts,{padding:[70,70],maxZoom:16});
  $('#routeBar').innerHTML=`<span><b>${esc(r.short||r.title)}</b> · <span style="color:#e8b86b">━ walk</span> <span style="color:#7cc4ff">┅ train</span> <span style="color:#ff8a7a">┄ taxi</span></span><button id="rbX">Clear</button>`;
  $('#routeBar').classList.remove('hidden'); $('#rbX').onclick=()=>{ routeLayer.remove(); routeLayer=null; $('#routeBar').classList.add('hidden'); };
}

/* ---------- info ---------- */
function renderInfo(){
  const T=D.transport||{};
  const tbl=(rows,head)=>`<table class="tt"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.join('')}</table>`;
  $('#info').innerHTML = `
   <div class="warn"><b>Tokyo trains do not run 24 hours.</b> Last trains back to Akihabara leave around midnight; the first ones on Saturday around 5 am. In between: taxi (or stay out until first train).</div>
   <h2 class="h">Last trains back to Akihabara (tonight, weekday timetable)</h2>
   ${tbl((T.last_trains||[]).map(x=>`<tr><td class="t">${esc(x.dep)}</td><td><b>${esc(x.from)}</b><br><span class="small">${esc(x.line)}${x.arr_akihabara?' · arr. Akihabara '+esc(x.arr_akihabara):''}${x.verified?'':' · approx.'}</span></td></tr>`),['Dep','From / line'])}
   <h2 class="h">First trains Saturday 10.10</h2>
   ${tbl((T.first_trains||[]).map(x=>`<tr><td class="t">${esc(x.dep)}</td><td><b>${esc(x.from)}</b><br><span class="small">${esc(x.line)}${x.verified?'':' · approx.'}</span></td></tr>`),['Dep','From / line'])}
   <h2 class="h">Getting there from Akihabara</h2>
   ${tbl((T.routes||[]).map(x=>`<tr><td><b>${esc(x.to)}</b><br><span class="small">${esc(x.line)}: ${esc(x.station_from)} → ${esc(x.station_to)}${x.notes?' · '+esc(x.notes):''}</span></td><td class="t">${x.minutes?esc(x.minutes)+' min':''}<br><span class="small">${x.fare_yen?'¥'+esc(x.fare_yen):''}</span></td></tr>`),['Where','Time / fare'])}
   <h2 class="h">Taxi after midnight</h2>
   <div class="note">${esc((T.taxi||{}).rules||'')}</div>
   ${tbl(((T.taxi||{}).estimates||[]).map(x=>`<tr><td><b>${esc(x.from)} → Akihabara</b><br><span class="small">${x.km?esc(x.km)+' km':''}${x.minutes?' · ~'+esc(x.minutes)+' min':''}</span></td><td class="t">${esc(x.yen_night)}</td></tr>`),['Route','Night estimate'])}
   <div class="small">${esc((T.taxi||{}).apps||'')}</div>
   <div class="btns" style="margin-top:10px"><a class="btn pri" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(H.gmaps_query)}&travelmode=transit" target="_blank" rel="noopener">🏨 Back to hotel (train)</a><a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(H.gmaps_query)}&travelmode=driving" target="_blank" rel="noopener">🚕 Taxi route</a></div>
   <h2 class="h">Walking distances</h2>
   ${tbl((T.walks||[]).map(x=>`<tr><td>${esc(x.from)} → ${esc(x.to)}</td><td class="t">${esc(x.minutes)} min</td></tr>`),['Walk','Time'])}
   <h2 class="h">Neighbourhoods compared</h2>
   ${D.verdict?`<div class="note">${D.verdict}</div>`:''}
   <div class="areas">${(D.areas||[]).map(a=>`<div class="area"><h4>${esc(a.name)} <span class="small">${esc(a.how||'')}</span></h4>
     <div class="small">Walk around <span class="stars">${'★'.repeat(a.walk||0)}</span> · Bar hop <span class="stars">${'★'.repeat(a.hop||0)}</span> · Meet people <span class="stars">${'★'.repeat(a.meet||0)}</span> · Upscale <span class="stars">${'★'.repeat(a.upscale||0)}</span></div>
     <div style="font-size:14px;margin-top:4px">${esc(a.text||'')}</div></div>`).join('')}</div>
   <div class="small" style="margin-top:6px">Stars = my assessment from the sources, not an official rating.</div>
   <h2 class="h">Safety notes</h2>
   ${(T.warnings||[]).map(w=>`<div class="warn">${esc(w.text)} ${w.source?`<a href="${esc(w.source)}" target="_blank" rel="noopener">source</a>`:''}</div>`).join('')}
   <h2 class="h">Sources</h2>
   <div class="src">${[T.taxi&&T.taxi.source].concat((T.routes||[]).map(r=>r.source),(T.last_trains||[]).map(r=>r.source)).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`).join('<br>')}</div>
   <div class="small" style="margin-top:16px">Research checked ${esc(D.checked)}. Built ${esc(D.generated)}. Hours and prices change - confirm on the venue's own page before you go.</div>`;
}

/* ---------- views ---------- */
function show(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+v));
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  if(v==='map') setTimeout(()=>map.invalidateSize(),50);
  try{ localStorage.setItem('tn_view',v);}catch(e){}
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>show(b.dataset.v));
function refresh(){ renderFilters(); renderCards(); renderMapChips(); renderMarkers(); }

initMap(); renderRoutes(); renderInfo(); refresh(); tick(); setInterval(()=>{tick();},30000);
setInterval(()=>{ if(F.at==='now') refresh(); },60000);
let start='map'; try{ start=localStorage.getItem('tn_view')||'map'; }catch(e){}
show(start);
})();
