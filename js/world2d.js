// MORINOAの世界「めぐる城下町」2Dアクション版（PC専用）
// 横スクロールで、長屋町 → 町人地 → 寺社地 → 武家地 → 城 へ進む。走る・跳ぶ・ブロックを叩く・もやを踏んで晴らす。
// 屋根の上を行く道も、地面を行く道も、水路をまたぐ道もあり、どの道でも最後は城に着いて 再生→維持→持続 になる。
// 絵はすべてここで描く仮のもの。奥絵師の絵が届いたら差し替える。
function boot(){
  if (window.matchMedia('(max-width: 900px)').matches) return;   // PC専用
  var canvas = document.getElementById('gl'), ctx = canvas.getContext('2d'), screen = document.getElementById('screen');
  var C = { ink:'#111D0F', forest:'#254723', shu:'#8C4229', gold:'#C9A96B', sora:'#5BA0C1', teal:'#4E9495', avo:'#8AB657', matcha:'#8AA344', wall:'#efe6cf', roof:'#3a3a35', wood:'#6b5036', wood2:'#8a6a44', stone:'#9a927c' };
  var rs = 7, rnd = function(){ rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };

  // ---------- 世界の寸法・区画 ----------
  var H = 540, GY = 450, L = 7900, GOAL = 7440;
  var ZONES = [
    { name: '長屋町', x0: 0, x1: 1700, top: '#9cc3e6', soil: '#c9c0a2' },
    { name: '町人地', x0: 1700, x1: 4200, top: '#e79a8a', soil: '#cdb9a0' },
    { name: '寺社地', x0: 4200, x1: 5800, top: '#c09c76', soil: '#bfa987' },
    { name: '武家地', x0: 5800, x1: L, top: '#e8d886', soil: '#cfc49a' }
  ];
  var PITS = [];                                                                       // 冒険要素はなし：穴・水路はつくらない
  var grounds = [], solids = [], oneways = [], blocks = [], coins = [], enemies = [], flags = [], decor = [], shopsList = [];
  (function(){ var x = 0; PITS.forEach(function(p){ grounds.push([x, p[0]]); x = p[0] + p[1]; }); grounds.push([x, L]); })();
  grounds.forEach(function(g){ solids.push({ x: g[0], y: GY, w: g[1] - g[0], h: 400, ground: true }); });
  function zoneAt(x){ for (var i = 0; i < ZONES.length; i++) if (x < ZONES[i].x1) return ZONES[i]; return ZONES[ZONES.length - 1]; }

  // ---------- 店の正面の絵（先に描いておく） ----------
  function frontImg(ch, nc, open){
    var c = document.createElement('canvas'); c.width = 256; c.height = 320; var x = c.getContext('2d');
    x.fillStyle = open ? '#f1e8d0' : '#d8cfb6'; x.fillRect(0, 0, 256, 320); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, 256, 60);
    for (var i = 0; i < 3; i++) { var wx = 24 + i * 76; x.fillStyle = open ? '#7a5a3a' : '#9d9380'; x.fillRect(wx, 52, 52, 38); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 2; for (var l = 1; l < 6; l++) { x.beginPath(); x.moveTo(wx + l * 8.6, 52); x.lineTo(wx + l * 8.6, 90); x.stroke(); } }
    x.fillStyle = open ? '#8a6a44' : '#b6ab92'; x.fillRect(88, 10, 80, 32); x.fillStyle = '#f2eee0'; x.font = '700 24px "Yuji Syuku", serif'; x.textAlign = 'center'; x.fillText(ch, 128, 35);
    x.fillStyle = open ? '#6b5036' : '#8f8470'; x.fillRect(0, 0, 8, 320); x.fillRect(248, 0, 8, 320); x.fillRect(0, 130, 256, 8);
    x.fillStyle = open ? '#6b5036' : '#9d9380'; for (var k = 0; k < 9; k++) x.fillRect(16 + k * 11, 150, 4, 150);
    x.fillStyle = open ? '#f6d68f' : '#8f8672'; x.fillRect(128, 148, 108, 152);
    if (!open) { x.fillStyle = 'rgba(0,0,0,.2)'; for (var j = 0; j < 8; j++) x.fillRect(128, 148 + j * 19, 108, 2); }
    x.fillStyle = open ? nc : '#a7998a'; for (var n = 0; n < 4; n++) x.fillRect(132 + n * 26, 140, 22, 70);
    x.fillStyle = '#f2eee0'; x.font = '700 30px "Yuji Syuku", serif'; x.fillText(open ? ch : '', 184, 186);
    x.fillStyle = open ? '#8d8571' : '#a59d88'; x.fillRect(0, 300, 256, 20); return c;
  }
  var KINDS = [['米', '#5BA0C1'], ['酒', '#8C4229'], ['茶', '#254723'], ['筆', '#4E9495'], ['宿', '#8AA344'], ['菓', '#8AB657']];
  var imgOpen = KINDS.map(function(k){ return frontImg(k[0], k[1], true); }), imgClosed = KINDS.map(function(k){ return frontImg(k[0], k[1], false); });

  // ---------- 街づくり ----------
  var shopN = 0;
  function nagaya(x, w){                                       // 長屋：小ぶりの家。軒先に跳び乗れる
    w = w || 180; var h = 128, kind = shopN++ % 6;
    decor.push({ t: 'house', x: x, w: w, h: h, kind: kind, th: .04 + shopN * .012, small: true });
    oneways.push({ x: x - 8, y: GY - 96, w: w + 16 });
  }
  function machiya(x){                                         // 町家：庇（低い足場）と屋根（高い足場）の二段
    var w = 236, h = 198, kind = shopN++ % 6;
    decor.push({ t: 'house', x: x, w: w, h: h, kind: kind, th: .08 + shopN * .02 });
    oneways.push({ x: x - 10, y: GY - 104, w: w + 20 }); oneways.push({ x: x + 34, y: GY - 202, w: w - 68 });
  }
  function crate(){}                                           // 障害物はなし
  var spots = [], SIGNCH = ['長', '屋', '辻', '茶', '瓦', '通', '宿', '灯', '寺', '塔'];
  function qblock(x, y, i){ spots.push({ x: x + 20, idx: i, hit: false, ch: SIGNCH[i] }); }   // 立て札：前を通ると話が聞ける
  function coinRow(){}
  function coinArc(){}
  function tree(x, kind){ decor.push({ t: 'tree', x: x, kind: kind }); }
  function flag(x, name, text, count){ flags.push({ x: x, name: name, text: text, count: count, got: false }); }
  function moya(){}                                            // 敵はいない

  // 長屋町（青）
  flag(110, '長屋町', '', false);
  [150, 350, 550, 750, 950, 1150, 1350].forEach(function(x){ nagaya(x, 172); });
  qblock(420, GY - 170, 0); qblock(1000, GY - 190, 1);
  coinArc(1270, 1470, GY - 90, 90); coinRow(320, GY - 130, 3); coinRow(600, GY - 126, 3);
  nagaya(1550, 150); qblock(1600, GY - 176, 2);
  tree(40, 'green'); tree(700, 'green'); tree(1440, 'sakura');
  moya(420); moya(700, 70); moya(1100, 60); moya(1560);
  flag(1690, '町人地', '町人地に入った。赤の区画に、人と金が集まる。ここから手を入れる。', true);
  // 町人地（赤）
  [1780, 2050, 2320, 2590, 2860, 3130, 3400, 3670, 3940].forEach(machiya);
  qblock(1900, GY - 176, 3); qblock(2200, GY - 176, 4); qblock(2810, GY - 176, 5); qblock(3150, GY - 176, 6); qblock(3700, GY - 176, 7);
  coinArc(2540, 2740, GY - 90, 100); coinArc(3360, 3590, GY - 90, 110);
  moya(1950, 80); moya(2400, 70); moya(2900, 100); moya(3260, 60); moya(3750, 90); moya(4050, 70);
  crate(3330, 1);
  decor.push({ t: 'lanterns', x0: 1700, x1: 4200 });
  flag(4190, '寺社地', '寺社地に入った。祈りと祭りは、町の求心力になる。', true);
  // 寺社地（茶）
  decor.push({ t: 'torii', x: 4330 });
  crate(4470, 1); crate(4520, 2);
  decor.push({ t: 'dais', x: 4570, w: 470 });
  decor.push({ t: 'hall', x: 4640, w: 330 }); oneways.push({ x: 4620, y: GY - 252, w: 370 });
  qblock(4790, GY - 250 + 20, 8);
  coinRow(4660, GY - 300, 6); coinRow(4600, GY - 130, 5);
  nagaya(5090, 170); nagaya(5620, 150); decor.push({ t: 'toro', x: 4300 }); decor.push({ t: 'toro', x: 4540 }); decor.push({ t: 'toro', x: 5300 });
  decor.push({ t: 'pagoda', x: 5350 }); oneways.push({ x: 5330, y: GY - 120, w: 150 }); oneways.push({ x: 5345, y: GY - 230, w: 120 });
  qblock(5395, GY - 330, 9); coinRow(5360, GY - 260, 3);
  tree(4250, 'momiji'); tree(5120, 'momiji'); tree(5520, 'momiji'); tree(5700, 'pine');
  moya(4400, 60); moya(5260, 60); moya(5650, 60);
  coinArc(5140, 5340, GY - 90, 100);
  flag(5790, '武家地', '武家地に入った。城のまわりの安定が、町の再生の土台になる。', true);
  // 武家地（黄）
  decor.push({ t: 'wall', x: 5950, w: 220 });
  decor.push({ t: 'sam', x: 6200, w: 300 }); oneways.push({ x: 6190, y: GY - 150, w: 320 });
  decor.push({ t: 'sam', x: 6540, w: 330 }); oneways.push({ x: 6530, y: GY - 150, w: 350 });
  decor.push({ t: 'wall', x: 6950, w: 200 });
  coinArc(6280, 6480, GY - 90, 100); coinRow(6540, GY - 190, 6); coinRow(5980, GY - 140, 5);
  tree(6180, 'green'); tree(6880, 'sakura'); tree(7240, 'sakura');
  moya(6100, 50); moya(6750, 60);
  flag(7180, '城', '城の前に着いた。稼ぎが戻る場所を固めれば、町へ手を回せる。', true);
  decor.push({ t: 'castle', x: 7440 });

  // ---------- 一言（？ブロックを下から叩く） ----------
  var QTEXT = [
    ['長屋町の入口', '青の区画、長屋町。町を支える手が、多く住んでいる。小さな仕事が町を回す。'],
    ['長屋', '路地の奥にも暮らしがある。腕と品は、まだ町に残っている。'],
    ['辻', '城の外にも、人は暮らしている。端まで目を配るのが将の務めだ。'],
    ['茶屋', '客を呼べる店は町の旗。一軒が立てば、まわりも立つ。'],
    ['瓦版', '語られる町は人を呼ぶ。物語は、いちばん安い兵糧だ。'],
    ['通り', '客になって使う。一杯の茶代が、再生の最初の一歩になる。'],
    ['宿', '泊まる人が来れば、使われるお金の行き先が増える。'],
    ['灯り', '夜にも灯りがともれば、町の時間が長くなる。稼ぐ機会も増える。'],
    ['寺社地', '茶の区画、寺社地。町の記憶と祈りがここにある。祭りは年に一度の総力戦だ。'],
    ['五重塔', '高い所から見れば、傾いた場所も、まだ生きている場所も見える。']
  ];
  var MOYA_TEXT = ['傾きの正体が見えた。ひとつずつ、晴らしていこう。', '埃をかぶっていただけだ。品は死んでいない。', 'もやが晴れて、店の暖簾が見えてきた。'];

  // ---------- 主人公：将軍 ----------
  var P = { x: 120, y: GY - 46, w: 28, h: 46, vx: 0, vy: 0, on: false, face: 1, coyote: 0, buf: 0, inv: 0, anim: 0, spawnX: 120 };
  var maxX = 0, coinN = 0, itemsGot = 0, itemsTotal = 0;
  spots.forEach(function(){ itemsTotal++; }); flags.forEach(function(f){ if (f.count) itemsTotal++; }); enemies.forEach(function(){ itemsTotal++; });

  // ---------- 状態・UI ----------
  var track = document.getElementById('track'), monitor = document.getElementById('monitor');
  var fill = document.getElementById('scale-fill'), pin = document.getElementById('scale-pin'), labels = document.querySelectorAll('.scale-labels span');
  var narr = document.getElementById('narr'), nNo = document.getElementById('narr-no'), nTitle = document.getElementById('narr-title'), nBody = document.getElementById('narr-body');
  var peek = document.getElementById('peek'), emakiBox = document.getElementById('emaki'), endlink = document.getElementById('endlink'), endFree = document.getElementById('endfree');
  var hud = document.getElementById('hud'), talk = document.getElementById('talk'), skipBtn = document.getElementById('introskip');
  var started = false, playing = false, ending = false, ended = false, endT = 0, stageShown = -1, prog = 0, progS = 0, talkTimer = 0, zoneShown = '', zoneT = 0;
  var keys = {}, camX = 0, vw = 960, viewW = 960, zoomK = 1, sc = 1, lastT = 0, T = 0;
  var ovPan = 0, STAGES = [['壱　再生', 'くすんだ町にも、腕と品は残っている', '走って、跳んで、確かめるほど、町が目を覚ます。'], ['弐　維持', '客になり、使い、伝える', '気づきが増えるほど、人と灯りが戻る。'], ['参　持続', '巡りはじめた町', '稼ぎが城へ、城がまた町へ。巡りが町を支える。']];
  function stageOf(v){ return v < .34 ? 0 : v < .67 ? 1 : 2; }
  function say(who, text, ms){ document.getElementById('talk-who').textContent = who; document.getElementById('talk-text').textContent = text; talk.classList.add('show'); talkTimer = ms || 5500; }
  function refreshHud(){
    document.getElementById('hud-count').textContent = '気づき ' + itemsGot + ' / ' + itemsTotal;
    var st = stageOf(prog); labels.forEach(function(l, i){ l.classList.toggle('on', i === st); });
    fill.style.width = (prog * 100) + '%'; pin.style.left = (prog * 100) + '%';
    if (st !== stageShown) { stageShown = st; var sp2 = STAGES[st][0].split('　'); document.getElementById('sb-no').textContent = sp2[0]; document.getElementById('sb-name').textContent = sp2[1]; document.getElementById('sb-sub').textContent = STAGES[st][1] + '　' + STAGES[st][2]; }
  }
  function bump(){ var f = (maxX / GOAL), it = itemsGot / itemsTotal; prog = Math.max(prog, Math.min(.99, .5 * f + .5 * it)); }
  function sizeUp(){
    var w = screen.clientWidth, h = screen.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); sc = canvas.height / H; vw = canvas.width / sc;
  }
  function start(){
    if (started) return; started = true; monitor.classList.add('on'); playing = true; hud.hidden = false; skipBtn.hidden = true;
    document.documentElement.classList.add('immersive'); window.scrollTo(0, 0);
    sizeUp(); requestAnimationFrame(sizeUp); setTimeout(sizeUp, 120); setTimeout(sizeUp, 500);
    refreshHud(); hud.classList.remove('quiet'); setTimeout(function(){ hud.classList.add('quiet'); }, 9000);
    say('将軍', '城を目指して、右へ歩こう。屋根の上を行く道もある。立て札の前で足を止めると、話が聞ける。どの道を行っても、町は巡りはじめる。', 7000);
  }
  function resumeWalk(){ ending = false; peek.style.opacity = 0; emakiBox.style.transform = 'scale(1)'; endlink.classList.remove('show'); endFree.classList.remove('show'); narr.style.visibility = ''; P.x = GOAL - 160; P.y = GY - P.h; P.vx = P.vy = 0; playing = true; }
  document.getElementById('play').addEventListener('click', start);
  endFree.addEventListener('click', resumeWalk);
  window.addEventListener('resize', sizeUp);
  var GAMEKEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'shift', 'z', 'x'];
  document.addEventListener('keydown', function(e){
    if (!playing) return; var k = e.key.toLowerCase();
    if (GAMEKEYS.indexOf(k) >= 0) { if (!keys[k] && (k === ' ' || k === 'arrowup' || k === 'w' || k === 'z')) P.buf = .12; keys[k] = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', function(e){ keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', function(){ keys = {}; });
  monitor.addEventListener('wheel', function(e){ if (started) e.preventDefault(); }, { passive: false });

  // ---------- 動き（走る・跳ぶ・当たり） ----------
  function overlap(a, b){ return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function respawn(){ P.x = P.spawnX; P.y = GY - P.h - 4; P.vx = P.vy = 0; P.inv = 1; }
  function step(dt){
    var left = keys['arrowleft'] || keys['a'], right = keys['arrowright'] || keys['d'], run = keys['shift'] || keys['x'];
    var jumpHeld = keys[' '] || keys['arrowup'] || keys['w'] || keys['z'];
    var maxV = run ? 400 : 270, acc = P.on ? 1900 : 1100, dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir) { P.vx += dir * acc * dt; P.face = dir; if (Math.abs(P.vx) > maxV) P.vx = dir * maxV; }
    else { var fr = (P.on ? 1700 : 500) * dt; P.vx = Math.abs(P.vx) <= fr ? 0 : P.vx - Math.sign(P.vx) * fr; }
    P.buf = Math.max(0, P.buf - dt); P.coyote = P.on ? .1 : Math.max(0, P.coyote - dt);
    if (P.buf > 0 && P.coyote > 0) { P.vy = -840; P.on = false; P.coyote = 0; P.buf = 0; }
    if (!jumpHeld && P.vy < -300) P.vy += 3400 * dt;                    // 短く押すと低く跳ぶ
    P.vy += 2300 * dt; if (P.vy > 1100) P.vy = 1100;
    // 横
    P.x += P.vx * dt; if (P.x < 0) { P.x = 0; P.vx = 0; }
    var i, s;
    for (i = 0; i < solids.length; i++) { s = solids[i]; if (s.x > camX + vw + 200 || s.x + s.w < camX - 200) continue; if (overlap(P, s)) { if (P.vx > 0) P.x = s.x - P.w; else if (P.vx < 0) P.x = s.x + s.w; P.vx = 0; } }
    // 縦
    var prevBottom = P.y + P.h; P.y += P.vy * dt; P.on = false;
    for (i = 0; i < solids.length; i++) {
      s = solids[i]; if (s.x > camX + vw + 200 || s.x + s.w < camX - 200) continue;
      if (overlap(P, s)) {
        if (P.vy >= 0) { P.y = s.y - P.h; P.vy = 0; P.on = true; }
        else { P.y = s.y + s.h; P.vy = 120; if (s.q && !s.hit) hitBlock(s); s.bump = .16; }
      }
    }
    if (P.vy >= 0) for (i = 0; i < oneways.length; i++) { var o = oneways[i]; if (P.x + P.w > o.x && P.x < o.x + o.w && prevBottom <= o.y + 4 && P.y + P.h >= o.y) { P.y = o.y - P.h; P.vy = 0; P.on = true; } }
    if (P.y > H + 80) { say('将軍', '水に落ちた。手前の旗から、もう一度。', 2600); respawn(); }
    P.anim += Math.abs(P.vx) * dt * .05; P.inv = Math.max(0, P.inv - dt);
    if (P.x > maxX) maxX = P.x;
    // 立て札（前を通ると、将軍が一言語る）
    spots.forEach(function(q){ if (!q.hit && Math.abs((P.x + 14) - q.x) < 46) { q.hit = true; itemsGot++; var qq = QTEXT[q.idx]; say('将軍｜' + qq[0], qq[1], 7000); } });
    // 小判
    for (i = 0; i < coins.length; i++) { var c = coins[i]; if (!c.got && Math.abs(c.x - (P.x + 14)) < 24 && Math.abs(c.y - (P.y + 22)) < 34) { c.got = true; coinN++; } }
    // 旗（区画の入口）
    flags.forEach(function(f){ if (!f.got && P.x > f.x - 20) { f.got = true; P.spawnX = f.x + 40; if (f.count) { itemsGot++; say('将軍｜' + f.name, f.text, 6000); } } });
    // もや
    enemies.forEach(function(e){
      if (!e.alive) { e.puff = Math.max(0, e.puff - dt); return; }
      e.x += e.vx * dt; if (e.x < e.x0 || e.x > e.x1) e.vx = -e.vx;
      var eb = { x: e.x - 18, y: e.y - 34, w: 36, h: 34 };
      if (overlap(P, eb)) {
        if (P.vy > 0 && P.y + P.h < eb.y + 20) { e.alive = false; e.puff = .5; P.vy = -560; itemsGot++; coinN += 3; say('将軍', MOYA_TEXT[itemsGot % MOYA_TEXT.length], 3400); }
        else if (P.inv <= 0) { P.vx = -P.face * 320; P.vy = -380; P.inv = 1.2; }
      }
    });
    if (P.x > GOAL && !ending && !ended) { ending = true; ended = true; endT = 0; playing = false; keys = {}; prog = 1; itemsGot = Math.max(itemsGot, 0); say('町', 'どの道を通っても、町は 再生 → 維持 → 持続 へ向かう。', 9000); }
    bump();
  }
  function hitBlock(b){
    b.hit = true; itemsGot++; coinN += 2; var q = QTEXT[b.idx]; say('将軍｜' + q[0], q[1], 7000);
  }


  // ---------- 季節（桜 → 紅葉 → 冬景色）：世界の横位置で移り変わる ----------
  function hex(c){ return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mix(a, b, u){ var x = hex(a), y = hex(b); return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * u) + ',' + Math.round(x[1] + (y[1] - x[1]) * u) + ',' + Math.round(x[2] + (y[2] - x[2]) * u) + ')'; }
  function seasonCol(spring, autumn, winter, u){ u = Math.max(0, Math.min(1, u)); return u < .5 ? mix(spring, autumn, u / .5) : mix(autumn, winter, (u - .5) / .5); }
  function wts(u){ u = Math.max(0, Math.min(1, u)); return { sp: Math.max(0, 1 - u / .45), au: Math.max(0, 1 - Math.abs(u - .5) / .35), wi: Math.max(0, (u - .55) / .35) > 1 ? 1 : Math.max(0, (u - .55) / .35) }; }

  // ---------- 描画 ----------
  function sky(prog2){
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#dfe5e6'); g.addColorStop(.55, '#ebebe2'); g.addColorStop(.9, '#f4efe0'); g.addColorStop(1, '#f1e8d0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, vw, H);
    ctx.fillStyle = '#efe0b4'; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(vw * .84, 110, 46, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  function mountains(par, base, amp, cols, seed, treeCols){
    var off = camX * par, w = 260, u = (camX + viewW / 2) / L;
    ctx.fillStyle = seasonCol(cols[0], cols[1], cols[2], u); ctx.beginPath(); ctx.moveTo(0, H);
    var pts = [];
    for (var x = -((off % w) + w); x < vw + w; x += w / 2) {
      var k = Math.floor((x + off) / (w / 2)), h = amp * (.55 + ((Math.sin(k * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1 * .6), yy = base - (k % 2 ? 0 : h);
      ctx.lineTo(x, yy); pts.push([x, yy, k]);
    }
    ctx.lineTo(vw + w, H); ctx.closePath(); ctx.fill();
    // 稜線の木々：春は桜、秋は紅葉、冬は雪
    var tc = seasonCol(treeCols[0], treeCols[1], treeCols[2], u);
    for (var i = 1; i < pts.length; i++) {
      var a2 = pts[i - 1], b2 = pts[i];
      for (var j = 0; j < 7; j++) { var t = (j + .5) / 7, px = a2[0] + (b2[0] - a2[0]) * t, py = a2[1] + (b2[1] - a2[1]) * t + 8 + ((Math.sin((a2[2] * 7 + j) * 91.7) * 1e4) % 1 + 1) % 1 * 36;
        ctx.fillStyle = tc; ctx.beginPath(); ctx.arc(px, py, 7 + ((j * 13 + a2[2]) % 5), 0, 7); ctx.fill(); }
    }
  }
  function farTown(par, su){
    var off = camX * par, tone = seasonCol('#bfb4b2', '#b4a08c', '#cdd3da', su), roofC = seasonCol('#9a8c8c', '#8a6a52', '#aab2bb', su);
    for (var wx = -((off % 120) + 120); wx < vw + 120; wx += 120) {
      var k = Math.floor((wx + off) / 120), r1 = ((Math.sin(k * 78.233) * 43758.5) % 1 + 1) % 1, r2 = ((Math.sin(k * 12.9 + 3) * 9371.3) % 1 + 1) % 1, hh = 44 + r1 * 40, ww = 76 + r2 * 40, by = GY - 30;
      ctx.fillStyle = tone; ctx.fillRect(wx, by - hh, ww, hh); ctx.fillStyle = roofC; ctx.beginPath(); ctx.moveTo(wx - 10, by - hh); ctx.lineTo(wx + ww / 2, by - hh - 26); ctx.lineTo(wx + ww + 10, by - hh); ctx.fill();
      if (k % 7 === 0) { ctx.fillStyle = tone; for (var t2 = 0; t2 < 4; t2++) { ctx.fillRect(wx + ww + 14 - t2 * 3, by - hh - 30 - t2 * 26, 26 + t2 * 6 - 12 + 12, 22); ctx.fillStyle = roofC; ctx.fillRect(wx + ww + 6 - t2 * 3, by - hh - 34 - t2 * 26, 42, 6); ctx.fillStyle = tone; } }
      if (k % 3 === 0) { ctx.fillStyle = seasonCol('#e8b4c4', '#c9733a', '#f4f6f9', su); ctx.beginPath(); ctx.arc(wx + ww + 22, by - 26, 16, 0, 7); ctx.fill(); }
    }
  }
  function cloud(x, y, s){ ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.beginPath(); ctx.ellipse(x, y, 54 * s, 18 * s, 0, 0, 7); ctx.ellipse(x + 36 * s, y - 10 * s, 36 * s, 16 * s, 0, 0, 7); ctx.ellipse(x - 34 * s, y - 6 * s, 30 * s, 14 * s, 0, 0, 7); ctx.fill(); }
  function farCastle(x, y, s){
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = .55;
    ctx.fillStyle = '#7e8d93'; ctx.fillRect(-90, -50, 180, 50);
    var tiers = [[130, 40], [100, 38], [72, 34], [48, 30]], yy = -50;
    tiers.forEach(function(t){ ctx.fillStyle = '#aab6b8'; ctx.fillRect(-t[0] / 2, yy - t[1], t[0], t[1]); ctx.fillStyle = '#5a6468'; ctx.beginPath(); ctx.moveTo(-t[0] / 2 - 12, yy - t[1]); ctx.lineTo(0, yy - t[1] - 20); ctx.lineTo(t[0] / 2 + 12, yy - t[1]); ctx.fill(); yy -= t[1] + 14; });
    ctx.restore();
  }
  function drawTree(x, kind){
    var y = GY, u = x / L; ctx.fillStyle = C.wood; ctx.fillRect(x - 6, y - 70, 12, 70);
    if (kind === 'pine') { ctx.fillStyle = '#3d5a33'; for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 50 + i * 8, y - 50 - i * 38); ctx.lineTo(x, y - 110 - i * 38); ctx.lineTo(x + 50 - i * 8, y - 50 - i * 38); ctx.fill(); }
      if (u > .62) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(.9, (u - .62) * 4) + ')'; for (var j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(x - 24 + j * 4, y - 78 - j * 38); ctx.lineTo(x, y - 110 - j * 38); ctx.lineTo(x + 24 - j * 4, y - 78 - j * 38); ctx.fill(); } } return; }
    var col = kind === 'sakura' ? seasonCol('#f4c2cf', '#e0883a', '#eef2f6', u) : kind === 'momiji' ? seasonCol('#9ac27a', '#cf5a30', '#e9edf1', u) : seasonCol('#8fbf6a', '#d9a23a', '#e6ebf0', u);
    ctx.fillStyle = col; [[0, -110, 42], [-34, -88, 32], [34, -90, 32], [0, -72, 30]].forEach(function(c){ ctx.beginPath(); ctx.arc(x + c[0], y + c[1], c[2], 0, 7); ctx.fill(); });
  }
  function roofShape(x, y, w, h, col){
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w * .06, y + h); ctx.quadraticCurveTo(x + w / 2, y + h * .35, x + w * 1.06, y + h); ctx.lineTo(x + w * .88, y); ctx.lineTo(x + w * .12, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(30,24,20,.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; for (var i = 1; i < 9; i++) { var lx = x + w * i / 9; ctx.beginPath(); ctx.moveTo(lx, y + 2); ctx.lineTo(lx + (lx - x - w / 2) * .1, y + h * .85); ctx.stroke(); }
  }
  function drawHouse(d, effP){
    var open = effP > d.th, img = (open ? imgOpen : imgClosed)[d.kind], y = GY - d.h;
    ctx.fillStyle = 'rgba(40,30,15,.2)'; ctx.beginPath(); ctx.ellipse(d.x + d.w / 2, GY + 4, d.w * .6, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = open ? '#e6dcc0' : '#d6cdb4'; ctx.fillRect(d.x, y, d.w, d.h); ctx.strokeStyle = 'rgba(30,24,20,.5)'; ctx.lineWidth = 2; ctx.strokeRect(d.x, y, d.w, d.h);
    ctx.drawImage(img, d.x + 2, y + d.h * .1, d.w - 4, d.h * .9);
    roofShape(d.x - 8, y - d.h * .2, d.w + 16, d.h * .26, d.small ? '#8a7a4a' : '#3a3a35');
    ctx.fillStyle = d.small ? '#7a6a3a' : '#4b4a42'; ctx.fillRect(d.x - 12, GY - (d.small ? 100 : 108), d.w + 24, 8);       // 庇（足場）
    if (d.x / L > .7) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(.95, (d.x / L - .7) * 5) + ')'; ctx.fillRect(d.x - 4, y - d.h * .2 - 3, d.w + 8, 8); }
    if (!d.small) { ctx.fillStyle = '#2a2a26'; ctx.fillRect(d.x + 30, y - d.h * .2 - 8, 12, 12); ctx.fillRect(d.x + d.w - 42, y - d.h * .2 - 8, 12, 12); }
  }
  function drawBlock(b){
    var yy = b.y - (b.bump > 0 ? Math.sin(b.bump / .16 * Math.PI) * 10 : 0);
    ctx.fillStyle = b.hit ? '#9a8a68' : '#e0b24a'; ctx.fillRect(b.x, yy, 40, 40);
    ctx.strokeStyle = b.hit ? '#6b5c40' : '#8a5a10'; ctx.lineWidth = 3; ctx.strokeRect(b.x + 1.5, yy + 1.5, 37, 37);
    if (!b.hit) { ctx.fillStyle = '#fff3c0'; ctx.font = '700 26px "Yuji Syuku", serif'; ctx.textAlign = 'center'; ctx.fillText('？', b.x + 20, yy + 30); }
  }
  function drawSign(q, t){
    var x = q.x - 18, y = GY - 118; ctx.fillStyle = C.wood; ctx.fillRect(x + 15, y + 60, 6, 58);
    ctx.fillStyle = q.hit ? '#c9bd9c' : '#efe3c2'; ctx.fillRect(x, y, 36, 66); ctx.strokeStyle = 'rgba(30,24,20,.6)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, 34, 64);
    ctx.fillStyle = q.hit ? '#8a8270' : '#00517e'; ctx.font = '700 24px "Yuji Syuku", serif'; ctx.textAlign = 'center'; ctx.fillText(q.ch, x + 18, y + 42);
    if (!q.hit) { ctx.fillStyle = '#b6b666'; ctx.beginPath(); ctx.arc(x + 18, y - 10 + Math.sin(t * 3 + q.x) * 3, 5, 0, 7); ctx.fill(); }
  }
  function drawCrate(d){ ctx.fillStyle = '#a07844'; ctx.fillRect(d.x, d.y, 40, 40); ctx.strokeStyle = '#6b5036'; ctx.lineWidth = 3; ctx.strokeRect(d.x + 1.5, d.y + 1.5, 37, 37); ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 40, d.y + 40); ctx.moveTo(d.x + 40, d.y); ctx.lineTo(d.x, d.y + 40); ctx.stroke(); }
  function drawCoin(c, t){ var w = Math.abs(Math.cos(t * 3 + c.x * .02)) * 9 + 3; ctx.fillStyle = '#f0c850'; ctx.beginPath(); ctx.ellipse(c.x, c.y + Math.sin(t * 2 + c.x) * 2, w, 11, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#a98a4c'; ctx.lineWidth = 2; ctx.stroke(); }
  function drawMoya(e, t){
    if (!e.alive) { if (e.puff > 0) { ctx.fillStyle = 'rgba(200,200,190,' + e.puff + ')'; ctx.beginPath(); ctx.arc(e.x, e.y - 20, 34 * (1.5 - e.puff), 0, 7); ctx.fill(); } return; }
    var y = e.y - 4, wob = Math.sin(t * 6 + e.x) * 2;
    ctx.fillStyle = '#8a8a86'; ctx.beginPath(); ctx.moveTo(e.x - 22, y); ctx.quadraticCurveTo(e.x - 26, y - 38 + wob, e.x, y - 38); ctx.quadraticCurveTo(e.x + 26, y - 38 + wob, e.x + 22, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x - 8, y - 22, 4.5, 0, 7); ctx.arc(e.x + 8, y - 22, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(e.x - 8 + Math.sign(e.vx) * 1.5, y - 22, 2, 0, 7); ctx.arc(e.x + 8 + Math.sign(e.vx) * 1.5, y - 22, 2, 0, 7); ctx.fill();
  }
  function drawShogun(t){
    var x = P.x + P.w / 2, y = P.y + P.h; if (P.inv > 0 && Math.floor(t * 14) % 2) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(P.face, 1);
    var sw = P.on ? Math.sin(P.anim * 2) * 6 : 0, jump = !P.on;
    ctx.fillStyle = 'rgba(0,0,0,.2)'; if (P.on) { ctx.beginPath(); ctx.ellipse(0, 1, 16, 4, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#2a2a26'; ctx.fillRect(-9 + (jump ? -2 : sw), -12, 8, 12); ctx.fillRect(2 + (jump ? 5 : -sw), -12, 8, 12);                    // 足（袴）
    ctx.fillStyle = C.forest; ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(-9, -36); ctx.quadraticCurveTo(0, -42, 9, -36); ctx.lineTo(13, -10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1f3a1d'; ctx.fillRect(-10, -34, 20, 16); ctx.fillStyle = C.gold; ctx.fillRect(-10, -29, 20, 2); ctx.fillRect(-10, -23, 20, 2); ctx.fillRect(-12, -18, 24, 4);   // 鎧・帯
    ctx.fillStyle = '#1f3a1d'; ctx.fillRect(7, -34 + (jump ? -6 : 0), 8, 14);                                                                     // 袖
    ctx.fillStyle = '#ecd7b4'; ctx.beginPath(); ctx.arc(0, -46, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(3, -48, 2, 3);
    ctx.fillStyle = C.roof; ctx.beginPath(); ctx.moveTo(-12, -49); ctx.quadraticCurveTo(0, -66, 12, -49); ctx.lineTo(14, -45); ctx.lineTo(-14, -45); ctx.closePath(); ctx.fill();   // 兜
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -66, 8, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();                 // 三日月の前立
    ctx.restore();
  }
  function lanterns(x0, x1, effP){
    var col = effP > .35 ? '#e0472a' : '#a99d8a';
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, GY - 270); ctx.quadraticCurveTo((x0 + x1) / 2, GY - 210, x1, GY - 270); ctx.stroke();
    for (var x = x0 + 40; x < x1; x += 70) { var u = (x - x0) / (x1 - x0), yy = GY - 270 + Math.sin(u * Math.PI) * 52; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, yy + 14, 12, 15, 0, 0, 7); ctx.fill(); ctx.fillStyle = C.ink; ctx.fillRect(x - 7, yy, 14, 3); }
  }
  function drawDecor(d, effP, t){
    if (d.t === 'house') drawHouse(d, effP);
    else if (d.t === 'crate') drawCrate(d);
    else if (d.t === 'tree') drawTree(d.x, d.kind);
    else if (d.t === 'toro') { ctx.fillStyle = '#9a927c'; ctx.fillRect(d.x + 8, GY - 20, 14, 20); ctx.fillRect(d.x + 11, GY - 52, 8, 32); ctx.fillRect(d.x + 3, GY - 70, 24, 18); ctx.fillStyle = '#f3dc9a'; ctx.fillRect(d.x + 10, GY - 66, 10, 10); ctx.fillStyle = '#6f6a5a'; ctx.beginPath(); ctx.moveTo(d.x - 2, GY - 70); ctx.lineTo(d.x + 15, GY - 86); ctx.lineTo(d.x + 32, GY - 70); ctx.fill(); }
    else if (d.t === 'torii') { ctx.fillStyle = '#b3322a'; ctx.fillRect(d.x, GY - 150, 14, 150); ctx.fillRect(d.x + 126, GY - 150, 14, 150); ctx.fillRect(d.x - 18, GY - 160, 176, 14); ctx.fillRect(d.x - 4, GY - 128, 148, 9); }
    else if (d.t === 'dais') { ctx.fillStyle = '#a8a08a'; ctx.fillRect(d.x, GY - 80, d.w, 80); ctx.fillStyle = 'rgba(0,0,0,.12)'; for (var i = 0; i < d.w; i += 40) ctx.fillRect(d.x + i, GY - 80, 2, 80); ctx.fillStyle = '#c9c0a2'; ctx.fillRect(d.x, GY - 84, d.w, 8); }
    else if (d.t === 'hall') { var by = GY - 80; ctx.fillStyle = '#8a6a44'; ctx.fillRect(d.x, by - 120, d.w, 120); ctx.fillStyle = '#6b5036'; for (var j = 0; j < 7; j++) ctx.fillRect(d.x + 14 + j * 46, by - 112, 8, 104); roofShape(d.x - 30, by - 190, d.w + 60, 76, C.roof); }
    else if (d.t === 'pagoda') { var yy = GY; for (var k = 0; k < 5; k++) { var w = 120 - k * 16; ctx.fillStyle = '#e6dcc0'; ctx.fillRect(d.x + 60 - w / 2 + 10, yy - 62, w - 20, 62); ctx.fillStyle = C.roof; ctx.beginPath(); ctx.moveTo(d.x + 60 - w / 2 - 14, yy - 60); ctx.lineTo(d.x + 60, yy - 84); ctx.lineTo(d.x + 60 + w / 2 + 14, yy - 60); ctx.fill(); yy -= 66; } ctx.fillStyle = C.gold; ctx.fillRect(d.x + 58, yy - 40, 4, 40); }
    else if (d.t === 'wall') { ctx.fillStyle = '#f1e8d0'; ctx.fillRect(d.x, GY - 96, d.w, 96); ctx.fillStyle = C.roof; ctx.fillRect(d.x - 6, GY - 108, d.w + 12, 14); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (var m = 0; m < d.w; m += 55) ctx.fillRect(d.x + m, GY - 96, 2, 96); }
    else if (d.t === 'sam') { ctx.fillStyle = '#efe4c6'; ctx.fillRect(d.x, GY - 120, d.w, 120); ctx.fillStyle = '#6b5036'; for (var n = 0; n < 5; n++) ctx.fillRect(d.x + 20 + n * 62, GY - 100, 36, 70); roofShape(d.x - 16, GY - 160, d.w + 32, 52, '#4a4a42'); ctx.fillStyle = '#4a4a42'; ctx.fillRect(d.x - 12, GY - 150, d.w + 24, 8); }
    else if (d.t === 'castle') {
      var x = d.x; ctx.save(); ctx.translate(x, GY); ctx.scale(.7, .7); ctx.translate(-x, -GY); ctx.fillStyle = C.stone; ctx.beginPath(); ctx.moveTo(x - 220, GY); ctx.lineTo(x + 220, GY); ctx.lineTo(x + 170, GY - 160); ctx.lineTo(x - 170, GY - 160); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.08)'; for (var r = 0; r < 6; r++) for (var c = 0; c < 12; c++) ctx.fillRect(x - 160 + c * 28 + (r % 2) * 12, GY - 154 + r * 25, 24, 20);
      var tiers = [[300, 80], [236, 74], [176, 68], [120, 62], [80, 56]], yy = GY - 160;
      tiers.forEach(function(t2, i){ ctx.fillStyle = '#f1e8d0'; ctx.fillRect(x - t2[0] / 2, yy - t2[1], t2[0], t2[1]); ctx.fillStyle = C.ink; for (var q = 0; q < 4; q++) ctx.fillRect(x - t2[0] / 2 + t2[0] * (.14 + q * .2), yy - t2[1] * .72, t2[0] * .08, t2[1] * .34); roofShape(x - t2[0] / 2 - 18, yy - t2[1] - 26, t2[0] + 36, 36, C.roof); yy -= t2[1] + 22; });
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x - 20, yy + 6, 7, 0, 7); ctx.arc(x + 20, yy + 6, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#3f2f20'; ctx.fillRect(x - 40, GY - 100, 80, 100); ctx.fillStyle = C.roof; ctx.fillRect(x - 56, GY - 116, 112, 16);                            // 城門
      ctx.fillStyle = C.wood; ctx.fillRect(x + 250, GY - 300, 6, 300); ctx.fillStyle = C.shu; ctx.fillRect(x + 256, GY - 296, 70, 46); ctx.fillStyle = '#f2eee0'; ctx.font = '700 28px "Yuji Syuku", serif'; ctx.textAlign = 'center'; ctx.fillText('巡', x + 291, GY - 262); ctx.restore();
    }
  }
  function drawFlag(f, t){
    ctx.fillStyle = C.wood; ctx.fillRect(f.x, GY - 120, 5, 120); ctx.fillStyle = f.got ? C.gold : C.shu; var w = Math.sin(t * 4 + f.x) * 3;
    ctx.beginPath(); ctx.moveTo(f.x + 5, GY - 118); ctx.lineTo(f.x + 54 + w, GY - 104); ctx.lineTo(f.x + 5, GY - 84); ctx.fill();
    ctx.fillStyle = '#f2eee0'; ctx.font = '700 16px "Yuji Syuku", serif'; ctx.textAlign = 'center'; ctx.fillText(f.name.charAt(0), f.x + 24, GY - 98);
  }
  function drawWorld(effP, t){
    ctx.save(); ctx.translate(-camX, 0);
    // 地面と水
    var cx0 = camX - 40, cx1 = camX + viewW + 40;
    grounds.forEach(function(g){
      if (g[1] < cx0 || g[0] > cx1) return;
      ZONES.forEach(function(z){
        var a = Math.max(g[0], z.x0, cx0), b = Math.min(g[1], z.x1, cx1); if (b <= a) return;
        ctx.fillStyle = z.soil; ctx.fillRect(a, GY + 14, b - a, H - GY); ctx.fillStyle = z.top; ctx.fillRect(a, GY, b - a, 16);
        if (b > L * .66) { var wa = Math.max(a, L * .66); var gr = ctx.createLinearGradient(wa, 0, Math.min(b, L * .9), 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.85)'); ctx.fillStyle = gr; ctx.fillRect(wa, GY - 2, b - wa, 20); }
        ctx.fillStyle = 'rgba(0,0,0,.08)'; for (var xx = Math.floor(a / 60) * 60; xx < b; xx += 60) ctx.fillRect(xx, GY + 16, 2, H - GY);
      });
    });
    PITS.forEach(function(p){
      if (p[0] + p[1] < cx0 || p[0] > cx1) return;
      ctx.fillStyle = '#4aa8cf'; ctx.fillRect(p[0], GY + 30, p[1], H - GY); ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (var xx = p[0]; xx < p[0] + p[1]; xx += 36) ctx.fillRect(xx + Math.sin(t * 2 + xx) * 6, GY + 38, 20, 3);
      ctx.fillStyle = '#b9ad90'; ctx.fillRect(p[0] - 6, GY + 16, 6, H - GY); ctx.fillRect(p[0] + p[1], GY + 16, 6, H - GY);
    });
    // 奥の飾り（家・木・城）
    decor.forEach(function(d){
      var xx = d.x !== undefined ? d.x : d.x0, ww = d.w || 300; if (d.t === 'lanterns') { if (d.x1 < cx0 || d.x0 > cx1) return; lanterns(d.x0, d.x1, effP); return; }
      if (xx + ww + 400 < cx0 || xx - 400 > cx1) return; drawDecor(d, effP, t);
    });
    flags.forEach(function(f){ if (f.x > cx0 - 80 && f.x < cx1) drawFlag(f, t); });
    spots.forEach(function(q){ if (q.x > cx0 - 60 && q.x < cx1) drawSign(q, t); });
    coins.forEach(function(c){ if (!c.got && c.x > cx0 && c.x < cx1) drawCoin(c, t); });
    enemies.forEach(function(e){ if (e.x > cx0 - 60 && e.x < cx1 + 60) drawMoya(e, t); });
    drawShogun(t);
    ctx.restore();
  }
  function frame(){
    requestAnimationFrame(frame);
    var now = performance.now() / 1000, dt = Math.min(.05, now - lastT); lastT = now; T = now;
    progS += (prog - progS) * Math.min(1, dt * 1.4); var effP = progS;
    if (playing) step(dt);
    else if (ending) {
      endT += dt; P.vx = 0; if (endT < 1.6) { P.x += 120 * dt; P.face = 1; P.anim += dt * 8; }
      // 城から覗く：町を引いて見せ、スタートの長屋町へ向かってゆっくり流れる
      var kz = Math.min(1, Math.max(0, (endT - .6) / 2.6)), ke = kz * kz * (3 - 2 * kz); zoomK = 1 - .55 * ke;
      var pz = Math.min(1, Math.max(0, (endT - 3) / 9)), pe = pz * pz * (3 - 2 * pz);
      var last = Math.min(1, Math.max(0, (endT - 1.2) / 10)), appear = Math.min(1, last / .25), zoom = Math.min(1, Math.max(0, (last - .25) / .75)), ez = zoom * zoom * (3 - 2 * zoom);
      peek.style.opacity = appear * (1 - Math.max(0, (zoom - .92) / .08)); peek.style.transform = 'scale(' + (1 + ez * 7) + ')';
      emakiBox.style.transform = 'scale(' + (1.18 - .18 * ez) + ')'; narr.style.visibility = last > .1 ? 'hidden' : '';
      var fin = last > .97; endlink.classList.toggle('show', fin); endFree.classList.toggle('show', fin); if (fin) { talk.classList.remove('show'); talkTimer = 0; }
      ovPan = pe;
    }
    if (talkTimer > 0) { talkTimer -= dt * 1000; if (talkTimer <= 0) talk.classList.remove('show'); }
    refreshHud();
    // カメラ：進む先が見えるよう、主人公を左寄りに置く
    if (!ending) { zoomK += (1 - zoomK) * Math.min(1, dt * 6); }
    viewW = vw / zoomK;
    var target;
    if (ending) { var cen = GOAL + 100 - ovPan * (GOAL - 700); target = Math.max(0, Math.min(L - viewW, cen - viewW / 2)); camX += (target - camX) * Math.min(1, dt * 3); }
    else { target = Math.max(0, Math.min(L - vw, P.x - vw * .32 + P.face * 40)); camX += (target - camX) * Math.min(1, dt * 5); }
    // 区画名
    var z = zoneAt(P.x + 10); if (z.name !== zoneShown) { zoneShown = z.name; zoneT = 2.6; var zl = document.getElementById('zone-name'); if (zl) { zl.textContent = z.name; zl.classList.remove('show'); void zl.offsetWidth; zl.classList.add('show'); } }
    var q = Math.min(1, Math.max(0, (effP - .03) / .9)); canvas.style.filter = 'sepia(' + (.6 * (1 - q)).toFixed(3) + ') saturate(' + (.38 + .8 * q).toFixed(3) + ') contrast(' + (1.04 + .02 * q).toFixed(3) + ')';
    // 描く
    ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.clearRect(0, 0, vw, H);
    sky(effP);
    var t = T; for (var i = 0; i < 6; i++) cloud(((i * 330 - camX * .12 + t * 8) % (vw + 400) + vw + 400) % (vw + 400) - 100, 70 + (i % 3) * 46, .8 + (i % 2) * .5);
    farCastle(vw * (.9 - .6 * Math.min(1, camX / (L - vw))), GY - 140, 1.1);
    var su = (camX + vw / 2) / L;
    mountains(.08, GY - 110, 150, ['#d9cdd0', '#cdb9a2', '#e4e8ee'], 1, ['#efc6d2', '#d98a4a', '#ffffff']);
    farTown(.32, su);
    mountains(.18, GY - 60, 110, ['#c9b3bb', '#b98b62', '#d2d9e1'], 5, ['#f4b6c6', '#c4552e', '#f6f8fb']);
    ctx.fillStyle = seasonCol('#a9a39a', '#9a8a62', '#dfe3e6', su); ctx.fillRect(0, GY - 40, vw, 60);
    ctx.setTransform(sc * zoomK, 0, 0, sc * zoomK, 0, canvas.height - H * sc * zoomK);
    drawWorld(effP, t);
    fall(t, (camX + viewW / 2) / L);
  }
  function fall(t, u){                                                // 桜の花びら・紅葉・雪が舞う
    ctx.setTransform(sc, 0, 0, sc, 0, 0); var w = wts(u);
    [[w.sp, '#f6c6d2', 1], [w.au, '#d2663a', 2], [w.wi, '#ffffff', 3]].forEach(function(ty){
      if (ty[0] < .05) return; ctx.globalAlpha = Math.min(.9, ty[0]); ctx.fillStyle = ty[1];
      for (var i = 0; i < 46; i++) {
        var sp = 24 + (i * 37) % 50, x = ((i * 211 + t * sp * (ty[2] === 3 ? .4 : 1.2)) % (vw + 60)) - 30 + Math.sin(t * 1.3 + i) * 14, y = ((i * 97 + t * (ty[2] === 3 ? 38 : 30 + i % 20)) % (H + 40)) - 20;
        ctx.beginPath(); if (ty[2] === 3) ctx.arc(x, y, 2.2 + i % 3, 0, 7); else ctx.ellipse(x, y, 5, 3, t + i, 0, 7); ctx.fill();
      }
    }); ctx.globalAlpha = 1;
  }
  sizeUp(); refreshHud(); lastT = performance.now() / 1000; frame();
}
// 文字（Yuji Syuku）を先に読み込んでから組み立てる
(function(){
  var ran = false, go = function(){ if (!ran) { ran = true; boot(); } };
  if (document.fonts && document.fonts.load) { document.fonts.load('700 24px "Yuji Syuku"', '茶米酒筆宿菓巡長町人').then(go, go); setTimeout(go, 1800); } else go();
})();
