/* Lighter first steps for visitors not ready to send a bill.
   Renders into any <div data-light-ask>: a renewal-reminder form and a
   call-back request. Both save to electricity_leads with source
   'power-done-right', so they follow the same CRM intake + notification path
   as the bill forms. Also exposes window.PDRLead.submit() for other small
   forms (the referral partner page). quick-quote.js appends a container and
   loads this file, so every page with a lead form gets it. */
(function () {
  'use strict';
  if (window.PDRLead) return;

  var SUPABASE_URL = 'https://lhwfbectnrmrvwhkftun.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod2ZiZWN0bnJtcnZ3aGtmdHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzE1MzEsImV4cCI6MjA4OTQ0NzUzMX0.zmPRPeILtFNgGMp66JzhD44QUamXr0GFQAQq7y2WyoU';
  var PHONE = '(214) 494-1627';
  var PHONE_LINK = '<a href="tel:+12144941627">' + PHONE + '</a>';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Save a lead and notify the team. Resolves on a saved row; rejects otherwise.
  async function submit(fields, formName) {
    var params = new URLSearchParams(window.location.search);
    var payload = Object.assign({
      landing_page: window.location.pathname,
      referrer: document.referrer || null,
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
      gclid: params.get('gclid'),
      source: 'power-done-right',
      status: 'new',
    }, fields);
    if (window.crypto && crypto.randomUUID) payload.id = crypto.randomUUID();

    var res = await fetch(SUPABASE_URL + '/rest/v1/electricity_leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    fetch(SUPABASE_URL + '/functions/v1/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      body: JSON.stringify({ type: 'PDR_LEAD', record: payload }),
    }).catch(function () {});

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'generate_lead', { event_category: 'lead', form: formName, page_path: window.location.pathname });
    }
  }

  window.PDRLead = { submit: submit, PHONE: PHONE, PHONE_LINK: PHONE_LINK };

  var CSS = '' +
    '.la,.la *{box-sizing:border-box}' +
    '.la{max-width:640px;margin:22px auto 0;font-family:Archivo,system-ui,-apple-system,sans-serif;color:#1A1F2B;text-align:left}' +
    '.la-head{font-size:15px;font-weight:600;text-align:center;margin:0 0 12px}' +
    '.la-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '@media(max-width:560px){.la-opts{grid-template-columns:1fr}}' +
    '.la-opt{display:block;width:100%;text-align:left;background:#fff;border:1px solid #D9DEE3;border-radius:12px;padding:14px 16px;font:inherit;color:#1A1F2B;cursor:pointer}' +
    '.la-opt:hover,.la-opt[aria-expanded=true]{border-color:#14213D}' +
    '.la-opt b{display:block;font-size:15px;margin-bottom:3px}' +
    '.la-opt span{display:block;font-size:13px;color:#5A6475;line-height:1.4}' +
    '.la-panel{background:#fff;border:1px solid #D9DEE3;border-radius:12px;padding:18px;margin-top:10px}' +
    '.la-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '@media(max-width:560px){.la-row{grid-template-columns:1fr}}' +
    '.la label{display:block;font-size:12.5px;font-weight:600;margin:0 0 6px}' +
    '.la .la-f{margin-bottom:12px}' +
    '.la input,.la select{width:100%;border:1px solid #D9DEE3;border-radius:10px;padding:11px 13px;font:inherit;font-size:15px;color:#1A1F2B;background:#fff}' +
    '.la input:focus,.la select:focus{outline:2px solid #1e8a5f;outline-offset:1px;border-color:#1e8a5f}' +
    '.la .la-btn{width:100%;border:0;border-radius:8px;background:#14213D;color:#fff;font:inherit;font-weight:600;font-size:15px;padding:13px 18px;cursor:pointer}' +
    '.la .la-btn:disabled{opacity:.65;cursor:not-allowed}' +
    '.la .la-fine{font-size:12px;color:#5A6475;margin:10px 0 0;text-align:center}' +
    '.la .la-err{display:none;background:#fbeae6;color:#8a2c1a;border-radius:10px;padding:10px 14px;font-size:14px;margin-bottom:12px}' +
    '.la .la-err a,.la .la-done a{color:inherit;font-weight:700}' +
    '.la .la-done{text-align:center;padding:6px 0}' +
    '.la .la-done b{display:block;font-size:17px;margin-bottom:6px}' +
    '.la .la-done p{margin:0;color:#5A6475;font-size:14.5px}';

  function months() {
    // Next 36 months, the range a commercial contract end date can fall in.
    var out = ['<option value="">Select month</option>'];
    var d = new Date(); d.setDate(1);
    for (var i = 0; i < 36; i++) {
      var y = d.getFullYear(), m = d.getMonth() + 1;
      var val = y + '-' + (m < 10 ? '0' : '') + m + '-01';
      out.push('<option value="' + val + '">' + d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) + '</option>');
      d.setMonth(d.getMonth() + 1);
    }
    out.push('<option value="unknown">Not sure</option>');
    return out.join('');
  }

  function html() {
    return '' +
      '<p class="la-head">Not ready to send a bill? Start smaller.</p>' +
      '<div class="la-opts">' +
        '<button type="button" class="la-opt" data-open="remind" aria-expanded="false"><b>Remind me before my contract ends</b><span>Tell us when it ends. We\'ll contact you before your renewal window opens.</span></button>' +
        '<button type="button" class="la-opt" data-open="call" aria-expanded="false"><b>Have someone call me</b><span>A short call to answer questions. No bill needed.</span></button>' +
      '</div>' +
      '<div class="la-panel" data-panel="remind" hidden>' +
        '<div class="la-err" role="alert"></div>' +
        '<div class="la-body">' +
          '<div class="la-row">' +
            '<div class="la-f"><label>Full name</label><input type="text" name="name" autocomplete="name" /></div>' +
            '<div class="la-f"><label>Business name</label><input type="text" name="company" autocomplete="organization" /></div>' +
          '</div>' +
          '<div class="la-row">' +
            '<div class="la-f"><label>Work email</label><input type="email" name="email" autocomplete="email" /></div>' +
            '<div class="la-f"><label>When does your contract end?</label><select name="end">' + months() + '</select></div>' +
          '</div>' +
          '<button type="button" class="la-btn">Set my reminder</button>' +
          '<p class="la-fine">No obligation. We use your email only for this reminder and your renewal.</p>' +
        '</div>' +
        '<div class="la-done" hidden><b>Reminder set.</b><p>We\'ll be in touch before your renewal window opens. Questions sooner? Call ' + PHONE_LINK + '.</p></div>' +
      '</div>' +
      '<div class="la-panel" data-panel="call" hidden>' +
        '<div class="la-err" role="alert"></div>' +
        '<div class="la-body">' +
          '<div class="la-row">' +
            '<div class="la-f"><label>Full name</label><input type="text" name="name" autocomplete="name" /></div>' +
            '<div class="la-f"><label>Phone</label><input type="tel" name="phone" autocomplete="tel" /></div>' +
          '</div>' +
          '<div class="la-row">' +
            '<div class="la-f"><label>Work email</label><input type="email" name="email" autocomplete="email" /></div>' +
            '<div class="la-f"><label>Best time to call</label><select name="when"><option>Morning</option><option>Midday</option><option>Afternoon</option></select></div>' +
          '</div>' +
          '<button type="button" class="la-btn">Request a call</button>' +
          '<p class="la-fine">Weekdays, Central time. Or call now: ' + PHONE_LINK + '</p>' +
        '</div>' +
        '<div class="la-done" hidden><b>Thank you — we\'ll call you.</b><p>We return call requests within one business day.</p></div>' +
      '</div>';
  }

  function mount(el) {
    if (el.getAttribute('data-rendered')) return;
    el.setAttribute('data-rendered', '1');
    var box = document.createElement('div');
    box.className = 'la';
    box.innerHTML = html();
    el.appendChild(box);

    var opts = box.querySelectorAll('.la-opt');
    opts.forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-open');
        opts.forEach(function (o) { o.setAttribute('aria-expanded', String(o === b)); });
        box.querySelectorAll('.la-panel').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== key; });
      });
    });

    function wire(key, collect, formName, label) {
      var panel = box.querySelector('[data-panel="' + key + '"]');
      var btn = panel.querySelector('.la-btn');
      var errEl = panel.querySelector('.la-err');
      var f = function (n) { return panel.querySelector('[name="' + n + '"]').value.trim(); };
      btn.addEventListener('click', async function () {
        var fields;
        try { fields = collect(f); } catch (msg) {
          errEl.textContent = msg; errEl.style.display = 'block'; return;
        }
        errEl.style.display = 'none';
        btn.disabled = true; btn.textContent = 'Sending…';
        try {
          await submit(fields, formName);
          panel.querySelector('.la-body').hidden = true;
          panel.querySelector('.la-done').hidden = false;
        } catch (err) {
          errEl.innerHTML = 'We couldn\'t send that. Please try again, or call us at ' + PHONE_LINK + '.';
          errEl.style.display = 'block';
          btn.disabled = false; btn.textContent = label;
          console.error('Light-ask submit error:', err);
        }
      });
    }

    wire('remind', function (f) {
      if (!f('name') || !EMAIL_RE.test(f('email'))) throw 'Please enter your name and a valid email address.';
      if (!f('end')) throw 'Please choose the month your contract ends, or "Not sure".';
      var end = f('end') === 'unknown' ? null : f('end');
      var endLabel = end ? panelMonthLabel(end) : 'not sure';
      return {
        name: f('name'), email: f('email'), property_name: f('company') || null,
        contract_expiration: end,
        notes: '[Request: renewal reminder] Contract ends: ' + endLabel + '. Contact before the renewal window opens. Form on ' + window.location.pathname,
      };
    }, 'renewal_reminder', 'Set my reminder');

    wire('call', function (f) {
      if (!f('name') || f('phone').replace(/\D/g, '').length < 10 || !EMAIL_RE.test(f('email'))) throw 'Please enter your name, a phone number and a valid email address.';
      return {
        name: f('name'), phone: f('phone'), email: f('email'),
        best_time_to_contact: f('when'),
        notes: '[Request: call back] Best time: ' + f('when') + ' (Central). Form on ' + window.location.pathname,
      };
    }, 'call_back', 'Request a call');
  }

  function panelMonthLabel(iso) {
    var p = iso.split('-');
    return new Date(+p[0], +p[1] - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  function init() {
    var els = document.querySelectorAll('[data-light-ask]');
    if (!els.length) return;
    if (!document.getElementById('la-css')) {
      var style = document.createElement('style');
      style.id = 'la-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    els.forEach(mount);
  }
  window.PDRLead.init = init;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
