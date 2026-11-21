/* Power Done Right — shared mobile menu toggle for the site header. */
(function(){
  const btn = document.getElementById('navToggle');
  const menu = document.getElementById('mobMenu');
  const ham = document.getElementById('hamIcon');
  const close = document.getElementById('closeIcon');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    ham.style.display = open ? 'none' : '';
    close.style.display = open ? '' : 'none';
  });
})();
function closeMobMenu(){
  const menu = document.getElementById('mobMenu');
  const btn = document.getElementById('navToggle');
  const ham = document.getElementById('hamIcon');
  const close = document.getElementById('closeIcon');
  if (menu) menu.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (ham) ham.style.display = '';
  if (close) close.style.display = 'none';
}

/* Header dropdowns: hover/focus open them on desktop (CSS); a click toggles for touch. */
document.addEventListener('click', function (e) {
  var b = e.target.closest('.hx-dd > button');
  document.querySelectorAll('.hx-dd.open').forEach(function (d) {
    if (!b || d !== b.parentNode) { d.classList.remove('open'); d.firstElementChild.setAttribute('aria-expanded', 'false'); }
  });
  if (b) { var o = b.parentNode.classList.toggle('open'); b.setAttribute('aria-expanded', String(o)); }
});
