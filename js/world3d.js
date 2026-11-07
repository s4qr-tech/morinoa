// MORINOAの世界「めぐる城下町」3D版（PC専用）
// 江戸の城下町図（武家地=黄 / 町人地=赤 / 寺社地=茶 / 下級武士地=青 / 川と海）を元にしたミニチュア。
// 縦スクロールでカメラが町を巡る。形はすべてここで組む仮のもの。奥絵師の絵・モデルが届いたら差し替える。
function boot(){
  if (window.matchMedia('(max-width: 900px)').matches) return;   // PC専用
  if (!window.THREE) return;
  var T3 = THREE;

  var N = 7;
  var C = { ink:'#111D0F', forest:'#254723', shu:'#8C4229', gold:'#C9A96B', sora:'#5BA0C1', teal:'#4E9495', avo:'#8AB657', matcha:'#8AA344' };
  var rs = 11, rnd = function(){ rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };

  // ---------- 土台：描画・光・空 ----------
  var screen = document.getElementById('screen'), canvas = document.getElementById('gl');
  var renderer = new T3.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFSoftShadowMap;
  var scene = new T3.Scene();
  var SKY = new T3.Color('#8fc3dc');
  scene.background = SKY; scene.fog = new T3.Fog('#cfe3e0', 120, 330);
  var camera = new T3.PerspectiveCamera(42, 16 / 9, .5, 700);
  scene.add(new T3.HemisphereLight('#ffffff', '#c9b98e', .78));
  var sun = new T3.DirectionalLight('#fff1d2', .72);
  sun.position.set(-70, 110, 70); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera; sc.left = -130; sc.right = 130; sc.top = 100; sc.bottom = -100; sc.near = 10; sc.far = 320; sun.shadow.bias = -.0006;
  scene.add(sun);

  var mats = {};
  function M(col, o){ var k = col + (o ? JSON.stringify(o) : ''); if (!mats[k]) mats[k] = new T3.MeshLambertMaterial(Object.assign({ color: col }, o || {})); return mats[k]; }
  function add(mesh, cast, recv, parent){ mesh.castShadow = cast !== false; mesh.receiveShadow = recv !== false; (parent || scene).add(mesh); return mesh; }
  function box(w, h, d, col, x, y, z, parent, o){ var m = new T3.Mesh(new T3.BoxGeometry(w, h, d), M(col, o)); m.position.set(x, y, z); return add(m, true, true, parent); }
  function cyl(rt, rb, h, seg, col, x, y, z, parent){ var m = new T3.Mesh(new T3.CylinderGeometry(rt, rb, h, seg), M(col)); m.position.set(x, y, z); return add(m, true, true, parent); }
  function flat(w, d, col, x, y, z){ var m = new T3.Mesh(new T3.PlaneGeometry(w, d), M(col)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return add(m, false, true); }
  // 寄棟の瓦屋根（四角錐を軸に合わせて伸ばす）
  function hip(w, d, h, col, x, y, z, parent){
    var m = new T3.Mesh(new T3.ConeGeometry(1, h, 4, 1), M(col));
    m.rotation.y = Math.PI / 4; m.scale.set((w / 2 + .5) / .7071, 1, (d / 2 + .5) / .7071); m.position.set(x, y + h / 2, z); return add(m, true, true, parent);
  }

  // ---------- 地面・川・海・ゾーン（江戸図の色分け） ----------
  flat(320, 220, '#b7c78e', 0, 0, -40);                                                  // 草地
  var sea = new T3.Mesh(new T3.PlaneGeometry(420, 150), M('#3f9ec4')); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -.15, 138); scene.add(sea);
  flat(420, 8, '#e9ddb4', 0, .02, 63);                                                    // 浜
  var river = new T3.Mesh(new T3.PlaneGeometry(330, 14), M('#4aa8cf')); river.rotation.x = -Math.PI / 2; river.position.set(0, .05, -64); scene.add(river);
  var canal = new T3.Mesh(new T3.PlaneGeometry(6, 130), M('#4aa8cf')); canal.rotation.x = -Math.PI / 2; canal.position.set(78, .05, 0); scene.add(canal);
  flat(80, 70, '#e8d886', -22, .03, -2);                                                  // 武家地（黄）
  flat(46, 62, '#9cc3e6', -86, .03, 0);                                                   // 下級武士地（青）
  flat(66, 54, '#e79a8a', 44, .03, 10);                                                   // 町人地（赤）
  flat(66, 36, '#c09c76', 44, .03, -36);                                                  // 寺社地（茶）
  flat(100, 8, '#f0e3c2', 32, .06, 10);                                                   // 本通り
  flat(8, 40, '#f0e3c2', -18, .06, 30);                                                   // 登城道
  flat(60, 8, '#f0e3c2', -48, .06, 10);                                                   // 武家地の通り
  for (var lz = -20; lz <= 40; lz += 20) flat(66, 3, '#f4e8c8', 44, .05, lz);              // 町人地の路地

  // 遠景の山
  for (var mi = 0; mi < 14; mi++) {
    var mh = 26 + rnd() * 26, mc = new T3.Mesh(new T3.ConeGeometry(30 + rnd() * 22, mh, 6), M(mi % 2 ? '#7fa38c' : '#6f9580'));
    mc.position.set(-190 + mi * 30 + rnd() * 10, mh / 2 - 2, -165 - rnd() * 30); scene.add(mc);
  }

  // ---------- 張り付き用のテクスチャ（店の正面） ----------
  function frontTex(ch, nc, open){
    var c = document.createElement('canvas'); c.width = 256; c.height = 320; var x = c.getContext('2d');
    var wall = open ? '#f1e8d0' : '#d8cfb6'; x.fillStyle = wall; x.fillRect(0, 0, 256, 320);
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, 256, 60);
    // 二階の虫籠窓
    for (var i = 0; i < 3; i++) {
      var wx = 24 + i * 76; x.fillStyle = open ? '#7a5a3a' : '#9d9380'; x.fillRect(wx, 52, 52, 38);
      x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 2; for (var l = 1; l < 6; l++) { x.beginPath(); x.moveTo(wx + l * 8.6, 52); x.lineTo(wx + l * 8.6, 90); x.stroke(); }
    }
    // 看板
    x.fillStyle = open ? '#8a6a44' : '#b6ab92'; x.fillRect(88, 10, 80, 32); x.fillStyle = '#f2eee0'; x.font = '700 24px "Yuji Syuku", serif'; x.textAlign = 'center'; x.fillText(ch, 128, 35);
    // 柱・梁
    x.fillStyle = open ? '#6b5036' : '#8f8470'; x.fillRect(0, 0, 8, 320); x.fillRect(248, 0, 8, 320); x.fillRect(0, 130, 256, 8);
    // 一階：格子と入口
    x.fillStyle = open ? '#6b5036' : '#9d9380'; for (var k = 0; k < 9; k++) x.fillRect(16 + k * 11, 150, 4, 150);
    x.fillStyle = open ? '#f6d68f' : '#8f8672'; x.fillRect(128, 148, 108, 152);
    if (!open) { x.fillStyle = 'rgba(0,0,0,.2)'; for (var j = 0; j < 8; j++) x.fillRect(128, 148 + j * 19, 108, 2); }
    // 暖簾
    x.fillStyle = open ? nc : '#a7998a'; for (var n = 0; n < 4; n++) x.fillRect(132 + n * 26, 140, 22, 70);
    x.fillStyle = '#f2eee0'; x.font = '700 30px "Yuji Syuku", serif'; x.fillText(open ? ch : '', 184, 186);
    x.fillStyle = open ? '#8d8571' : '#a59d88'; x.fillRect(0, 300, 256, 20);   // 石の基礎
    var t = new T3.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  var KINDS = [['米', '#5BA0C1'], ['酒', '#8C4229'], ['茶', '#254723'], ['筆', '#4E9495'], ['宿', '#8AA344'], ['菓', '#8AB657']];
  var texOpen = KINDS.map(function(k){ return frontTex(k[0], k[1], true); }), texClosed = KINDS.map(function(k){ return frontTex(k[0], k[1], false); });
  var shops = [], blockers = [], shopPos = [];   // 店：進行に合わせて暖簾が開く
  var lanternMat = new T3.MeshBasicMaterial({ color: '#a99d8a' });

  // 町家：箱＋寄棟屋根＋庇＋正面の絵
  function machiya(x, z, w, d, h, face, kind, thr){
    var g = new T3.Group(); g.position.set(x, 0, z); g.rotation.y = face > 0 ? 0 : Math.PI; scene.add(g);
    box(w, h, d, '#e6dcc0', 0, h / 2, 0, g);
    hip(w, d, h * .42, '#3a3a35', 0, h, 0, g);
    box(w + 1.2, .25, 1.6, '#4b4a42', 0, h * .55, d / 2 + .5, g);                                  // 庇
    var fm = new T3.MeshLambertMaterial({ map: texClosed[kind] });
    var fr = new T3.Mesh(new T3.PlaneGeometry(w * .98, h * .96), fm); fr.position.set(0, h * .48, d / 2 + .03); fr.receiveShadow = true; g.add(fr);
    box(.5, .5, .5, '#2a2a26', -w / 2 + .2, h + .3, d / 2 - .4, g); box(.5, .5, .5, '#2a2a26', w / 2 - .2, h + .3, d / 2 - .4, g);   // 鬼瓦
    if (rnd() > .55) { var br = cyl(.55, .55, .9, 8, '#8a6a44', w * .32, .45, d / 2 + 1.2, g); }           // 店先の樽
    shops.push({ m: fm, o: texOpen[kind], c: texClosed[kind], th: thr });
    blockers.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]); shopPos.push({ x: x, z: z, h: h });
    return g;
  }
  function samurai(x, z, w, d, rot){
    var g = new T3.Group(); g.position.set(x, 0, z); g.rotation.y = rot || 0; scene.add(g);
    blockers.push([x - w / 2 - 1.5, x + w / 2 + 1.5, z - d / 2, z + d / 2 + 2.5]);
    box(w, 2.4, d, '#efe4c6', 0, 1.2, 0, g); hip(w, d, 2.2, '#4a4a42', 0, 2.4, 0, g);
    box(w + 3, 1.3, .35, '#d9cfb0', 0, .65, d / 2 + 2.2, g); box(2.4, 2, .5, '#6b5036', 0, 1, d / 2 + 2.2, g);   // 塀と門
    box(2.8, .18, 1.2, '#3a3a35', 0, 2.1, d / 2 + 2.2, g);
    return g;
  }
  function lowhouse(x, z, rot){
    var g = new T3.Group(); g.position.set(x, 0, z); g.rotation.y = rot || 0; scene.add(g);
    blockers.push([x - 1.8, x + 1.8, z - 1.7, z + 1.7]);
    box(3.6, 2, 3.4, '#d9c9a0', 0, 1, 0, g); hip(3.6, 3.4, 1.8, '#8a7a4a', 0, 2, 0, g);
  }
  function tree(x, z, s, kind){
    s = s || 1; var g = new T3.Group(); g.position.set(x, 0, z); scene.add(g);
    cyl(.22 * s, .3 * s, 2 * s, 6, '#6b5036', 0, s, 0, g);
    if (kind === 'pine') { for (var i = 0; i < 3; i++) { var c = new T3.Mesh(new T3.ConeGeometry((1.9 - i * .4) * s, 1.8 * s, 7), M('#3d5a33')); c.position.y = (2.4 + i * 1.1) * s; add(c, true, false, g); } }
    else { var col = kind === 'sakura' ? '#f4c2cf' : kind === 'momiji' ? '#cf5a30' : '#5f9a4a'; for (var j = 0; j < 3; j++) { var sp = new T3.Mesh(new T3.SphereGeometry((1.5 - j * .2) * s, 8, 6), M(col)); sp.position.set((j - 1) * .7 * s, (2.8 + j * .5) * s, (j % 2) * .5); add(sp, true, false, g); } }
  }

  // ---------- 町人地（赤）：本通りの両側と裏の町並み ----------
  var rowSpec = [[2, 1, 8, 7], [18, -1, 8, 7], [-8, 1, 7, 6.2], [28, -1, 7, 6.2]];
  var shopIdx = 0;
  rowSpec.forEach(function(r, ri){
    for (var bx = 16; bx < 74; bx += r[3] + .4) {
      var h = (ri < 2 ? 6.6 : 5.6) + rnd() * 1.4, kind = shopIdx++ % 6, thr = .12 + (bx - 16) / 58 * .55 + rnd() * .08;
      machiya(bx + r[3] / 2, r[0], r[3], r[2], h, r[1], kind, thr);
    }
  });
  // 本通りの提灯の綱
  [6.3, 13.7].forEach(function(lz){
    box(56, .12, .12, '#111D0F', 45, 6.3, lz);
    for (var lx = 18; lx < 72; lx += 3.6) { var lm = new T3.Mesh(new T3.SphereGeometry(.4, 8, 6), lanternMat); lm.position.set(lx, 5.7, lz); scene.add(lm); }
  });
  // 日本橋（赤い欄干）と運河の舟
  box(10, .6, 7, '#8C4229', 78, .9, 10); box(10, .3, .5, '#b5553a', 78, 1.9, 6.8); box(10, .3, .5, '#b5553a', 78, 1.9, 13.2);
  var boats = [];
  for (var bt = 0; bt < 6; bt++) { var bg = new T3.Group(); box(1.6, .5, 4.4, '#8a6a44', 0, .3, 0, bg); box(1.2, .8, 1.6, '#e6dcc0', 0, .9, -.4, bg); bg.userData = { ph: bt * 1.7, ax: bt < 3 ? 78 : 0, bt: bt }; if (bt < 3) bg.position.set(78, 0, -40 + bt * 28); else { bg.rotation.y = Math.PI / 2; bg.position.set(-70 + bt * 30, 0, -64); } scene.add(bg); boats.push(bg); }
  box(10, .6, 8, '#8C4229', 40, .9, -64);   // 川の橋

  // ---------- 武家地（黄）：城のまわり ----------
  var cx = -18, cz = -6;
  for (var sx = -62; sx <= 8; sx += 11) for (var sz = -40; sz <= 42; sz += 12) {
    var dd = Math.hypot(sx - cx, sz - cz); if (sx > 0 || dd < 25 || (Math.abs(sz - 10) < 8) || (Math.abs(sx - cx) < 5 && sz > 8)) continue;
    samurai(sx, sz, 6 + rnd() * 1.5, 5, 0); if (rnd() > .45) tree(sx + 4, sz + 3, .8 + rnd() * .4, 'green');
  }
  // ---------- 下級武士地（青） ----------
  for (var bx2 = -104; bx2 <= -68; bx2 += 6) for (var bz = -28; bz <= 28; bz += 6.5) lowhouse(bx2, bz, 0);

  // ---------- 寺社地（茶） ----------
  (function(){
    var g = new T3.Group(); g.position.set(30, 0, -38); scene.add(g);
    blockers.push([24, 36, -42, -34], [45.5, 50.5, -40.5, -35.5], [57, 63, -43, -37.5]);
    box(12, 3, 8, '#8a6a44', 0, 1.5, 0, g); hip(12, 8, 4, '#3a3a35', 0, 3, 0, g);                       // 本堂
    var px = 18, y = 0; for (var i = 0; i < 5; i++) { var w = 5 - i * .6; box(w, 2.4, w, '#e6dcc0', px, y + 1.2, 0, g); hip(w + 1, w + 1, 1.4, '#3a3a35', px, y + 2.4, 0, g); y += 3; }
    cyl(.12, .12, 4, 6, C.gold, px, y + 2, 0, g);                                                           // 五重塔
    var sg = new T3.Group(); sg.position.set(60, 0, -30); scene.add(sg);                                    // 鳥居
    cyl(.35, .35, 6, 8, '#b3322a', -2.2, 3, 0, sg); cyl(.35, .35, 6, 8, '#b3322a', 2.2, 3, 0, sg); box(7, .5, .7, '#b3322a', 0, 6, 0, sg); box(5.4, .3, .5, '#b3322a', 0, 5, 0, sg);
    box(6, 2.6, 5, '#d8c8a4', 60, 1.3, -40); hip(6, 5, 2.4, '#4a4a42', 60, 2.6, -40);                       // 社
    for (var tt = 0; tt < 16; tt++) tree(20 + rnd() * 54, -52 + rnd() * 24, .9 + rnd() * .7, tt % 4 === 0 ? 'momiji' : 'pine');
  })();

  // ---------- 城（石垣・天守・堀・櫓・白壁） ----------
  (function(){
    var g = new T3.Group(); g.position.set(cx, 0, cz); scene.add(g);
    var moat = new T3.Mesh(new T3.RingGeometry(13.5, 19, 48), M('#4aa8cf')); moat.rotation.x = -Math.PI / 2; moat.position.y = .07; g.add(moat);
    cyl(13, 14.5, 3, 24, '#9fb36a', 0, 1.5, 0, g);                                                        // 丘
    var base = new T3.Mesh(new T3.CylinderGeometry(7, 10, 5, 4), M('#9a927c')); base.rotation.y = Math.PI / 4; base.position.y = 5.5; add(base, true, true, g);   // 石垣
    var ty = 8, tiers = [[9, 4], [7.4, 3.6], [6, 3.4], [4.6, 3.2], [3.4, 3]];
    tiers.forEach(function(t, i){
      box(t[0], t[1], t[0], '#f1e8d0', 0, ty + t[1] / 2, 0, g);
      box(t[0] * .12, t[1] * .4, t[0] + .05, '#2a2a26', -t[0] * .25, ty + t[1] * .5, 0, g); box(t[0] * .12, t[1] * .4, t[0] + .05, '#2a2a26', t[0] * .25, ty + t[1] * .5, 0, g);
      hip(t[0] + 1.6, t[0] + 1.6, 1.8, '#3a3a35', 0, ty + t[1], 0, g);
      if (i === 1 || i === 2) { var gb = new T3.Mesh(new T3.ConeGeometry(1.8, 1.8, 4), M('#3a3a35')); gb.position.set(0, ty + t[1] + 1.3, t[0] / 2 + .5); gb.rotation.y = Math.PI / 4; add(gb, true, false, g); }
      ty += t[1] + 1.2;
    });
    box(.5, 1.2, .5, C.gold, -1.4, ty + .3, 0, g); box(.5, 1.2, .5, C.gold, 1.4, ty + .3, 0, g);          // 鯱
    // 櫓と白壁
    [[-9, -9], [9, -9], [9, 9], [-9, 9]].forEach(function(p){ box(3.6, 3.2, 3.6, '#f1e8d0', p[0], 4.6, p[1], g); hip(3.6, 3.6, 1.6, '#3a3a35', p[0], 6.2, p[1], g); });
    for (var a = 0; a < 20; a++) { var an = a / 20 * Math.PI * 2, wx = Math.cos(an) * 12.2, wz = Math.sin(an) * 12.2; if (Math.abs(an - Math.PI / 2) < .3) continue; var wall = box(4.2, 1.4, .5, '#f1e8d0', wx, 3.7, wz, g); wall.rotation.y = -an + Math.PI / 2; }
    box(40, .25, 5.6, '#8a6a44', 0, .22, 16.2, g); box(40, .5, .3, '#6b5036', 0, .6, 13.5, g); box(40, .5, .3, '#6b5036', 0, .6, 18.9, g);   // 本通りが堀を渡る橋
    // 門と橋
    box(5, 3.4, 3, '#6b5036', 0, 3.4, 12, g); hip(5, 3, 1.6, '#3a3a35', 0, 5.1, 12, g); box(3, 1, 7, '#8a6a44', 0, .6, 16, g);
    for (var tr = 0; tr < 10; tr++) { var ta = rnd() * 6.28, tr2 = 11 + rnd() * 1.5; if (Math.sin(ta) > .1) ta = -ta; tree(Math.cos(ta) * tr2, Math.sin(ta) * tr2 - 1, .8 + rnd() * .4, tr % 3 ? 'pine' : 'sakura'); }
  })();
  // 町のはずれの桜・柳
  for (var sk = 0; sk < 12; sk++) { var skz = -12 + rnd() * 58; if (skz > -4 && skz < 36) skz = skz < 16 ? -6 - rnd() * 6 : 38 + rnd() * 6; tree(6 + rnd() * 6, skz, 1 + rnd() * .4, 'sakura'); }

  // ---------- 一座（四人）：将軍・大老・老中・奥絵師 ----------
  function figure(who){
    var g = new T3.Group(), col = { '将': C.forest, '大': '#3f6b3a', '老': C.teal, '絵': C.shu }[who];
    cyl(.55, .75, 1.7, 10, col, 0, 1.25, 0, g); cyl(.6, .6, .4, 10, '#2a2a26', 0, .45, 0, g);
    var hd = new T3.Mesh(new T3.SphereGeometry(.5, 12, 10), M('#ecd7b4')); hd.position.y = 2.5; add(hd, true, false, g);
    box(.9, .18, .9, who === '将' ? C.gold : '#111D0F', 0, 1.35, 0, g);
    if (who === '将') { var k = new T3.Mesh(new T3.ConeGeometry(.7, .7, 8), M('#3a3a35')); k.position.y = 3.05; add(k, true, false, g);
      var cr = new T3.Mesh(new T3.TorusGeometry(.38, .07, 6, 14, Math.PI), M(C.gold)); cr.position.set(0, 3.5, .45); add(cr, true, false, g);
      box(.9, 1.3, .5, '#1f3a1d', 0, 1.6, 0, g); }
    if (who === '大') { box(.2, .5, .2, '#111D0F', 0, 3.05, 0, g); box(1.5, .5, .5, '#3f6b3a', 0, 1.9, 0, g); }
    if (who === '老') { box(.5, .8, .5, '#111D0F', 0, 3.1, 0, g); box(.3, .45, .25, '#b0322a', .6, 1.3, .2, g); }
    if (who === '絵') { box(.12, 1.1, .12, '#6b5036', .75, 2.1, .15, g).rotation.z = -.4; var fan = new T3.Mesh(new T3.CircleGeometry(.6, 10, 0, Math.PI), M(C.gold)); fan.position.set(-.8, 1.9, .3); fan.rotation.z = .4; add(fan, true, false, g); }
    return g;
  }
  var party = new T3.Group(), pf = ['将', '大', '老', '絵'].map(function(w, i){ var f = figure(w); f.position.set((i % 2) * .9 - .45, 0, -i * 1.9); f.userData.ph = i * .8; party.add(f); return f; });
  scene.add(party);

  // ---------- 通りの人々（群衆） ----------
  var CROWD = 54, crowd = [], bodyM = new T3.InstancedMesh(new T3.CylinderGeometry(.45, .6, 1.5, 7), new T3.MeshLambertMaterial({ color: '#ffffff' }), CROWD),
      headM = new T3.InstancedMesh(new T3.SphereGeometry(.4, 8, 6), M('#ecd7b4'), CROWD), cols = ['#4E9495', '#5B5344', '#8C4229', '#254723', '#6b5036', '#5BA0C1', '#b5553a', '#8AA344'];
  for (var ci = 0; ci < CROWD; ci++) {
    var lane = ci % 3, onMain = ci < 38;
    crowd.push({ x: onMain ? 14 + rnd() * 60 : -60 + rnd() * 70, z: onMain ? [6.9, 7.9, 12.6, 13.6][ci % 4] + (rnd() - .5) * .4 : 10 + (rnd() - .5) * 3, sp: (.6 + rnd() * .9) * (ci % 2 ? 1 : -1), a: onMain ? 14 : -62, b: onMain ? 74 : 8 });
    bodyM.setColorAt(ci, new T3.Color(cols[ci % cols.length]));
  }
  bodyM.castShadow = true; scene.add(bodyM); scene.add(headM);
  var dummy = new T3.Object3D();

  // ---------- 稼ぎの流れ（町→城、城→町） ----------
  var flowA = new T3.CatmullRomCurve3([new T3.Vector3(66, 7, 8), new T3.Vector3(34, 11, 7), new T3.Vector3(4, 10, 8), new T3.Vector3(-14, 12, 2)]);
  var flowB = new T3.CatmullRomCurve3([new T3.Vector3(-14, 12, 4), new T3.Vector3(4, 12, 12), new T3.Vector3(34, 12, 13), new T3.Vector3(64, 8, 12)]);
  var coinsA = [], coinsB = [];
  for (var cn = 0; cn < 22; cn++) { var ca = new T3.Mesh(new T3.CylinderGeometry(.5, .5, .14, 12), new T3.MeshBasicMaterial({ color: C.gold })); ca.rotation.x = Math.PI / 2; scene.add(ca); coinsA.push(ca);
    var cb = new T3.Mesh(new T3.SphereGeometry(.38, 8, 6), new T3.MeshBasicMaterial({ color: C.avo })); scene.add(cb); coinsB.push(cb); }

  // ---------- 場面とカメラの道筋 ----------
  var V = function(x, y, z){ return new T3.Vector3(x, y, z); };
  var SPOTS = [V(-18, 0, 20), V(6, 0, 10), V(30, 0, 10), V(46, 0, 10), V(60, 0, 10), V(30, 0, 12), V(-4, 0, 11)];
  var camPts = [V(-34, 13, 58), V(-8, 5.5, 11.5), V(16, 4.8, 11.5), V(32, 5, 11.5), V(44, 6, 11.5), V(40, 40, 52), V(24, 84, 100)];
  var tgtPts = [V(-18, 9, 0), V(14, 3.2, 9.5), V(38, 3.6, 9), V(52, 4.2, 9), V(68, 5, 10), V(0, 0, 4), V(4, 0, 6)];
  var partyCurve = new T3.CatmullRomCurve3(SPOTS), camCurve = new T3.CatmullRomCurve3(camPts), tgtCurve = new T3.CatmullRomCurve3(tgtPts);
  var STORY = [
    ['壱', '再生', '城を出る', '一座がそろい、城下町を自分たちの足で見に行く。'],
    ['弐', '再生', '静かな城下町', '人通りはまだ少ない。けれど、腕と品は町に残っている。'],
    ['参', '維持', '店に入り、使う', 'まず客になる。茶を飲み、品を買い、町にお金を落とす。'],
    ['肆', '維持', '良さを伝える', '奥絵師が店の良さを描き、瓦版で町の外へ広める。'],
    ['伍', '持続', '町がにぎわう', '暖簾が新しくなり、灯りが戻り、旅人が泊まっていく。'],
    ['陸', '持続', '城へ巡る', '町の稼ぎは城へ、城はまた町へ。行き来する仕組みをつくる。'],
    ['七', '持続', '色づく城下町', 'すべてが巡り、町が色づく。いい地域は、こうしてつくられる。']
  ];
  var TAGS = [
    [0, -18, 14, 20, '一座', '一座、出立', '将軍・大老・老中・奥絵師。四つの座がそろい、城下町を自分たちの足で見に行く。机の上で考えるより、まず現場へ。'],
    [0, -18, 30, -6, '城', '城下の要', '城は、町を守り、町に支えられる場所。城が栄えるには、まず町が息を吹き返す必要がある。'],
    [0, -40, 8, 14, '武家地', '城を囲む武家地', '図では黄色の区画。城を支えてきた人々の暮らしがある。町の再生は、城のまわりから始まる。'],
    [1, 22, 9, 6, '暖簾', '出番を待つ暖簾', '人通りはまだ少ない。けれど、品の良さや職人の腕は、町にしっかり残っている。その事業、まだ死んでいない。'],
    [1, 12, 6, 7, '雨戸', '閉じた店', '閉じた雨戸の向こうにも、守ってきた味と技がある。閉じた理由を、店の人と一緒に確かめる。'],
    [1, 6, 5, 11, '老中', '老中の目', '老中は町を歩き、数字と事実を集める。どこが傾いているのか、まず正体を見極める。'],
    [2, 38, 9, 3, '茶屋', 'まず客になる', '一座は茶屋で食べ、工房で買い、実際にお金を使う。客として通うから、店の強みも困りごとも肌でわかる。'],
    [2, 31, 5, 11, '銭箱', '使うことから始まる', '外からの助言より、一杯の茶代。町にお金が落ちることが、再生の最初の一歩になる。'],
    [2, 44, 8, 3, '店主', '店主の話', '何を守り、何を変えたいのか。将軍がカウンターの内側に入り、店主と同じ目線で話を聞く。'],
    [3, 48, 8, 9, '瓦版', '奥絵師の瓦版', '奥絵師が店の良さを絵にし、瓦版で町の外へ広める。今でいうIPとSNS。物語が人を呼ぶ。'],
    [3, 46, 5.5, 12, '画板', '描いて残す', '店の顔となるキャラクターや暖簾、看板。値引きではなく「語られる理由」をつくる。'],
    [3, 56, 6, 12, '人だかり', '旅人が集まり始める', '瓦版を見た人が、町の外から足を運ぶ。人が人を呼び、通りに声が戻ってくる。'],
    [4, 66, 8, 3, '新しい暖簾', '選ばれる町', '店が増え、暖簾が新しくなり、人が行き交う。値引きに頼らず、語られる理由で選ばれる町になる。'],
    [4, 62, 8, 18, '宿', '泊まる人が来る', '茶屋の隣に宿ができ、旅人が町に泊まる。使われるお金の行き先が、少しずつ増えていく。'],
    [4, 54, 7.5, 10, '提灯', '灯りが戻る', '夜にも通りに灯りがともる。町の時間が長くなるほど、稼ぐ機会も増える。'],
    [5, 34, 13, 9, '荷車', '稼ぎが戻る', '町の稼ぎは年貢として城へ戻る。片方だけが得をするのではなく、行き来する仕組みをつくる。'],
    [5, -18, 27, -6, '城', '城から町へ', '城はまた町へ手を入れる。道を直し、橋を架け、次の店を後押しする。巡るほど、地域は強くなる。'],
    [5, 8, 14, 10, '巡り', '循環の仕組み', '使う → 伝える → にぎわう → 戻る → また手を入れる。この輪を回し続けることが「持続」。'],
    [6, 44, 12, 10, '色づく町', '巡りの先に', '使い、伝え、にぎわい、城へ巡り、また町へ。輪が回るたびに、暖簾の色が増えていく。'],
    [6, 40, 10, -38, '寺社地', '祈りの寺社地', '図では茶色の区画。町の記憶と祈りの場所。物語を語り継ぐ拠り所になる。']
  ];
  var tagsBox = document.getElementById('tags'), tagEls = TAGS.map(function(t){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'fuda-tag'; b.textContent = t[4];
    b.dataset.title = t[5]; b.dataset.body = t[6]; b.dataset.kind = t[4]; tagsBox.appendChild(b); return { el: b, sc: t[0], pos: V(0, 0, 0) };
  });
  // TAGS の並びは [場面, x, y, z, ...]。上の V() 呼び出しと食い違わないよう、ここで組み直す
  tagEls.forEach(function(te, i){ var t = TAGS[i]; te.pos = V(t[1], t[2], t[3]); });

  // ---------- スクロール連動 ----------
  var track = document.getElementById('track'), monitor = document.getElementById('monitor');
  var fill = document.getElementById('scale-fill'), pin = document.getElementById('scale-pin'), hint = document.getElementById('hint');
  var labels = document.querySelectorAll('.scale-labels span');
  var narr = document.getElementById('narr'), nNo = document.getElementById('narr-no'), nTitle = document.getElementById('narr-title'), nBody = document.getElementById('narr-body');
  var peek = document.getElementById('peek'), emakiBox = document.getElementById('emaki'), endlink = document.getElementById('endlink');
  var started = false, lastIdx = -1, P = 0, curSceneIdx = 0;

  function sizeUp(){
    var w = screen.clientWidth, h = screen.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function progress(){
    var r = track.getBoundingClientRect(), range = track.offsetHeight - window.innerHeight;
    return range > 0 ? Math.min(1, Math.max(0, -r.top / (range * .92))) : 0;
  }
  var raw = 0;
  function refreshHud(){
    var n = 0, tot = 1; if (who) { tot = POI.length + ITEMS[who].length; poiDone.forEach(function(b){ if (b) n++; }); ITEMS[who].forEach(function(o){ if (gotOf(o)) n++; }); }
    document.getElementById('hud-count').textContent = '気づき ' + n + ' / ' + tot;
    var st = stageOf(prog);
    labels.forEach(function(l, i){ l.classList.toggle('on', i === st); });
    fill.style.width = (prog * 100) + '%'; pin.style.left = (prog * 100) + '%';
    if (st !== stageShown) {
      stageShown = st; narr.classList.remove('show'); void narr.offsetWidth;
      nNo.textContent = STAGES[st][0]; nTitle.textContent = STAGES[st][1]; nBody.textContent = STAGES[st][2]; narr.classList.add('show');
    }
  }
  function update(){ refreshHud(); }
  function start(){
    if (started) return; started = true; monitor.classList.add('on'); enterExplore();
    document.documentElement.classList.add('immersive'); window.scrollTo(0, 0);
    sizeUp(); requestAnimationFrame(sizeUp); setTimeout(sizeUp, 120); setTimeout(sizeUp, 500);
  }
  document.getElementById('play').addEventListener('click', start);
  window.addEventListener('resize', function(){ sizeUp(); });


  // ================= 自由に歩く（キャラクターを選び、それぞれの目で町を見る） =================
  var LENS = {
    '将': { name: '将軍', lens: '全体を見渡す目', desc: '区画・城・稼ぎの流れ。町を一枚の図として見る。', dist: 22, h: 24, look: 0, speed: 9, sat: 1.0 },
    '大': { name: '大老', lens: 'お金の流れを見る目', desc: '店の稼ぎと回収。どこへ金が落ち、どこへ戻るか。', dist: 16, h: 15, look: 0, speed: 7.5, sat: 1.0 },
    '老': { name: '老中', lens: '現場の事実を見る目', desc: '傾きの正体。人と帳簿の実情を足で確かめる。', dist: 14, h: 12, look: 0, speed: 8, sat: .95 },
    '絵': { name: '奥絵師', lens: '物語と魅力を見る目', desc: '絵になる景色、語りたくなる理由を探して描き留める。', dist: 17, h: 16, look: 0, speed: 7.5, sat: 1.12 }
  };
  // 場所ごとの一言：[x, z, 場所名, 将, 大, 老, 絵]
  var POI = [
    [-18, 19, '城門前', '城は町の要。守るのは石垣ではなく、町が食べていける仕組みだ。', '年貢が戻る場所だ。ここへ回る金が細れば、城は何も直せぬ。', '門番の話では、城下への出入りが年々減っているそうだ。', '白壁に瓦、堀に映る天守。これだけで一枚の絵になる。'],
    [-46, 10, '武家地', '黄の区画、武家地。城を支える人の住まい。ここが痩せれば城も痩せる。', '禄で暮らす家が多く、町へ落ちる金は小さい。使い道を変えたい。', '空き屋敷がいくつかある。持ち主に話を聞きに行こう。', '塀と門が続く静かな通り。人を一人描き足せば、物語が動く。'],
    [14, 10, '本通りの入口', 'ここから先が町人地。赤の区画に、人と金が集まる。', '通行量が売上の元手。この通りの人数を数えるところから始める。', '地面を見ろ。人の流れが片側の店に偏っている。', '暖簾が並ぶ眺め。色がそろうと、通りに顔が生まれる。'],
    [36, 10, '茶屋の前', '客を呼べる店は町の旗。一軒が立てば、まわりも立つ。', '一杯の茶代でも、毎日なら大きい。客単価と回転を見よう。', '帳場を覗くと、仕入れの値が三年前のままだ。', '湯気と暖簾と笑い声。茶屋の看板娘を描いてみたい。'],
    [50, 10, '瓦版の広場', '語られる町は人を呼ぶ。物語は、いちばん安い兵糧だ。', '広告に金を積むより、語られる理由に投じるほうが長持ちする。', '瓦版を読んだ客が何を目当てに来たのか、聞いて回ろう。', 'ここに店の顔になる絵を貼る。瓦版は、私の戦場だ。'],
    [72, 10, '日本橋', '橋は町と町をつなぐ。外から来る人の入り口でもある。', '橋の通行が増えれば、運ぶ荷も増える。物流は金の血管だ。', '欄干が傷んでいる。直す費用の見積りを取ろう。', '朱の橋と青い水。いちばん絵葉書になる場所だ。'],
    [30, -30, '寺社地の本堂', '茶の区画、寺社地。町の記憶と祈りがここにある。', '参拝客が落とす金は門前の店へ流れる。寺と町は一つの帳簿だ。', '参道の石畳が欠けている。年寄りが歩きにくいと聞く。', '五重塔と紅葉。季節ごとに違う絵が描けそうだ。'],
    [60, -33, '鳥居', '祭りは町が一つになる日。年に一度の総力戦だ。', '祭りの日の売上は平日の何倍か。そこから伸びしろを読む。', '祭りの担い手が高齢になっている。若い手が要る。', '赤い鳥居の向こうに光が差す。ここは必ず描く。'],
    [-60, 10, '下級武士地の入口', '青の区画、下級武士地。町を支える手が、多く住んでいる。', '蓄えは少ない。小さな仕事を回せば、町の金も回る。', '内職の手が余っている。技を活かす先を探したい。', '小さな家が並ぶ素朴な眺め。暮らしの匂いがいい。'],
    [72, -12, '運河の舟', '水運は町の背骨。舟が通えば荷が動く。', '舟賃は小さいが、積み荷の価値は大きい。運ぶものを選びたい。', '船着場の使い方に決まりがない。混む刻限を調べよう。', '舟が水面に落とす影が好きだ。ゆっくり描く。'],
    [20, 57, '浜', '南は海。外の世界とつながる口だ。', '港から入る品は、町の仕入れを変える。値と量を見張る。', '浜の干し場が荒れている。使える場所を洗い直そう。', '海と町の境の光。夕方に来たら、きっと綺麗だ。']
  ];
  var PINS_TEXT = ['後継ぎがいない。店主の代で終わるかもしれぬ。', '在庫が積み上がっている。売れ筋を取り違えているようだ。', '客の動線が悪い。入口が奥まって見つけにくい。', '帳簿が追えていない。どこで金が漏れるのか分からぬ。', '看板が色あせ、何の店か伝わらぬ。'];
  var intro = false, introT = 0, avatarPlaced = false, avatar = null, who = null, exploring = false, apos = V(-18, 0, 20), yaw = Math.PI / 2, keys = {}, camYawVel = 0, poiShown = {}, lensObjs = { '将': [], '大': [], '老': [], '絵': [] }, pinList = [], sparkList = [], sketched = 0, talkTimer = 0;
  var skipBtn = document.getElementById('introskip'), pick = document.getElementById('pick'), hud = document.getElementById('hud'), talk = document.getElementById('talk'), freeBtn = document.getElementById('freebtn'), endFree = document.getElementById('endfree'), exitBtn = document.getElementById('exitfree');

  function spriteText(str, fg, bg, w, h){
    var c = document.createElement('canvas'); c.width = 256; c.height = 96; var x = c.getContext('2d');
    x.fillStyle = bg; x.beginPath(); x.moveTo(14, 0); x.arcTo(256, 0, 256, 96, 14); x.arcTo(256, 96, 0, 96, 14); x.arcTo(0, 96, 0, 0, 14); x.arcTo(0, 0, 256, 0, 14); x.fill();
    x.fillStyle = fg; x.font = '700 40px "Yuji Syuku", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(str, 128, 50);
    var sp = new T3.Sprite(new T3.SpriteMaterial({ map: new T3.CanvasTexture(c), transparent: true, depthTest: false })); sp.scale.set(w || 12, (h || 12) * 96 / 256, 1); sp.renderOrder = 10; sp.visible = false; scene.add(sp); return sp;
  }
  // 将軍の目：区画の名札
  [['武家地', '#7a6a1c', '#f3e7a0', -22, 12, -2], ['町人地', '#8a2a1a', '#f6c3b6', 44, 14, 10], ['寺社地', '#5a3a1c', '#e3c9a8', 44, 12, -36], ['下級武士地', '#1f4f7f', '#cfe3f6', -86, 10, 0], ['城', '#111D0F', '#f1e8d0', -18, 34, -6]].forEach(function(z){
    var sp = spriteText(z[0], z[1], z[2], 14, 14); sp.position.set(z[3], z[4], z[5]); lensObjs['将'].push(sp);
  });
  // 大老の目：店ごとの稼ぎの柱
  shopPos.forEach(function(sh, i){
    var hh = 2 + (Math.sin(i * 1.7) * .5 + .5) * 7, b = new T3.Mesh(new T3.BoxGeometry(1.6, hh, 1.6), new T3.MeshBasicMaterial({ color: i % 3 ? '#C9A96B' : '#e0b850' }));
    b.position.set(sh.x, sh.h + 2 + hh / 2, sh.z); b.visible = false; scene.add(b); lensObjs['大'].push(b);
    var top = new T3.Mesh(new T3.CylinderGeometry(.7, .7, .2, 12), new T3.MeshBasicMaterial({ color: '#fff3c0' })); top.position.set(sh.x, sh.h + 2 + hh + .1, sh.z); top.visible = false; scene.add(top); lensObjs['大'].push(top);
  });
  // 老中の目：傾きの印（店先の赤い杭）
  shopPos.forEach(function(sh, i){
    if (i % 5 !== 2) return;
    var pn = new T3.Group(); var cone = new T3.Mesh(new T3.ConeGeometry(.9, 2, 4), new T3.MeshBasicMaterial({ color: '#d1362a' })); cone.rotation.x = Math.PI; cone.position.y = 0; pn.add(cone);
    var ex = spriteText('!', '#ffffff', '#d1362a', 2.6, 2.6); ex.visible = true; scene.remove(ex); ex.position.y = 2.2; pn.add(ex);
    pn.position.set(sh.x, sh.h + 4, sh.z); pn.visible = false; scene.add(pn); pn.userData = { t: PINS_TEXT[pinList.length % PINS_TEXT.length], seen: false }; pinList.push(pn); lensObjs['老'].push(pn);
  });
  // 奥絵師の目：絵になる景色の輝き
  [[-18, 4, 20], [-46, 4, 8], [30, 4, 8], [48, 4, 12], [72, 4, 7], [28, 5, -30], [60, 5, -30], [-86, 4, -4], [20, 4, 52]].forEach(function(q){
    var sp = new T3.Mesh(new T3.OctahedronGeometry(.8), new T3.MeshBasicMaterial({ color: '#ffe38a' })); sp.position.set(q[0], q[1], q[2]); sp.visible = false; sp.userData = { got: false, y: q[1] }; scene.add(sp); sparkList.push(sp); lensObjs['絵'].push(sp);
  });
  var SPARK_TEXT = ['良い絵だ。筆を走らせよう。', 'ここは季節ごとに描き分けたい。', '人の背中がいい。画帖に写した。', '光の入り方が好きだ。忘れぬうちに。', 'この角度こそ、瓦版の顔になる。', '朱が映える。色は多すぎぬほうがいい。', '町の記憶が、一枚に収まった。', '素朴さこそ、この町の強みだ。', '海と町の境に、いい余白がある。'];


  // 将軍の旗（五つの区画を押さえる）／大老の小判（通りで売上を集める）
  var flagList = [], coinList = [];
  [[-22, 26, '武家地', '城を支える武家地を押さえた。町の再生は、城のまわりの安定から。'], [44, 12, '町人地', '町人地を押さえた。人と金が集まる場所に、手を入れる順を決める。'], [44, -27, '寺社地', '寺社地を押さえた。祈りと祭りは、町の求心力になる。'], [-60, 12, '下級武士地', '下級武士地を押さえた。小さな手が動けば、町全体が動く。'], [-18, 15, '城', '城を押さえた。稼ぎが戻る場所を固めれば、町へ手を回せる。']].forEach(function(q){
    var g = new T3.Group(); box(.25, 7, .25, '#6b5036', 0, 3.5, 0, g); box(2.6, 1.5, .12, '#8C4229', 1.4, 6.2, 0, g); box(2.6, .2, .14, C.gold, 1.4, 5.4, 0, g);
    g.position.set(q[0], 0, q[1]); g.visible = false; g.userData = { got: false, text: q[3], where: q[2], y: 0 }; scene.add(g); flagList.push(g); lensObjs['将'].push(g);
  });
  [[16, 11.5], [24, 8.2], [32, 11.8], [40, 8.2], [48, 11.8], [56, 8.2], [64, 11.8]].forEach(function(q, i){
    var c = new T3.Mesh(new T3.CylinderGeometry(1.1, 1.1, .25, 16), new T3.MeshBasicMaterial({ color: '#f0c850' })); c.rotation.x = Math.PI / 2; var g = new T3.Group(); g.add(c);
    g.position.set(q[0], 2.2, q[1]); g.visible = false; g.userData = { got: false, y: 2.2, text: ['売上が立った。一杯の茶代が、町の最初の血になる。', '回収できた。稼ぎが戻れば、次の仕入れに回せる。', '客単価が上がった。値引きでなく、語られる理由で。', '現金が回った。資金繰りは、町の呼吸だ。', '利が出た。城へ納めても、町に残る分がある。', '稼ぎが積み上がる。巡りの音が聞こえる。', '橋の向こうからも金が入る。外の客が増えた。'][i] }; scene.add(g); coinList.push(g); lensObjs['大'].push(g);
  });
  var ITEMS = { '将': flagList, '大': coinList, '老': pinList, '絵': sparkList };
  function gotOf(o){ return !!(o.userData.got || o.userData.seen); }
  var poiDone = POI.map(function(){ return false; }), prog = 0, progS = 0, ending = false, ended = false, endT = 0, stageShown = -1;
  function calcProg(){
    if (!who) return prog;
    var n = 0, tot = POI.length + ITEMS[who].length; poiDone.forEach(function(b){ if (b) n++; }); ITEMS[who].forEach(function(o){ if (gotOf(o)) n++; });
    prog = Math.max(prog, n / tot); return prog;
  }
  var STAGES = [['壱　再生', 'くすんだ町にも、腕と品は残っている', '歩いて確かめるほど、町が目を覚ます。'], ['弐　維持', '客になり、使い、伝える', '気づきが増えるほど、人と灯りが戻る。'], ['参　持続', '巡りはじめた町', '稼ぎが城へ、城がまた町へ。巡りが町を支える。']];
  function stageOf(v){ return v < .34 ? 0 : v < .67 ? 1 : 2; }

  // 冒頭：天守から城下を見渡し、城を下りて、ひとりの背中の後ろへ。そのまま目えらびの画面になる
  var PICK = { dist: 12, h: 9, look: .6 }, SPAWN_X = -8, SPAWN_Z = 10, INTRO_SEC = 7.5;
  var introCam = new T3.CatmullRomCurve3([V(-18, 31, 1), V(-17, 27, 5), V(-14, 17, 12), V(SPAWN_X - Math.sin(Math.PI / 2) * PICK.dist, PICK.h, SPAWN_Z)]);
  var introLook = new T3.CatmullRomCurve3([V(34, 3, 12), V(32, 2, 11), V(20, 3, 10), V(SPAWN_X + 4, PICK.look, SPAWN_Z)]);
  function previewFigure(w){
    var keep = avatar ? avatar.position.clone() : null; if (avatar) scene.remove(avatar);
    avatar = figure(w); avatar.scale.setScalar(1.25); if (keep) avatar.position.copy(keep); scene.add(avatar);
  }
  function blockedAt(x, z){
    for (var i = 0; i < blockers.length; i++) { var b = blockers[i]; if (x > b[0] - .8 && x < b[1] + .8 && z > b[2] - .8 && z < b[3] + .8) return true; }
    if (Math.hypot(x - cx, z - cz) < 19.5 && z < 7.4 && !(Math.abs(x - cx) < 1.7 && z > cz + 11.5)) return true;       // 城（門まで）。本通りは堀の橋として渡れる
    if (z < -56.5 && !(Math.abs(x - 40) < 4.5)) return true;                                                 // 川（橋だけ渡れる）
    if (x > 74.5 && x < 81.5 && !(Math.abs(z - 10) < 3.4)) return true;                                       // 運河（橋だけ渡れる）
    if (z > 61 || x < -108 || x > 104) return true;
    return false;
  }
  function say(who2, text, ms){
    document.getElementById('talk-who').textContent = who2; document.getElementById('talk-text').textContent = text;
    talk.classList.add('show'); talkTimer = ms || 6500;
  }
  function pickAvatar(w){
    who = w; var L = LENS[w];
    previewFigure(w);
    poiShown = {};
    Object.keys(lensObjs).forEach(function(k){ lensObjs[k].forEach(function(o){ o.visible = (k === w); }); });
    document.getElementById('hud-name').textContent = L.name; document.getElementById('hud-lens').textContent = L.lens; document.getElementById('hud-desc').textContent = L.desc;
        pick.hidden = true; hud.hidden = false; exitBtn.hidden = false; refreshHud(); hud.classList.remove('quiet'); setTimeout(function(){ hud.classList.add('quiet'); }, 9000);
    say(L.name, '町を歩いて確かめよう。' + L.lens + 'で、この町を見る。どの道を行っても、町は巡りはじめる。', 6000);
  }
  function enterExplore(){
    exploring = true; monitor.classList.add('exploring');
    if (!avatarPlaced) { apos.set(SPAWN_X, 0, SPAWN_Z); yaw = Math.PI / 2; faceYaw = Math.PI / 2; avatarPlaced = true; }
    previewFigure('将'); avatar.position.set(apos.x, 0, apos.z); avatar.rotation.y = faceYaw;
    intro = true; introT = 0; pick.hidden = true; hud.hidden = true; exitBtn.hidden = true; skipBtn.hidden = false;
    endFree.classList.remove('show'); endlink.classList.remove('show'); peek.style.opacity = 0; emakiBox.style.transform = 'scale(1)'; party.visible = false; refreshHud();
    say('天守より', '城から、城下を見渡す。ここから、ひとりの背中になって町へ下りていく。', 6500);
  }
  function endIntro(){ if (!intro) return; intro = false; skipBtn.hidden = true; pick.hidden = false; talk.classList.remove('show'); }
  function rePick(){                                    // 目をえらびなおす（町の進みはそのまま）
    who = null; pick.hidden = false; hud.hidden = true; exitBtn.hidden = true; talk.classList.remove('show');
    Object.keys(lensObjs).forEach(function(k){ lensObjs[k].forEach(function(o){ o.visible = false; }); });
    previewFigure('将');
  }
  function resumeWalk(){                                // 終幕のあと、もう少し歩く
    ending = false; peek.style.opacity = 0; emakiBox.style.transform = 'scale(1)'; endlink.classList.remove('show'); endFree.classList.remove('show'); narr.style.visibility = '';
  }
  document.querySelectorAll('.pick-card').forEach(function(b){ b.addEventListener('click', function(){ pickAvatar(b.dataset.who); }); ['mouseenter', 'focus'].forEach(function(ev){ b.addEventListener(ev, function(){ if (!who && !intro) previewFigure(b.dataset.who); }); }); });
  skipBtn.addEventListener('click', endIntro); canvas.addEventListener('click', function(){ if (intro) endIntro(); });
  exitBtn.addEventListener('click', rePick); endFree.addEventListener('click', resumeWalk);
  document.addEventListener('keydown', function(e){
    if (!exploring || !who) return; var k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'shift'].indexOf(k) >= 0) { keys[k] = true; if (k.indexOf('arrow') === 0 || k === ' ') e.preventDefault(); }
    if (k === 'escape') rePick();
  });
  document.addEventListener('keyup', function(e){ keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', function(){ keys = {}; });
  var drag = null;
  canvas.addEventListener('pointerdown', function(e){ if (exploring && who) { drag = e.clientX; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', function(e){ if (drag !== null) { yaw -= (e.clientX - drag) * .006; drag = e.clientX; } });
  canvas.addEventListener('pointerup', function(){ drag = null; });
  monitor.addEventListener('wheel', function(e){ if (exploring) e.preventDefault(); }, { passive: false });

  var lastT = 0, fwd = V(0, 0, 0), curCam = V(0, 8, 30), curLook = V(0, 0, 0), faceYaw = 0;
  function exploreStep(dt, t){
    if (!avatar) { camera.position.set(-18 + Math.cos(t * .15) * 60, 40, 22 + Math.sin(t * .15) * 60); camera.lookAt(-8, 0, 4); return; }   // 起動前：町をゆっくり周回
    if (!who) {                                          // 冒頭の動き → 人の背中（目えらびの画面）
      var fx0 = Math.sin(yaw), fz0 = Math.cos(yaw);
      avatar.position.set(apos.x, 0, apos.z); avatar.rotation.y = faceYaw;
      if (intro) {
        introT += dt; var u = Math.min(1, introT / INTRO_SEC), e = u * u * (3 - 2 * u);
        introCam.getPoint(e, camera.position); introLook.getPoint(e, tgtLook); camera.lookAt(tgtLook); curCam.copy(camera.position); curLook.copy(tgtLook);
        if (introT >= INTRO_SEC) endIntro();
      } else {
        var cp0 = V(apos.x - fx0 * PICK.dist, PICK.h + Math.sin(t * .6) * .15, apos.z - fz0 * PICK.dist), lk0 = V(apos.x + fx0 * 4, PICK.look, apos.z + fz0 * 4);
        curCam.lerp(cp0, Math.min(1, dt * 3)); curLook.lerp(lk0, Math.min(1, dt * 3)); camera.position.copy(curCam); camera.lookAt(curLook);
      }
      return;
    }
    var L = LENS[who], f = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? .6 : 0);
    var turn = (keys['a'] || keys['arrowleft'] ? 1 : 0) - (keys['d'] || keys['arrowright'] ? 1 : 0);
    yaw += turn * 2.1 * dt;                                                 // 向きを回す（キャラも画面も、いつも進む方向を向く）
    var fx = Math.sin(yaw), fz = Math.cos(yaw), moving = Math.abs(f) > .01;
    var dyw = ((yaw - faceYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; faceYaw += dyw * Math.min(1, dt * 14);
    if (moving) {
      var sp2 = L.speed * (keys['shift'] ? 1.8 : 1) * f * dt, mx = fx * sp2, mz = fz * sp2;
      if (!blockedAt(apos.x + mx, apos.z)) apos.x += mx; if (!blockedAt(apos.x, apos.z + mz)) apos.z += mz;
    }
    avatar.position.set(apos.x, moving ? Math.abs(Math.sin(t * 9)) * .18 : 0, apos.z); avatar.rotation.y = faceYaw;
    var cd = L.dist; while (cd > 3 && (blockedAt(apos.x - fx * cd, apos.z - fz * cd) || blockedAt(apos.x - fx * (cd * .6), apos.z - fz * (cd * .6)))) cd -= 1;   // 壁の中へ入らないよう、手前に寄る
    var cp = V(apos.x - fx * cd, L.h * (.5 + .5 * cd / L.dist), apos.z - fz * cd), lk = V(apos.x + fx * 9, L.look, apos.z + fz * 9);
    curCam.lerp(cp, Math.min(1, dt * 5)); curLook.lerp(lk, Math.min(1, dt * 6)); camera.position.copy(curCam); camera.lookAt(curLook);
    // 場所の一言（見る人によって、同じ場所の言い分が変わる）。訪ねるたびに町が進む
    var idx = { '将': 3, '大': 4, '老': 5, '絵': 6 }[who], before = prog;
    POI.forEach(function(q, i){ var d = Math.hypot(apos.x - q[0], apos.z - q[1]); if (d < 8 && !poiShown[i]) { poiShown[i] = true; poiDone[i] = true; say(L.name + '｜' + q[2], q[idx], 7500); } else if (d > 14) poiShown[i] = false; });
    if (who === '老') pinList.forEach(function(pn){ if (!pn.userData.seen && Math.hypot(apos.x - pn.position.x, apos.z - pn.position.z) < 6) { pn.userData.seen = true; say('老中｜傾きの印', pn.userData.t, 7000); } });
    if (who === '絵') sparkList.forEach(function(sp, i){ if (sp.userData.got) { sp.visible = false; return; } sp.rotation.y = t * 2; sp.position.y = sp.userData.y + Math.sin(t * 2 + i) * .4; sp.scale.setScalar(1 + Math.sin(t * 5 + i) * .15);
      if (Math.hypot(apos.x - sp.position.x, apos.z - sp.position.z) < 4.2) { sp.userData.got = true; say('奥絵師｜画帖', SPARK_TEXT[i % SPARK_TEXT.length], 5000); } });
    if (who === '大') coinList.forEach(function(c, i){ if (c.userData.got) { c.visible = false; return; } c.rotation.y = t * 3; c.position.y = c.userData.y + Math.sin(t * 2 + i) * .35; if (Math.hypot(apos.x - c.position.x, apos.z - c.position.z) < 3.6) { c.userData.got = true; say('大老｜勘定', c.userData.text, 5200); } });
    if (who === '将') flagList.forEach(function(f){ if (f.userData.got) { f.children[1].material = M(C.gold); return; } if (Math.hypot(apos.x - f.position.x, apos.z - f.position.z) < 4.5) { f.userData.got = true; say('将軍｜' + f.userData.where, f.userData.text, 6500); } });
    calcProg();
    if (who === '大') lensObjs['大'].forEach(function(o){ if (o.geometry && o.geometry.type === 'BoxGeometry') o.scale.y = 1 + Math.sin(t * 1.5 + o.position.x) * .06; });
    refreshHud();
    if (prog >= 1 && !ended) { ended = true; ending = true; endT = 0; say('町', 'どの道を通っても、町は 再生 → 維持 → 持続 へ向かう。', 9000); }
    if (talkTimer > 0) { talkTimer -= dt * 1000; if (talkTimer <= 0) talk.classList.remove('show'); }
  }

  // ---------- 毎フレームの描き直し ----------
  var clock = new T3.Clock(), tmp = V(0, 0, 0), look = V(0, 0, 0), proj = V(0, 0, 0), tgtLook = V(0, 0, 0);
  function frame(){
    requestAnimationFrame(frame);
    var t = clock.getElapsedTime(), dt = Math.min(.05, t - lastT); lastT = t;
    progS += (prog - progS) * Math.min(1, dt * 1.2);                 // 町の色・灯りは、なめらかに戻る
    var effP = progS;
    if (ending) {
      endT += dt;                                                    // 終幕：町を見下ろし、丸窓へ寄る
      var u = Math.min(1, endT / 3.2), eu = u * u * (3 - 2 * u);
      curCam.lerp(camPts[6], Math.min(1, dt * 1.6)); curLook.lerp(tgtPts[6], Math.min(1, dt * 2)); camera.position.copy(curCam); camera.lookAt(curLook);
      var last = Math.min(1, Math.max(0, (endT - 2.2) / 6)), appear = Math.min(1, last / .3), zoom = Math.min(1, Math.max(0, (last - .3) / .7)), ez = zoom * zoom * (3 - 2 * zoom);
      peek.style.opacity = appear * (1 - Math.max(0, (zoom - .92) / .08)); peek.style.transform = 'scale(' + (1 + ez * 7) + ')';
      emakiBox.style.transform = 'scale(' + (1.18 - .18 * ez) + ')'; narr.style.visibility = last > .1 ? 'hidden' : '';
      var fin = last > .97; endlink.classList.toggle('show', fin); endFree.classList.toggle('show', fin); if (fin) { talk.classList.remove('show'); talkTimer = 0; }
      if (avatar) avatar.visible = eu < .6;
    } else {
      if (avatar) avatar.visible = true;
      exploreStep(dt, t);
    }
    // 町の色・空・灯り：再生→持続で色が戻る
    var sat = .32 + .83 * Math.min(1, Math.max(0, (effP - .05) / .85));
    if (who) sat = Math.min(1.5, sat * LENS[who].sat);
    canvas.style.filter = 'saturate(' + sat.toFixed(3) + ')';
    lanternMat.color.set('#a99d8a').lerp(new T3.Color('#e0472a'), Math.min(1, Math.max(0, (effP - .35) / .3)));
    shops.forEach(function(s){ var on = effP > s.th; if (s.on !== on) { s.on = on; s.m.map = on ? s.o : s.c; s.m.needsUpdate = true; } });
    // 群衆（序盤は少なく、後半で町が人であふれる）
    var visible = Math.floor(CROWD * (.12 + .88 * Math.min(1, effP / .7)));
    for (var i = 0; i < CROWD; i++) {
      var c = crowd[i];
      if (i >= visible) { dummy.position.set(0, -50, 0); dummy.scale.set(0, 0, 0); }
      else {
        c.x += c.sp * .016; if (c.x > c.b) c.x = c.a; if (c.x < c.a) c.x = c.b;
        dummy.position.set(c.x, .75 + Math.abs(Math.sin(t * 6 + i)) * .1, c.z); dummy.scale.set(1, 1, 1);
      }
      dummy.updateMatrix(); bodyM.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 1.15; dummy.updateMatrix(); headM.setMatrixAt(i, dummy.matrix);
    }
    bodyM.instanceMatrix.needsUpdate = true; headM.instanceMatrix.needsUpdate = true; if (bodyM.instanceColor) bodyM.instanceColor.needsUpdate = true;
    // 舟・水面・稼ぎの流れ
    boats.forEach(function(b){ var d = b.userData; if (d.bt < 3) b.position.z = -48 + ((t * 1.4 + d.ph * 8) % 100); else b.position.x = -100 + ((t * 1.6 + d.ph * 9) % 200); b.position.y = Math.sin(t * 2 + d.ph) * .06; });
    river.material.color.setHSL(.55, .6, .55 + Math.sin(t * .8) * .015);
    var flowOn = (who === '将' || ending) ? 1 : Math.min(1, Math.max(0, (effP - .62) / .12));
    for (var k = 0; k < coinsA.length; k++) {
      var u = (t * .05 + k / coinsA.length) % 1; flowA.getPoint(u, coinsA[k].position); coinsA[k].rotation.z = t * 3; coinsA[k].scale.setScalar(flowOn);
      flowB.getPoint(u, coinsB[k].position); coinsB[k].scale.setScalar(flowOn);
    }
    // 札：いまの場面のものだけ、3Dの位置に合わせて画面へ置く
    var sw = screen.clientWidth, sh = screen.clientHeight;
    tagEls.forEach(function(te){
      proj.copy(te.pos).project(camera);
      var show = started && !exploring && te.sc === curSceneIdx && proj.z < 1 && Math.abs(proj.x) < .96 && proj.y > -.8 && proj.y < .96;
      te.el.style.left = ((proj.x * .5 + .5) * sw) + 'px'; te.el.style.top = ((-proj.y * .5 + .5) * sh) + 'px';
      te.el.classList.toggle('on', show); te.el.tabIndex = show ? 0 : -1;
    });
    renderer.render(scene, camera);
  }

  // ---------- 札 → 小窓 ----------
  var popup = document.getElementById('popup'), lastTag = null;
  tagsBox.addEventListener('click', function(e){
    var t = e.target.closest('.fuda-tag'); if (!t) return;
    lastTag = t;
    document.getElementById('popup-kind').textContent = t.dataset.kind;
    document.getElementById('popup-title').textContent = t.dataset.title;
    document.getElementById('popup-body').textContent = t.dataset.body;
    popup.hidden = false; popup.querySelector('.popup-close').focus();
  });
  function close(){ popup.hidden = true; if (lastTag) lastTag.focus(); }
  popup.addEventListener('click', function(e){ if (e.target === popup || e.target.closest('.popup-close')) close(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !popup.hidden) close(); });

  // ▼ BGM はあとで追加：<audio id="bgm" src="world/bgm.mp3" loop> を置き、start() の中で再生する

  sizeUp(); update(); frame();
}
// 文字（Yuji Syuku）を先に読み込んでから組み立てる（店の看板の字がきれいに出る）
(function(){
  var ran = false, go = function(){ if (!ran) { ran = true; boot(); } };
  if (document.fonts && document.fonts.load) { document.fonts.load('700 24px "Yuji Syuku"', '茶米酒筆宿菓').then(go, go); setTimeout(go, 1800); } else go();
})();
