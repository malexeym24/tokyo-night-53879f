/* Lightbox for every photo on Alexey's pages (rule 12.10.2026).
   Tap a photo -> full screen. Close: Esc, the X button, a tap anywhere,
   swipe down, or the browser/phone Back button. Arrows / swipe left-right
   flip through the photos of the page. No dependencies, include once:
   <script src="lightbox.js" defer></script> */
(function () {
  if (window.__lbReady) return; window.__lbReady = true;
  var css = '.lb{position:fixed;inset:0;z-index:2147483000;background:#0b0b0d;display:none;align-items:center;justify-content:center;flex-direction:column;-webkit-user-select:none;user-select:none;touch-action:pan-y}' +
    '.lb.on{display:flex}.lb img{max-width:96vw;max-height:82vh;object-fit:contain;border-radius:6px;box-shadow:0 4px 30px rgba(0,0,0,.5)}' +
    '.lb-c{color:#ddd;font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;max-width:92vw;text-align:center;margin-top:10px}' +
    '.lb button{position:absolute;background:rgba(0,0,0,.55);color:#fff;border:1px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;border-radius:999px;width:48px;height:48px;font:28px/48px -apple-system,sans-serif;cursor:pointer;padding:0;z-index:2}' +
    '.lb-x{top:calc(12px + env(safe-area-inset-top,0px));right:12px}.lb-p{left:10px;top:50%;margin-top:-24px}.lb-n{right:10px;top:50%;margin-top:-24px}' +
    '.lb-h{position:absolute;bottom:calc(10px + env(safe-area-inset-bottom,0px));color:#aaa;font:12px -apple-system,sans-serif}' +
    'figure img,.pics img,.grid img,.gal img{cursor:zoom-in}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var ov = document.createElement('div'); ov.className = 'lb'; ov.setAttribute('role', 'dialog');
  ov.innerHTML = '<button class="lb-x" aria-label="Закрыть">×</button><button class="lb-p" aria-label="Назад"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4 7 12l8 8"/></svg></button>' +
    '<img alt=""><div class="lb-c"></div><button class="lb-n" aria-label="Вперёд"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4l8 8-8 8"/></svg></button>' +
    '<div class="lb-h">Esc, × или тап - закрыть · ← → листать</div>';
  document.body.appendChild(ov);
  var img = ov.querySelector('img'), cap = ov.querySelector('.lb-c'), prev = ov.querySelector('.lb-p'), next = ov.querySelector('.lb-n');
  var list = [], idx = 0, open = false, pushed = false;
  var SEL = 'figure img, .pics img, .grid img, .gal img';
  function full(el) { var a = el.closest('a'); var h = a && a.getAttribute('href'); return el.getAttribute('data-full') || (h && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(h) ? h : el.currentSrc || el.src); }
  function show(i) {
    idx = (i + list.length) % list.length; var el = list[idx]; img.src = full(el);
    var fc = el.closest('figure'), t = fc && fc.querySelector('figcaption') ? fc.querySelector('figcaption').textContent : (el.alt || '');
    cap.textContent = t + (list.length > 1 ? '  ·  ' + (idx + 1) + '/' + list.length : '');
    prev.style.display = next.style.display = list.length > 1 ? '' : 'none';
  }
  function openAt(el) {
    list = Array.prototype.slice.call(document.querySelectorAll(SEL)).filter(function (x) { return !x.closest('.lb') && x.offsetParent !== null; });
    if (list.indexOf(el) < 0) list = [el];
    show(list.indexOf(el)); ov.classList.add('on'); open = true; document.documentElement.style.overflow = 'hidden';
    try { history.pushState({ lb: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
  }
  function close(fromPop) {
    if (!open) return; open = false; ov.classList.remove('on'); img.removeAttribute('src'); document.documentElement.style.overflow = '';
    if (!fromPop && pushed) { pushed = false; history.back(); } else pushed = false;
  }
  document.addEventListener('click', function (e) {
    var t = e.target; if (t && t.tagName === 'IMG' && t.matches(SEL) && !t.closest('.lb')) { e.preventDefault(); e.stopPropagation(); openAt(t); }
  }, true);
  ov.addEventListener('click', function (e) {
    if (moved) { moved = false; return; }
    if (prev.contains(e.target)) { e.stopPropagation(); show(idx - 1); return; }
    if (next.contains(e.target)) { e.stopPropagation(); show(idx + 1); return; }
    close();
  });
  document.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
  });
  window.addEventListener('popstate', function () { if (open) close(true); });
  var sx = 0, sy = 0, moved = false;
  ov.addEventListener('touchstart', function (e) { var p = e.touches[0]; sx = p.clientX; sy = p.clientY; moved = false; }, { passive: true });
  ov.addEventListener('touchend', function (e) {
    var p = e.changedTouches[0], dx = p.clientX - sx, dy = p.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { moved = true; show(idx + (dx < 0 ? 1 : -1)); e.preventDefault(); }
    else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) { moved = true; close(); e.preventDefault(); }
  });
})();
