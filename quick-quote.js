/* Quick-quote form — a short lead form for pages without the full homepage
   form. Renders into any <div data-quick-quote> (optional data-business-type
   and data-heading) and saves to electricity_leads with source
   'power-done-right', so it follows the same CRM intake and notification
   path as the homepage form. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://lhwfbectnrmrvwhkftun.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod2ZiZWN0bnJtcnZ3aGtmdHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzE1MzEsImV4cCI6MjA4OTQ0NzUzMX0.zmPRPeILtFNgGMp66JzhD44QUamXr0GFQAQq7y2WyoU';
  var PHONE = '(214) 494-1627';

  var CSS = '' +
    '.qq,.qq *{box-sizing:border-box}' +
    '.qq{background:#fff;color:#0b1220;border:1px solid #e3dfd5;border-radius:16px;padding:clamp(22px,4vw,34px);max-width:640px;margin:0 auto;text-align:left;font-family:Manrope,system-ui,-apple-system,sans-serif;box-shadow:0 20px 50px -30px rgba(11,18,32,.35)}' +
    '.qq h3{font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:clamp(26px,3.4vw,34px);line-height:1.1;margin:0 0 6px;color:#0b1220}' +
    '.qq .qq-sub{font-size:14.5px;color:#5b6373;margin:0 0 20px;line-height:1.5}' +
    '.qq .qq-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '@media(max-width:560px){.qq .qq-row{grid-template-columns:1fr}}' +
    '.qq label{display:block;font-size:12.5px;font-weight:600;color:#0b1220;margin:0 0 6px}' +
    '.qq .qq-f{margin-bottom:14px}' +
    '.qq input[type=text],.qq input[type=email],.qq input[type=tel],.qq input[type=number]{width:100%;box-sizing:border-box;border:1px solid #d6d1c4;border-radius:10px;padding:12px 14px;font:inherit;font-size:15px;color:#0b1220;background:#fbfaf7}' +
    '.qq input:focus{outline:2px solid #1e8a5f;outline-offset:1px;border-color:#1e8a5f}' +
    '.qq .qq-file{display:block;border:1px dashed #c8c0a8;border-radius:10px;padding:14px;text-align:center;font-size:13.5px;color:#5b6373;cursor:pointer;margin-bottom:16px}' +
    '.qq .qq-file:hover{border-color:#1e8a5f}' +
    '.qq button{width:100%;border:0;border-radius:999px;background:#0b1220;color:#fff;font:inherit;font-weight:600;font-size:15.5px;padding:15px 20px;cursor:pointer}' +
    '.qq button:disabled{opacity:.65;cursor:not-allowed}' +
    '.qq .qq-err{display:none;background:#fbeae6;color:#8a2c1a;border-radius:10px;padding:10px 14px;font-size:14px;margin-bottom:14px}' +
    '.qq .qq-err a{color:inherit;font-weight:700}' +
    '.qq .qq-fine{font-size:12px;color:#5b6373;margin:12px 0 0;text-align:center}' +
    '.qq .qq-done{text-align:center;padding:12px 0}' +
    '.qq .qq-done p{color:#5b6373;font-size:15px;margin:8px 0 0}';

  function html(heading) {
    return '' +
      '<div class="qq-body">' +
        '<h3>' + heading + '</h3>' +
        '<p class="qq-sub">Tell us where to send it. Attach a recent bill if you have one — it lets us start right away.</p>' +
        '<div class="qq-err" role="alert"></div>' +
        '<div class="qq-row">' +
          '<div class="qq-f"><label>Full name</label><input type="text" name="name" autocomplete="name" /></div>' +
          '<div class="qq-f"><label>Business name</label><input type="text" name="company" autocomplete="organization" /></div>' +
        '</div>' +
        '<div class="qq-row">' +
          '<div class="qq-f"><label>Work email</label><input type="email" name="email" autocomplete="email" /></div>' +
          '<div class="qq-f"><label>Phone (optional)</label><input type="tel" name="phone" autocomplete="tel" /></div>' +
        '</div>' +
        '<div class="qq-f"><label>Typical monthly electricity bill (optional)</label><input type="number" name="bill" inputmode="decimal" min="0" placeholder="$" /></div>' +
        '<label class="qq-file"><input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp" hidden />' +
          '<span class="qq-file-label">Attach a recent bill (optional) · PDF, JPG, PNG</span></label>' +
        '<button type="button">Get my quotes →</button>' +
        '<p class="qq-fine">No fees to your business · We reply within one business day</p>' +
      '</div>' +
      '<div class="qq-done" hidden>' +
        '<h3>Thank you — we have it.</h3>' +
        '<p>We\'ll be in touch within one business day. Questions sooner? Call <a href="tel:+12144941627">' + PHONE + '</a>.</p>' +
      '</div>';
  }

  function uploadBill(file) {
    var filename = crypto.randomUUID() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    return file.arrayBuffer().then(function (buf) {
      return fetch(SUPABASE_URL + '/storage/v1/object/electricity-bills/' + filename, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': file.type },
        body: buf,
      });
    }).then(function (res) {
      if (!res.ok) throw new Error('Upload failed');
      return SUPABASE_URL + '/storage/v1/object/public/electricity-bills/' + filename;
    });
  }

  function mount(el) {
    var box = document.createElement('div');
    box.className = 'qq';
    box.innerHTML = html(el.getAttribute('data-heading') || 'Get your written rate comparison.');
    el.appendChild(box);

    var field = function (n) { return box.querySelector('[name="' + n + '"]'); };
    var errEl = box.querySelector('.qq-err');
    var btn = box.querySelector('button');
    var fileLabel = box.querySelector('.qq-file-label');

    field('file').addEventListener('change', function () {
      var f = field('file').files[0];
      fileLabel.textContent = f ? '✓ ' + f.name : 'Attach a recent bill (optional) · PDF, JPG, PNG';
    });

    function fail(msg) {
      errEl.innerHTML = msg;
      errEl.style.display = 'block';
    }

    btn.addEventListener('click', async function () {
      var name = field('name').value.trim();
      var email = field('email').value.trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fail('Please enter your name and a valid email address.');
        return;
      }
      errEl.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Sending…';

      var file = field('file').files[0];
      var billUrl = null;
      if (file) {
        try { billUrl = await uploadBill(file); } catch (_) { /* the lead still goes through without the bill */ }
      }

      var params = new URLSearchParams(window.location.search);
      var payload = {
        name: name,
        email: email,
        phone: field('phone').value.trim() || null,
        property_name: field('company').value.trim() || null,
        current_monthly_bill: parseFloat(field('bill').value) || null,
        business_type: el.getAttribute('data-business-type') || null,
        bill_url: billUrl,
        landing_page: window.location.pathname,
        referrer: document.referrer || null,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        utm_term: params.get('utm_term'),
        utm_content: params.get('utm_content'),
        gclid: params.get('gclid'),
        notes: 'Quick-quote form on ' + window.location.pathname,
        source: 'power-done-right',
        status: 'new',
      };
      // Client-generated id so the CRM intake can stamp this lead (see index.html).
      if (window.crypto && crypto.randomUUID) payload.id = crypto.randomUUID();

      try {
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
          window.gtag('event', 'generate_lead', { event_category: 'lead', form: 'quick_quote', page_path: window.location.pathname });
        }
        box.querySelector('.qq-body').hidden = true;
        box.querySelector('.qq-done').hidden = false;
      } catch (err) {
        fail('We couldn\'t send your details. Please try again, or call us at <a href="tel:+12144941627">' + PHONE + '</a>.');
        btn.disabled = false;
        btn.textContent = 'Get my quotes →';
        console.error('Quick-quote submit error:', err);
      }
    });
  }

  function init() {
    var els = document.querySelectorAll('[data-quick-quote]');
    if (!els.length) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    els.forEach(mount);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
