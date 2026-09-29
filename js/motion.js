// MORINOA モーション
// 初回訪問：御簾の入場から見出しの幕開けへ。2回目以降：左下に演出ON/OFFのスイッチを表示。
// OFFを選んだ人・「動きを減らす」設定の端末では、動きを止めて内容をすぐに見せる。
(function(){
  var body = document.body;
  var VISIT_KEY = 'morinoa-visits', PREF_KEY = 'morinoa-motion';
  function lsGet(k){ try { return localStorage.getItem(k); } catch(e) { return null; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e) {} }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function motionOn(){ return !reduce && lsGet(PREF_KEY) !== 'off'; }

  var visits = (parseInt(lsGet(VISIT_KEY), 10) || 0) + 1;
  lsSet(VISIT_KEY, visits);

  body.classList.add('motion');

  // ---------- 見出しを行ごとに包む ----------
  var hero = document.querySelector('.hero');
  var h1 = hero && hero.querySelector('h1');
  if (h1) {
    h1.innerHTML = h1.innerHTML.split(/<br\s*\/?>/i).map(function(p){
      return '<span class="ln"><span>' + p + '</span></span>';
    }).join('');
  }
  function playHero(){ if (hero) hero.classList.add('play'); }

  // ---------- 五手の線・読み進みバー ----------
  var flow = document.querySelector('.flow-grid');
  if (flow) { var line = document.createElement('div'); line.className = 'flow-line'; flow.appendChild(line); }
  var bar = document.createElement('div'); bar.className = 'read-progress'; body.appendChild(bar);
  var header = document.querySelector('header');

  // ---------- 画面に入ったら再生 ----------
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        var t = e.target;
        if (t === flow) flow.classList.add('play');
        else if (t.classList.contains('sec-title')) t.classList.add('inked');
        else if (t.classList.contains('hanko')) t.classList.add('show');
        io.unobserve(t);
      });
    }, {threshold:.4});
    if (flow) io.observe(flow);
    document.querySelectorAll('.sec-title,.hanko').forEach(function(el){ io.observe(el); });
  } else {
    if (flow) flow.classList.add('play');
    document.querySelectorAll('.sec-title').forEach(function(el){ el.classList.add('inked'); });
    document.querySelectorAll('.hanko').forEach(function(el){ el.classList.add('show'); });
  }

  // ---------- スクロール連動 ----------
  function onScroll(){
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 40);
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? y / max * 100 : 0) + '%';
  }
  addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // ---------- カーソル連動（マウスのある端末のみ） ----------
  var finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer) {
    document.querySelectorAll('.svc,.org-card,.about-card').forEach(function(card){
      card.addEventListener('mousemove', function(ev){
        if (!motionOn()) return;
        var r = card.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
        card.style.transform = 'perspective(800px) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 6) + 'deg) translateY(-4px)';
      });
      card.addEventListener('mouseleave', function(){ card.style.transform = ''; });
    });
    document.querySelectorAll('.btn-primary').forEach(function(btn){
      btn.addEventListener('mousemove', function(ev){
        if (!motionOn()) return;
        var r = btn.getBoundingClientRect();
        btn.style.transform = 'translate(' + (ev.clientX - r.left - r.width / 2) * .25 + 'px,' + (ev.clientY - r.top - r.height / 2) * .35 + 'px)';
      });
      btn.addEventListener('mouseleave', function(){ btn.style.transform = ''; });
    });
  }

  // ---------- ロゴを「マーク」と「文字」に分けて重ねる ----------
  // 同じ画像を2枚重ね、上＝マークだけ、下＝morinoa の文字だけを切り抜いて、別々の時間に出す
  function splitLogo(){
    var img = document.querySelector('.hero-logo .logo-img');
    if (!img || img.parentNode.classList.contains('logo-stack')) return;
    var stack = document.createElement('span');
    stack.className = 'logo-stack';
    img.parentNode.insertBefore(stack, img);
    stack.appendChild(img);
    var word = img.cloneNode(false);
    word.className = 'logo-word';
    word.alt = '';
    word.removeAttribute('onerror');
    word.setAttribute('aria-hidden', 'true');
    stack.appendChild(word);
  }

  // ---------- 御簾の入場（トップページのみ） ----------
  var intro = null;
  function playIntro(){
    if (!hero || !motionOn()) { playHero(); return; }
    intro = document.createElement('div');
    intro.className = 'misu-intro';
    intro.setAttribute('aria-hidden', 'true');
    intro.innerHTML =
      '<div class="misu-dark"></div><div class="misu-glow"></div>' +
      '<div class="misu">' +
        '<div class="misu-mokou"><i class="misu-mon"></i><i class="misu-mon"></i><i class="misu-mon"></i></div>' +
        '<div class="misu-body"></div><div class="misu-hem"></div>' +
        '<div class="misu-fusa l"><i class="cord"></i><i class="knot"></i><i class="fringe"></i></div>' +
        '<div class="misu-fusa r"><i class="cord"></i><i class="knot"></i><i class="fringe"></i></div>' +
      '</div>';
    body.appendChild(intro);
    body.classList.add('misu-entering');
    splitLogo();
    setTimeout(function(){ body.classList.add('misu-entered'); }, 6400);
    var heroTimer = setTimeout(playHero, 3400);
    function finish(){ if (!intro) return; intro.remove(); intro = null; }
    intro.addEventListener('click', function(){ clearTimeout(heroTimer); playHero(); intro.classList.add('skip'); setTimeout(finish, 400); });
    intro.addEventListener('animationend', function(e){ if (e.animationName === 'misu-out') finish(); });
    setTimeout(finish, 4800); // animationend が来ない環境の保険
    // 描画を一度挟んでから開始（requestAnimationFrame は非表示タブで止まるため setTimeout を使う）
    setTimeout(function(){ intro && intro.classList.add('go'); }, 30);
  }

  // ---------- 訪問者向け：演出ON/OFF（2回目以降） ----------
  var toggle = null;
  function applyPref(){
    body.classList.toggle('motion-off', !motionOn());
    if (toggle) {
      toggle.setAttribute('aria-pressed', motionOn() ? 'true' : 'false');
      toggle.querySelector('span').textContent = motionOn() ? '演出 ON' : '演出 OFF';
    }
  }
  if (visits >= 2 && !reduce) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'motion-toggle';
    toggle.setAttribute('aria-label', 'ページの演出を切り替える');
    toggle.innerHTML = '<i aria-hidden="true"></i><span></span>';
    toggle.addEventListener('click', function(){
      lsSet(PREF_KEY, motionOn() ? 'off' : 'on');
      applyPref();
      if (!motionOn()) {
        playHero();
        if (intro) intro.classList.add('skip');
        document.querySelectorAll('.svc,.org-card,.about-card,.btn-primary').forEach(function(el){ el.style.transform = ''; });
      }
    });
    body.appendChild(toggle);
  }
  applyPref();
  playIntro();
})();
