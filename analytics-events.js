(function () {
  function track(eventName, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, Object.assign({ page_path: window.location.pathname }, params || {}));
  }

  function closestLink(target) {
    return target && target.closest ? target.closest('a[href]') : null;
  }

  document.addEventListener('click', function (event) {
    var link = closestLink(event.target);
    if (link) {
      var href = link.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0) {
        track('phone_click', { link_url: href, link_text: link.textContent.trim() });
      } else if (href.indexOf('mailto:') === 0) {
        track('email_click', { link_url: href, link_text: link.textContent.trim() });
      } else if (href === '#lead' || href.endsWith('/#lead')) {
        track('lead_cta_click', { link_text: link.textContent.trim() });
      } else if (href === '#calc-preview' || href.endsWith('/#calc-preview')) {
        track('calculator_cta_click', { link_text: link.textContent.trim() });
      }
    }

    var manualEntry = event.target.closest && event.target.closest('#lf-bill-skip');
    if (manualEntry) track('manual_entry_selected');

    var nextButton = event.target.closest && event.target.closest('#lf-next');
    if (nextButton) {
      var formWrap = document.getElementById('lead-form-wrap');
      var step = formWrap && formWrap.querySelector('#lf-step-1') &&
        getComputedStyle(formWrap.querySelector('#lf-step-1')).display !== 'none' ? 2 : 1;
      track(step === 1 ? 'lead_form_started' : 'lead_form_submit_attempt', { form_step: step });
    }
  });

  document.addEventListener('change', function (event) {
    if (event.target && event.target.matches('#lf-bill-file') && event.target.files && event.target.files.length) {
      track('bill_upload_started', { file_type: event.target.files[0].type || 'unknown' });
    }
  });
})();
