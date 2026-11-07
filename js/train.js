/* SERVICE：画面を一閃が走り、二つの事業が斬り分けられる */
(function () {
  var t = document.querySelector('.slash');
  if (!t) return;
  var still = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || !('IntersectionObserver' in window);
  function arrive() { t.classList.add('arrived'); }
  if (still) { t.classList.add('arrived', 'still'); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { setTimeout(arrive, 120); io.disconnect(); } });
  }, { threshold: .35 });
  io.observe(t);
  setTimeout(function () { if (!t.classList.contains('arrived') && t.getBoundingClientRect().top < innerHeight) arrive(); }, 2500);
})();
