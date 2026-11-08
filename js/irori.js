/* 囲炉裏の城下町（試作）
   茶室のなかに囲炉裏があり、その中に城下町がある。ボクセル調のミニチュアを、
   なめらかなカメラ（慣性・イージング）で見て回る。形はすべてここで組むオリジナル。 */
(function () {
  'use strict';
  var T = THREE;
  if (!T) return;

  var canvas = document.getElementById('gl');
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  var dpr = Math.min(1.5, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  var scene = new T.Scene();
  scene.background = new T.Color('#120b07');
  scene.fog = new T.Fog('#120b07', 7, 17);
  var camera = new T.PerspectiveCamera(40, 1, .05, 60);

  var rs = 7, rnd = function () { rs = (rs * 9301 + 49297) % 233280; return rs / 233280; };

  /* ---------- 材質 ---------- */
  var mats = {};
  function M(col, o) {
    o = o || {};
    var k = col + '|' + (o.e || '') + '|' + (o.r == null ? '' : o.r) + '|' + (o.m || '');
    if (!mats[k]) {
      mats[k] = new T.MeshStandardMaterial({ color: col, roughness: o.r == null ? .85 : o.r, metalness: o.m || 0,
        emissive: o.e ? new T.Color(o.e) : new T.Color(0), emissiveIntensity: o.ei || 1 });
    }
    return mats[k];
  }
  function B(parent, w, h, d, x, y, z, mat, cast, recv) {
    var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);                      // y は底面の高さ
    m.castShadow = cast !== false; m.receiveShadow = recv !== false;
    parent.add(m); return m;
  }

  /* ---------- 琉球畳の絵 ---------- */
  function tatamiTex() {
    var c = document.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d');
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      var x = i * 256, y = j * 256, horiz = (i + j) % 2 === 0;
      g.fillStyle = horiz ? '#BFC18A' : '#B6B880'; g.fillRect(x, y, 256, 256);
      g.strokeStyle = horiz ? '#A6A872' : '#9FA26B'; g.lineWidth = 1.2;
      for (var k = 0; k < 256; k += 4) { g.beginPath(); if (horiz) { g.moveTo(x, y + k); g.lineTo(x + 256, y + k); } else { g.moveTo(x + k, y); g.lineTo(x + k, y + 256); } g.stroke(); }
      g.strokeStyle = 'rgba(70,74,44,.65)'; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, 253, 253);
    }
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t;
  }
  var tatami = tatamiTex();
  function tatamiMat(w, d, minX, minZ) {
    var t = tatami.clone(); t.needsUpdate = true; t.repeat.set(w / 2, d / 2); t.offset.set(minX / 2, minZ / 2);
    return new T.MeshStandardMaterial({ map: t, roughness: .95, color: new T.Color('#d7c89a') });
  }
  function shojiTex() {
    var c = document.createElement('canvas'); c.width = 256; c.height = 512; var g = c.getContext('2d');
    g.fillStyle = '#f6e9c9'; g.fillRect(0, 0, 256, 512);
    var gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,214,150,.0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
    g.strokeStyle = '#5a3f26'; g.lineWidth = 5; g.strokeRect(2, 2, 252, 508);
    g.lineWidth = 3; for (var i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke(); }
    for (var j = 1; j < 8; j++) { g.beginPath(); g.moveTo(0, j * 64); g.lineTo(256, j * 64); g.stroke(); }
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t;
  }
  var shoji = shojiTex();

  /* ---------- 光 ---------- */
  scene.add(new T.AmbientLight('#4a2f1c', .05));
  scene.add(new T.HemisphereLight('#ffbf80', '#150b05', .06));
  var key = new T.DirectionalLight('#ffc98a', .05);
  key.position.set(-3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  var sc = key.shadow.camera; sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 1; sc.far = 14; key.shadow.bias = -.0006;
  scene.add(key); scene.add(key.target);
  var fire = new T.PointLight('#ff7a2a', 2.6, 6, 2);
  fire.position.set(0, .12, 0); fire.castShadow = false; scene.add(fire);

  /* ---------- 茶室 ---------- */
  var room = new T.Group(); scene.add(room);
  var wood = M('#5a3a22', { r: .7 }), woodDark = M('#2f1d10', { r: .6 }), woodLight = M('#8a6038', { r: .65 });
  var RW = 5.4;                                              // 部屋の半幅
  // 床（囲炉裏の穴をあけて、四枚の畳）
  function slab(x0, x1, z0, z1) {
    var w = x1 - x0, d = z1 - z0;
    var m = new T.Mesh(new T.BoxGeometry(w, .1, d), [M('#6b4a2a'), M('#6b4a2a'), tatamiMat(w, d, x0, z0), M('#3a2514'), M('#6b4a2a'), M('#6b4a2a')]);
    m.position.set((x0 + x1) / 2, -.05, (z0 + z1) / 2); m.receiveShadow = true; room.add(m);
  }
  slab(-RW, -1, -RW, RW); slab(1, RW, -RW, RW); slab(-1, 1, -RW, -1); slab(-1, 1, 1, RW);
  // 囲炉裏：四角い木の框と穴
  var HR = .84;                                          // 穴の半径
  (function () {
    var fw = M('#8a6038', { r: .65 }), fd = M('#4a2f1a', { r: .7 }), L = HR * 2 + .06;
    // 框（太い木の縁。四辺をしっかり囲む）＋ 角の留め
    B(room, 2.5, .12, .36, 0, 0, -(HR + .18), fw); B(room, 2.5, .12, .36, 0, 0, HR + .18, fw);
    B(room, .36, .12, L, -(HR + .18), 0, 0, fw); B(room, .36, .12, L, HR + .18, 0, 0, fw);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { B(room, .42, .15, .42, c[0] * (HR + .18), 0, c[1] * (HR + .18), fd); });
    // 穴の内側は木の板で囲う
    B(room, L, .34, .06, 0, -.3, -HR, fd); B(room, L, .34, .06, 0, -.3, HR, fd);
    B(room, .06, .34, L, -HR, -.3, 0, fd); B(room, .06, .34, L, HR, -.3, 0, fd);
    var ashM = M('#6a655c', { r: 1 });
    var ash = new T.Mesh(new T.BoxGeometry(HR * 2 - .02, .06, HR * 2 - .02), ashM); ash.position.y = -.26; ash.receiveShadow = true; room.add(ash);
    // 焦げ（灰の上の黒ずみ）
    var scorchM = new T.MeshBasicMaterial({ color: '#2a2420', transparent: true, opacity: .55, depthWrite: false });
    for (var s = 0; s < 6; s++) { var sr = .16 + rnd() * .2, sc2 = new T.Mesh(new T.CircleGeometry(sr, 18), scorchM); sc2.rotation.x = -Math.PI / 2; var sa = rnd() * 6.283, sd = rnd() * .45; sc2.position.set(Math.cos(sa) * sd, -.228, Math.sin(sa) * sd); sc2.scale.set(1, 1, .7 + rnd() * .5); room.add(sc2); }
  })();
  // 火のついた炭（少しだけ）
  var glow = M('#ff6a1a', { e: '#ff5a10', ei: 1.5, r: .6 }); var glowM = [];
  var coalM = M('#1b1511', { r: .9 });
  for (var i = 0; i < 9; i++) {
    var ca = rnd() * 6.283, cd = .08 + rnd() * .42, cx0 = Math.cos(ca) * cd, cz0 = Math.sin(ca) * cd, cw = .1 + rnd() * .08;
    var coal = B(room, cw, .06, cw * .7, cx0, -.22, cz0, coalM, false, false); coal.rotation.y = rnd() * 3;
    var ember = B(room, cw * .8, .012, cw * .5, cx0, -.188, cz0, glow, false, false); ember.rotation.y = coal.rotation.y; glowM.push(ember);
  }
  for (var i2 = 0; i2 < 8; i2++) {                          // 灰の隙間の小さな熾火
    var ea = rnd() * 6.283, ed = rnd() * .7; var em = B(room, .05, .01, .035, Math.cos(ea) * ed, -.228, Math.sin(ea) * ed, glow, false, false); glowM.push(em);
  }
  var hearthLight = new T.PointLight('#ff7a2a', .45, 2.0, 1.8); hearthLight.position.set(0, -.12, 0); room.add(hearthLight);

  // 壁（内向き）と障子
  var wallM = M('#3a2818', { r: .9 });
  function wall(w, h, x, y, z, ry) { var m = new T.Mesh(new T.PlaneGeometry(w, h), wallM); m.position.set(x, y + h / 2, z); m.rotation.y = ry; m.receiveShadow = true; room.add(m); return m; }
  var H = 4.8;
  wall(RW * 2, H, 0, 0, -RW, 0);                          // 奥
  wall(RW * 2, H, -RW, 0, 0, Math.PI / 2);                // 左
  wall(RW * 2, H, RW, 0, 0, -Math.PI / 2);                // 右
  var shojiMat = new T.MeshStandardMaterial({ map: shoji, emissive: new T.Color('#ffb868'), emissiveMap: shoji, emissiveIntensity: 1.25, roughness: 1 });
  function shojiPanel(x, z, ry) {
    var g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; room.add(g);
    var p = new T.Mesh(new T.PlaneGeometry(1.05, 2.1), shojiMat); p.position.set(0, 1.25, .02); g.add(p);
    B(g, 1.12, .12, .1, 0, 2.3, .02, woodDark, false, false); B(g, 1.12, .12, .1, 0, .15, .02, woodDark, false, false);
  }
  for (var s = -3; s <= 3; s++) { shojiPanel(-RW + .02, s * 1.2 - .2, Math.PI / 2); shojiPanel(RW - .02, s * 1.2 - .2, -Math.PI / 2); }
  // 柱と長押
  [[-RW, -RW], [RW, -RW], [-RW, RW], [RW, RW], [-RW, 0], [RW, 0], [0, -RW]].forEach(function (p) { B(room, .22, H, .22, p[0], 0, p[1], woodDark); });
  B(room, RW * 2, .16, .12, 0, 2.45, -RW + .06, woodDark, false, false);
  B(room, .12, .16, RW * 2, -RW + .06, 2.45, 0, woodDark, false, false); B(room, .12, .16, RW * 2, RW - .06, 2.45, 0, woodDark, false, false);
  // 天井（下からだけ見える）と梁
  var ceil = new T.Mesh(new T.PlaneGeometry(RW * 2, RW * 2), M('#4a2f1a', { r: .8 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; room.add(ceil);
  var ceilParts = [ceil];
  for (var bz = -4; bz <= 4; bz += 2) ceilParts.push(B(room, RW * 2, .3, .24, 0, H - .3, bz, woodDark, false, false));
  ceilParts.push(B(room, .3, .34, RW * 2, 0, H - .34, 0, woodDark, false, false));

  // 床の間（奥）：一段高く、掛軸と花
  B(room, 3.2, .22, 1.3, 0, 0, -RW + .75, woodLight);
  B(room, 3.0, .04, 1.1, 0, .22, -RW + .75, M('#a64b2a', { r: .8 }), false, true);
  function scrollTex() {
    var c = document.createElement('canvas'); c.width = 256; c.height = 768; var g = c.getContext('2d');
    g.fillStyle = '#e9dfc2'; g.fillRect(0, 0, 256, 768); g.fillStyle = '#254723'; g.fillRect(0, 0, 256, 40); g.fillRect(0, 728, 256, 40);
    g.fillStyle = '#111D0F'; g.font = '800 92px "Shippori Mincho", serif'; g.textAlign = 'center';
    ['再', '生', '維', '持', '持', '続'].forEach(function (ch, i) { g.fillText(ch, 128, 150 + i * 100 - (i > 1 ? 0 : 0)); });
    g.fillStyle = '#8C4229'; g.fillRect(190, 660, 38, 38); var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }
  var scrollMesh = new T.Mesh(new T.PlaneGeometry(.9, 2.2), new T.MeshStandardMaterial({ map: scrollTex(), roughness: 1 }));
  scrollMesh.position.set(0, 1.5, -RW + .1); room.add(scrollMesh);
  var vase = new T.Mesh(new T.CylinderGeometry(.12, .18, .5, 14), M('#254723', { r: .4 })); vase.position.set(1.1, .52, -RW + .8); vase.castShadow = true; room.add(vase);
  [[0, .5, '#8AB657'], [.1, .62, '#8C4229'], [-.08, .56, '#E9C46A']].forEach(function (f) { B(room, .04, .5, .04, 1.1 + f[0], .76, -RW + .8, M(f[2]), false, false); var b = new T.Mesh(new T.SphereGeometry(.08, 10, 8), M(f[2])); b.position.set(1.1 + f[0], 1.34 + f[1] * .1, -RW + .8); room.add(b); });

  // 金屏風（四曲）：金箔の地に、墨の松
  function byobuTex() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 512; var g = c.getContext('2d');
    var gr = g.createLinearGradient(0, 0, 512, 512); gr.addColorStop(0, '#d9b24a'); gr.addColorStop(.5, '#f0d27a'); gr.addColorStop(1, '#c79a35'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 260; i++) { g.fillStyle = 'rgba(255,240,170,' + (.1 + Math.random() * .25) + ')'; g.fillRect(Math.random() * 512, Math.random() * 512, 6 + Math.random() * 26, 3 + Math.random() * 12); }
    g.strokeStyle = '#1a140c'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(90, 512); g.bezierCurveTo(110, 380, 60, 300, 130, 200); g.stroke();
    g.fillStyle = '#23331c'; [[80, 210, 90], [150, 170, 70], [60, 140, 60], [170, 250, 55]].forEach(function (a) { g.beginPath(); g.ellipse(a[0], a[1], a[2], a[2] * .32, -.15, 0, 6.283); g.fill(); });
    g.fillStyle = 'rgba(140,66,41,.9)'; g.beginPath(); g.arc(390, 120, 36, 0, 6.283); g.fill();
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }
  var byobuM = new T.MeshStandardMaterial({ map: byobuTex(), metalness: .55, roughness: .38 });
  for (var bi = 0; bi < 4; bi++) {
    var bp = new T.Group(); bp.position.set(2.5 + bi * .78, 0, -RW + 1.3 - (bi % 2) * .18); bp.rotation.y = (bi % 2 ? -.35 : .35); room.add(bp);
    var pm = new T.Mesh(new T.BoxGeometry(.78, 1.6, .04), [woodDark, woodDark, woodDark, woodDark, byobuM, byobuM]); pm.position.y = .8; pm.castShadow = true; bp.add(pm);
  }
  // 席（囲炉裏のまわりに6つ）：人は座らせず、役ごとのモチーフだけを置く（将軍＝兜、大老＝軍配、老中＝印籠、奥絵師＝筆と扇子）。残り二席は空席
  function plateTex(txt, sub) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 128; var g = c.getContext('2d');
    g.fillStyle = '#e8d3a0'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#3a2514'; g.lineWidth = 6; g.strokeRect(4, 4, 248, 120);
    g.fillStyle = '#111D0F'; g.textAlign = 'center'; g.font = '800 54px "Shippori Mincho", serif'; g.fillText(txt, 128, sub ? 66 : 82);
    if (sub) { g.fillStyle = '#8C4229'; g.font = '800 30px "Shippori Mincho", serif'; g.fillText(sub, 128, 108); }
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  // 将軍の兜（席に置く）
  function kabuto(g) {
    var iron = M('#2a2c33', { m: .6, r: .4 }), gold = M('#e0b341', { m: .6, r: .35 });
    var dome = new T.Mesh(new T.SphereGeometry(.2, 18, 12, 0, 6.283, 0, 1.5), iron); dome.position.set(0, .06, 0); dome.castShadow = true; g.add(dome);
    var neck = new T.Mesh(new T.CylinderGeometry(.24, .3, .1, 20, 1, true, 0, 6.283), M('#8C4229', { r: .7 })); neck.position.y = .06; g.add(neck);
    var brim = new T.Mesh(new T.TorusGeometry(.215, .018, 6, 24), gold); brim.rotation.x = Math.PI / 2; brim.position.y = .1; g.add(brim);
    var crest = new T.Mesh(new T.TorusGeometry(.19, .016, 6, 18, Math.PI), gold); crest.position.set(0, .24, .12); crest.rotation.set(0, 0, 0); g.add(crest);
    [-1, 1].forEach(function (sd) { var h = B(g, .018, .24, .018, sd * .06, .2, .13, gold); h.rotation.z = sd * -.5; });
  }
  // 席は等間隔に並べず、ばらけた位置・距離・向きに散らす（人物ごとに a=角度, R=囲炉裏からの距離, j=向きのずれ）
  // 大老：軍配（黒漆の団扇に金の縁と朱の日輪）
  function gunbai(g) {
    var lacq = M('#1b1d22', { r: .35, m: .2 }), gold = M('#d6a94a', { r: .4, m: .5 }), shu = M('#C23219', { r: .6 }), wood = M('#8a6038', { r: .75 });
    var grp = new T.Group(); grp.position.set(0, .03, 0); grp.rotation.y = .5; g.add(grp);
    var pad = new T.Mesh(new T.CylinderGeometry(.19, .19, .03, 32), lacq); pad.scale.set(1, 1, 1.22); pad.position.set(0, .015, -.08); pad.castShadow = true; grp.add(pad);
    var rim = new T.Mesh(new T.TorusGeometry(.19, .012, 6, 40), gold); rim.rotation.x = Math.PI / 2; rim.scale.set(1, 1.22, 1); rim.position.set(0, .03, -.08); grp.add(rim);
    var sun = new T.Mesh(new T.CylinderGeometry(.07, .07, .006, 24), shu); sun.position.set(0, .034, -.1); grp.add(sun);
    B(grp, .035, .035, .22, 0, 0, .2, wood); B(grp, .05, .03, .03, 0, 0, .3, gold, false, false);
  }
  // 老中：印籠（朱塗りの三段重ねと、紐・根付）
  function inro(g) {
    var red = M('#9e2a16', { r: .35, m: .15 }), gold = M('#d6a94a', { r: .4, m: .5 }), cord = M('#254723', { r: .8 });
    var grp = new T.Group(); grp.position.set(0, .03, 0); grp.rotation.y = -.4; g.add(grp);
    for (var i = 0; i < 3; i++) { B(grp, .13, .05, .06, 0, i * .056, 0, red); B(grp, .136, .008, .066, 0, i * .056 + .02, 0, gold, false, false); }
    var loop = new T.Mesh(new T.TorusGeometry(.12, .008, 6, 28, Math.PI * 1.5), cord); loop.rotation.x = Math.PI / 2; loop.position.set(.16, .01, .02); grp.add(loop);
    var net = new T.Mesh(new T.SphereGeometry(.035, 12, 10), M('#e9dfc6', { r: .6 })); net.position.set(.26, .035, .02); grp.add(net);
  }
  // 奥絵師：筆と扇子（筆置きに筆、開いた扇）
  function fude(g) {
    var wood = M('#8a6038', { r: .7 }), tip = M('#17120f', { r: .8 }), paper = M('#efe6cf', { r: .9 }), rib = M('#5a3a22', { r: .8 }), shu = M('#C23219', { r: .6 });
    var grp = new T.Group(); grp.position.set(0, .03, 0); g.add(grp);
    B(grp, .22, .03, .05, -.12, 0, .12, M('#3a2514', { r: .8 }));                                    // 筆置き
    var br = new T.Group(); br.position.set(-.12, .06, .12); br.rotation.y = .25; grp.add(br);
    var shaft = new T.Mesh(new T.CylinderGeometry(.012, .016, .34, 10), wood); shaft.rotation.z = Math.PI / 2; br.add(shaft);
    var head = new T.Mesh(new T.ConeGeometry(.024, .09, 10), tip); head.rotation.z = Math.PI / 2; head.position.x = .21; br.add(head);
    for (var k = 0; k < 7; k++) {                                                                   // 扇：骨と紙
      var a = (k - 3) * .21; var r = B(grp, .26, .004, .02, .15 + Math.cos(a) * .0, 0, -.1, rib, false, false); r.position.set(.12 + Math.sin(a) * .13, .005, -.1 - Math.cos(a) * .13 + .02); r.rotation.y = -a + Math.PI / 2 + 0; r.scale.set(1, 1, 1);
    }
    var fan = new T.Mesh(new T.CircleGeometry(.27, 24, Math.PI * .22, Math.PI * .56), new T.MeshStandardMaterial({ color: '#efe6cf', roughness: 1, side: T.DoubleSide })); fan.rotation.x = -Math.PI / 2; fan.position.set(.12, .006, .02); grp.add(fan);
    var seal = new T.Mesh(new T.CircleGeometry(.03, 16), new T.MeshBasicMaterial({ color: '#C23219', side: T.DoubleSide })); seal.rotation.x = -Math.PI / 2; seal.position.set(.12, .008, -.14); grp.add(seal);
  }
  var SEATS = [
    { a: 3.55, R: 2.55, j: .22, who: null, label: '将軍', sub: '外出中', cush: '#8C4229' },
    { a: 1.15, R: 1.85, j: -.3, who: 'tairo', label: '大老', cush: '#254723' },
    { a: 5.35, R: 2.35, j: .28, who: ['#4E9495', '#f2eee0', false], label: '老中', cush: '#4E9495' },
    { a: 2.4, R: 2.95, j: -.18, who: ['#8C4229', '#E9C46A', true], label: '奥絵師', cush: '#5BA0C1' },
    { a: 4.45, R: 2.75, j: .35, who: undefined, label: '空席', cush: '#8AB657' },
    { a: .05, R: 2.2, j: -.4, who: undefined, label: '空席', cush: '#8AB657' }
  ];
  SEATS.forEach(function (st) {
    var a = st.a, R = st.R, g = new T.Group(); g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); g.rotation.y = a + Math.PI + st.j; room.add(g);
    B(g, .85, .1, .85, 0, 0, 0, M(st.cush, { r: .9 })); B(g, .56, .02, .56, 0, .1, 0, M('#f2eee0', { r: .9 }), false, false);
    var seat = new T.Group(); seat.position.y = .1; g.add(seat);
    if (st.label === '大老') gunbai(seat); else if (st.label === '老中') inro(seat); else if (st.label === '奥絵師') fude(seat);
    if (st.who === null) {                                   // 将軍は不在：脱いだ羽織と、外出中の札
      B(seat, .5, .05, .36, 0, 0, -.06, M('#C23219', { r: .85 })); var kb = new T.Group(); kb.position.set(0, .05, .05); seat.add(kb); kabuto(kb);
    }
    g.scale.setScalar(.8);
    if (st.label === '空席') return;
    var pl = new T.Mesh(new T.PlaneGeometry(.5, .25), new T.MeshStandardMaterial({ map: plateTex(st.label, st.sub), roughness: .8 }));
    pl.position.set(0, .3, .62); pl.rotation.x = -.25; g.add(pl); B(g, .5, .02, .08, 0, 0, .66, woodDark, false, false);
    B(g, .04, .18, .04, -.2, 0, .64, woodDark, false, false); B(g, .04, .18, .04, .2, 0, .64, woodDark, false, false);
  });

  // 行灯・吊り灯
  var lanterns = [];
  [[-2.6, -2.6], [2.6, -2.4], [-2.4, 2.6], [2.5, 2.5]].forEach(function (p) {
    var g = new T.Group(); g.position.set(p[0], 2.35, p[1]); room.add(g);
    B(g, .02, H - 2.35 - .6, .02, 0, .6, 0, woodDark, false, false);
    var l = new T.Mesh(new T.CylinderGeometry(.2, .2, .5, 16), new T.MeshStandardMaterial({ color: '#f3d9a2', emissive: new T.Color('#ff9b3a'), emissiveIntensity: .9, roughness: 1 }));
    l.position.y = .3; g.add(l); lanterns.push(l);
    B(g, .46, .04, .46, 0, .52, 0, woodDark, false, false); B(g, .46, .04, .46, 0, .06, 0, woodDark, false, false);
  });

  var folks = [], town = { visible: false };
  /* ---- 現在の城（castle.js）を、鉄瓶に代わって囲炉裏の上に吊るす。城下町は城の中にあるので、灰の上の町は外す ---- */
  window.__CASTLE_EMBED = { scene: scene, renderer: renderer, camera: camera };
  (function () {
    var cs = document.createElement('script'); cs.src = 'js/castle.js?v=38';
    cs.onload = function () {
      var root = window.__CASTLE_ROOT; if (!root) return; var k = .06;
      root.traverse(function (o) { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.radiusTop === 15 && o.parent) o.parent.visible = false; });   // 庭（円い地面）は外す
      // 城のすべて（天守閣・城下町・御簾の囲い・庭）を縮小して、囲炉裏の枠の中に収め、鎖で吊るす
      root.scale.setScalar(k); root.position.set(0, .1, 0); scene.add(root);
      root.traverse(function (o) { if (o.isPointLight) { o.distance *= k; o.intensity *= .06; } });
      town.visible = false; if (typeof kagi !== 'undefined') kagi.visible = false; if (typeof steam !== 'undefined') steam.length = 0;                                  // 灰の上の町、鉄瓶、湯気を外す
      // 吊るす鎖：城の天守の頂から、天井の梁まで
      var topY = root.position.y + 22.9 * k, chain = new T.Group(); room.add(chain);
      var ironM = M('#1b1b1e', { m: .6, r: .4 });
      B(chain, .026, H - topY - .1, .026, 0, topY, 0, ironM, false, false);
      for (var ci = 0; ci < 9; ci++) { var lk = new T.Mesh(new T.TorusGeometry(.03, .008, 6, 12), ironM); lk.position.set(0, topY + .12 + ci * ((H - topY - .4) / 9), 0); lk.rotation.y = ci % 2 ? 0 : Math.PI / 2; chain.add(lk); }
      var hk = new T.Mesh(new T.TorusGeometry(.07, .014, 8, 18, Math.PI * 1.4), ironM); hk.position.set(0, topY + .02, 0); chain.add(hk);              // 自在鉤の環
      var ceilBar = B(chain, .5, .05, .05, 0, H - .06, 0, ironM, false, false);
      var gl = new T.PointLight('#ffb25a', 1.2, 3.5, 1.6); gl.position.set(0, .8, .5); room.add(gl);                       // 城をほんのり照らす灯り
    };
    document.head.appendChild(cs);
  })();
  /* ---------- 見どころ（カード＋印） ---------- */
  var spots = [
    { id: 'castle', jp: '経営・事業開発', en: 'Management', txt: '経営戦略から事業再生・新規事業まで、再生と成長を支援します。', href: 'service-support.html', pos: new T.Vector3(0, 1.2, 0) },
    { id: 'studio', jp: 'IP・デザイン', en: 'IP & Design', txt: 'IPの企画・ブランド設計・デザインで、事業の物語を形にします。', href: 'service-ip.html', pos: new T.Vector3(0, .85, 0) },
    { id: 'hall', jp: 'MORINOA 一座', en: 'Organization', txt: '戦略を描く者と、現場で実行する者。二つの座が一体となって動きます。', href: 'index.html#org', pos: new T.Vector3(0, .55, 0) },
    { id: 'gate', jp: '事例・実績', en: 'Works', txt: '再生・IP・デザインの取り組みを、ここに並べていきます。', href: '', pos: new T.Vector3(0, .25, 0) }
  ];
  var wrapMarks = document.getElementById('marks'), cardsEl = document.getElementById('cards');
  spots.forEach(function (s, i) {
    var b = document.createElement('button'); b.className = 'mark'; b.setAttribute('aria-label', s.jp); b.innerHTML = '<i></i><span>' + s.jp + '</span>';
    b.addEventListener('click', function () { focus(i); }); wrapMarks.appendChild(b); s.el = b;
    var c = document.createElement('div'); c.className = 'card'; c.innerHTML = '<h3>' + s.jp + '</h3><p class="en">' + s.en + '</p><p>' + s.txt + '</p>' + (s.href ? '<a class="more" href="' + s.href + '">More <b>›</b></a>' : '<span class="soon">COMING SOON</span>') + '';
    c.addEventListener('click', function (e) { if (e.target.closest('a')) return; focus(i); }); cardsEl.appendChild(c); s.card = c;
  });

  /* ---------- カメラ：慣性つきの周回、イージングつきの移動 ---------- */
  var ENTER = /[?&]enter=1/.test(location.search);                                                    // 天守の扉をくぐって入ってきた：部屋の入口の低い目線から、囲炉裏のまわりへ
  var S0 = ENTER ? { az: 3.14, pol: 1.42, dist: 6.2 } : { az: .6, pol: .22, dist: 7 };
  var cam = { az: S0.az, pol: S0.pol, dist: S0.dist, tx: 0, ty: .6, tz: 0 };           // 現在値
  var goal = { az: .6, pol: .78, dist: 5.0, tx: 0, ty: .6, tz: 0 };         // 目標値
  var idle = 0, active = -1, introT = 0, introDone = false;
  var CLAMP = { pmin: .25, pmax: 1.38, dmin: .8, dmax: 6.2 };
  function focus(i) {
    active = i; idle = 0; var p = spots[i].pos;
    goal.tx = p.x; goal.ty = p.y; goal.tz = p.z; goal.dist = 1.8; goal.pol = 1.15;
    spots.forEach(function (s, k) { s.card.classList.toggle('on', k === i); s.el.classList.toggle('on', k === i); });
    spots[i].card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  function overview() { active = -1; goal.tx = 0; goal.ty = .6; goal.tz = 0; goal.dist = 4.4; goal.pol = .78; spots.forEach(function (s) { s.card.classList.remove('on'); s.el.classList.remove('on'); }); }
  document.getElementById('reset').addEventListener('click', overview);


  /* ---- 覗く：天守閣へ寄って扉の高さから中を見る／離れる ---- */
  var peeking = false, peekBtn = document.getElementById('peek'), peekTimers = [];
  function clearPeek() { peekTimers.forEach(clearTimeout); peekTimers = []; }
  peekBtn.addEventListener('click', function () {
    peeking = !peeking; peekBtn.textContent = peeking ? '離れる' : '覗く'; idle = 0; clearPeek(); var door = window.__CASTLE_DOOR || function () {};
    if (peeking) {                                                                  // 扉の前へ → 扉が開く → 御簾をくぐって、天守閣の中の囲炉裏の間をのぞく
      goal.az = 0; goal.pol = 1.5; goal.ty = .62; goal.tx = 0; goal.tz = 0; goal.dist = 1.7;
      peekTimers.push(setTimeout(function () { door(1); }, 900));
      peekTimers.push(setTimeout(function () { goal.dist = .3; }, 1900));
    } else {                                                                        // 引いて、扉を閉じ、全体へ
      goal.dist = 1.7; peekTimers.push(setTimeout(function () { door(0); goal.dist = 5.0; goal.pol = .78; goal.ty = .55; }, 900));
    }
  });
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); idle = 0; canvas.classList.add('grab'); });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    goal.az -= dx * .0052; goal.pol = Math.max(CLAMP.pmin, Math.min(CLAMP.pmax, goal.pol - dy * .0042)); idle = 0;
  });
  function up(e) { drag = null; canvas.classList.remove('grab'); }
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); goal.dist = Math.max(CLAMP.dmin, Math.min(CLAMP.dmax, goal.dist * Math.exp(e.deltaY * .0011))); idle = 0; }, { passive: false });
  var pinch = null;
  canvas.addEventListener('touchmove', function (e) {
    if (e.touches.length !== 2) { pinch = null; return; } e.preventDefault();
    var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (pinch) goal.dist = Math.max(CLAMP.dmin, Math.min(CLAMP.dmax, goal.dist * pinch / d)); pinch = d; idle = 0;
  }, { passive: false });
  canvas.addEventListener('touchend', function () { pinch = null; });
  addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') goal.az -= .15; if (e.key === 'ArrowRight') goal.az += .15; if (e.key === 'Escape') overview(); });

  /* ---------- 描画ループ ---------- */
  function resize() { var w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 58 : 40; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  var last = performance.now(), ftAcc = 0, ftN = 0, lowered = false, tmp = new T.Vector3();
  function damp(a, b, k, dt) { return a + (b - a) * (1 - Math.exp(-k * dt)); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  var titleEl = document.getElementById('title');

  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; var t = now / 1000;
    // 性能が足りなければ解像度を下げる（なめらかさ優先）
    ftAcc += dt; ftN++; if (ftN === 90) { if (ftAcc / 90 > .026 && !lowered && dpr > 1) { lowered = true; renderer.setPixelRatio(1.25); resize(); } ftAcc = 0; ftN = 0; }
    // 導入：上から降りて、囲炉裏を囲む視点へ
    if (!introDone) { introT += dt / 3.6; var e = ease(Math.min(1, introT)); goal.dist = (ENTER ? 6.2 : 8) + (4.4 - (ENTER ? 6.2 : 8)) * e; goal.pol = (ENTER ? 1.42 : .22) + (.78 - (ENTER ? 1.42 : .22)) * e; goal.az = ENTER ? 3.14 + (.6 - 3.14) * e : .6 + (1 - e) * 1.6; if (introT >= 1) { introDone = true; titleEl.classList.add('out'); } }
    else { idle += dt; if (idle > 6 && active < 0) goal.az += dt * .05; }
    var k = introDone ? 5.2 : 9;
    cam.az = damp(cam.az, goal.az, k, dt); cam.pol = damp(cam.pol, goal.pol, k, dt); cam.dist = damp(cam.dist, goal.dist, k, dt);
    cam.tx = damp(cam.tx, goal.tx, 4.4, dt); cam.ty = damp(cam.ty, goal.ty, 4.4, dt); cam.tz = damp(cam.tz, goal.tz, 4.4, dt);
    var sp = Math.sin(cam.pol), cp = Math.cos(cam.pol);
    camera.position.set(cam.tx + cam.dist * sp * Math.sin(cam.az), cam.ty + cam.dist * cp, cam.tz + cam.dist * sp * Math.cos(cam.az));
    var underBeam = camera.position.y < H - .7; ceilParts.forEach(function (m) { m.visible = underBeam; });          // 見下ろす時は、天井と梁を消す（梁が視界をふさがない）
    camera.lookAt(cam.tx, cam.ty, cam.tz);

    // 炎のゆらぎ
    var fl = 1 + Math.sin(t * 7.1) * .06 + Math.sin(t * 13.3) * .05 + Math.sin(t * 3.7) * .04;
    fire.intensity = 2.2 * fl; glow.emissiveIntensity = 1.2 + Math.sin(t * 2.2) * .35;
    lanterns.forEach(function (l, i) { l.material.emissiveIntensity = .85 + Math.sin(t * 2 + i) * .08; });
    // 人影
    folks.forEach(function (f) {
      f.t += dt * f.spd; var ph = f.t % 2, p = ph < 1 ? ph : 2 - ph, a = f.path[0], b = f.path[1];
      f.g.position.set(a[0] + (b[0] - a[0]) * p, a[1] + Math.abs(Math.sin(t * 9 + f.spd * 50)) * .006, a[2] + (b[2] - a[2]) * p); f.g.rotation.y = ph < 1 ? Math.atan2(b[0] - a[0], b[2] - a[2]) : Math.atan2(a[0] - b[0], a[2] - b[2]);
    });


    // 印の位置
    spots.forEach(function (s) {
      tmp.copy(s.pos); tmp.project(camera);
      var vis = tmp.z < 1 && Math.abs(tmp.x) < 1.2 && Math.abs(tmp.y) < 1.2;
      s.el.style.opacity = vis && introDone ? '1' : '0'; s.el.style.pointerEvents = vis && introDone ? 'auto' : 'none';
      s.el.style.transform = 'translate(' + ((tmp.x * .5 + .5) * innerWidth).toFixed(1) + 'px,' + ((-tmp.y * .5 + .5) * innerHeight).toFixed(1) + 'px)';
    });
    if (window.__CASTLE_STEP) window.__CASTLE_STEP(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.load) document.fonts.load('800 40px "Shippori Mincho"').finally(function () { requestAnimationFrame(frame); }); else requestAnimationFrame(frame);
  document.body.classList.add('ready');
})();
