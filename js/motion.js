// MORINOA モーション
// 初回訪問：御簾の入場から見出しの幕開けへ。2回目以降：左下に演出ON/OFFのスイッチを表示。
// OFFを選んだ人・「動きを減らす」設定の端末では、動きを止めて内容をすぐに見せる。
(function(){
  var body = document.body;
  var VISIT_KEY = 'morinoa-visits', PREF_KEY = 'morinoa-motion';
  function lsGet(k){ try { return localStorage.getItem(k); } catch(e) { return null; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e) {} }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 端末の「動きを減らす」設定がオンでも演出は出す（ご要望）。
  // その代わり、その端末では初回から演出ON/OFFのスイッチを表示し、すぐ止められるようにする。
  function motionOn(){ return lsGet(PREF_KEY) !== 'off'; }

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
  // 五手：細い矢印がカードの後ろを通り、カードの間に見える（常時表示）
  var refreshFlow = function(){};
  if (flow) refreshFlow = flowArrows(flow);
  function flowArrows(grid){
    var voy = document.createElement('div');
    voy.className = 'voyage'; voy.setAttribute('aria-hidden', 'true');
    voy.innerHTML = '<div class="trail-rest"></div><div class="trail"></div>';
    grid.appendChild(voy);   // 最後の子にして、手の色分け（nth-child）をずらさない
    var trail = voy.querySelector('.trail'), steps = [].slice.call(grid.querySelectorAll('.step')), idx = -2;
    function mobile(){ return window.matchMedia && matchMedia('(max-width:920px)').matches; }
    function centers(){
      var g = grid.getBoundingClientRect();
      return steps.map(function(st){ var r = st.getBoundingClientRect(); return mobile() ? r.top + r.height / 2 - g.top : r.left + r.width / 2 - g.left; });
    }
    function go(i){
      if (i === idx) return;
      idx = i;
      var c = centers(), pos = i < 0 ? 0 : c[i];
      trail.style.setProperty('--route', (c[c.length - 1] + 10) + 'px');
      if (mobile()) { trail.style.height = pos + 'px'; trail.style.width = ''; }
      else { trail.style.width = pos + 'px'; trail.style.height = ''; }
      steps.forEach(function(st, k){ st.classList.toggle('lit', k <= i); st.classList.toggle('here', false); });
    }
    function fromScroll(){
      // スクロールには同期させず、常に最後の手まで矢印を表示する
      go(steps.length - 1); return;
      var r = grid.getBoundingClientRect(), vh = innerHeight, i;
      if (mobile()) { var c = centers(); i = -1; c.forEach(function(y, k){ if (r.top + y < vh * .62) i = k; }); }
      else { var p = (vh * .8 - r.top) / (vh * .55); i = Math.min(steps.length - 1, Math.floor(p * 5.5) - 1); }
      go(Math.max(-1, i));
    }
    addEventListener('resize', function(){ var k = idx; idx = -2; go(k); });
    trail.style.transition = 'none';
    fromScroll();
    setTimeout(function(){ trail.style.transition = ''; }, 60);
    return function(){ idx = -2; fromScroll(); };
  }
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

  // ---------- ロゴの組み上がり（御簾の奥で、後ろから照らされながら） ----------
  // 墨の菱形が左から、緑の菱形が右から転がって重なり、円が入り、最後に文字が出る。
  // 描く座標はロゴ画像（681×573）と同じにして、最後に本物の画像へすり替えても位置がずれないようにする。
  function assembleLogo(){
    var card = document.querySelector('.hero-logo'), stack = card && card.querySelector('.logo-stack');
    var img = stack && stack.querySelector('.logo-img');
    if (!stack || !img) return;
    body.classList.add('logo-assembling');
    var cv = document.createElement('canvas');
    cv.className = 'logo-canvas';
    cv.setAttribute('aria-hidden', 'true');
    card.appendChild(cv);
    function place(){
      var a = card.getBoundingClientRect(), b = stack.getBoundingClientRect();
      cv.style.left = (b.left - a.left - card.clientLeft) + 'px'; cv.style.top = (b.top - a.top - card.clientTop) + 'px';
      cv.style.width = b.width + 'px'; cv.style.height = b.height + 'px';
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(b.width * dpr); cv.height = Math.round(b.height * dpr);
    }
    place();

    var TAU = Math.PI * 2, LW = 681, LH = 573;
    var INK = '#111D0F', GREEN = '#82C147', BLUE = '#42ACD0';
    // 実ロゴの菱形：中心→先端 212px、中心→辺 179px。これに合う角丸正方形（一辺358・角の丸み99）
    var A = { x: 212, y: 212 }, B = { x: 467, y: 220 }, S = 358, RAD = 99, R = 97.5;
    // 内側の円は菱形の中心から少しずれている（実ロゴを計測）
    var CA = { x: 212.5, y: 214.5 }, CB = { x: 467.5, y: 214.5 };
    function clamp(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }
    function bez(x1, y1, x2, y2){
      var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
      function sx(t){ return ((ax * t + bx) * t + cx) * t; } function sy(t){ return ((ay * t + by) * t + cy) * t; }
      function dx(t){ return (3 * ax * t + 2 * bx) * t + cx; }
      return function(x){ if (x <= 0) return 0; if (x >= 1) return 1; var t = x; for (var i = 0; i < 8; i++) { var e = sx(t) - x, d = dx(t); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; t -= e / d; } return sy(t); };
    }
    // 転がりは加速・減速のなめらかなカーブ、円は軽く弾む程度に
    var roll = bez(.33, 0, .2, 1), back = bez(.3, 1.3, .6, 1), out = bez(.22, 1, .36, 1);
    function seg(t, a, b, e){ return e(clamp((t - a) / (b - a))); }
    function rsq(g, x, y, rot, fill){
      var h = S / 2, r = RAD;
      g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
      g.moveTo(-h + r, -h); g.arcTo(h, -h, h, h, r); g.arcTo(h, h, -h, h, r); g.arcTo(-h, h, -h, -h, r); g.arcTo(-h, -h, h, -h, r); g.closePath();
      g.fillStyle = fill; g.fill(); g.restore();
    }
    // 転がる正方形：進んだ距離に合わせて90°ずつ回り、角で立つたびに中心が上下する
    var BOB = .35;   // 角で立つときの上下の揺れ（1だと実際の転がり、小さいほど滑らか）
    function rolled(from, to, restY, p, dir){
      var x = from + (to - from) * p, rot = Math.PI / 4 + dir * (x - to) / S * (Math.PI / 2);
      var local = ((rot % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
      var lift = (S / Math.SQRT2) * Math.cos(local - Math.PI / 4);
      return { x: x, y: restY + (S / Math.SQRT2 - lift) * BOB, rot: rot };   // 静止時にちょうど restY に収まる
    }
    function draw(t){
      var g = cv.getContext('2d'), sc = cv.width / LW;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      g.setTransform(sc, 0, 0, sc, 0, 0);
      var pA = seg(t, .1, 1.7, roll), pB = seg(t, .9, 2.4, roll);
      var cA = seg(t, 2.2, 2.9, back), cB = seg(t, 2.45, 3.15, back), word = seg(t, 3.0, 3.9, out);
      var a = rolled(-260, A.x, A.y, pA, 1);
      rsq(g, a.x, a.y, a.rot, INK);
      if (cA > 0) { g.beginPath(); g.arc(CA.x, CA.y, R * cA, 0, TAU); g.fillStyle = BLUE; g.fill(); }
      if (pB > 0) { var b = rolled(LW + 260, B.x, B.y, pB, 1); rsq(g, b.x, b.y, b.rot, GREEN); }
      if (cB > 0) { g.beginPath(); g.arc(CB.x, CB.y, R * cB, 0, TAU); g.fillStyle = INK; g.fill(); }
      if (word > 0 && img.complete) {
        g.globalAlpha = word;
        g.drawImage(img, 0, 436, LW, LH - 436, 0, 436 + (1 - word) * 14, LW, LH - 436);
        g.globalAlpha = 1;
      }
    }
    var t0 = performance.now(), DELAY = .9, END = 4.6;
    (function tick(now){
      if (!cv.isConnected) return;
      var t = (now - t0) / 1000 - DELAY;
      draw(Math.max(0, Math.min(t, END)));
      if (t < END) requestAnimationFrame(tick);
    })(t0);
    // 組み上がったら本物のロゴ画像に切り替える
    setTimeout(function(){ body.classList.add('logo-assembled'); }, 5400);
    setTimeout(function(){ cv.remove(); }, 6200);   // logo-assembling は残す（外すと旧来の浮かび上がりが再生されるため）
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
    assembleLogo();
    setTimeout(function(){ body.classList.add('misu-entered'); }, 5400);
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
  if (visits >= 2 || reduce) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'motion-toggle';
    toggle.setAttribute('aria-label', 'ページの演出を切り替える');
    toggle.innerHTML = '<i aria-hidden="true"></i><span></span>';
    toggle.addEventListener('click', function(){
      lsSet(PREF_KEY, motionOn() ? 'off' : 'on');
      applyPref();
      refreshFlow();
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
