/* Market prices from the U.S. Energy Information Administration (EIA), read from
   public.market_prices (filled weekly by the CRM's sync-market-prices job).
   - [data-price-ticker]  header pill: Texas vs U.S. average commercial electricity
   - [data-price-chart data-series="elec_com|gas_com" data-area="TX"]
       line chart, the area vs the U.S. average, last 24 months, with hover
       crosshair + tooltip, legend, direct end labels and a table view.
   These are average ALL-IN prices to commercial customers (supply + delivery),
   not supplier offers; every chart says so. Renders nothing if data is missing. */
(function () {
  'use strict';
  var URL = 'https://lhwfbectnrmrvwhkftun.supabase.co/rest/v1/market_prices';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod2ZiZWN0bnJtcnZ3aGtmdHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzE1MzEsImV4cCI6MjA4OTQ0NzUzMX0.zmPRPeILtFNgGMp66JzhD44QUamXr0GFQAQq7y2WyoU';
  var NAMES = { TX: 'Texas', CA: 'California', CT: 'Connecticut', DC: 'Washington, D.C.', DE: 'Delaware', IL: 'Illinois', MA: 'Massachusetts', MD: 'Maryland', ME: 'Maine', NH: 'New Hampshire', NJ: 'New Jersey', NY: 'New York', OH: 'Ohio', PA: 'Pennsylvania', RI: 'Rhode Island', AZ: 'Arizona', CO: 'Colorado', FL: 'Florida', IN: 'Indiana', KY: 'Kentucky', MI: 'Michigan', VA: 'Virginia', US: 'U.S. average' };
  var MONTHS = 24;
  var FOCUS = '#14213D', CONTEXT = '#7A8394';

  function get(series, areas) {
    var since = new Date(); since.setMonth(since.getMonth() - MONTHS - 4);
    var q = '?select=area,period,value&series=eq.' + series + '&area=in.(' + areas.join(',') + ')' +
            '&period=gte.' + since.toISOString().slice(0, 10) + '&order=period.asc';
    return fetch(URL + q, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function monthLabel(p, long) {
    var d = new Date(p + 'T00:00:00');
    return d.toLocaleString('en-US', { month: long ? 'long' : 'short', year: 'numeric' });
  }
  function fmt(series, v) { return series === 'gas_com' ? '$' + v.toFixed(2) : v.toFixed(2) + '¢'; }
  function unitLong(series) { return series === 'gas_com' ? 'dollars per thousand cubic feet (Mcf)' : 'cents per kilowatt-hour'; }

  /* ---------- ticker ---------- */
  function ticker() {
    var els = document.querySelectorAll('[data-price-ticker]');
    if (!els.length) return;
    get('elec_com', ['TX', 'US']).then(function (rows) {
      var last = {}; rows.forEach(function (r) { last[r.area] = r; });
      if (!last.TX || !last.US) return;
      var txt = 'TX commercial avg ' + fmt('elec_com', +last.TX.value) + ' · U.S. ' + fmt('elec_com', +last.US.value) +
                ' · ' + monthLabel(last.TX.period) + ' · EIA';
      els.forEach(function (el) { var t = el.querySelector('.pt-t'); if (t) t.textContent = txt; });
    }).catch(function () {});
  }

  /* ---------- chart ---------- */
  var CSS = '' +
    '.pc{background:#fff;border:1px solid #D9DEE3;border-radius:16px;padding:clamp(18px,3vw,28px);font-family:Archivo,system-ui,sans-serif;color:#1A1F2B;text-align:left}' +
    '.pc h3{font-size:clamp(20px,2.2vw,24px);font-weight:700;font-stretch:88%;margin:0 0 6px}' +
    '.pc .pc-sub{font-size:14px;color:#5A6475;margin:0 0 14px;line-height:1.5}' +
    '.pc .pc-leg{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:#1A1F2B;margin:0 0 8px}' +
    '.pc .pc-leg span{display:inline-flex;align-items:center;gap:7px}' +
    '.pc .pc-leg i{display:inline-block;width:18px;height:0;border-top:2.5px solid ' + FOCUS + '}' +
    '.pc .pc-leg i.us{border-top:2px dashed ' + CONTEXT + '}' +
    '.pc .pc-plot{position:relative}' +
    '.pc svg{display:block;width:100%;height:auto;overflow:visible}' +
    '.pc .pc-tip{position:absolute;pointer-events:none;background:#14213D;color:#fff;border-radius:8px;padding:8px 10px;font-size:12.5px;line-height:1.45;white-space:nowrap;transform:translate(-50%,-100%);opacity:0;transition:opacity .1s}' +
    '.pc .pc-tip b{display:block;font-weight:700;margin-bottom:2px}' +
    '.pc .pc-foot{font-size:12.5px;color:#5A6475;margin:12px 0 0;line-height:1.5}' +
    '.pc details{margin-top:8px;font-size:13px}' +
    '.pc summary{cursor:pointer;color:#14213D;font-weight:600}' +
    '.pc table{border-collapse:collapse;margin-top:8px;font-size:12.5px;width:100%;max-width:420px}' +
    '.pc th,.pc td{padding:5px 8px;border-bottom:1px solid #EEF1F4;text-align:right}' +
    '.pc th:first-child,.pc td:first-child{text-align:left}';

  function chart(el) {
    var series = el.getAttribute('data-series') || 'elec_com';
    var area = el.getAttribute('data-area') || 'TX';
    var name = NAMES[area] || area;
    var energy = series === 'gas_com' ? 'natural gas' : 'electricity';
    get(series, [area, 'US']).then(function (rows) {
      var by = {}; rows.forEach(function (r) { (by[r.area] = by[r.area] || {})[r.period] = +r.value; });
      if (!by[area] || !by.US) return;
      var periods = Object.keys(by[area]).filter(function (p) { return by.US[p] != null; }).sort().slice(-MONTHS);
      if (periods.length < 6) return;
      var a = periods.map(function (p) { return by[area][p]; }), u = periods.map(function (p) { return by.US[p]; });

      var W = 640, H = 260, L = 44, R = 70, T = 10, B = 28;
      var all = a.concat(u), lo = Math.min.apply(0, all), hi = Math.max.apply(0, all);
      var step = series === 'gas_com' ? (hi - lo > 8 ? 4 : 2) : (hi - lo > 8 ? 4 : 2);
      lo = Math.max(0, Math.floor(lo / step) * step); hi = Math.ceil(hi / step) * step;
      var x = function (i) { return L + i * (W - L - R) / (periods.length - 1); };
      var y = function (v) { return T + (hi - v) * (H - T - B) / (hi - lo); };
      var path = function (arr) { return arr.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' '); };

      var grid = '';
      for (var g = lo; g <= hi + 1e-9; g += step) {
        grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="#E6EAEE" stroke-width="1"/>' +
                '<text x="' + (L - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end" font-size="11" fill="#5A6475">' + (series === 'gas_com' ? '$' + g : g + '¢') + '</text>';
      }
      var ticks = '';
      periods.forEach(function (p, i) {
        if (i % 6 === 0 || i === periods.length - 1) {
          ticks += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="' + (i === periods.length - 1 ? 'end' : i === 0 ? 'start' : 'middle') + '" font-size="11" fill="#5A6475">' + monthLabel(p) + '</text>';
        }
      });
      var n = periods.length - 1;
      // direct end labels, nudged apart if they would collide
      var ya = y(a[n]), yu = y(u[n]);
      if (Math.abs(ya - yu) < 14) { if (ya < yu) { ya -= 7; yu += 7; } else { ya += 7; yu -= 7; } }
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + name + ' versus U.S. average commercial ' + energy + ' price, ' + monthLabel(periods[0]) + ' to ' + monthLabel(periods[n]) + '">' +
        grid + ticks +
        '<path d="' + path(u) + '" fill="none" stroke="' + CONTEXT + '" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>' +
        '<path d="' + path(a) + '" fill="none" stroke="' + FOCUS + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<circle cx="' + x(n) + '" cy="' + y(a[n]) + '" r="4.5" fill="' + FOCUS + '" stroke="#fff" stroke-width="2"/>' +
        '<circle cx="' + x(n) + '" cy="' + y(u[n]) + '" r="4" fill="' + CONTEXT + '" stroke="#fff" stroke-width="2"/>' +
        '<text x="' + (x(n) + 9) + '" y="' + (ya + 4) + '" font-size="12" font-weight="700" fill="#1A1F2B">' + fmt(series, a[n]) + '</text>' +
        '<text x="' + (x(n) + 9) + '" y="' + (yu + 4) + '" font-size="12" fill="#5A6475">' + fmt(series, u[n]) + '</text>' +
        '<line class="pc-x" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="#14213D" stroke-width="1" opacity="0"/>' +
        '<rect class="pc-hit" x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent"/>' +
        '</svg>';

      var rowsHtml = periods.map(function (p, i) { return '<tr><td>' + monthLabel(p) + '</td><td>' + fmt(series, a[i]) + '</td><td>' + fmt(series, u[i]) + '</td></tr>'; }).reverse().join('');
      var box = document.createElement('div');
      box.className = 'pc';
      box.innerHTML =
        '<h3>What ' + name + ' businesses pay for ' + energy + '</h3>' +
        '<p class="pc-sub">Average price to commercial customers, all-in (supply + delivery), in ' + unitLong(series) + '. ' + name + ' vs. the U.S. average, last ' + periods.length + ' months.</p>' +
        '<div class="pc-leg"><span><i></i>' + name + '</span><span><i class="us"></i>U.S. average</span></div>' +
        '<div class="pc-plot">' + svg + '<div class="pc-tip" aria-hidden="true"></div></div>' +
        '<p class="pc-foot">Source: U.S. Energy Information Administration, latest month ' + monthLabel(periods[n], true) + '. These averages include delivery charges, so they are not the supply rate on a supplier offer. Your price depends on your usage, contract and timing.</p>' +
        '<details><summary>See the numbers</summary><table><thead><tr><th>Month</th><th>' + name + '</th><th>U.S.</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></details>';
      el.appendChild(box);

      // hover: crosshair + tooltip on the nearest month
      var s = box.querySelector('svg'), hit = box.querySelector('.pc-hit'), xl = box.querySelector('.pc-x'), tip = box.querySelector('.pc-tip');
      function at(evt) {
        var r = s.getBoundingClientRect(), cx = (evt.touches ? evt.touches[0].clientX : evt.clientX);
        var vx = (cx - r.left) * W / r.width;
        var i = Math.max(0, Math.min(n, Math.round((vx - L) / ((W - L - R) / n))));
        xl.setAttribute('x1', x(i)); xl.setAttribute('x2', x(i)); xl.setAttribute('opacity', '.35');
        tip.innerHTML = '<b>' + monthLabel(periods[i], true) + '</b>' + name + ': ' + fmt(series, a[i]) + '<br>U.S. average: ' + fmt(series, u[i]);
        tip.style.left = (x(i) * r.width / W) + 'px';
        tip.style.top = (Math.min(y(a[i]), y(u[i])) * r.height / H - 10) + 'px';
        tip.style.opacity = 1;
      }
      function off() { xl.setAttribute('opacity', '0'); tip.style.opacity = 0; }
      hit.addEventListener('mousemove', at); hit.addEventListener('touchstart', at, { passive: true });
      hit.addEventListener('touchmove', at, { passive: true }); hit.addEventListener('mouseleave', off); hit.addEventListener('touchend', off);
    }).catch(function () {});
  }

  function init() {
    ticker();
    var els = document.querySelectorAll('[data-price-chart]');
    if (!els.length) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    els.forEach(chart);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
