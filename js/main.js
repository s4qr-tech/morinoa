// スクロール出現（スライドアップ 20px→0 / 0.5s、ステガー 0.1s）
(function(){
  var items = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){
    items.forEach(function(el){el.classList.add('show');});
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e,i){
      if(e.isIntersecting){
        setTimeout(function(){e.target.classList.add('show');}, (i%4)*100);
        io.unobserve(e.target);
      }
    });
  },{threshold:.15});
  items.forEach(function(el){io.observe(el);});
})();

// 一座の名札：押すと裏返って本人の写真を表示（裏面がある札のみ）
document.querySelectorAll('.org-card.has-back').forEach(function(card){
  function flip(){
    var on = card.classList.toggle('flipped');
    card.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  card.addEventListener('click', flip);
  card.addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
  });
});

// 三本線メニュー：開閉、外側クリック・Escキー・リンク選択で閉じる
(function(){
  var btn = document.querySelector('.menu-btn'), menu = document.getElementById('site-menu');
  if (!btn || !menu) return;
  function set(open){
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    menu.hidden = !open;
  }
  btn.addEventListener('click', function(e){ e.stopPropagation(); set(menu.hidden); });
  menu.addEventListener('click', function(e){ if (e.target.closest('a')) set(false); });
  document.addEventListener('click', function(e){ if (!menu.hidden && !menu.contains(e.target)) set(false); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
})();

// 飲食事業：BAR のネオン看板は、見えたときに通電させる
(function(){
  var signs = document.querySelectorAll('.neon-sign');
  if (!signs.length) return;
  if (!('IntersectionObserver' in window)) { [].forEach.call(signs, function(el){ el.classList.add('on'); }); return; }
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }); }, { threshold: .6 });
  [].forEach.call(signs, function(el){ io.observe(el); });
})();
