/* 城の作り込み（試作）
   上：江戸時代に実在した城（姫路城）を模した天守。下：現代の鉄筋コンクリートの芯柱と円環、
   逆さに連なる町家の塊（サマーウォーズの城のイメージ）。中庭は打ち放しの曲面壁、
   沈んだ円形の火床、青緑に灯る水面。「設計図」に切り替えると線画になる。形はすべてここで組む。 */
(function () {
  'use strict';
  var T = THREE; if (!T) return;
  var canvas = document.getElementById('gl');
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  var dpr = Math.min(2, devicePixelRatio || 1); renderer.setPixelRatio(dpr);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  var scene = new T.Scene();
  var NIGHT = new T.Color('#06122a'), BLUE = new T.Color('#0a2038');
  scene.background = NIGHT; scene.fog = new T.Fog('#06122a', 30, 90);
  var camera = new T.PerspectiveCamera(42, 1, .1, 200);

  var seed = 5, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  var R = function (a, b) { return a + rnd() * (b - a); };

  /* ---- 四方の季節：春（桜）・梅雨・秋（紅葉）・冬（雪） ---- */
  var SEAS = [
    { n: '春', ground: '#b9d49a', rim: '#ffd6e4', roof: '#7a5a63' },
    { n: '梅雨', ground: '#1f6f6a', rim: '#9fe9e0', roof: '#16302d' },
    { n: '秋', ground: '#b8793a', rim: '#ffcf7a', roof: '#4a2514' },
    { n: '冬', ground: '#eef3f8', rim: '#ffffff', roof: '#eef3f8' }
  ];
  function seasonOf(x, z) { var f = Math.atan2(z, x); if (f >= 0 && f < Math.PI / 2) return 0; if (f >= Math.PI / 2) return 1; if (f < -Math.PI / 2) return 2; return 3; }

  /* ---- 材質・テクスチャ ---- */
  function boardTex() {                                     // 打ち放しコンクリート：型枠の横縞とにじみ
    var c = document.createElement('canvas'); c.width = 512; c.height = 512; var g = c.getContext('2d');
    g.fillStyle = '#9b9378'; g.fillRect(0, 0, 512, 512);
    for (var y = 0; y < 512; y += 64) { g.fillStyle = 'rgba(' + (60 + rnd() * 40 | 0) + ',' + (55 + rnd() * 30 | 0) + ',40,' + (.12 + rnd() * .12) + ')'; g.fillRect(0, y, 512, 64); g.fillStyle = 'rgba(30,26,18,.5)'; g.fillRect(0, y, 512, 2); }
    for (var i = 0; i < 1400; i++) { g.fillStyle = 'rgba(30,26,18,' + rnd() * .09 + ')'; g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1 + rnd() * 3); }
    for (var k = 0; k < 16; k++) { g.fillStyle = 'rgba(30,26,18,.35)'; g.beginPath(); g.arc(k * 32 + 16, 32 + (k % 2) * 64, 2.5, 0, 6.28); g.fill(); }
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t;
  }
  var board = boardTex();
  var cache = {};
  function M(col, o) {
    o = o || {}; var k = col + '|' + (o.e || '') + '|' + (o.r == null ? '' : o.r) + '|' + (o.m || '') + '|' + (o.ei || '');
    if (!cache[k]) cache[k] = new T.MeshStandardMaterial({ color: col, roughness: o.r == null ? .85 : o.r, metalness: o.m || 0, emissive: new T.Color(o.e || '#000'), emissiveIntensity: o.ei || 1 });
    return cache[k];
  }
  function mesh(g, mat, x, y, z, parent) { var m = new T.Mesh(g, mat); m.position.set(x, y, z); parent.add(m); return m; }
  function box(parent, w, h, d, x, y, z, mat) { return mesh(new T.BoxGeometry(w, h, d), mat, x, y + h / 2, z, parent); }

  var root = new T.Group(); scene.add(root);
  var castle = new T.Group(); root.add(castle);
  var plaza = new T.Group(); root.add(plaza);

  /* ---- 光 ---- */
  scene.add(new T.AmbientLight('#2a3d66', .55));
  var moon = new T.DirectionalLight('#7f9be0', .55); moon.position.set(-12, 30, 18); scene.add(moon);
  scene.add(new T.HemisphereLight('#3b5aa8', '#120a05', .35));
  var fireL = new T.PointLight('#ff8a3d', 4.2, 18, 1.8); fireL.position.set(0, 1.1, 0); scene.add(fireL);
  var warm = new T.PointLight('#ffb25a', 2.4, 22, 1.6); warm.position.set(0, 10, 0); scene.add(warm);
  var top = new T.PointLight('#fff1d2', 1.6, 18, 1.8); top.position.set(0, 21, 0); scene.add(top);

  /* ---- 中庭：円形の火床、青緑の水面、打ち放しの曲面壁 ---- */
  function disc(parent, rIn, rOut, y, h, mat, seg) { var g = new T.RingGeometry(rIn, rOut, seg || 64); g.rotateX(-Math.PI / 2); return mesh(g, mat, 0, y, 0, parent); }
  var slate = new T.Mesh(new T.CylinderGeometry(15, 15, .3, 80), M('#1b2230', { r: .6 })); slate.position.y = -.15; plaza.add(slate);
  for (var si = 0; si < 4; si++) {
    var f0 = [0, Math.PI / 2, -Math.PI, -Math.PI / 2][si];                       // 各季節の xz 角度の始まり
    var gg = new T.RingGeometry(6.4, 12.2, 32, 1, -(f0 + Math.PI / 2), Math.PI / 2); gg.rotateX(-Math.PI / 2);
    var gm = si === 1 ? M('#2b9d95', { e: '#168a82', ei: .32, r: .18, m: .1 }) : M(SEAS[si].ground, { r: .9, e: si === 3 ? '#9fb8d0' : '#000', ei: si === 3 ? .12 : 1 });
    mesh(gg, gm, 0, .02, 0, plaza);
    var gr = new T.RingGeometry(12.2, 12.6, 32, 1, -(f0 + Math.PI / 2), Math.PI / 2); gr.rotateX(-Math.PI / 2);
    mesh(gr, M(SEAS[si].rim, { e: SEAS[si].rim, ei: .9 }), 0, .03, 0, plaza);
  }
  var water = null;
  var pitRing = new T.Mesh(new T.CylinderGeometry(3.1, 3.3, .5, 48, 1, true), M('#ece3d0', { r: .8 })); pitRing.position.y = .1; plaza.add(pitRing);
  var seatRing = new T.Mesh(new T.TorusGeometry(2.55, .42, 10, 64), M('#e9dfca', { r: .9 })); seatRing.rotation.x = Math.PI / 2; seatRing.position.y = .45; plaza.add(seatRing);
  disc(plaza, 0, 2.0, .06, 0, M('#14100c', { r: .7 }), 48);
  var fireMesh = new T.Mesh(new T.SphereGeometry(.45, 14, 10), M('#ff8a2a', { e: '#ff6a10', ei: 2.2 })); fireMesh.scale.set(1, .8, 1); fireMesh.position.y = .55; plaza.add(fireMesh);
  var embers = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, .08, 32), M('#ff5a10', { e: '#ff4a08', ei: 1.5 })); embers.position.y = .1; plaza.add(embers);
  var wallTex = board.clone(); wallTex.needsUpdate = true; wallTex.repeat.set(10, 3);
  var wallMat = new T.MeshStandardMaterial({ map: wallTex, roughness: .95, side: T.DoubleSide });
  [[0.15, 1.35, 13.4, 5.2], [1.75, 3.0, 13.0, 3.9], [3.55, 4.55, 13.8, 4.6], [5.0, 6.0, 12.8, 3.6]].forEach(function (a) {
    var g = new T.CylinderGeometry(a[2], a[2], a[3], 40, 1, true, a[0] * Math.PI, (a[1] - a[0]) * Math.PI); mesh(g, wallMat, 0, a[3] / 2, 0, plaza);
  });
  // 壁の足元を照らす光の帯
  disc(plaza, 12.9, 13.1, .05, 0, M('#fff0b0', { e: '#ffd980', ei: 1.4 }), 96);
  // オリーブの木（中庭）
  (function () { var t = new T.Group(); t.position.set(-8, 0, -9); plaza.add(t); box(t, .25, 1.6, .25, 0, 0, 0, M('#4a3a28')); for (var i = 0; i < 9; i++) mesh(new T.SphereGeometry(R(.5, .9), 8, 6), M('#6f8a58', { e: '#2a3a20', ei: .35 }), R(-.9, .9), R(1.4, 2.5), R(-.9, .9), t); })();

  /* ---- 町家のインスタンス ---- */
  /* 町家：色ごとの頂点色つきジオメトリを、ひとつの Mesh にまとめる（InstancedMesh を使わず確実に描く） */
  var wallBase = new T.BoxGeometry(1, 1, 1).toNonIndexed();
  var roofBase = new T.ConeGeometry(.7071, 1, 4).toNonIndexed(); roofBase.rotateY(Math.PI / 4);
  function houses() { return { pos: [], col: [] }; }
  var dummy = new T.Object3D(), vtmp = new T.Vector3();
  function pushGeo(H, base, matrix, color) {
    var p = base.attributes.position, n = p.count;
    for (var i = 0; i < n; i++) { vtmp.fromBufferAttribute(p, i).applyMatrix4(matrix); H.pos.push(vtmp.x, vtmp.y, vtmp.z); H.col.push(color.r, color.g, color.b); }
  }
  function addHouse(H, x, y, z, w, h, d, yaw, wall, roof) {
    dummy.position.set(x, y + h / 2, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(w, h, d); dummy.updateMatrix(); pushGeo(H, wallBase, dummy.matrix, wall);
    var se = seasonOf(x, z); if (se !== 0 || rnd() > .35) roof = new T.Color(SEAS[se].roof); var rh = h * .36 + .05; dummy.position.set(x, y + h + rh / 2, z); dummy.scale.set(w * 1.34, rh, d * 1.34); dummy.updateMatrix(); pushGeo(H, roofBase, dummy.matrix, roof);
  }
  function finish(H, parent) {
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(H.pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(H.col, 3)); g.computeVertexNormals();
    var m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: .85, flatShading: true })); m.frustumCulled = false; parent.add(m);
  }
  var WALL_D = ['#2a2522', '#352d27', '#3f352c', '#241f1c', '#4a3d33'], WALL_L = ['#e8e2d2', '#ddd5c2', '#cfc6b2'], ROOF_D = ['#1d1f24', '#25282e', '#17181c'], ROOF_G = ['#2f5f55', '#3a6b5f'];
  function pick(a) { return new T.Color(a[Math.floor(rnd() * a.length)]); }


  function seasonTree(parent, x, y, z, se, k) {
    var t = new T.Group(); t.position.set(x, y, z); t.scale.setScalar(k || 1); parent.add(t);
    if (se === 3) {                                                           // 冬：雪をかぶった松
      box(t, .14, .7, .14, 0, 0, 0, M('#3a2a1c'));
      [[.6, .55, .7], [.45, .5, 1.15], [.3, .42, 1.55]].forEach(function (c) { var m = new T.Mesh(new T.ConeGeometry(c[0], c[1], 7), M('#2e5a3c', { r: .9 })); m.position.y = c[2]; t.add(m); var sn = new T.Mesh(new T.ConeGeometry(c[0] * .82, c[1] * .55, 7), M('#f3f7fb', { e: '#9fb8d0', ei: .15 })); sn.position.y = c[2] + c[1] * .22; t.add(sn); });
      return;
    }
    box(t, .14, .8, .14, 0, 0, 0, M(se === 1 ? '#2a1f16' : '#3a2a1c'));
    var cols = se === 0 ? ['#f7b9cf', '#ffd6e4', '#f19ab8'] : se === 1 ? ['#1f5a3a', '#2a6b46', '#174a30'] : ['#e0662a', '#c7311a', '#f0a030'];
    for (var q = 0; q < 6; q++) mesh(new T.SphereGeometry(R(.3, .5), 8, 6), M(cols[q % 3], { e: se === 2 ? '#8a2a10' : '#000', ei: se === 2 ? .7 : 1, r: .85 }), R(-.4, .4), R(.9, 1.5), R(-.4, .4), t);
    if (se === 1) for (var h = 0; h < 4; h++) mesh(new T.SphereGeometry(.09, 6, 5), M(h % 2 ? '#7a8be0' : '#9b6fd0', { e: '#3a3d9a', ei: .5 }), R(-.5, .5), .1, R(-.5, .5), t);   // 紫陽花
  }

  // 四方の木（桜・梅雨の木と紫陽花・紅葉・雪の松）
  for (var pt = 0; pt < 44; pt++) { var pa0 = rnd() * 6.283, pr0 = R(7.2, 11.6); seasonTree(plaza, Math.cos(pa0) * pr0, .02, Math.sin(pa0) * pr0, seasonOf(Math.cos(pa0), Math.sin(pa0)), R(1.2, 2.0)); }
  /* ---- 逆さに連なる町家の塊（下へ向かって細くなる） ---- */
  var MASS_TOP = 9.0, MASS_BOT = 3.4, MR = 5.1;
  var mass = houses();
  var layers = 30;
  for (var li = 0; li < layers; li++) {
    var t = li / (layers - 1), y = MASS_TOP - t * (MASS_TOP - MASS_BOT), rr = Math.max(.25, MR * Math.pow(1 - t, .85));
    for (var ring = rr; ring > .1; ring -= .62) {
      var cnt = Math.max(1, Math.floor(2 * Math.PI * ring / .62)); var off = rnd() * 6.28;
      for (var k = 0; k < cnt; k++) {
        var a = off + k / cnt * 6.283, w = R(.34, .56), d = R(.34, .56), h = R(.22, .36);
        addHouse(mass, Math.cos(a) * ring + R(-.05, .05), y, Math.sin(a) * ring + R(-.05, .05), w, h, d, -a + R(-.3, .3), pick(rnd() > .88 ? WALL_L : WALL_D), pick(ROOF_D));
      }
    }
  }
  finish(mass, castle);

  /* ---- 浮かぶ円環：町家の環と、赤い帯、光る縁 ---- */
  var rings = [
    { y: 9.1, r: 7.0, rows: 2 }, { y: 11.2, r: 5.9, rows: 2 }, { y: 13.0, r: 4.7, rows: 1 }
  ];
  var rh = houses();
  rings.forEach(function (rg, ri) {
    var disk = mesh(new T.CylinderGeometry(rg.r, rg.r * .96, .22, 72), M('#1d1f26', { r: .5, m: .3 }), 0, rg.y - .11, 0, castle);
    var band = mesh(new T.TorusGeometry(rg.r, .07, 8, 96), M('#e0301c', { e: '#d02010', ei: 1.3 }), 0, rg.y + .02, 0, castle); band.rotation.x = Math.PI / 2;
    var rim = mesh(new T.TorusGeometry(rg.r * .96, .035, 6, 96), M('#9fe9ff', { e: '#6fd6ff', ei: 1.8 }), 0, rg.y - .22, 0, castle); rim.rotation.x = Math.PI / 2;
    for (var row = 0; row < rg.rows; row++) {
      var rr2 = rg.r - .55 - row * .78, cnt2 = Math.floor(2 * Math.PI * rr2 / .82);
      for (var j = 0; j < cnt2; j++) {
        var a2 = j / cnt2 * 6.283 + row * .2, w2 = R(.5, .7), d2 = R(.5, .7), h2 = R(.34, .58) + (row ? 0 : .08);
        addHouse(rh, Math.cos(a2) * rr2, rg.y, Math.sin(a2) * rr2, w2, h2, d2, -a2 + Math.PI / 2, pick(rnd() > .55 ? WALL_L : WALL_D), pick(ROOF_D));
      }
    }
    // 環の上の木：その方角の季節の木
    for (var m2 = 0; m2 < 9; m2++) {
      var ma = rnd() * 6.283, mr = rg.r * R(.12, .5), tx = Math.cos(ma) * mr, tz = Math.sin(ma) * mr; seasonTree(castle, tx, rg.y, tz, seasonOf(tx, tz), .55);
    }
  });
  finish(rh, castle);

  /* ---- 芯柱（鉄筋コンクリート）：打ち放し、スリットの灯り、バルコニー ---- */
  var coreTex = board.clone(); coreTex.needsUpdate = true; coreTex.repeat.set(3, 6);
  var core = mesh(new T.CylinderGeometry(1.05, 1.25, 13.4, 36), new T.MeshStandardMaterial({ map: coreTex, roughness: .95 }), 0, 9.6, 0, castle);
  for (var sl = 0; sl < 14; sl++) { var sa = sl / 14 * 6.283; box(castle, .08, 3.4, .06, Math.cos(sa) * 1.16, 3.8 + (sl % 3) * 3.0, Math.sin(sa) * 1.16, M('#ffcf80', { e: '#ffb050', ei: 1.6 })).rotation.y = -sa + Math.PI / 2; }
  [4.5, 7.0, 9.4].forEach(function (y) { var b = mesh(new T.TorusGeometry(1.5, .1, 6, 48), M('#d8d0bd', { r: .8 }), 0, y, 0, castle); b.rotation.x = Math.PI / 2; });

  /* ---- 現代の離れ（緑青の屋根・焼杉・暖色の灯り・青緑のプール） ---- */
  (function () {
    var g = new T.Group(); g.position.set(3.6, 9.1, 0); g.rotation.y = -.4; castle.add(g);
    box(g, 2.3, .8, 1.5, 0, 0, 0, M('#1f1713', { r: .9 })); box(g, 2.0, .5, 1.2, 0, .12, .1, M('#ffb25a', { e: '#ff9a40', ei: 1.4 }));
    var roof = box(g, 2.7, .12, 1.9, 0, .8, 0, M('#2f6a5c', { r: .5, m: .3 })); roof.rotation.z = .04;
    var pool = box(g, 1.7, .08, .5, -.2, 0, 1.25, M('#35e0cf', { e: '#18c8b8', ei: 1.2 }));
    box(g, 2.4, .04, 1.1, 0, 0, 1.2, M('#2a2d34'));
  })();
  (function () {
    var g = new T.Group(); g.position.set(-3.0, 11.2, 1.4); g.rotation.y = .5; castle.add(g);
    box(g, 1.9, .7, 1.3, 0, 0, 0, M('#1f1713', { r: .9 })); box(g, 1.6, .4, 1.0, 0, .12, .15, M('#ffb25a', { e: '#ff9a40', ei: 1.3 }));
    box(g, 2.2, .1, 1.6, 0, .7, 0, M('#2f6a5c', { r: .5, m: .3 }));
    var fp = new T.Mesh(new T.CylinderGeometry(.35, .35, .1, 24), M('#ff7a22', { e: '#ff5a10', ei: 1.6 })); fp.position.set(0, .05, 1.1); g.add(fp);
  })();

  /* ---- 天守（姫路城に倣う）：石垣、白漆喰の五重、千鳥破風、小天守、金の鯱 ---- */

  var donjon = new T.Group(); donjon.position.y = 13.1; castle.add(donjon);
  var stone = M('#a39c8d', { r: .95 }), plaster = M('#f1ede2', { r: .9 }), kawara = M('#3a3d44', { r: .55, m: .2 }), woodD = M('#2b1f17', { r: .8 }), gold = M('#e9b53a', { e: '#c98a10', ei: .7, m: .6, r: .35 });
  function frustum(parent, rb, rt, h, y, mat) { var g = new T.CylinderGeometry(rt, rb, h, 4); g.rotateY(Math.PI / 4); return mesh(g, mat, 0, y + h / 2, 0, parent); }
  function prismRoof(parent, w, d, h, x, y, z, mat, yaw) {                          // 千鳥破風の三角
    var s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    var g = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); var m = mesh(g, mat, x, y, z, parent); m.rotation.y = yaw || 0; return m;
  }
  function tower(parent, cx, cz, base, tiers, scale, yaw) {
    var g = new T.Group(); g.position.set(cx, 0, cz); g.rotation.y = yaw || 0; g.scale.setScalar(scale); parent.add(g);
    frustum(g, base * 1.05, base * .8, 1.1, 0, stone); var y = 1.1;
    for (var i = 0; i < tiers; i++) {
      var w = base * (1 - i * .15); var h = .92 - i * .04;
      var body = box(g, w, h, w, 0, y, 0, plaster);
      for (var s2 = 0; s2 < 4; s2++) { var a = s2 * Math.PI / 2; for (var k = -1; k <= 1; k++) { var wd = box(g, .16, .2, .04, 0, y + h * .55, 0, woodD); wd.position.set(Math.sin(a) * (w / 2 + .02) + Math.cos(a) * k * w * .26, y + h * .55, Math.cos(a) * (w / 2 + .02) - Math.sin(a) * k * w * .26); wd.rotation.y = a; } }
      var rw = w * 1.5; box(g, rw * .86, .07, rw * .86, 0, y + h, 0, woodD); var roof = mesh(new T.ConeGeometry(rw * .7071, .36, 4), kawara, 0, y + h + .07 + .18, 0, g); roof.geometry.rotateY(Math.PI / 4); box(g, rw * .5, .05, rw * .5, 0, y + h + .3, 0, kawara);
      if (i === 1 || i === 3) { [0, 1, 2, 3].forEach(function (q) { if (q % 2) return; var a2 = q * Math.PI / 2; prismRoof(g, w * .55, w * .3, .42, Math.sin(a2) * (w / 2 + .02), y + h + .02, Math.cos(a2) * (w / 2 + .02), kawara, a2 + Math.PI / 2); }); }
      y += h + .4;
    }
    // 入母屋の最上層と、金の鯱
    var tw = base * (1 - tiers * .15), topRoof = mesh(new T.ConeGeometry(tw * 1.25 * .7071, .5, 4), kawara, 0, y + .25, 0, g); topRoof.geometry.rotateY(Math.PI / 4);
    box(g, tw * 1.05, .06, tw * 1.05, 0, y, 0, woodD);
    box(g, .2, .34, .14, tw * .36, y + .42, 0, gold); box(g, .2, .34, .14, -tw * .36, y + .42, 0, gold); box(g, .12, .16, .12, tw * .36, y + .74, 0, gold); box(g, .12, .16, .12, -tw * .36, y + .74, 0, gold);
    return g;
  }

  // 大天守：立面図に倣う。反った石垣、五重、柱割りと白壁、深い軒、千鳥破風、最上階は朱と金。断面（透視）で内部が見える
  var stoneRef = null;
  var plasterDS = new T.MeshStandardMaterial({ color: '#f1ede2', roughness: .9, side: T.DoubleSide });
  var glowY = M('#ffd24a', { e: '#ffb800', ei: 1.5, r: .6 }), redL = M('#c42b1a', { e: '#7a1008', ei: .4, r: .5 }), woodP = M('#2b1f17', { r: .8 });

  // 各階の内部：1階=城下町の通り、2・4階=PCだらけの部屋、3階=図書館、最上階=書院（断面や窓から見える）
  function fitOut(parentG, k, y, w, h) {
    var Z = 1.38, g = new T.Group(); g.scale.setScalar(Z); parentG.add(g);
    var hw = w * .36, y0 = y + .06; g.position.y = -(y0) * (Z - 1);
    if (k === 0) {                                                  // 城下町：通りと小さな町家、提灯
      box(g, w * .8, .02, .16, 0, y0, 0, M('#d9c48a'));
      for (var i = -2; i <= 2; i++) [-1, 1].forEach(function (sd) {
        var hh = R(.2, .32), ww = R(.2, .3); box(g, ww, hh, .2, i * hw * .42, y0, sd * (.2 + R(0, .08)), M(rnd() > .5 ? '#e8e2d2' : '#cfc6b2'));
        box(g, ww * 1.2, .05, .26, i * hw * .42, y0 + hh, sd * .2, M('#2b2e34'));
        box(g, .04, .05, .04, i * hw * .42 + .08, y0 + hh * .6, sd * (.3), M('#ffcf80', { e: '#ff9d3a', ei: 1.6 }));
      });
    } else if (k === 1 || k === 3) {                                // PCだらけの部屋：机の列、光るモニター、サーバーラック
      for (var r = -1; r <= 1; r++) for (var c = -2; c <= 2; c++) {
        var dx = c * hw * .45, dz = r * hw * .5;
        box(g, hw * .36, .03, .13, dx, y0 + .1, dz, M('#3a3d44', { r: .5 }));
        box(g, .02, .1, .02, dx, y0, dz - .04, M('#2a2c33'));
        box(g, .11, .075, .012, dx, y0 + .13, dz - .04, M(c % 2 ? '#5fe0ff' : '#9bf0a0', { e: c % 2 ? '#2ab8e8' : '#4cc866', ei: 1.8 }));
        box(g, .08, .012, .035, dx, y0 + .13, dz + .01, M('#d8d8dc'));
        box(g, .07, .09, .07, dx, y0, dz + .12, M('#1f2127'));
      }
      for (var q = -2; q <= 2; q++) { box(g, .08, .34, .1, q * hw * .42, y0, -hw * .95, M('#202228', { r: .5 })); box(g, .05, .26, .012, q * hw * .42, y0 + .04, -hw * .95 + .06, M('#5fe0ff', { e: '#2ab8e8', ei: 1.4 })); }
    } else if (k === 2 || k === 4) {                                // 図書館：本棚の列、色とりどりの背表紙、読書灯
      var bc = ['#8C4229', '#254723', '#5BA0C1', '#e9b53a', '#b7282e', '#4E9495', '#e8e2d2'];
      for (var sx = -2; sx <= 2; sx++) {
        box(g, .05, h * .8, hw * 1.5, sx * hw * .45, y0, 0, M('#4a3322', { r: .8 }));
        for (var b = 0; b < 9; b++) box(g, .035, R(.1, .22), .06, sx * hw * .45 + .04, y0 + .1 + (b % 3) * .2, -hw * .6 + b * hw * .14, M(bc[(b + sx + 5) % 7]));
      }
      box(g, hw * .8, .03, .16, 0, y0 + .12, hw * .85, M('#6b4a2a')); box(g, .05, .1, .05, .1, y0 + .15, hw * .85, M('#ffcf80', { e: '#ff9d3a', ei: 1.8 }));
    } else {                                                        // 最上階：書院（畳・掛軸・金の灯り）
      box(g, w * .8, .02, w * .8, 0, y0, 0, M('#bfc18a', { r: .95 }));
      box(g, .4, h * .5, .03, 0, y0 + .1, -hw * 1.1, M('#e9dfc2')); box(g, .3, .22, .03, 0, y0 + .1, -hw * 1.08, M('#c42b1a', { e: '#7a1008', ei: .4 }));
    }
  }

  // ---- 天守の細部の部品 ----
  function strut(parent, p1, p2, r, mat) {                                  // 二点をつなぐ細い棒（隅棟・高欄など）
    var a = new T.Vector3(p1[0], p1[1], p1[2]), b = new T.Vector3(p2[0], p2[1], p2[2]), d = b.clone().sub(a), len = d.length();
    var m = new T.Mesh(new T.CylinderGeometry(r, r, len, 5), mat); m.position.copy(a.clone().add(b).multiplyScalar(.5));
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); parent.add(m); return m;
  }
  function shachi(parent, x, y, z, flip) {                                  // 金の鯱：反った体・背びれ・尾
    var gM = M('#e9b53a', { e: '#c98a10', ei: .7, m: .6, r: .35 }); var g = new T.Group(); g.position.set(x, y, z); if (flip) g.rotation.y = Math.PI; parent.add(g);
    box(g, .1, .2, .1, 0, 0, 0, gM); var hd = box(g, .12, .1, .14, 0, .18, .02, gM); hd.rotation.x = -.3;
    var tail = new T.Mesh(new T.TorusGeometry(.08, .022, 6, 10, Math.PI * 1.1), gM); tail.position.set(0, .3, -.06); tail.rotation.y = Math.PI / 2; g.add(tail);
    box(g, .02, .12, .08, 0, .12, -.07, gM);
  }
  function kakenyo(parent, x, y, z, yaw) {                                  // 懸魚（破風の飾り）と家紋の円
    var d = new T.Mesh(new T.CylinderGeometry(.07, .07, .02, 14), M('#e9b53a', { e: '#c98a10', ei: .6, m: .5 })); d.rotation.x = Math.PI / 2; d.position.set(x, y, z); d.rotation.z = yaw || 0; parent.add(d);
  }

  /* ---- 石垣：反りのある裾、算木積み（角で互い違い）、下から上へMORINOAの色のグラデーション ---- */
  var STOPS = ['#173018', '#254723', '#3d7a62', '#4E9495', '#5BA0C1', '#8AB657', '#d9e6b8'].map(function (c) { return new T.Color(c); });
  function gradAt(t) { var x = Math.min(.9999, Math.max(0, t)) * (STOPS.length - 1), i = Math.floor(x); return STOPS[i].clone().lerp(STOPS[i + 1], x - i); }
  function stoneWall(parent, y0) {
    var H = houses(), N = 11, ch = .1473, depth = .42;
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1), hw = 1.95 + 1.15 * Math.pow(1 - t, 2.1);                    // 反り：裾が広く、上へ向かって急に立ち上がる
      var yy = y0 + i * ch, base = gradAt(t), core = base.clone().multiplyScalar(.55);
      dummy.position.set(0, yy + ch / 2, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set((hw - depth) * 2 + .04, ch, (hw - depth) * 2 + .04); dummy.updateMatrix(); pushGeo(H, wallBase, dummy.matrix, core);   // 内側の詰め
      for (var f = 0; f < 4; f++) {
        var an = f * Math.PI / 2, full = ((f % 2) === (i % 2)), L = full ? hw * 2 : hw * 2 - depth * 2, n = Math.max(2, Math.round(L / .52)), len = L / n;
        for (var j = 0; j < n; j++) {
          var u = -L / 2 + len * (j + .5), rad = hw - depth / 2;
          var jit = (rnd() - .5) * .16, col = base.clone().offsetHSL(0, 0, jit * .35);
          dummy.position.set(Math.sin(an) * rad + Math.cos(an) * u, yy + ch / 2, Math.cos(an) * rad - Math.sin(an) * u);
          dummy.rotation.set(0, an, 0); dummy.scale.set(len - .018, ch * .97, depth); dummy.updateMatrix(); pushGeo(H, wallBase, dummy.matrix, col);
        }
      }
    }
    finish(H, parent); return parent.children[parent.children.length - 1];
  }
  function mainDonjon(parent) {
    var g = new T.Group(); parent.add(g); var y = 0;
    var stoneMesh = stoneWall(g, 0); stoneRef = stoneMesh; y = 1.62;
    var W = [3.7, 3.1, 2.55, 2.05, 1.55, 1.1], Hh = [1.0, .95, .88, .8, .72, .62];     // 立面図：下が最大、上へ向かって大きく絞る
    y = 1.62;
    for (var k = 0; k < 6; k++) {
      var w = W[k], h = Hh[k];
      box(g, w, h, w, 0, y, 0, plasterDS);
      box(g, w * .92, .03, w * .92, 0, y + .04, 0, glowY);                                      // 床の灯り（断面で見える）
      fitOut(g, k, y, w, h);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { box(g, .08, h, .08, c[0] * w * .4, y, c[1] * w * .4, redL); });
      var n = Math.max(3, Math.round(w / .46));
      for (var f = 0; f < 4; f++) {
        var ang = f * Math.PI / 2;
        for (var j = 0; j <= n; j++) {
          var u = (j / n - .5) * (w - .04);
          var px = Math.sin(ang) * (w / 2 + .01) + Math.cos(ang) * u, pz = Math.cos(ang) * (w / 2 + .01) - Math.sin(ang) * u;
          var col = box(g, .05, h * .94, .05, px, y + .03, pz, woodP);
          if (j < n) { var wu = u + (w - .04) / n / 2; var wx = Math.sin(ang) * (w / 2 + .02) + Math.cos(ang) * wu, wz = Math.cos(ang) * (w / 2 + .02) - Math.sin(ang) * wu; var wd = box(g, (w - .04) / n * .62, h * .34, .03, wx, y + h * .4, wz, woodD); wd.rotation.y = ang; }
        }
      }
      box(g, w + .012, h * .26, w + .012, 0, y, 0, M('#1f1913', { r: .85 }));                          // 下見板（黒い腰）
      for (var fq = 0; fq < 4; fq++) { var an = fq * Math.PI / 2; for (var hs = -1; hs <= 1; hs++) { var hx = Math.sin(an) * (w / 2 + .015) + Math.cos(an) * hs * w * .22, hz = Math.cos(an) * (w / 2 + .015) - Math.sin(an) * hs * w * .22; var sm = box(g, .05, .05, .02, hx, y + h * .82, hz, M('#17120d')); sm.rotation.y = an; } }   // 狭間
      var eh = y + h, ew = (w + .95) / 2;
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (c) {
        strut(g, [0, eh + .3, 0], [c[0] * ew, eh + .01, c[1] * ew], .018, M('#15161a'));                  // 隅棟
        box(g, .07, .07, .07, c[0] * ew, eh, c[1] * ew, M('#e9b53a', { e: '#c98a10', ei: .5, m: .5 }));   // 隅の鬼瓦
      });
      box(g, w + .72, .05, w + .72, 0, y + h - .05, 0, M('#efe9da'));                                      // 軒裏の白い板
      if (k === 1) { box(g, w * .4, h * .72, .26, 0, y + .08, w / 2 + .12, plasterDS); var bay = new T.Mesh(new T.ConeGeometry(w * .3, .22, 4), kawara); bay.geometry.rotateY(Math.PI / 4); bay.scale.set(1, 1, .8); bay.position.set(0, y + h * .8 + .12, w / 2 + .12); g.add(bay); }   // 出窓
      if (k === 2) { var kr = new T.Mesh(new T.CylinderGeometry(.34, .34, w * .5, 14, 1, false, 0, Math.PI), kawara); kr.rotation.z = Math.PI / 2; kr.rotation.y = Math.PI / 2; kr.position.set(0, y + h + .1, w / 2 + .1); g.add(kr); kakenyo(g, 0, y + h + .1, w / 2 + .3, 0); }   // 唐破風
      var eave = new T.Mesh(new T.ConeGeometry((w + .95) * .7071, .3, 4), kawara); eave.geometry.rotateY(Math.PI / 4); eave.position.y = y + h + .15; g.add(eave);
      var ed = box(g, w + .78, .035, w + .78, 0, y + h - .01, 0, woodP);
      if (k === 1 || k === 3) { [0, 2].forEach(function (q) { var a2 = q * Math.PI / 2; var pr = prismRoof(g, w * .55, w * .3, .4, Math.sin(a2) * (w / 2 + .12), y + h + .04, Math.cos(a2) * (w / 2 + .12), kawara, a2 + Math.PI / 2); box(g, .1, .1, .06, Math.sin(a2) * (w / 2 + .3), y + h + .3, Math.cos(a2) * (w / 2 + .3), gold); }); }
      y += h + .3;
    }
    var rr = box(g, W[5] * 1.1, .07, W[5] * 1.1, 0, y - .3 + .0, 0, redL);                                  // 最上階の朱の廻縁
    var top = new T.Mesh(new T.ConeGeometry(W[5] * 1.15, .62, 4), kawara); top.geometry.rotateY(Math.PI / 4); top.position.y = y + .2; g.add(top);
    shachi(g, W[5] * .3, y + .5, 0, false); shachi(g, -W[5] * .3, y + .5, 0, true);
    var rl = W[5] * .55;                                                                                       // 高欄（朱の欄干と擬宝珠）
    for (var rp = 0; rp < 16; rp++) { var ra = rp / 16 * Math.PI * 2; var rx = Math.cos(ra) * rl * 1.2, rz = Math.sin(ra) * rl * 1.2; box(g, .035, .14, .035, rx, y - .3, rz, redL); box(g, .05, .04, .05, rx, y - .17, rz, gold); }
    var rr2 = new T.Mesh(new T.TorusGeometry(rl * 1.2, .016, 5, 40), redL); rr2.rotation.x = Math.PI / 2; rr2.position.y = y - .2; g.add(rr2);
    box(g, .5, y - 1.5, .5, 0, 1.5, 0, glowY);                                                              // 中央の吹き抜け（安土城のような大空間）
    return g;
  }
  mainDonjon(donjon);
  tower(donjon, -3.9, .8, 1.0, 3, .85, .3); tower(donjon, 3.8, 1.0, .95, 3, .85, -.3); tower(donjon, .6, 3.9, .8, 2, .85, 0);   // 小天守
  // 渡櫓（天守をつなぐ）と白壁
  box(donjon, 2.6, .55, .5, -1.3, 1.1, .45, plaster); box(donjon, 2.4, .55, .5, 1.3, 1.1, .6, plaster);
  var wallRing = mesh(new T.CylinderGeometry(4.5, 4.6, .6, 48, 1, true), new T.MeshStandardMaterial({ color: '#efe9da', roughness: .9, side: T.DoubleSide }), 0, .3, 0, donjon);
  var tr = new T.Mesh(new T.TorusGeometry(4.55, .06, 6, 64), kawara); tr.rotation.x = Math.PI / 2; tr.position.y = .62; donjon.add(tr);
  disc(castle, 0, 4.7, 13.01, 0, M('#6a6558'), 48);
  var ish = new T.Group(); castle.add(ish);
  for (var mi = 0; mi < 5; mi++) {
    var ma2 = -1 + mi * .55, mt = new T.Group(); mt.position.set(Math.cos(ma2) * 4.2, 11.2, Math.sin(ma2) * 4.2); castle.add(mt);
    box(mt, .14, .9, .14, 0, 0, 0, M('#3a2a1c'));
    for (var q = 0; q < 6; q++) mesh(new T.SphereGeometry(R(.3, .5), 8, 6), M(q % 2 ? '#e0662a' : '#c7311a', { e: '#8a2a10', ei: .6 }), R(-.4, .4), R(.9, 1.5), R(-.4, .4), mt);
  }


  /* ---- 断面（透視図）：カメラ側の半分を切り取り、内部の吹き抜けと灯りの床を見せる ---- */
  renderer.localClippingEnabled = true;
  var cutPlane = new T.Plane(new T.Vector3(0, 0, -1), 0), cutOn = false, cutBtn = document.getElementById('cut');
  function setCut(on) {
    cutOn = on; cutBtn.classList.toggle('on', on);
    [donjon, core, ish].forEach(function (grp) { grp.traverse(function (o) { if (!o.isMesh) return; var ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(function (m) { m.clippingPlanes = on ? [cutPlane] : null; m.needsUpdate = true; }); }); });
  }
  cutBtn.addEventListener('click', function () { setCut(!cutOn); });
  /* ---- 光の粒（舞う灯りの粉） ---- */
  var N = 520, pg = new T.BufferGeometry(), pp = new Float32Array(N * 3), pc = new Float32Array(N * 3), pseas = new Uint8Array(N);
  var PCOL = [['#ffd6e4', '#ffbfd4'], ['#9fd0ff', '#7fbfff'], ['#ff9a4a', '#e0662a'], ['#ffffff', '#e8f1ff']];
  for (var pi = 0; pi < N; pi++) {
    var se2 = pi % 4, f0 = [0, Math.PI / 2, -Math.PI, -Math.PI / 2][se2], pa = f0 + rnd() * Math.PI / 2, pr = R(2, 12.5);
    pp[pi * 3] = Math.cos(pa) * pr; pp[pi * 3 + 1] = R(.5, 19); pp[pi * 3 + 2] = Math.sin(pa) * pr; pseas[pi] = se2;
    var cc = new T.Color(PCOL[se2][pi % 2 ? 0 : 1]); pc[pi * 3] = cc.r; pc[pi * 3 + 1] = cc.g; pc[pi * 3 + 2] = cc.b;
  }
  pg.setAttribute('position', new T.BufferAttribute(pp, 3)); pg.setAttribute('color', new T.BufferAttribute(pc, 3));
  var pts = new T.Points(pg, new T.PointsMaterial({ size: .11, vertexColors: true, transparent: true, opacity: .9, depthWrite: false })); pts.visible = false; scene.add(pts);   // 今は止める（城の作り込みを優先）

  /* ---- 設計図モード ---- */
  var line = new T.MeshBasicMaterial({ color: '#8ec8ff', wireframe: true, transparent: true, opacity: .55 });
  var orig = [], bp = false, bpBtn = document.getElementById('bp');
  function setBP(on) {
    bp = on; document.body.classList.toggle('bp', on); bpBtn.classList.toggle('on', on);
    scene.traverse(function (o) { if (!(o.isMesh)) return; if (on) { if (!o.userData.m) o.userData.m = o.material; o.material = line; } else if (o.userData.m) o.material = o.userData.m; });
    scene.background = on ? BLUE : NIGHT; scene.fog.color = on ? BLUE : NIGHT;
  }
  bpBtn.addEventListener('click', function () { setBP(!bp); });

  /* ---- 注記（設計図の書き込み）---- */
  var notes = [
    { t: '天守｜姫路城に倣う五重', p: new T.Vector3(0, 17.2, 0), id: 'n1' },
    { t: '小天守・渡櫓・白壁', p: new T.Vector3(-2.6, 14.6, .6), id: 'n2' },
    { t: '円環の町（浮遊層 ×3）', p: new T.Vector3(6.3, 11.2, 0), id: 'n3' },
    { t: 'RC 芯柱 ｜ 打ち放し φ2.4', p: new T.Vector3(1.2, 7, 0), id: 'n4' },
    { t: '逆さの町家塊（約900棟）', p: new T.Vector3(-2.6, 5.0, 2.0), id: 'n5' },
    { t: '離れ ｜ 緑青屋根・焼杉・露天', p: new T.Vector3(3.8, 9.9, 0), id: 'n6' },
    { t: '火床 ｜ 沈む円形の座', p: new T.Vector3(2.3, .6, 0), id: 'n7' }
  ];
  var noteWrap = document.getElementById('notes');
  notes.forEach(function (n) { var e = document.createElement('div'); e.className = 'note'; e.innerHTML = '<i></i><span>' + n.t + '</span>'; noteWrap.appendChild(e); n.el = e; });

  /* ---- カメラ ---- */
  var cam = { az: .9, pol: 1.28, dist: 42, tx: 0, ty: 10.5, tz: 0 }, goal = { az: .9, pol: 1.28, dist: 38, tx: 0, ty: 10.5, tz: 0 };
  var presets = { all: { dist: 38, pol: 1.28, ty: 10.5 }, donjon: { dist: 12, pol: 1.3, ty: 18.6 }, garden: { dist: 22, pol: 1.0, ty: 2 } };
  function go(k) { var p = presets[k]; goal.dist = p.dist; goal.pol = p.pol; goal.ty = p.ty; idle = 0; [].forEach.call(document.querySelectorAll('[data-go]'), function (b) { b.classList.toggle('on', b.dataset.go === k); }); }
  [].forEach.call(document.querySelectorAll('[data-go]'), function (b) { b.addEventListener('click', function () { go(b.dataset.go); }); });
  var idle = 0, drag = null;
  canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); idle = 0; });
  canvas.addEventListener('pointermove', function (e) { if (!drag) return; goal.az -= (e.clientX - drag.x) * .0055; goal.pol = Math.max(.35, Math.min(1.62, goal.pol - (e.clientY - drag.y) * .0045)); drag.x = e.clientX; drag.y = e.clientY; idle = 0; });
  canvas.addEventListener('pointerup', function () { drag = null; }); canvas.addEventListener('pointercancel', function () { drag = null; });
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); goal.dist = Math.max(4, Math.min(60, goal.dist * Math.exp(e.deltaY * .0011))); idle = 0; }, { passive: false });
  var pinch = null;
  canvas.addEventListener('touchmove', function (e) { if (e.touches.length !== 2) { pinch = null; return; } e.preventDefault(); var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) goal.dist = Math.max(4, Math.min(48, goal.dist * pinch / d)); pinch = d; }, { passive: false });
  canvas.addEventListener('touchend', function () { pinch = null; });


  /* ---- 表示は「白い天守」だけ。石垣より下（地下）は真っ暗にして、COMING SOON のボタンから ---- */
  var underView = document.getElementById('under-view'), underBtn = document.getElementById('under'), underOn = false;
  if (stoneRef) stoneRef.visible = false;                                       // 石垣は隠す（白い天守から上を見せる）
  /* 地下の城下町は見せず、外観を覆う：逆さの町家の塊は風呂敷で包み、浮かぶ環は簾で巻く */
  var covers = new T.Group(); castle.add(covers);
  function clothTex() {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 512; var g = c.getContext('2d');
    g.fillStyle = '#2d5a3a'; g.fillRect(0, 0, 1024, 512);
    g.strokeStyle = 'rgba(223,235,200,.22)'; g.lineWidth = 3;
    for (var y = 0; y < 512; y += 48) for (var x = (y / 48 % 2) * 24; x < 1024; x += 48) { g.beginPath(); g.arc(x, y, 24, 0, 6.283); g.stroke(); }          // 七宝つなぎ
    g.fillStyle = 'rgba(17,29,15,.55)'; g.fillRect(0, 196, 1024, 120);
    g.fillStyle = '#F2EEE0'; g.textAlign = 'center'; g.font = '800 70px "Barlow", sans-serif';
    for (var k = 0; k < 2; k++) g.fillText('COMING SOON', 256 + k * 512, 280);
    var t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t;
  }
  var prof = [[0, 2.9], [.5, 3.2], [1.6, 4.4], [2.8, 5.6], [3.9, 6.9], [4.9, 8.2], [6.1, 9.3], [6.9, 10.1], [6.5, 11.4], [5.6, 12.6], [4.9, 13.2], [3.6, 13.3]];
  var clothG = new T.LatheGeometry(prof.map(function (q) { return new T.Vector2(q[0], q[1]); }), 96);
  var cp = clothG.attributes.position;
  for (var vi = 0; vi < cp.count; vi++) {                                       // 風呂敷のたるみとひだ
    var vx = cp.getX(vi), vy = cp.getY(vi), vz = cp.getZ(vi), ang = Math.atan2(vz, vx), rr3 = Math.hypot(vx, vz);
    var wob = 1 + .045 * Math.sin(ang * 9 + vy * .8) + .025 * Math.sin(ang * 17 - vy * 1.6); cp.setXYZ(vi, vx * wob, vy, vz * wob);
  }
  clothG.computeVertexNormals();
  var clothMat = new T.MeshStandardMaterial({ map: clothTex(), roughness: .95, side: T.DoubleSide });
  clothMat.map.repeat.set(2, 1);
  var cloth = new T.Mesh(clothG, clothMat); covers.add(cloth);
  var knotM = M('#2d5a3a', { r: .9 });                                           // 結び目
  [[0, 2.7, .0], [.35, 2.45, .1], [-.35, 2.45, -.1]].forEach(function (k) { var kn = new T.Mesh(new T.SphereGeometry(.28, 10, 8), knotM); kn.position.set(k[0], k[1], k[2]); covers.add(kn); });
  function sudareTex() {
    var c = document.createElement('canvas'); c.width = 256; c.height = 256; var g = c.getContext('2d');
    g.fillStyle = '#7a6238'; g.fillRect(0, 0, 256, 256);
    for (var x = 0; x < 256; x += 8) { g.fillStyle = (x / 8) % 2 ? '#c9b27a' : '#b89a5c'; g.fillRect(x, 0, 6, 256); }
    g.fillStyle = '#3a2a18'; [24, 128, 232].forEach(function (y) { g.fillRect(0, y, 256, 6); });
    var t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t;
  }
  var sTex = sudareTex();
  rings.forEach(function (rg) {                                                  // 各環の縁に簾を垂らし、上の町家も隠す高さまで
    var len = 1.9, st = sTex.clone(); st.needsUpdate = true; st.repeat.set(Math.round(rg.r * 2 * Math.PI / .7), 1);
    var sd = new T.Mesh(new T.CylinderGeometry(rg.r + .14, rg.r + .14, len, 96, 1, true), new T.MeshStandardMaterial({ map: st, roughness: .9, side: T.DoubleSide }));
    sd.position.y = rg.y + .55 - len / 2; covers.add(sd);
    var cap = new T.Mesh(new T.TorusGeometry(rg.r + .14, .06, 6, 96), M('#3a2a18', { r: .8 })); cap.rotation.x = Math.PI / 2; cap.position.y = rg.y + .55; covers.add(cap);   // 簾の掛け棒
  });
  // 中身（町家・環の上面）は見せない：覆いの内側に隠れるよう、覆い以外の地下の部品を非表示
  castle.children.forEach(function (c) { if (c !== donjon && c !== covers && !c.isLight) c.visible = false; });
  // ただし環の円盤（足場）と縁の光は見せて、浮かぶ姿を残す
  castle.children.forEach(function (c) { if (c.isMesh && c.geometry && (c.geometry.type === 'CylinderGeometry' && c.material && c.material.metalness === .3)) c.visible = true; });
  plaza.visible = true;
  function setUnder(on) {
    underOn = on; document.body.classList.toggle('under', on); underBtn.classList.toggle('on', on);
    donjon.visible = !on;
    [].forEach.call(document.querySelectorAll('[data-go]'), function (b) { b.classList.remove('on'); });
    if (!on) go('all');
  }
  underBtn.addEventListener('click', function () { setUnder(!underOn); });
  document.getElementById('under-back').addEventListener('click', function () { setUnder(false); });

  function resize() { var w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 60 : 42; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  function damp(a, b, k, dt) { return a + (b - a) * (1 - Math.exp(-k * dt)); }
  var last = performance.now(), tmp = new T.Vector3(), acc = 0, nF = 0, lowered = false, tt = 0;
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; tt += dt; idle += dt;
    acc += dt; nF++; if (nF === 90) { if (acc / 90 > .028 && !lowered && dpr > 1.25) { lowered = true; renderer.setPixelRatio(1.2); resize(); } acc = 0; nF = 0; }
    if (idle > 5) goal.az += dt * .06;
    cam.az = damp(cam.az, goal.az, 5, dt); cam.pol = damp(cam.pol, goal.pol, 5, dt); cam.dist = damp(cam.dist, goal.dist, 4.4, dt); cam.ty = damp(cam.ty, goal.ty, 3.6, dt);
    var sp = Math.sin(cam.pol), cp = Math.cos(cam.pol);
    camera.position.set(cam.dist * sp * Math.sin(cam.az), cam.ty + cam.dist * cp, cam.dist * sp * Math.cos(cam.az)); camera.lookAt(0, cam.ty, 0);
    var fl = 1 + Math.sin(tt * 7.1) * .07 + Math.sin(tt * 12.9) * .05; fireL.intensity = 4.2 * fl; fireMesh.scale.set(1 + Math.sin(tt * 9) * .05, .8 + Math.sin(tt * 6) * .08, 1);
    castle.rotation.y = Math.sin(tt * .15) * .02;
    if (cutOn) { var cx = camera.position.x, cz = camera.position.z, cl = Math.hypot(cx, cz) || 1; cutPlane.normal.set(-cx / cl, 0, -cz / cl); cutPlane.constant = 0; }                                          // ごくゆっくり揺れる
    var pa2 = pts.geometry.attributes.position.array;
    for (var i = 0; i < N; i++) {
      var sj = pseas[i], vy = sj === 1 ? -7 : sj === 3 ? -.9 : sj === 0 ? -.55 : -.8;                               // 雨は速く、雪・花びら・落ち葉はゆっくり落ちる
      pa2[i * 3 + 1] += dt * vy; pa2[i * 3] += Math.sin(tt * (sj === 1 ? 0 : 1.2) + i) * dt * (sj === 1 ? 0 : .35);
      if (pa2[i * 3 + 1] < .1) pa2[i * 3 + 1] = 19;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    notes.forEach(function (n) { tmp.copy(n.p).project(camera); var vis = bp && tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1; n.el.style.opacity = vis ? 1 : 0; n.el.style.transform = 'translate(' + ((tmp.x * .5 + .5) * innerWidth).toFixed(1) + 'px,' + ((-tmp.y * .5 + .5) * innerHeight).toFixed(1) + 'px)'; });
    renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  go('all');
})();
