/* IP・デザイン：ページを開いた瞬間に、筆で描くように墨が走り、墨汁が散る。
   閃光ではなく、筆の毛ひと筋ずつ・かすれ・はね。タップで飛ばせる。 */
(function () {
  'use strict';
  var root = document.documentElement;
  var INKB = '17,29,15', INK = INKB, PAPER = '#EFE9D6';
  // 端末の「動きを減らす」設定がオンでも演出は出す（スマホは既定でオンのことが多いため。サイト全体の方針と同じ）
  var reduce = false;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ease(t) { return 1 - Math.pow(1 - t, 2.2); }

  /* ---- 一本の筆：毛を並べ、進むほど細くかすれる ---- */
  function makeStroke(x0, y0, x1, y1, width, dur, delay) {
    var dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy);
    var ux = dx / len, uy = dy / len, px = -uy, py = ux;
    var n = Math.max(24, Math.round(width / 2.4));
    var bristles = [];
    for (var i = 0; i < n; i++) {
      var off = (i / (n - 1) - 0.5) * 2;                 // -1..1
      bristles.push({
        off: off,
        w: rnd(1.6, 4.2),
        a: rnd(.72, 1),
        end: Math.min(1, 0.62 + Math.pow(Math.random(), 1.6) * 0.5 + (1 - Math.abs(off)) * 0.12), // 外側の毛ほど早く切れる＝かすれ
        ph: rnd(0, 6.28), fq: rnd(5, 14), amp: rnd(.4, 1.8),
        lag: rnd(0, .05), gap: Math.random() < .12   // 毛のすき間
      });
    }
    return { x0: x0, y0: y0, dx: dx, dy: dy, len: len, ux: ux, uy: uy, px: px, py: py, width: width, dur: dur, delay: delay, b: bristles, prev: 0, splat: false };
  }
  function stepStroke(ctx, s, t) {          // t: 経過秒（delay 差引後）
    var INK = s.col || INKB;
    var p = Math.min(1, Math.max(0, t / s.dur)); p = ease(p);
    for (var i = 0; i < s.b.length; i++) {
      var br = s.b[i];
      var pp = Math.max(0, Math.min(br.end, p - br.lag)), pv = Math.max(0, Math.min(br.end, s.prev - br.lag));
      if (pp <= pv) continue;
      var steps = 6;
      ctx.lineCap = 'round';
      for (var k = 0; k < steps; k++) {
        var a = pv + (pp - pv) * (k / steps), b2 = pv + (pp - pv) * ((k + 1) / steps);
        var prof = (0.55 + 0.45 * Math.sin(Math.min(1, a * 1.4) * Math.PI * .5 + .6)) * (1 - 0.38 * a); // 太さの変化
        var wob = Math.sin(a * br.fq + br.ph) * br.amp;
        var o = br.off * s.width * .5 * prof + wob;
        var fade = 1 - Math.pow(a / br.end, 3) * .5;
        ctx.strokeStyle = 'rgba(' + INK + ',' + (br.a * fade * (br.gap && a > .35 ? .35 : 1)).toFixed(2) + ')';
        ctx.lineWidth = br.w * (1.4 - a * .6);
        var wob2 = Math.sin(b2 * br.fq + br.ph) * br.amp, o2 = br.off * s.width * .5 * ((0.55 + 0.45 * Math.sin(Math.min(1, b2 * 1.4) * Math.PI * .5 + .6)) * (1 - 0.38 * b2)) + wob2;
        ctx.beginPath();
        ctx.moveTo(s.x0 + s.dx * a + s.px * o, s.y0 + s.dy * a + s.py * o);
        ctx.lineTo(s.x0 + s.dx * b2 + s.px * o2, s.y0 + s.dy * b2 + s.py * o2);
        ctx.stroke();
      }
    }
    // 中心の墨だまり：途切れのない太い線で、毛のすき間を埋める
    var core = Math.min(.92, p);
    if (core > s.prev) {
      var f0 = s.prev, f1 = core;
      var pf0 = (0.55 + 0.45 * Math.sin(Math.min(1, f0 * 1.4) * Math.PI * .5 + .6)) * (1 - 0.38 * f0);
      var pf1 = (0.55 + 0.45 * Math.sin(Math.min(1, f1 * 1.4) * Math.PI * .5 + .6)) * (1 - 0.38 * f1);
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(' + INK + ',1)';
      ctx.lineWidth = s.width * .5 * (pf0 + pf1) * .5;
      ctx.beginPath();
      ctx.moveTo(s.x0 + s.dx * f0, s.y0 + s.dy * f0);
      ctx.lineTo(s.x0 + s.dx * f1, s.y0 + s.dy * f1);
      ctx.stroke();
    }
    s.prev = p;
  }

  /* ---- はね：大小の墨滴。筆の進む向きに長く飛ぶ ---- */
  function splatter(ctx, cx, cy, ux, uy, spread, count, big) {
    for (var i = 0; i < count; i++) {
      var ang = Math.atan2(uy, ux) + rnd(-1.1, 1.1);
      var dist = Math.pow(Math.random(), 1.7) * spread;
      var x = cx + Math.cos(ang) * dist, y = cy + Math.sin(ang) * dist;
      var r = (Math.pow(Math.random(), 3.2) * (big || 16)) + rnd(.8, 2.2);
      ctx.fillStyle = 'rgba(' + INK + ',' + rnd(.78, 1).toFixed(2) + ')';
      ctx.beginPath();
      if (r > 5 && Math.random() < .6) {              // 太い滴は進行方向に伸びたしずく型
        ctx.ellipse(x, y, r * rnd(1.2, 2.1), r * rnd(.7, 1), ang, 0, 6.283);
        ctx.fill();
        // 尾
        ctx.lineWidth = r * .5; ctx.strokeStyle = ctx.fillStyle; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * r * rnd(2, 4), y - Math.sin(ang) * r * rnd(2, 4)); ctx.stroke();
      } else {
        ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      }
    }
  }

  function sizeCanvas(c, w, h) {
    var d = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(w * d); c.height = Math.round(h * d);
    c.style.width = w + 'px'; c.style.height = h + 'px';
    var ctx = c.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    return ctx;
  }

  /* ---- 飛ぶ墨滴：勢いよく飛び散り、減速して止まる ---- */
  function makeBurst(list, x, y, ux, uy, count, big, speed, cone, cols) {
    var base = Math.atan2(uy, ux);
    for (var i = 0; i < count; i++) {
      var ang = base + rnd(-cone, cone);
      var v = speed * (0.25 + Math.pow(Math.random(), 1.4) * 0.95);
      list.push({
        x: x, y: y, px: x, py: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
        r: Math.pow(Math.random(), 3) * big + rnd(.8, 2.4), life: rnd(.22, .6), age: 0, a: rnd(.85, 1), col: cols ? cols[Math.floor(Math.random() * cols.length)] : INKB
      });
    }
  }
  function stepParticles(ctx, pctx, list, dt, W, H) {
    pctx.clearRect(0, 0, W, H);
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      p.age += dt;
      var drag = Math.pow(0.02, dt / p.life);    // 寿命の終わりでほぼ静止
      var ox = p.x, oy = p.y;
      p.x += p.vx * dt * drag; p.y += p.vy * dt * drag + 60 * dt * p.age;
      var k = Math.min(1, p.age / p.life);
      if (p.age >= p.life) {                     // 着地：丸いしみを下の紙に残す
        ctx.fillStyle = 'rgba(' + p.col + ',' + p.a.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.05, 0, 6.283); ctx.fill();
        list.splice(i, 1);
        continue;
      }
      // 飛んでいる最中：短い尾を引く（軌跡は残さない）
      var tx = p.x - p.vx * .018 * (1 - k), ty = p.y - p.vy * .018 * (1 - k);
      pctx.strokeStyle = 'rgba(' + p.col + ',' + p.a.toFixed(2) + ')';
      pctx.fillStyle = pctx.strokeStyle; pctx.lineCap = 'round';
      pctx.lineWidth = Math.max(.8, p.r * 1.6 * (1 - k * .3));
      pctx.beginPath(); pctx.moveTo(tx, ty); pctx.lineTo(p.x, p.y); pctx.stroke();
      pctx.beginPath(); pctx.arc(p.x, p.y, Math.max(.8, p.r * (1 - k * .15)), 0, 6.283); pctx.fill();
    }
  }

  /* ---- 開幕：読み込みの数字が駆け上がるあいだに、筆が次々と走り、墨が弾ける ---- */
  function intro() {
    var W = innerWidth, H = innerHeight, m = Math.min(W, H), sp = Math.max(.6, Math.max(W, H) / 1100);
    var wrap = document.createElement('div');
    wrap.id = 'inkIntro';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:' + PAPER + ';cursor:pointer;will-change:transform;';
    var c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;inset:0;display:block;';
    wrap.appendChild(c);
    var pc = document.createElement('canvas');
    pc.style.cssText = 'position:absolute;inset:0;display:block;pointer-events:none;';
    var num = document.createElement('div');
    num.style.cssText = 'position:absolute;left:0;right:0;top:' + (H * .5 - Math.min(W * .06, 70) - 28) + 'px;text-align:center;font-family:"Dela Gothic One","Zen Maru Gothic",sans-serif;font-size:' + Math.min(W * .13, 120) + 'px;line-height:1;color:#EFE9D6;mix-blend-mode:difference;letter-spacing:.02em;pointer-events:none;';
    num.textContent = '0%';
    var bar = document.createElement('div');
    bar.style.cssText = 'position:absolute;left:50%;top:' + (H * .5 + Math.min(W * .07, 70) + 4) + 'px;width:' + Math.min(W * .5, 420) + 'px;height:6px;margin-left:-' + Math.min(W * .25, 210) + 'px;background:rgba(239,233,214,1);mix-blend-mode:difference;pointer-events:none;';
    var fill = document.createElement('div');
    fill.style.cssText = 'height:100%;width:0;background:#D3381C;';
    bar.appendChild(fill);
    var cl = document.createElement('div'), cr = document.createElement('div');
    var stripe = W / 12, panel = function (side) {
      var el = document.createElement('div');
      el.style.cssText = 'position:absolute;top:0;bottom:0;width:50%;' + side + ':0;overflow:hidden;clip-path:inset(0 0 100% 0);transition:clip-path .28s cubic-bezier(.3,0,.2,1),transform .95s cubic-bezier(.72,0,.18,1);will-change:transform;' +
        'background:repeating-linear-gradient(90deg,rgba(0,0,0,.28) 0,rgba(0,0,0,0) ' + (W / 48) + 'px,rgba(255,255,255,.1) ' + (W / 32) + 'px,rgba(0,0,0,.24) ' + (W / 24) + 'px),' +
        'repeating-linear-gradient(90deg,#16130F 0 ' + stripe + 'px,#D4551F ' + stripe + 'px ' + (stripe * 2) + 'px,#6FB067 ' + (stripe * 2) + 'px ' + (stripe * 3) + 'px);' +
        'background-size:' + W + 'px 100%;background-position:' + (side === 'left' ? '0' : '-' + (W / 2) + 'px') + ' 0;';
      return el;
    };
    cl = panel('left'); cr = panel('right');
    wrap.appendChild(cl); wrap.appendChild(cr);
    wrap.appendChild(pc);
    wrap.appendChild(num); wrap.appendChild(bar);
    document.body.appendChild(wrap);
    root.classList.remove('ink-intro');
    var ctx = sizeCanvas(c, W, H), pctx = sizeCanvas(pc, W, H);

    var th = function (f) { return Math.max(56, H * f); };
    var defs = [
      [-.05 * W, .20 * H, 1.05 * W, .30 * H, th(.20), .42, .05],
      [1.05 * W, .08 * H, -.05 * W, .52 * H, th(.15), .38, .28],
      [-.05 * W, .66 * H, 1.05 * W, .50 * H, th(.22), .42, .52],
      [.22 * W, -.05 * H, .74 * W, 1.05 * H, th(.13), .42, .72],
      [1.05 * W, .88 * H, -.05 * W, .78 * H, th(.18), .38, .92],
      [-.05 * W, .04 * H, 1.05 * W, .96 * H, th(.15), .48, 1.12],
      [1.05 * W, .96 * H, -.05 * W, .06 * H, th(.13), .48, 1.32],
      [-.06 * W, .5 * H, 1.06 * W, .5 * H, th(.27), .5, 1.58]
    ];
    var strokes = defs.map(function (d) { var s = makeStroke(d[0], d[1], d[2], d[3], d[4], d[5], d[6]); s.mid = false; s.end = false; return s; });
    var CL = ['211,56,28', '0,163,175', '239,187,36', '170,207,83', '183,40,46'];
    strokes[3].col = CL[0]; strokes[4].col = CL[1]; strokes[5].col = CL[2]; strokes[6].col = CL[3]; strokes[7].col = CL[4];
    var parts = [];
    var vPrev = 0, t0 = performance.now(), last = t0, ended = false, titleShown = false, shakeUntil = 0, bigBurst = false;

    function shake(ms) { shakeUntil = performance.now() + ms; }
    var opened = false;
    function finish() {                       // 開演：定式幕が左右へ引かれる
      if (ended) return; ended = true;
      wrap.style.transform = '';
      cl.style.clipPath = cr.style.clipPath = 'inset(0)';
      setTimeout(function () {
        c.style.opacity = '0'; num.style.opacity = '0'; bar.style.opacity = '0';
        wrap.style.background = 'transparent';
        cl.style.transform = 'translateX(-101%)'; cr.style.transform = 'translateX(101%)';
        makeBurst(parts, W * .5, H * .5, 1, 0, 160, 24, 2000 * sp, 3.14, CL);
        (function drain(n) { stepParticles(ctx, pctx, parts, .016, W, H); if (n > 0) requestAnimationFrame(function () { drain(n - 1); }); })(70);
      }, 330);
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 1500);
    }
    wrap.addEventListener('click', finish);

    function frame(now) {
      if (ended) return;
      var t = (now - t0) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
      // 数字：駆け上がり、ときどき跳ぶ
      var pr = Math.min(1, t / 1.9), v = Math.floor(100 * (pr < .5 ? pr * pr * 2 : 1 - Math.pow(-2 * pr + 2, 2) / 2) + (pr < 1 ? Math.random() * 3 : 0));
      v = Math.min(100, Math.max(vPrev, v)); vPrev = v;
      num.textContent = v + '%'; fill.style.width = v + '%';

      for (var i = 0; i < strokes.length; i++) {
        var s = strokes[i], ts = t - s.delay;
        if (ts < 0) continue;
        stepStroke(ctx, s, ts);
        var ux = s.ux, uy = s.uy;
        if (!s.mid && ts > s.dur * .42) {      // 走りの途中：筆の脇へはねる
          s.mid = true;
          makeBurst(parts, s.x0 + s.dx * .55, s.y0 + s.dy * .55, s.px * (i % 2 ? 1 : -1), s.py * (i % 2 ? 1 : -1), 36, 14, 900 * sp, .9);
        }
        if (!s.end && ts > s.dur * .8) {       // 筆先：進行方向へ大きく飛ぶ
          s.end = true;
          makeBurst(parts, s.x0 + s.dx * .86, s.y0 + s.dy * .86, ux, uy, 120, 26, 1700 * sp, .75, s.col ? [s.col, s.col, INKB] : null);
          makeBurst(parts, s.x0 + s.dx * .86, s.y0 + s.dy * .86, -ux, -uy, 40, 12, 800 * sp, 1.1);
          shake(150);
        }
      }
      if (t > 1.95 && !bigBurst) {             // 締め：発色のはね
        bigBurst = true;
        makeBurst(parts, W * .5, H * .5, 1, 0, 170, 30, 1900 * sp, 3.14, CL);
        shake(260);
      }
      stepParticles(ctx, pctx, parts, dt, W, H);
      if (t > 1.8 && !titleShown) { titleShown = true; num.style.opacity = '0'; bar.style.opacity = '0'; }
      wrap.style.transform = now < shakeUntil ? 'translate(' + rnd(-7, 7).toFixed(1) + 'px,' + rnd(-7, 7).toFixed(1) + 'px)' : '';
      if (t > 2.75) { finish(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---- 本文：最上部に、薄い墨の筆跡と散った墨滴を残す ---- */
  function heroInk() {
    var hero = document.querySelector('.detail-hero');
    if (!hero) return;
    var c = document.createElement('canvas');
    c.className = 'hero-ink';
    c.setAttribute('aria-hidden', 'true');
    hero.insertBefore(c, hero.firstChild);
    function paint() {
      var W = hero.clientWidth, H = hero.clientHeight;
      var ctx = sizeCanvas(c, W, H);
      ctx.clearRect(0, 0, W, H);
      // 薄い墨の滲み：二本の筆跡（文字の後ろ）
      ctx.save(); ctx.globalAlpha = .16;
      var a = makeStroke(-.04 * W, H * .78, W * 1.04, H * .66, Math.max(60, H * .22), 1, 0);
      var b = makeStroke(W * 1.04, H * .22, W * .25, H * .12, Math.max(50, H * .17), 1, 0);
      stepStroke(ctx, a, 9); stepStroke(ctx, b, 9);
      ctx.restore();
      // はね：濃い墨滴（隅に）
      var bg = Math.min(14, W * .03);
      splatter(ctx, W * .02, H * .96, 1, -.35, W * .22, 60, bg);
      splatter(ctx, W * .98, H * .94, -1, -.5, W * .2, 50, bg * .85);
      splatter(ctx, W * .5, H * .03, .6, .2, W * .16, 22, bg * .6);
      splatter(ctx, W * .32, H * .5, 1, .3, W * .3, 46, bg * .8);
      splatter(ctx, W * .7, H * .3, 1, -.2, W * .26, 40, bg * .8);
      splatter(ctx, W * .12, H * .25, .8, .6, W * .2, 30, bg * .6);
      splatter(ctx, W * .88, H * .6, -1, .4, W * .24, 38, bg * .7);
    }
    paint();
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(paint, 200); });
  }

  function start() {
    heroInk();
    if (!reduce) intro(); else root.classList.remove('ink-intro');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  // 保険：何かあっても覆いは外す
  setTimeout(function () { root.classList.remove('ink-intro'); }, 5000);
})();
