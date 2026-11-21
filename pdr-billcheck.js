/* Instant bill check. The lead form's bill reader (extract-bill) fires
   window "pdr:bill" with what it read; this renders "Your bill at a glance" at the
   top of the form's details step: supplier, supply rate, usage, bill total, the
   all-in cost per kWh (bill ÷ usage), and a renewal timeline. Only figures read
   from the visitor's own bill — no estimates, no promised savings.
   Shopping starts 90 days before the contract ends (the renewal guide's advice). */
(function () {
  'use strict';
  var LEAD_DAYS = 90;
  var DAY = 86400000;

  var CSS = '' +
    '.bc{border:1px solid #D9DEE3;border-radius:14px;padding:18px;margin:0 0 18px;background:#F8FAFB;font-family:Archivo,system-ui,sans-serif;color:#1A1F2B;text-align:left}' +
    '.bc h3{font-size:18px;font-weight:700;margin:0 0 4px}' +
    '.bc .bc-sub{font-size:13px;color:#5A6475;margin:0 0 14px}' +
    '.bc .bc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}' +
    '@media(max-width:560px){.bc .bc-grid{grid-template-columns:1fr 1fr}}' +
    '.bc .bc-t{background:#fff;border:1px solid #E6EAEE;border-radius:10px;padding:10px 12px}' +
    '.bc .bc-t b{display:block;font-size:20px;font-weight:800;font-stretch:80%;color:#14213D;line-height:1.1}' +
    '.bc .bc-t span{display:block;font-size:11.5px;color:#5A6475;margin-top:4px;line-height:1.3}' +
    '.bc .bc-tl{margin-top:16px}' +
    '.bc .bc-msg{font-size:14px;font-weight:600;margin:0 0 10px}' +
    '.bc .bc-bar{position:relative;height:10px;border-radius:6px;background:#E6EAEE;margin:0 6px}' +
    '.bc .bc-win{position:absolute;top:0;bottom:0;border-radius:6px;background:#F5B400}' +
    '.bc .bc-dot{position:absolute;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#14213D;border:2px solid #fff;box-shadow:0 0 0 1px #14213D}' +
    '.bc .bc-lab{display:flex;justify-content:space-between;font-size:11.5px;color:#5A6475;margin-top:8px;gap:8px}' +
    '.bc .bc-lab b{color:#1A1F2B;font-weight:600}' +
    '.bc .bc-note{font-size:12px;color:#5A6475;margin:12px 0 0}' +
    '.bc .bc-cta{font-size:14px;font-weight:600;color:#14213D;margin:14px 0 0}';

  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[$,¢\s]/g, '')); return isNaN(n) ? null : n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmtDate(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function parseEnd(v) {
    if (!v) return null;
    var d = new Date(String(v));
    if (isNaN(d.getTime())) return null;
    if (d.getFullYear() < 2000 || d.getFullYear() > 2100) return null;
    d.setHours(0, 0, 0, 0); return d;
  }

  function tiles(data) {
    var out = [];
    var bill = num(data.current_monthly_bill), kwh = num(data.current_monthly_usage), rate = num(data.current_rate);
    if (rate != null && rate > 0) {
      var cents = rate < 1 ? rate * 100 : rate;           // reader returns $/kWh; tolerate cents
      if (cents > 0.5 && cents < 60) out.push([cents.toFixed(2) + '¢', 'Supply rate per kWh']);
    }
    if (kwh != null && kwh > 0) out.push([Math.round(kwh).toLocaleString() + ' kWh', 'Usage this bill']);
    if (bill != null && bill > 0) out.push(['$' + bill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'Total this bill']);
    if (bill && kwh) {
      var allin = bill / kwh * 100;
      if (allin > 1 && allin < 100) out.push([allin.toFixed(2) + '¢', 'All-in cost per kWh (bill ÷ usage)']);
    }
    return out;
  }

  function timeline(end) {
    if (!end) return '<div class="bc-tl"><p class="bc-msg">Your bill doesn\'t show a contract end date.</p><p class="bc-note">We\'ll confirm it with your supplier, so we can shop before your contract ends.</p></div>';
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var start = new Date(end); start.setDate(start.getDate() - LEAD_DAYS);   // calendar days, DST-safe
    var msg;
    if (end < today) msg = 'Your contract end date has passed. You may now be on holdover or month-to-month pricing — worth shopping now.';
    else if (start <= today) msg = 'Your renewal window is open: your contract ends in ' + Math.round((end - today) / DAY) + ' days. Now is the time to shop.';
    else msg = 'We\'d start shopping around ' + fmtDate(start) + ' — ' + Math.round((start - today) / DAY) + ' days from now, 90 days before your contract ends.';
    if (end < today) return '<div class="bc-tl"><p class="bc-msg">' + msg + '</p></div>';
    var span = Math.max(end - today, LEAD_DAYS * DAY * 1.25);
    var pos = function (d) { return Math.max(0, Math.min(100, (d - today) / span * 100)); };
    var s = pos(start), e = pos(end);
    return '<div class="bc-tl"><p class="bc-msg">' + msg + '</p>' +
      '<div class="bc-bar" role="img" aria-label="Timeline from today to your contract end on ' + fmtDate(end) + '">' +
        '<div class="bc-win" style="left:' + s + '%;width:' + Math.max(2, e - s) + '%"></div>' +
        '<div class="bc-dot" style="left:0%"></div></div>' +
      '<div class="bc-lab"><span><b>Today</b></span><span><b>Shop</b> ' + fmtDate(start) + '</span><span><b>Contract ends</b> ' + fmtDate(end) + '</span></div></div>';
  }

  function render(data) {
    var step = document.getElementById('lf-step-1');
    if (!step) return;
    var old = document.getElementById('bc-panel'); if (old) old.remove();
    var t = tiles(data || {});
    var end = parseEnd((data || {}).contract_expiration);
    if (!t.length && !end) return;                          // nothing read — the form's own message covers it
    if (!document.getElementById('bc-css')) {
      var st = document.createElement('style'); st.id = 'bc-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    var who = data.current_provider ? ' from ' + esc(String(data.current_provider).replace(/\.+$/, '')) : '';
    var el = document.createElement('div');
    el.className = 'bc'; el.id = 'bc-panel';
    el.innerHTML = '<h3>Your bill at a glance</h3><p class="bc-sub">What we read from your bill' + who + '. Check it below and correct anything we misread.</p>' +
      (t.length ? '<div class="bc-grid">' + t.map(function (x) { return '<div class="bc-t"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>' : '') +
      timeline(end) +
      '<p class="bc-cta">Add your name and email below, and we\'ll send a written comparison of every offer — no fee, no obligation.</p>';
    step.insertBefore(el, step.firstChild);
    if (typeof window.gtag === 'function') window.gtag('event', 'bill_check_shown', { page_path: window.location.pathname });
  }

  window.addEventListener('pdr:bill', function (e) { render(e.detail || {}); });
})();
