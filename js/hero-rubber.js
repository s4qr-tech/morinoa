/* ヒーロー（一画面のMORINOA）：少しスクロールしても、手を離すとゴムのように元の位置へ戻る
   ・ヒーローの高さの約3割まではゴムの範囲。それを超えたら通常のスクロール
   ・ヒーローの中身は、引かれた分だけ遅れてついてくる（引っ張られる感じ）
   ・視差を減らす設定のときは動かさない */
(function(){
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var hero = document.querySelector('.hero'); if (!hero || window.innerWidth <= 820) return;
  var root = document.documentElement, kids = Array.prototype.slice.call(hero.children);
  var timer = 0, anim = 0, busy = false, touching = false;

  function limit(){ return Math.min(window.innerHeight * .28, 260); }
  function pull(px){ var v = px ? 'translate3d(0,' + px.toFixed(1) + 'px,0)' : ''; kids.forEach(function(k){ k.style.transform = v; k.style.willChange = px ? 'transform' : ''; }); }
  function stretch(y){ return y * .42; }

  function springBack(){
    var start = window.scrollY; if (start < 2 || start >= limit()) { pull(0); return; }
    busy = true; root.style.scrollBehavior = 'auto';
    var t0 = performance.now(), total = 1.4;
    cancelAnimationFrame(anim);
    (function step(now){
      var t = Math.min(total, (now - t0) / 1000), s = Math.exp(-5 * t) * Math.cos(5.2 * t), pos = start * s;   // 1回だけ小さく行き過ぎて、静かに止まる
      window.scrollTo(0, Math.max(0, pos)); pull(pos < 0 ? pos * 1.6 : stretch(Math.max(0, pos)));
      if (t < total) anim = requestAnimationFrame(step); else { window.scrollTo(0, 0); pull(0); root.style.scrollBehavior = ''; busy = false; }
    })(t0);
  }

  function onScroll(){
    if (busy) return; var y = window.scrollY;
    if (y > 0 && y < limit()) pull(stretch(y)); else pull(0);
    clearTimeout(timer);
    timer = setTimeout(function(){ if (!touching && window.scrollY > 0 && window.scrollY < limit()) springBack(); }, 140);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('touchstart', function(){ touching = true; cancelAnimationFrame(anim); busy = false; }, { passive: true });
  window.addEventListener('touchend', function(){ touching = false; clearTimeout(timer); timer = setTimeout(function(){ if (window.scrollY > 0 && window.scrollY < limit()) springBack(); }, 60); }, { passive: true });
  window.addEventListener('wheel', function(){ if (busy) { cancelAnimationFrame(anim); busy = false; root.style.scrollBehavior = ''; } }, { passive: true });
})();
