// MORINOAの世界「めぐる城下町」3D版（PC専用）
// 城の中（城郭の内）に城下町が広がる、コンパクトなミニチュア。主人公は将軍ひとり。
// 区画の色分けは江戸の城下町図にならう：武家地=黄 / 町人地=赤 / 寺社地=茶 / 長屋町=青。
// 形はすべてここで組む仮のもの。奥絵師の絵・モデルが届いたら差し替える。
function boot(){
  if (window.matchMedia('(max-width: 900px)').matches) return;   // PC専用
  if (!window.THREE) return;
  var T3 = THREE;
  var C = { ink:'#111D0F', forest:'#254723', shu:'#8C4229', gold:'#C9A96B', sora:'#5BA0C1', teal:'#4E9495', avo:'#8AB657', matcha:'#8AA344' };
  var rs = 11, rnd = function(){ rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };
  var V = function(x, y, z){ return new T3.Vector3(x, y, z); };

  // ---------- 土台：描画・光・空 ----------
  var screen = document.getElementById('screen'), canvas = document.getElementById('gl');
  var renderer = new T3.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T3.PCFSoftShadowMap;
  var scene = new T3.Scene();
  scene.background = new T3.Color('#8fc3dc'); scene.fog = new T3.Fog('#cfe3e0', 110, 300);
  var camera = new T3.PerspectiveCamera(42, 16 / 9, .5, 700);
  scene.add(new T3.HemisphereLight('#ffffff', '#c9b98e', .78));
  var sun = new T3.DirectionalLight('#fff1d2', .72);
  sun.position.set(-50, 90, 60); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 260; sun.shadow.bias = -.0006;
  scene.add(sun);

  var mats = {};
  function M(col, o){ var k = col + (o ? JSON.stringify(o) : ''); if (!mats[k]) mats[k] = new T3.MeshLambertMaterial(Object.assign({ color: col }, o || {})); return mats[k]; }
  function add(mesh, cast, recv, parent){ mesh.castShadow = cast !== false; mesh.receiveShadow = recv !== false; (parent || scene).add(mesh); return mesh; }
  function box(w, h, d, col, x, y, z, parent){ var m = new T3.Mesh(new T3.BoxGeometry(w, h, d), M(col)); m.position.set(x, y, z); return add(m, true, true, parent); }
  function cyl(rt, rb, h, seg, col, x, y, z, parent){ var m = new T3.Mesh(new T3.CylinderGeometry(rt, rb, h, seg), M(col)); m.position.set(x, y, z); return add(m, true, true, parent); }
  function flat(w, d, col, x, y, z){ var m = new T3.Mesh(new T3.PlaneGeometry(w, d), M(col)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return add(m, false, true); }
  function hip(w, d, h, col, x, y, z, parent){
    var m = new T3.Mesh(new T3.ConeGeometry(1, h, 4, 1), M(col));
    m.rotation.y = Math.PI / 4; m.scale.set((w / 2 + .5) / .7071, 1, (d / 2 + .5) / .7071); m.position.set(x, y + h / 2, z); return add(m, true, true, parent);
  }

  // ---------- 城郭の内外：地面・堀・海 ----------
  var WX = 46, WZN = -40, WZS = 38;                       // 城郭（塀）の外周
  var blockers = [], shopPos = [];
  flat(360, 240, '#b7c78e', 0, 0, -30);                                                  // 外の草地
  var sea = new T3.Mesh(new T3.PlaneGeometry(520, 160), M('#3f9ec4')); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -.15, 150); scene.add(sea);
  flat(520, 8, '#e9ddb4', 0, .02, 68);                                                    // 浜
  var moatMat = M('#4aa8cf'), moats = [];
  [[WX * 2 + 16, 7, 0, WZN - 4.5], [WX * 2 + 16, 7, 0, WZS + 4.5], [7, WZS - WZN + 16, -WX - 4.5, -1], [7, WZS - WZN + 16, WX + 4.5, -1]].forEach(function(m){ var p = new T3.Mesh(new T3.PlaneGeometry(m[0], m[1]), moatMat); p.rotation.x = -Math.PI / 2; p.position.set(m[2], .05, m[3]); scene.add(p); moats.push(p); });
  flat(WX * 2, WZS - WZN, '#d9cfa4', 0, .02, (WZN + WZS) / 2);                          // 城郭の中の地面
  flat(34, 30, '#e8d886', -29, .03, -22);                                                 // 武家地（黄）
  flat(30, 30, '#c09c76', 31, .03, -22);                                                  // 寺社地（茶）
  flat(92, 28, '#e79a8a', 0, .03, 12);                                                    // 町人地（赤）
  flat(92, 9, '#9cc3e6', 0, .03, 33);                                                     // 長屋町（青）
  flat(92, 8, '#f0e3c2', 0, .06, 10);                                                     // 本通り（東西）
  flat(8, 70, '#f0e3c2', 0, .06, 2);                                                      // 大手道（城門から城へ）
  for (var mi = 0; mi < 12; mi++) {
    var mh = 28 + rnd() * 26, mc = new T3.Mesh(new T3.ConeGeometry(28 + rnd() * 20, mh, 6), M(mi % 2 ? '#7fa38c' : '#6f9580'));
    mc.position.set(-170 + mi * 31 + rnd() * 10, mh / 2 - 2, -120 - rnd() * 30); scene.add(mc);
  }
  // 木
  function tree(x, z, s, kind){
    s = s || 1; var g = new T3.Group(); g.position.set(x, 0, z); scene.add(g);
    cyl(.22 * s, .3 * s, 2 * s, 6, '#6b5036', 0, s, 0, g);
    if (kind === 'pine') { for (var i = 0; i < 3; i++) { var c = new T3.Mesh(new T3.ConeGeometry((1.9 - i * .4) * s, 1.8 * s, 7), M('#3d5a33')); c.position.y = (2.4 + i * 1.1) * s; add(c, true, false, g); } }
    else { var col = kind === 'sakura' ? '#f4c2cf' : kind === 'momiji' ? '#cf5a30' : '#5f9a4a'; for (var j = 0; j < 3; j++) { var sp = new T3.Mesh(new T3.SphereGeometry((1.5 - j * .2) * s, 8, 6), M(col)); sp.position.set((j - 1) * .7 * s, (2.8 + j * .5) * s, (j % 2) * .5); add(sp, true, false, g); } }
  }
  for (var ot = 0; ot < 40; ot++) { var ox = (rnd() - .5) * 190, oz = -75 + rnd() * 130; if (Math.abs(ox) < WX + 12 && oz > WZN - 12 && oz < WZS + 12) continue; tree(ox, oz, 1 + rnd() * .8, ot % 3 ? 'pine' : 'green'); }

  // ---------- 城郭：塀・櫓・城門・橋 ----------
  function wallBox(w, d, x, z){ box(w, 3.6, d, '#f1e8d0', x, 1.8, z); box(w + .4, .5, d + .4, '#3a3a35', x, 3.8, z); }
  wallBox(WX * 2, 1.6, 0, WZN);                                                           // 北
  wallBox(1.6, WZS - WZN, -WX, (WZN + WZS) / 2); wallBox(1.6, WZS - WZN, WX, (WZN + WZS) / 2);   // 西・東
  wallBox(WX - 4.2, 1.6, -(WX + 4.2) / 2, WZS); wallBox(WX - 4.2, 1.6, (WX + 4.2) / 2, WZS);     // 南（城門の隙間あり）
  [[-WX, WZN], [WX, WZN], [-WX, WZS], [WX, WZS]].forEach(function(p){ box(5, 5, 5, '#f1e8d0', p[0], 2.5, p[1]); hip(5, 5, 2.4, '#3a3a35', p[0], 5, p[1]); });   // 隅櫓
  box(7, 5.6, 4, '#6b5036', 0, 2.8, WZS + .2); hip(7, 4, 2.6, '#3a3a35', 0, 5.6, WZS + .2);                          // 城門
  box(.5, 5, 2, '#3a2f22', -3.2, 2.5, WZS + .2); box(.5, 5, 2, '#3a2f22', 3.2, 2.5, WZS + .2);
  box(6, .3, 10, '#8a6a44', 0, .25, WZS + 6);                                                                           // 堀の橋
  box(.3, .6, 10, '#6b5036', -3, .6, WZS + 6); box(.3, .6, 10, '#6b5036', 3, .6, WZS + 6);

  // ---------- 店の正面の絵 ----------
  function frontTex(ch, nc, open){
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
    x.fillStyle = open ? '#8d8571' : '#a59d88'; x.fillRect(0, 300, 256, 20);
    var t = new T3.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  var KINDS = [['米', '#5BA0C1'], ['酒', '#8C4229'], ['茶', '#254723'], ['筆', '#4E9495'], ['宿', '#8AA344'], ['菓', '#8AB657']];
  var texOpen = KINDS.map(function(k){ return frontTex(k[0], k[1], true); }), texClosed = KINDS.map(function(k){ return frontTex(k[0], k[1], false); });
  var shops = [], lanternMat = new T3.MeshBasicMaterial({ color: '#a99d8a' });

  function machiya(x, z, w, d, h, face, kind, thr){
    var g = new T3.Group(); g.position.set(x, 0, z); g.rotation.y = face > 0 ? 0 : Math.PI; scene.add(g);
    box(w, h, d, '#e6dcc0', 0, h / 2, 0, g); hip(w, d, h * .42, '#3a3a35', 0, h, 0, g); box(w + 1.2, .25, 1.6, '#4b4a42', 0, h * .55, d / 2 + .5, g);
    var fm = new T3.MeshLambertMaterial({ map: texClosed[kind] });
    var fr = new T3.Mesh(new T3.PlaneGeometry(w * .98, h * .96), fm); fr.position.set(0, h * .48, d / 2 + .03); fr.receiveShadow = true; g.add(fr);
    box(.5, .5, .5, '#2a2a26', -w / 2 + .2, h + .3, d / 2 - .4, g); box(.5, .5, .5, '#2a2a26', w / 2 - .2, h + .3, d / 2 - .4, g);
    if (rnd() > .55) cyl(.55, .55, .9, 8, '#8a6a44', w * .32, .45, d / 2 + 1.2, g);
    shops.push({ m: fm, o: texOpen[kind], c: texClosed[kind], th: thr });
    blockers.push([x - w / 2, x + w / 2, z - d / 2, z + d / 2]); shopPos.push({ x: x, z: z, h: h });
  }
  function samurai(x, z, w, d){
    var g = new T3.Group(); g.position.set(x, 0, z); scene.add(g); blockers.push([x - w / 2 - 1.5, x + w / 2 + 1.5, z - d / 2, z + d / 2 + 2.5]);
    box(w, 2.4, d, '#efe4c6', 0, 1.2, 0, g); hip(w, d, 2.2, '#4a4a42', 0, 2.4, 0, g);
    box(w + 3, 1.3, .35, '#d9cfb0', 0, .65, d / 2 + 2.2, g); box(2.4, 2, .5, '#6b5036', 0, 1, d / 2 + 2.2, g); box(2.8, .18, 1.2, '#3a3a35', 0, 2.1, d / 2 + 2.2, g);
  }
  function lowhouse(x, z){
    var g = new T3.Group(); g.position.set(x, 0, z); scene.add(g); blockers.push([x - 1.8, x + 1.8, z - 1.7, z + 1.7]);
    box(3.6, 2, 3.4, '#d9c9a0', 0, 1, 0, g); hip(3.6, 3.4, 1.8, '#8a7a4a', 0, 2, 0, g);
  }

  // ---------- 町人地（赤）：本通りの両側 ----------
  var shopIdx = 0;
  [[2, 1, 8, 7.2, 6.8], [18, -1, 8, 7.2, 6.8], [28, 1, 6, 6.4, 5.6]].forEach(function(r){
    [[-WX + 4, -6.4], [6.4, WX - 4]].forEach(function(seg){
      for (var bx = seg[0]; bx + r[3] <= seg[1] + .5; bx += r[3] + .3) {
        var h = r[4] + rnd() * 1.2, kind = shopIdx++ % 6, cxm = bx + r[3] / 2, thr = .1 + (Math.abs(cxm) / WX) * .5 + rnd() * .12;
        machiya(cxm, r[0], r[3], r[2], h, r[1], kind, thr);
      }
    });
  });
  // 本通りの提灯
  [6.3, 13.7].forEach(function(lz){
    box(88, .12, .12, '#111D0F', 0, 6.3, lz);
    for (var lx = -42; lx <= 42; lx += 3.6) { if (Math.abs(lx) < 4.4) continue; var lm = new T3.Mesh(new T3.SphereGeometry(.4, 8, 6), lanternMat); lm.position.set(lx, 5.7, lz); scene.add(lm); }
  });
  // ---------- 長屋町（青）：南の長屋 ----------
  for (var lx2 = -42; lx2 <= 42; lx2 += 6) { if (Math.abs(lx2) < 7) continue; lowhouse(lx2, 34.5); }
  // ---------- 武家地（黄）：城の西側 ----------
  [[-40, -32], [-30, -32], [-40, -22], [-30, -22], [-40, -12], [-30, -12], [-20, -12]].forEach(function(q){ samurai(q[0], q[1], 6.4, 5); if (rnd() > .4) tree(q[0] + 4, q[1] + 3, .8 + rnd() * .3, 'green'); });
  for (var st = 0; st < 5; st++) tree(-44 + rnd() * 8, -6 + rnd() * 4, .9, 'sakura');
  // ---------- 寺社地（茶）：城の東側 ----------
  (function(){
    var g = new T3.Group(); g.position.set(30, 0, -22); scene.add(g);
    blockers.push([24, 36, -26, -18], [38.5, 43.5, -33.5, -28.5], [19, 25, -34, -29]);
    box(12, 3, 8, '#8a6a44', 0, 1.5, 0, g); hip(12, 8, 4, '#3a3a35', 0, 3, 0, g);
    var y = 0; for (var i = 0; i < 5; i++) { var w = 4.6 - i * .55; box(w, 2.2, w, '#e6dcc0', 11, y + 1.1, -9, g); hip(w + 1, w + 1, 1.3, '#3a3a35', 11, y + 2.2, -9, g); y += 2.8; }
    cyl(.12, .12, 4, 6, C.gold, 11, y + 2, -9, g);
    var tg = new T3.Group(); tg.position.set(30, 0, -6); scene.add(tg);                                    // 鳥居
    cyl(.35, .35, 6, 8, '#b3322a', -2.2, 3, 0, tg); cyl(.35, .35, 6, 8, '#b3322a', 2.2, 3, 0, tg); box(7, .5, .7, '#b3322a', 0, 6, 0, tg); box(5.4, .3, .5, '#b3322a', 0, 5, 0, tg);
    box(5, 2.4, 4.4, '#d8c8a4', -8, 1.2, -12, g); hip(5, 4.4, 2.2, '#4a4a42', -8, 2.4, -12, g);
    for (var tt = 0; tt < 8; tt++) tree(17 + rnd() * 26, -36 + rnd() * 28, .9 + rnd() * .5, tt % 3 === 0 ? 'momiji' : 'pine');
  })();

  // ---------- 城：城郭の奥の高台 ----------
  var CX = 0, CZ = -27;
  (function(){
    var g = new T3.Group(); g.position.set(CX, 0, CZ); g.scale.setScalar(.86); scene.add(g);
    cyl(12, 13.5, 3, 24, '#9fb36a', 0, 1.5, 0, g);
    var base = new T3.Mesh(new T3.CylinderGeometry(7, 10, 5, 4), M('#9a927c')); base.rotation.y = Math.PI / 4; base.position.y = 5.5; add(base, true, true, g);
    var ty = 8, tiers = [[9, 4], [7.4, 3.6], [6, 3.4], [4.6, 3.2], [3.4, 3]];
    tiers.forEach(function(t, i){
      box(t[0], t[1], t[0], '#f1e8d0', 0, ty + t[1] / 2, 0, g);
      box(t[0] * .12, t[1] * .4, t[0] + .05, '#2a2a26', -t[0] * .25, ty + t[1] * .5, 0, g); box(t[0] * .12, t[1] * .4, t[0] + .05, '#2a2a26', t[0] * .25, ty + t[1] * .5, 0, g);
      hip(t[0] + 1.6, t[0] + 1.6, 1.8, '#3a3a35', 0, ty + t[1], 0, g);
      if (i === 1 || i === 2) { var gb = new T3.Mesh(new T3.ConeGeometry(1.8, 1.8, 4), M('#3a3a35')); gb.position.set(0, ty + t[1] + 1.3, t[0] / 2 + .5); gb.rotation.y = Math.PI / 4; add(gb, true, false, g); }
      ty += t[1] + 1.2;
    });
    box(.5, 1.2, .5, C.gold, -1.4, ty + .3, 0, g); box(.5, 1.2, .5, C.gold, 1.4, ty + .3, 0, g);
    [[-9, 6], [9, 6]].forEach(function(p){ box(3.6, 3.2, 3.6, '#f1e8d0', p[0], 4.6, p[1], g); hip(3.6, 3.6, 1.6, '#3a3a35', p[0], 6.2, p[1], g); });   // 櫓
  })();
  blockers.push([CX - 11, CX + 11, CZ - 11, CZ + 10.5]);
  // 大手道の脇の桜
  [-10, 10].forEach(function(sx){ for (var k = 0; k < 4; k++) tree(sx, -6 + k * 9, 1.1, 'sakura'); });

  // ---------- 将軍（ただ一人の主人公） ----------
  function shogun(){
    var g = new T3.Group();
    cyl(.55, .75, 1.7, 10, C.forest, 0, 1.25, 0, g); cyl(.6, .6, .4, 10, '#2a2a26', 0, .45, 0, g);
    var hd = new T3.Mesh(new T3.SphereGeometry(.5, 12, 10), M('#ecd7b4')); hd.position.y = 2.5; add(hd, true, false, g);
    box(.9, .18, .9, C.gold, 0, 1.35, 0, g);
    var k = new T3.Mesh(new T3.ConeGeometry(.7, .7, 8), M('#3a3a35')); k.position.y = 3.05; add(k, true, false, g);                    // 兜
    var cr = new T3.Mesh(new T3.TorusGeometry(.38, .07, 6, 14, Math.PI), M(C.gold)); cr.position.set(0, 3.5, .45); add(cr, true, false, g);   // 三日月の前立
    box(.9, 1.3, .5, '#1f3a1d', 0, 1.6, 0, g);
    return g;
  }
  var avatar = shogun(); avatar.scale.setScalar(1.25); scene.add(avatar);

  // ---------- 通りの人々（控えめに） ----------
  var CROWD = 30, crowd = [], bodyM = new T3.InstancedMesh(new T3.CylinderGeometry(.45, .6, 1.5, 7), new T3.MeshLambertMaterial({ color: '#ffffff' }), CROWD),
      headM = new T3.InstancedMesh(new T3.SphereGeometry(.32, 8, 6), M('#ecd7b4'), CROWD), cols = ['#4E9495', '#5B5344', '#8C4229', '#254723', '#6b5036', '#5BA0C1', '#b5553a', '#8AA344'];
  for (var ci = 0; ci < CROWD; ci++) {
    var onAve = ci % 4 === 3;
    crowd.push(onAve ? { ax: 'z', x: [-2.4, 2.4][ci % 2 ? 1 : 0] + (rnd() - .5) * .6, z: -6 + rnd() * 40, sp: (.6 + rnd() * .8) * (ci % 2 ? 1 : -1), a: -8, b: 34 }
                     : { ax: 'x', x: -42 + rnd() * 84, z: [6.9, 7.9, 12.6, 13.6][ci % 4] + (rnd() - .5) * .4, sp: (.6 + rnd() * .9) * (ci % 2 ? 1 : -1), a: -42, b: 42 });
    bodyM.setColorAt(ci, new T3.Color(cols[ci % cols.length]));
  }
  bodyM.castShadow = true; scene.add(bodyM); scene.add(headM);
  var dummy = new T3.Object3D();

  // ---------- 稼ぎの流れ（町→城、城→町） ----------
  var flowA = new T3.CatmullRomCurve3([V(34, 7, 14), V(16, 10, 8), V(5, 12, -4), V(4, 13, -16)]);
  var flowB = new T3.CatmullRomCurve3([V(-4, 13, -16), V(-5, 12, -2), V(-16, 10, 9), V(-34, 7, 14)]);
  var coinsA = [], coinsB = [];
  for (var cn = 0; cn < 20; cn++) { var ca = new T3.Mesh(new T3.CylinderGeometry(.5, .5, .14, 12), new T3.MeshBasicMaterial({ color: C.gold })); ca.rotation.x = Math.PI / 2; scene.add(ca); coinsA.push(ca);
    var cb = new T3.Mesh(new T3.SphereGeometry(.38, 8, 6), new T3.MeshBasicMaterial({ color: C.avo })); scene.add(cb); coinsB.push(cb); }

  // ---------- 場所の一言・旗（どの道を通っても、最後は 再生→維持→持続） ----------
  function spriteText(str, fg, bg, w, h){
    var c = document.createElement('canvas'); c.width = 256; c.height = 96; var x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 256, 96); x.fillStyle = fg; x.font = '700 40px "Yuji Syuku", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(str, 128, 50);
    var sp = new T3.Sprite(new T3.SpriteMaterial({ map: new T3.CanvasTexture(c), transparent: true, depthTest: false })); sp.scale.set(w, h * 96 / 256, 1); sp.renderOrder = 10; scene.add(sp); return sp;
  }
  [['武家地', '#7a6a1c', '#f3e7a0', -29, 14, -22], ['町人地', '#8a2a1a', '#f6c3b6', 0, 15, 22], ['寺社地', '#5a3a1c', '#e3c9a8', 31, 14, -14], ['長屋町', '#1f4f7f', '#cfe3f6', 0, 10, 36], ['城', '#111D0F', '#f1e8d0', 0, 32, -27]].forEach(function(z){
    var sp = spriteText(z[0], z[1], z[2], 6.5, 6.5); sp.position.set(z[3], z[4], z[5]);
  });
  // [x, z, 場所, 一言]
  var POI = [
    [0, -9, '城の前', '城は町の要。守るのは石垣ではなく、町が食べていける仕組みだ。'],
    [0, 10, '本通りの辻', '城の中に、町が収まっている。ここが東西南北の分かれ目だ。'],
    [-24, 10, '西の町並み', '客を呼べる店は町の旗。一軒が立てば、まわりも立つ。'],
    [24, 10, '東の町並み', '語られる町は人を呼ぶ。物語は、いちばん安い兵糧だ。'],
    [-30, -22, '武家地', '黄の区画、武家地。城を支える人の住まい。ここが痩せれば城も痩せる。'],
    [30, -16, '寺社地', '茶の区画、寺社地。町の記憶と祈りがここにある。祭りは年に一度の総力戦だ。'],
    [-24, 28, '長屋', '青の区画、長屋町。町を支える手が、多く住んでいる。小さな仕事が町を回す。'],
    [0, 33, '城門', '城門は町の入口。外から来る人と金を、ここで迎える。'],
    [-40, -34, '西北の櫓', '櫓から町を見渡せば、傾いた場所も、まだ生きている場所も見える。'],
    [40, 32, '東南の角', '城郭の隅にも、人は暮らしている。端まで目を配るのが将の務めだ。']
  ];
  var flagList = [], flagData = [[-30, -14, '武家地', '武家地を押さえた。城のまわりの安定が、町の再生の土台になる。'], [-18, 11, '町人地', '町人地を押さえた。人と金が集まる場所に、手を入れる順を決める。'], [30, -12, '寺社地', '寺社地を押さえた。祈りと祭りは、町の求心力になる。'], [-24, 31, '長屋町', '長屋町を押さえた。小さな手が動けば、町全体が動く。'], [0, -11, '城', '城を押さえた。稼ぎが戻る場所を固めれば、町へ手を回せる。']];
  flagData.forEach(function(q){
    var g = new T3.Group(); box(.25, 7, .25, '#6b5036', 0, 3.5, 0, g); var fl = box(2.6, 1.5, .12, '#8C4229', 1.4, 6.2, 0, g); box(2.6, .2, .14, C.gold, 1.4, 5.4, 0, g);
    g.position.set(q[0], 0, q[1]); g.userData = { got: false, text: q[3], where: q[2], flag: fl }; scene.add(g); flagList.push(g);
  });

  // ---------- 操作・進み具合 ----------
  var track = document.getElementById('track'), monitor = document.getElementById('monitor');
  var fill = document.getElementById('scale-fill'), pin = document.getElementById('scale-pin');
  var labels = document.querySelectorAll('.scale-labels span');
  var narr = document.getElementById('narr'), nNo = document.getElementById('narr-no'), nTitle = document.getElementById('narr-title'), nBody = document.getElementById('narr-body');
  var peek = document.getElementById('peek'), emakiBox = document.getElementById('emaki'), endlink = document.getElementById('endlink'), endFree = document.getElementById('endfree');
  var hud = document.getElementById('hud'), talk = document.getElementById('talk'), skipBtn = document.getElementById('introskip');
  var started = false, intro = false, introT = 0, playing = false, ending = false, ended = false, endT = 0, stageShown = -1;
  var apos = V(0, 0, -6), yaw = 0, faceYaw = 0, keys = {}, drag = null, poiShown = {}, poiDone = POI.map(function(){ return false; }), prog = 0, progS = 0, talkTimer = 0, lastT = 0;
  var curCam = V(0, 10, -18), curLook = V(0, 0, 0), tgtLook = V(0, 0, 0);
  var ME = { name: '将軍', dist: 18, h: 17, look: 1.5, ahead: 28, speed: 9 };
  var PICK = { dist: 11, h: 8, look: .6 }, INTRO_SEC = 7.5;
  var introCam = new T3.CatmullRomCurve3([V(0, 31, -18), V(0, 24, -12), V(2, 14, -14), V(0, PICK.h, apos.z - PICK.dist)]);
  var introLook = new T3.CatmullRomCurve3([V(0, 2, 30), V(0, 2, 24), V(0, 3, 14), V(0, PICK.look, apos.z + 4)]);
  var endCam = V(0, 88, 82), endLook = V(0, 0, 4);
  var STAGES = [['壱　再生', 'くすんだ町にも、腕と品は残っている', '歩いて確かめるほど、町が目を覚ます。'], ['弐　維持', '客になり、使い、伝える', '気づきが増えるほど、人と灯りが戻る。'], ['参　持続', '巡りはじめた町', '稼ぎが城へ、城がまた町へ。巡りが町を支える。']];
  function stageOf(v){ return v < .34 ? 0 : v < .67 ? 1 : 2; }

  function blockedAt(x, z){
    for (var i = 0; i < blockers.length; i++) { var b = blockers[i]; if (x > b[0] - .8 && x < b[1] + .8 && z > b[2] - .8 && z < b[3] + .8) return true; }
    if (x < -WX + 1.5 || x > WX - 1.5 || z < WZN + 1.5) return true;
    if (z > WZS - 1.4 && Math.abs(x) > 2.4) return true;
    if (z > WZS + 10) return true;
    return false;
  }
  function say(who, text, ms){ document.getElementById('talk-who').textContent = who; document.getElementById('talk-text').textContent = text; talk.classList.add('show'); talkTimer = ms || 6500; }
  function counts(){ var n = 0, tot = POI.length + flagList.length; poiDone.forEach(function(b){ if (b) n++; }); flagList.forEach(function(o){ if (o.userData.got) n++; }); return [n, tot]; }
  function refreshHud(){
    var c = counts(); document.getElementById('hud-count').textContent = '気づき ' + c[0] + ' / ' + c[1];
    var st = stageOf(prog); labels.forEach(function(l, i){ l.classList.toggle('on', i === st); });
    fill.style.width = (prog * 100) + '%'; pin.style.left = (prog * 100) + '%';
    if (st !== stageShown) { stageShown = st; narr.classList.remove('show'); void narr.offsetWidth; nNo.textContent = STAGES[st][0]; nTitle.textContent = STAGES[st][1]; nBody.textContent = STAGES[st][2]; narr.classList.add('show'); }
  }
  function sizeUp(){ var w = screen.clientWidth, h = screen.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  function start(){
    if (started) return; started = true; monitor.classList.add('on');
    intro = true; introT = 0; skipBtn.hidden = false; narr.style.visibility = 'hidden';
    document.documentElement.classList.add('immersive'); window.scrollTo(0, 0);
    sizeUp(); requestAnimationFrame(sizeUp); setTimeout(sizeUp, 120); setTimeout(sizeUp, 500);
    say('天守より', '城の中に、町が広がっている。ここから、ひとりの背中になって町へ下りていく。', 6500);
  }
  function endIntro(){
    if (!intro) return; intro = false; skipBtn.hidden = true; playing = true; hud.hidden = false; narr.style.visibility = ''; refreshHud();
    hud.classList.remove('quiet'); setTimeout(function(){ hud.classList.add('quiet'); }, 9000);
    say('将軍', '歩いて確かめよう。どの道を行っても、町は巡りはじめる。', 6000);
  }
  function resumeWalk(){ ending = false; peek.style.opacity = 0; emakiBox.style.transform = 'scale(1)'; endlink.classList.remove('show'); endFree.classList.remove('show'); narr.style.visibility = ''; }
  document.getElementById('play').addEventListener('click', start);
  skipBtn.addEventListener('click', endIntro); canvas.addEventListener('click', function(){ if (intro) endIntro(); });
  endFree.addEventListener('click', resumeWalk);
  window.addEventListener('resize', sizeUp);
  document.addEventListener('keydown', function(e){
    if (!playing) return; var k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'shift'].indexOf(k) >= 0) { keys[k] = true; if (k.indexOf('arrow') === 0 || k === ' ') e.preventDefault(); }
  });
  document.addEventListener('keyup', function(e){ keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', function(){ keys = {}; });
  canvas.addEventListener('pointerdown', function(e){ if (playing) { drag = e.clientX; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', function(e){ if (drag !== null) { yaw -= (e.clientX - drag) * .006; drag = e.clientX; } });
  canvas.addEventListener('pointerup', function(){ drag = null; });
  monitor.addEventListener('wheel', function(e){ if (started) e.preventDefault(); }, { passive: false });

  function walkStep(dt, t){
    var f = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? .6 : 0);
    var turn = (keys['a'] || keys['arrowleft'] ? 1 : 0) - (keys['d'] || keys['arrowright'] ? 1 : 0);
    yaw += turn * 2.1 * dt;                                                 // 向きを回す。キャラも画面も、いつも進む方向を向く
    var fx = Math.sin(yaw), fz = Math.cos(yaw), moving = Math.abs(f) > .01;
    var dyw = ((yaw - faceYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; faceYaw += dyw * Math.min(1, dt * 14);
    if (moving) { var sp = ME.speed * (keys['shift'] ? 1.8 : 1) * f * dt, mx = fx * sp, mz = fz * sp; if (!blockedAt(apos.x + mx, apos.z)) apos.x += mx; if (!blockedAt(apos.x, apos.z + mz)) apos.z += mz; }
    avatar.position.set(apos.x, moving ? Math.abs(Math.sin(t * 9)) * .18 : 0, apos.z); avatar.rotation.y = faceYaw;
    var cd = ME.dist; while (cd > 3 && (blockedAt(apos.x - fx * cd, apos.z - fz * cd) || blockedAt(apos.x - fx * (cd * .6), apos.z - fz * (cd * .6)))) cd -= 1;
    var cp = V(apos.x - fx * cd, ME.h * (.5 + .5 * cd / ME.dist), apos.z - fz * cd), lk = V(apos.x + fx * ME.ahead, ME.look, apos.z + fz * ME.ahead);
    curCam.lerp(cp, Math.min(1, dt * 5)); curLook.lerp(lk, Math.min(1, dt * 6)); camera.position.copy(curCam); camera.lookAt(curLook);
    POI.forEach(function(q, i){ var d = Math.hypot(apos.x - q[0], apos.z - q[1]); if (d < 7 && !poiShown[i]) { poiShown[i] = true; poiDone[i] = true; say('将軍｜' + q[2], q[3], 7000); } else if (d > 13) poiShown[i] = false; });
    flagList.forEach(function(g){ var u = g.userData; if (u.got) return; if (Math.hypot(apos.x - g.position.x, apos.z - g.position.z) < 4.5) { u.got = true; u.flag.material = M(C.gold); say('将軍｜' + u.where, u.text, 6500); } });
    var c = counts(); prog = Math.max(prog, c[0] / c[1]); refreshHud();
    if (prog >= 1 && !ended) { ended = true; ending = true; endT = 0; say('町', 'どの道を通っても、町は 再生 → 維持 → 持続 へ向かう。', 9000); }
  }

  var tmpC = new T3.Color();
  function frame(){
    requestAnimationFrame(frame);
    var t = performance.now() / 1000, dt = Math.min(.05, t - lastT); lastT = t;
    progS += (prog - progS) * Math.min(1, dt * 1.2);
    var effP = progS;
    if (!started) { camera.position.set(Math.cos(t * .15) * 80, 52, 30 + Math.sin(t * .15) * 60); camera.lookAt(0, 0, 0); avatar.position.set(apos.x, 0, apos.z); }
    else if (intro) {
      introT += dt; var u = Math.min(1, introT / INTRO_SEC), e = u * u * (3 - 2 * u);
      introCam.getPoint(e, camera.position); introLook.getPoint(e, tgtLook); camera.lookAt(tgtLook); curCam.copy(camera.position); curLook.copy(tgtLook);
      avatar.position.set(apos.x, 0, apos.z); avatar.rotation.y = faceYaw; if (introT >= INTRO_SEC) endIntro();
    } else if (ending) {
      endT += dt; curCam.lerp(endCam, Math.min(1, dt * 1.6)); curLook.lerp(endLook, Math.min(1, dt * 2)); camera.position.copy(curCam); camera.lookAt(curLook);
      var last = Math.min(1, Math.max(0, (endT - 2.2) / 6)), appear = Math.min(1, last / .3), zoom = Math.min(1, Math.max(0, (last - .3) / .7)), ez = zoom * zoom * (3 - 2 * zoom);
      peek.style.opacity = appear * (1 - Math.max(0, (zoom - .92) / .08)); peek.style.transform = 'scale(' + (1 + ez * 7) + ')';
      emakiBox.style.transform = 'scale(' + (1.18 - .18 * ez) + ')'; narr.style.visibility = last > .1 ? 'hidden' : '';
      var fin = last > .97; endlink.classList.toggle('show', fin); endFree.classList.toggle('show', fin); if (fin) { talk.classList.remove('show'); talkTimer = 0; }
      avatar.visible = endT < 2;
    } else { avatar.visible = true; walkStep(dt, t); }
    if (talkTimer > 0) { talkTimer -= dt * 1000; if (talkTimer <= 0) talk.classList.remove('show'); }

    // 町の色・灯り・人：再生 → 持続で戻る
    var sat = .32 + .83 * Math.min(1, Math.max(0, (effP - .05) / .85));
    canvas.style.filter = 'saturate(' + sat.toFixed(3) + ')';
    lanternMat.color.set('#a99d8a').lerp(tmpC.set('#e0472a'), Math.min(1, Math.max(0, (effP - .35) / .3)));
    shops.forEach(function(s){ var on = effP > s.th; if (s.on !== on) { s.on = on; s.m.map = on ? s.o : s.c; s.m.needsUpdate = true; } });
    var visible = Math.floor(CROWD * (.15 + .85 * Math.min(1, effP / .7)));
    for (var i = 0; i < CROWD; i++) {
      var c = crowd[i];
      if (i >= visible) { dummy.position.set(0, -50, 0); dummy.scale.set(0, 0, 0); }
      else {
        if (c.ax === 'z') { c.z += c.sp * .016; if (c.z > c.b) c.z = c.a; if (c.z < c.a) c.z = c.b; } else { c.x += c.sp * .016; if (c.x > c.b) c.x = c.a; if (c.x < c.a) c.x = c.b; }
        dummy.position.set(c.x, .75 + Math.abs(Math.sin(t * 6 + i)) * .1, c.z); dummy.scale.set(1, 1, 1);
      }
      dummy.updateMatrix(); bodyM.setMatrixAt(i, dummy.matrix); dummy.position.y += 1.15; dummy.updateMatrix(); headM.setMatrixAt(i, dummy.matrix);
    }
    bodyM.instanceMatrix.needsUpdate = true; headM.instanceMatrix.needsUpdate = true; if (bodyM.instanceColor) bodyM.instanceColor.needsUpdate = true;
    moats.forEach(function(m){ m.material.color.setHSL(.55, .6, .55 + Math.sin(t * .8) * .015); });
    var flowOn = ending ? 1 : Math.min(1, Math.max(0, (effP - .62) / .12));
    for (var k = 0; k < coinsA.length; k++) {
      var uu = (t * .05 + k / coinsA.length) % 1; flowA.getPoint(uu, coinsA[k].position); coinsA[k].rotation.z = t * 3; coinsA[k].scale.setScalar(flowOn);
      flowB.getPoint(uu, coinsB[k].position); coinsB[k].scale.setScalar(flowOn);
    }
    renderer.render(scene, camera);
  }
  sizeUp(); refreshHud(); frame();
}
// 文字（Yuji Syuku）を先に読み込んでから組み立てる（店の看板の字がきれいに出る）
(function(){
  var ran = false, go = function(){ if (!ran) { ran = true; boot(); } };
  if (document.fonts && document.fonts.load) { document.fonts.load('700 24px "Yuji Syuku"', '茶米酒筆宿菓').then(go, go); setTimeout(go, 1800); } else go();
})();
