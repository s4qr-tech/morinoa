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
  var top = new T.PointLight('#fff1d2', 1.6, 18, 1.8); top.position.set(0, 17, 0); scene.add(top);

  /* ---- 中庭：円形の火床、青緑の水面、打ち放しの曲面壁 ---- */
  function disc(parent, rIn, rOut, y, h, mat, seg) { var g = new T.RingGeometry(rIn, rOut, seg || 64); g.rotateX(-Math.PI / 2); return mesh(g, mat, 0, y, 0, parent); }
  var slate = new T.Mesh(new T.CylinderGeometry(15, 15, .3, 80), M('#1b2230', { r: .6 })); slate.position.y = -.15; plaza.add(slate);
  var water = disc(plaza, 6.4, 12.2, .02, 0, M('#2b9d95', { e: '#168a82', ei: .32, r: .18, m: .1 }), 96);
  disc(plaza, 12.2, 12.6, .03, 0, M('#e9fff8', { e: '#bff5e8', ei: 1.0 }), 96);                 // 水際の白い光
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
    var rh = h * .36 + .05; dummy.position.set(x, y + h + rh / 2, z); dummy.scale.set(w * 1.34, rh, d * 1.34); dummy.updateMatrix(); pushGeo(H, roofBase, dummy.matrix, roof);
  }
  function finish(H, parent) {
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(H.pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(H.col, 3)); g.computeVertexNormals();
    var m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: .85, flatShading: true })); m.frustumCulled = false; parent.add(m);
  }
  var WALL_D = ['#2a2522', '#352d27', '#3f352c', '#241f1c', '#4a3d33'], WALL_L = ['#e8e2d2', '#ddd5c2', '#cfc6b2'], ROOF_D = ['#2b2e34', '#35383e', '#232529'], ROOF_G = ['#2f5f55', '#3a6b5f'];
  function pick(a) { return new T.Color(a[Math.floor(rnd() * a.length)]); }

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
    { y: 9.1, r: 6.3, rows: 2 }, { y: 11.2, r: 5.0, rows: 2 }, { y: 13.0, r: 3.7, rows: 1 }
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
    // 環の上の木（紅葉）
    for (var m2 = 0; m2 < 7; m2++) {
      var ma = rnd() * 6.283, mr = rg.r * R(.15, .5), tr = new T.Group(); tr.position.set(Math.cos(ma) * mr, rg.y, Math.sin(ma) * mr); castle.add(tr);
      box(tr, .08, .45, .08, 0, 0, 0, M('#3a2a1c')); mesh(new T.SphereGeometry(R(.22, .34), 8, 6), M(rnd() > .5 ? '#e0662a' : '#c7311a', { e: '#7a2810', ei: .5 }), 0, .62, 0, tr);
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
  tower(donjon, 0, 0, 1.7, 5, 1.0, 0.0);                                  // 大天守
  tower(donjon, -2.6, .6, 1.0, 3, 1.0, .3); tower(donjon, 2.5, .9, .95, 3, 1.0, -.3); tower(donjon, .4, 2.3, .8, 2, 1.0, 0);   // 小天守
  // 渡櫓（天守をつなぐ）と白壁
  box(donjon, 2.6, .55, .5, -1.3, 1.1, .45, plaster); box(donjon, 2.4, .55, .5, 1.3, 1.1, .6, plaster);
  var wallRing = mesh(new T.CylinderGeometry(3.45, 3.55, .6, 48, 1, true), new T.MeshStandardMaterial({ color: '#efe9da', roughness: .9, side: T.DoubleSide }), 0, .3, 0, donjon);
  var tr = new T.Mesh(new T.TorusGeometry(3.5, .06, 6, 64), kawara); tr.rotation.x = Math.PI / 2; tr.position.y = .62; donjon.add(tr);
  disc(castle, 0, 3.7, 13.01, 0, M('#6a6558'), 48);

  /* ---- 光の粒（舞う灯りの粉） ---- */
  var N = 360, pg = new T.BufferGeometry(), pp = new Float32Array(N * 3), pc = new Float32Array(N * 3);
  for (var pi = 0; pi < N; pi++) { var pa = rnd() * 6.283, pr = R(3, 12); pp[pi * 3] = Math.cos(pa) * pr; pp[pi * 3 + 1] = R(1, 18); pp[pi * 3 + 2] = Math.sin(pa) * pr; var cc = new T.Color(['#ffcf80', '#7fe9ff', '#ff8a5a', '#ffe9b0'][pi % 4]); pc[pi * 3] = cc.r; pc[pi * 3 + 1] = cc.g; pc[pi * 3 + 2] = cc.b; }
  pg.setAttribute('position', new T.BufferAttribute(pp, 3)); pg.setAttribute('color', new T.BufferAttribute(pc, 3));
  var pts = new T.Points(pg, new T.PointsMaterial({ size: .09, vertexColors: true, transparent: true, opacity: .85, depthWrite: false })); scene.add(pts);

  /* ---- 設計図モード ---- */
  var line = new T.MeshBasicMaterial({ color: '#8ec8ff', wireframe: true, transparent: true, opacity: .55 });
  var orig = [], bp = false, bpBtn = document.getElementById('bp');
  function setBP(on) {
    bp = on; document.body.classList.toggle('bp', on); bpBtn.classList.toggle('on', on);
    scene.traverse(function (o) { if (!(o.isMesh)) return; if (on) { if (!o.userData.m) o.userData.m = o.material; o.material = line; } else if (o.userData.m) o.material = o.userData.m; });
    scene.background = on ? BLUE : NIGHT; scene.fog.color = on ? BLUE : NIGHT; pts.visible = !on;
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
  var cam = { az: .9, pol: 1.28, dist: 34, tx: 0, ty: 9, tz: 0 }, goal = { az: .9, pol: 1.28, dist: 30, tx: 0, ty: 9, tz: 0 };
  var presets = { all: { dist: 30, pol: 1.28, ty: 9 }, donjon: { dist: 9.5, pol: 1.3, ty: 15.5 }, rings: { dist: 15, pol: 1.4, ty: 10.6 }, base: { dist: 12, pol: 1.45, ty: 3.2 }, court: { dist: 20, pol: 1.0, ty: 2 } };
  function go(k) { var p = presets[k]; goal.dist = p.dist; goal.pol = p.pol; goal.ty = p.ty; idle = 0; [].forEach.call(document.querySelectorAll('[data-go]'), function (b) { b.classList.toggle('on', b.dataset.go === k); }); }
  [].forEach.call(document.querySelectorAll('[data-go]'), function (b) { b.addEventListener('click', function () { go(b.dataset.go); }); });
  var idle = 0, drag = null;
  canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); idle = 0; });
  canvas.addEventListener('pointermove', function (e) { if (!drag) return; goal.az -= (e.clientX - drag.x) * .0055; goal.pol = Math.max(.35, Math.min(1.62, goal.pol - (e.clientY - drag.y) * .0045)); drag.x = e.clientX; drag.y = e.clientY; idle = 0; });
  canvas.addEventListener('pointerup', function () { drag = null; }); canvas.addEventListener('pointercancel', function () { drag = null; });
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); goal.dist = Math.max(4, Math.min(48, goal.dist * Math.exp(e.deltaY * .0011))); idle = 0; }, { passive: false });
  var pinch = null;
  canvas.addEventListener('touchmove', function (e) { if (e.touches.length !== 2) { pinch = null; return; } e.preventDefault(); var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pinch) goal.dist = Math.max(4, Math.min(48, goal.dist * pinch / d)); pinch = d; }, { passive: false });
  canvas.addEventListener('touchend', function () { pinch = null; });

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
    castle.rotation.y = Math.sin(tt * .15) * .02;                                          // ごくゆっくり揺れる
    var pa2 = pts.geometry.attributes.position.array; for (var i = 0; i < N; i++) { pa2[i * 3 + 1] += dt * (.12 + (i % 5) * .03); if (pa2[i * 3 + 1] > 19) pa2[i * 3 + 1] = 1; } pts.geometry.attributes.position.needsUpdate = true;
    notes.forEach(function (n) { tmp.copy(n.p).project(camera); var vis = bp && tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1; n.el.style.opacity = vis ? 1 : 0; n.el.style.transform = 'translate(' + ((tmp.x * .5 + .5) * innerWidth).toFixed(1) + 'px,' + ((-tmp.y * .5 + .5) * innerHeight).toFixed(1) + 'px)'; });
    renderer.render(scene, camera); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  go('all');
})();
