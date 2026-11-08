/* 囲炉裏の城下町（試作）
   茶室のなかに囲炉裏があり、その中に城下町がある。ボクセル調のミニチュアを、
   なめらかなカメラ（慣性・イージング）で見て回る。形はすべてここで組むオリジナル。 */
(function () {
  'use strict';
  var T = THREE;
  if (!T) return;

  var canvas = document.getElementById('gl');
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  var dpr = Math.min(2, window.devicePixelRatio || 1);
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
  key.position.set(-3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  var sc = key.shadow.camera; sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 1; sc.far = 14; key.shadow.bias = -.0006;
  scene.add(key); scene.add(key.target);
  var fire = new T.PointLight('#ff7a2a', 5.5, 6, 2);
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
  // 囲炉裏の縁（框）
  B(room, 2.2, .08, .3, 0, 0, -.95, woodLight); B(room, 2.2, .08, .3, 0, 0, .95, woodLight);
  B(room, .3, .08, 1.6, -.95, 0, 0, woodLight); B(room, .3, .08, 1.6, .95, 0, 0, woodLight);
  // 穴の側板と灰
  var pit = M('#3b2616');
  B(room, 1.6, .22, .05, 0, -.22, -.775, pit); B(room, 1.6, .22, .05, 0, -.22, .775, pit);
  B(room, .05, .22, 1.6, -.775, -.22, 0, pit); B(room, .05, .22, 1.6, .775, -.22, 0, pit);
  B(room, 1.5, .06, 1.5, 0, -.24, 0, M('#7a756b', { r: 1 }), false, true);       // 灰の層
  // 灰の隙間から漏れる熾火
  var glow = M('#ff6a1a', { e: '#ff5a10', ei: 1.4, r: .6 }); var glowM = [];
  for (var i = 0; i < 26; i++) {
    var gx = (rnd() - .5) * 1.4, gz = (rnd() - .5) * 1.4, onEdge = rnd() > .5;
    var m = B(room, onEdge ? .22 : .08, .02, onEdge ? .05 : .1, Math.max(-.72, Math.min(.72, gx)), -.19, Math.max(-.72, Math.min(.72, gz)), glow, false, false); glowM.push(m);
  }

  // 壁（内向き）と障子
  var wallM = M('#3a2818', { r: .9 });
  function wall(w, h, x, y, z, ry) { var m = new T.Mesh(new T.PlaneGeometry(w, h), wallM); m.position.set(x, y + h / 2, z); m.rotation.y = ry; m.receiveShadow = true; room.add(m); return m; }
  var H = 3.2;
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
  for (var bz = -4; bz <= 4; bz += 2) B(room, RW * 2, .3, .24, 0, H - .3, bz, woodDark, false, false);
  B(room, .3, .34, RW * 2, 0, H - .34, 0, woodDark, false, false);

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
  // 席（囲炉裏のまわりに6つ）：大老・老中・奥絵師が座り、将軍は外出中、残り二席は空席
  function plateTex(txt, sub) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 128; var g = c.getContext('2d');
    g.fillStyle = '#e8d3a0'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#3a2514'; g.lineWidth = 6; g.strokeRect(4, 4, 248, 120);
    g.fillStyle = '#111D0F'; g.textAlign = 'center'; g.font = '800 54px "Shippori Mincho", serif'; g.fillText(txt, 128, sub ? 66 : 82);
    if (sub) { g.fillStyle = '#8C4229'; g.font = '800 30px "Shippori Mincho", serif'; g.fillText(sub, 128, 108); }
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function person(g, kimono, accent, brush) {
    var sk = M('#f2d6b0', { r: .8 });
    B(g, .46, .16, .4, 0, .1, .02, M('#1b1d22', { r: .9 }));                   // 袴（座った脚）
    B(g, .4, .38, .24, 0, .26, -.02, M(kimono, { r: .85 }));                    // 胴
    B(g, .2, .06, .26, 0, .52, -.02, M(accent, { r: .8 }), false, false);       // 帯・襟
    B(g, .12, .34, .1, -.27, .3, .06, M(kimono, { r: .85 })); B(g, .12, .34, .1, .27, .3, .06, M(kimono, { r: .85 }));   // 腕
    B(g, .22, .22, .22, 0, .64, -.02, sk);                                       // 頭
    B(g, .24, .1, .24, 0, .8, -.04, M('#16110d', { r: .9 }), false, false);     // 髪
    B(g, .04, .04, .02, -.05, .72, .1, M('#111'), false, false); B(g, .04, .04, .02, .05, .72, .1, M('#111'), false, false);
    if (brush) { var br = B(g, .02, .3, .02, .3, .3, .2, M('#8a6038')); br.rotation.x = -.5; B(g, .04, .08, .04, .3, .52, .14, M('#111D0F')); }
  }
  // 大老：原案のIP（深緑の官服・金の縁・青緑の布と冠・口ひげと顎ひげ）を立体に
  function tairo(g) {
    var green = M('#2f5d3a', { r: .8 }), gold = M('#d6a94a', { r: .45, m: .35 }), cream = M('#efe7cf', { r: .85 }), dark = M('#2b1d14', { r: .8 }), skin = M('#dcd2a2', { r: .8 }), teal = M('#3f9a9a', { r: .7 }), jade = M('#a9d6b4', { r: .4 });
    var lathe = new T.Mesh(new T.LatheGeometry([[0, 0], [.4, 0], [.42, .1], [.38, .28], [.32, .44], [.22, .54], [.0, .58]].map(function (p) { return new T.Vector2(p[0], p[1]); }), 24), green); lathe.castShadow = true; g.add(lathe);
    var hem = new T.Mesh(new T.TorusGeometry(.41, .03, 6, 28), gold); hem.rotation.x = Math.PI / 2; hem.position.y = .03; g.add(hem);
    [-1, 1].forEach(function (sd) {                                                   // 金縁の襟（V字）
      var l = B(g, .06, .46, .04, sd * .1, .1, .27, gold, false, false); l.rotation.z = sd * .22; l.position.z = .3;
      var c = B(g, .05, .34, .03, sd * .06, .22, .3, cream, false, false); c.rotation.z = sd * .17;
    });
    var belt = new T.Mesh(new T.TorusGeometry(.3, .035, 6, 28), M('#4a3022', { r: .7 })); belt.rotation.x = Math.PI / 2; belt.scale.set(1, 1, 1); belt.position.y = .3; g.add(belt);
    B(g, .08, .08, .03, 0, .27, .32, jade, false, false); B(g, .1, .1, .02, 0, .26, .315, gold, false, false);
    [-1, 1].forEach(function (sd) {                                                   // 大きな袖
      var sl = B(g, .2, .34, .3, sd * .42, .2, .08, green); sl.rotation.z = -sd * .22; B(g, .21, .05, .31, sd * .45, .17, .08, gold, false, false);
    });
    B(g, .05, .22, .02, 0, .4, .38, jade);                                            // 手にした笏
    var head = new T.Mesh(new T.SphereGeometry(.15, 16, 12), skin); head.scale.set(1, 1.12, 1); head.position.y = .72; head.castShadow = true; g.add(head);
    [-1, 1].forEach(function (sd) {
      B(g, .06, .012, .01, sd * .06, .75, .135, dark, false, false).rotation.z = sd * .28;                                // 眉
      B(g, .05, .01, .01, sd * .06, .715, .14, dark, false, false); B(g, .05, .004, .01, sd * .06, .708, .141, M('#c23219'), false, false);   // 目と赤い縁
      var ear = new T.Mesh(new T.SphereGeometry(.035, 8, 6), skin); ear.position.set(sd * .15, .72, 0); ear.scale.set(.5, 1.2, .8); g.add(ear);
    });
    B(g, .025, .06, .02, 0, .68, .145, skin, false, false);                                                              // 鼻
    B(g, .12, .014, .012, 0, .655, .142, dark, false, false);                                                            // 口ひげ
    B(g, .035, .08, .015, 0, .58, .13, dark, false, false);                                                              // 顎ひげ
    var hair = new T.Mesh(new T.SphereGeometry(.155, 14, 8, 0, 6.283, 0, 1.2), dark); hair.position.y = .725; hair.scale.set(1.02, 1.05, 1.02); g.add(hair);
    var band = new T.Mesh(new T.TorusGeometry(.07, .028, 6, 14), teal); band.rotation.x = Math.PI / 2; band.position.y = .9; g.add(band);   // 青緑の布
    B(g, .075, .26, .075, 0, .9, 0, M('#1f4a2a', { r: .8 }));                                                                // 緑の高い冠
    [-1, 1].forEach(function (sd) { var r = B(g, .2, .012, .012, sd * .12, .93, 0, teal, false, false); r.rotation.z = sd * .2; });   // 布の飾り紐
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
  var SEATS = [
    { ang: 0, who: null, label: '将軍', sub: '外出中', cush: '#8C4229' },
    { ang: 1, who: 'tairo', label: '大老', cush: '#254723' },
    { ang: 2, who: ['#4E9495', '#f2eee0', false], label: '老中', cush: '#4E9495' },
    { ang: 3, who: ['#8C4229', '#E9C46A', true], label: '奥絵師', cush: '#5BA0C1' },
    { ang: 4, who: undefined, label: '空席', cush: '#8AB657' },
    { ang: 5, who: undefined, label: '空席', cush: '#8AB657' }
  ];
  SEATS.forEach(function (st) {
    var a = st.ang * Math.PI / 3 + Math.PI, R = 2.15, g = new T.Group(); g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); g.rotation.y = a + Math.PI; room.add(g);
    B(g, .85, .1, .85, 0, 0, 0, M(st.cush, { r: .9 })); B(g, .56, .02, .56, 0, .1, 0, M('#f2eee0', { r: .9 }), false, false);
    var seat = new T.Group(); seat.position.y = .1; g.add(seat);
    if (st.who === 'tairo') tairo(seat); else if (st.who) person(seat, st.who[0], st.who[1], st.who[2]);
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
    var g = new T.Group(); g.position.set(p[0], H - .85, p[1]); room.add(g);
    B(g, .02, .6, .02, 0, .6, 0, woodDark, false, false);
    var l = new T.Mesh(new T.CylinderGeometry(.2, .2, .5, 16), new T.MeshStandardMaterial({ color: '#f3d9a2', emissive: new T.Color('#ff9b3a'), emissiveIntensity: .9, roughness: 1 }));
    l.position.y = .3; g.add(l); lanterns.push(l);
    B(g, .46, .04, .46, 0, .52, 0, woodDark, false, false); B(g, .46, .04, .46, 0, .06, 0, woodDark, false, false);
  });

  /* ---------- 囲炉裏の中の城下町 ---------- */
  var town = new T.Group(); town.position.y = -.18; room.add(town);
  var BASE = 0;                                          // town 内の地面は y=0（灰の上 -.5）
  var u = .1;                                            // 一区画
  function V(gx, gz, w, d, h, col, y0, o) { return B(town, w * u, h * u, d * u, (gx + w / 2 - 7.5) * u, (y0 || 0) * u + .02, (gz + d / 2 - 7.5) * u, M(col, o)); }
  // 地面（芝・道・川）
  V(0, 0, 15, 15, .4, '#8fb05f', 0);                                       // 芝
  V(0, 6, 15, 2, .5, '#d9c48a', 0); V(6, 0, 2, 15, .5, '#d9c48a', 0);      // 十字の道
  V(11, 0, 4, 15, .3, '#5BA0C1', 0, { r: .35 });                           // 川
  V(10.4, 6, 5.2, 2, .9, '#8a5a2e', 0);                                    // 橋
  // 城（左奥）
  function castle(gx, gz) {
    V(gx, gz, 5, 5, 1.2, '#7f7b72', 0); V(gx + .5, gz + .5, 4, 4, 1.2, '#8f8b82', 1.2);
    var yy = 2.4;
    [[3.2, '#f2eee0', '#2b2e33'], [2.4, '#f2eee0', '#2b2e33'], [1.6, '#f2eee0', '#8C4229']].forEach(function (t, i) {
      var o = (5 - t[0]) / 2; V(gx + o, gz + o, t[0], t[0], 1.1, t[1], yy);
      V(gx + o - .5, gz + o - .5, t[0] + 1, t[0] + 1, .35, t[2], yy + 1.1); V(gx + o - .1, gz + o - .1, t[0] + .2, t[0] + .2, .3, t[2], yy + 1.45);
      yy += 1.75;
    });
    V(gx + 2.3, gz + 2.3, .4, .4, .5, '#e9c46a', yy, { e: '#e9a42a', ei: .6 });  // 金の飾り
    V(gx + 1.5, gz - .6, 2, .8, .7, '#7f7b72', 0);                              // 門
  }
  castle(.8, 1);
  // 家
  function house(gx, gz, w, d, h, wall, roof, noren) {
    V(gx, gz, w, d, h, wall, 0.4);
    V(gx - .3, gz - .3, w + .6, d + .6, .35, roof, .4 + h); V(gx + .2, gz + .2, w - .4, d - .4, .35, roof, .4 + h + .35);
    if (noren) V(gx + w * .3, gz - .12, w * .4, .12, h * .5, noren, .4 + h * .35, { r: .9 });
  }
  var shops = [[1, 8.5, 3, 2.4, 1.2, '#f2eee0', '#3b2c22', '#254723'], [4.2, 8.5, 2.6, 2.4, 1.2, '#f2eee0', '#3b2c22', '#8C4229'],
    [8, 8.8, 2.6, 2.4, 1.3, '#f2eee0', '#3b2c22', '#5BA0C1'], [1, 12, 2.6, 2.2, 1.1, '#e9dfc2', '#3b2c22', '#8C4229'],
    [4.2, 12, 3, 2.2, 1.2, '#f2eee0', '#2b2e33', '#254723'], [8, 12, 2.4, 2.2, 1.1, '#e9dfc2', '#3b2c22', '#5BA0C1'],
    [8.2, 2.2, 2.2, 2.6, 1.2, '#f2eee0', '#8C4229', '#e9c46a'], [8.2, .2, 2.4, 1.6, 1, '#e9dfc2', '#3b2c22', null]];
  shops.forEach(function (s) { house.apply(null, s); });
  // 工房（奥絵師の絵筆の看板つき）
  house(11.4, 8.8, 3, 2.4, 1.4, '#f2eee0', '#8C4229', '#e9c46a');
  // 一座の屋敷（家紋の旗）
  house(5.4, 1.6, 3.2, 3.6, 1.6, '#f2eee0', '#254723', '#e9c46a');
  V(8.3, 1.4, .25, .25, 3, '#2f1d10', .4); V(8.55, 1.5, 1.1, .1, 1.2, '#254723', 1.9);
  // 木々
  function tree(gx, gz, sakura) {
    V(gx, gz, .5, .5, 1.2, '#6b4a2a', .4);
    var c = sakura ? '#e9a0b4' : '#4f8a3a'; V(gx - .6, gz - .6, 1.7, 1.7, .9, c, 1.6); V(gx - .3, gz - .3, 1.1, 1.1, .7, c, 2.5);
  }
  tree(.4, 6.2, true); tree(13.2, 3, true); tree(.4, 3, false); tree(5.4, 6.5, false); tree(13.6, 13.4, false);
  // 鳥居（入口）
  V(6.6, 6.1, .3, .3, 1.8, '#C23219', .4); V(8.1, 6.1, .3, .3, 1.8, '#C23219', .4); V(6.4, 6.1, 2.2, .3, .3, '#C23219', 2.2); V(6.5, 6.1, 2, .25, .22, '#C23219', 1.85);
  // 灯籠（光る）
  [[5, 5.6], [9, 5.6], [5, 8.4], [9, 8.4]].forEach(function (p) { V(p[0], p[1], .35, .35, .9, '#d9c48a', .4); V(p[0] - .02, p[1] - .02, .4, .4, .4, '#ffcf80', 1.3, { e: '#ff9d3a', ei: 1.6 }); });
  // 縁取りの熾火（灰の縁を橙に）
  var rim = M('#ff7a22', { e: '#ff5a10', ei: 1.1 });
  B(town, 1.52, .015, .03, 0, .02, -.755, rim, false, false); B(town, 1.52, .015, .03, 0, .02, .755, rim, false, false);
  B(town, .03, .015, 1.52, -.755, .02, 0, rim, false, false); B(town, .03, .015, 1.52, .755, .02, 0, rim, false, false);

  // 行き交う人（ごく小さな人影）
  var folks = [];
  function folk(col, path, spd) {
    var g = new T.Group(); town.add(g);
    B(g, .04, .06, .03, 0, 0, 0, M('#2f1d10'), false, false); B(g, .045, .07, .035, 0, .06, 0, M(col), false, false); B(g, .04, .04, .04, 0, .13, 0, M('#f2d6b0'), false, false);
    folks.push({ g: g, path: path, spd: spd, t: rnd() * 10 });
  }
  folk('#8C4229', [[-.7, 0.03, .06], [.2, .03, .06]], .12); folk('#254723', [[.55, .03, -.65], [.55, .03, .62]], .1);
  folk('#5BA0C1', [[-.3, .03, .06], [-.7, .03, .06]], .14); folk('#e9c46a', [[.2, .03, -.3], [.2, .03, .5]], .09);
  folk('#f2eee0', [[-.6, .03, -.2], [.4, .03, -.2]], .11);

  /* ---------- 自在鉤と鉄瓶、湯気 ---------- */
  var kagi = new T.Group(); kagi.position.set(.2, 0, .1); room.add(kagi);
  B(kagi, .03, H - 1.35, .03, 0, 1.35, 0, M('#1b1b1e', { m: .6, r: .4 }), false, false);
  var kettle = new T.Mesh(new T.SphereGeometry(.2, 16, 12), M('#1f1f23', { m: .7, r: .35 })); kettle.scale.set(1, .8, 1); kettle.position.y = 1.2; kettle.castShadow = true; kagi.add(kettle);
  var spout = new T.Mesh(new T.CylinderGeometry(.015, .03, .17, 8), M('#1f1f23', { m: .7, r: .35 })); spout.position.set(.2, 1.25, 0); spout.rotation.z = -.9; kagi.add(spout);
  var handle = new T.Mesh(new T.TorusGeometry(.17, .008, 6, 20, Math.PI), M('#1f1f23', { m: .8, r: .3 })); handle.position.y = 1.3; kagi.add(handle);
  // 湯気
  var steam = [];
  var sprite = (function () { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'); var r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,.75)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
  for (var si = 0; si < 22; si++) {
    var sp = new T.Sprite(new T.SpriteMaterial({ map: sprite, transparent: true, depthWrite: false, opacity: 0 })); sp.scale.set(.2, .2, .2); room.add(sp);
    steam.push({ s: sp, t: si / 22 });
  }

  /* ---------- 見どころ（カード＋印） ---------- */
  var spots = [
    { id: 'castle', jp: '経営・事業開発', en: 'Management', txt: '経営戦略から事業再生・新規事業まで、再生と成長を支援します。', href: 'service-support.html', pos: new T.Vector3(-.42, .72, -.4) },
    { id: 'studio', jp: 'IP・デザイン', en: 'IP & Design', txt: 'IPの企画・ブランド設計・デザインで、事業の物語を形にします。', href: 'service-ip.html', pos: new T.Vector3(.54, .3, .25) },
    { id: 'hall', jp: 'MORINOA 一座', en: 'Organization', txt: '戦略を描く者と、現場で実行する者。二つの座が一体となって動きます。', href: 'index.html#org', pos: new T.Vector3(-.05, .34, -.41) },
    { id: 'gate', jp: '事例・実績', en: 'Works', txt: '再生・IP・デザインの取り組みを、ここに並べていきます。', href: '', pos: new T.Vector3(-.01, .28, -.12) }
  ];
  var wrapMarks = document.getElementById('marks'), cardsEl = document.getElementById('cards');
  spots.forEach(function (s, i) {
    var b = document.createElement('button'); b.className = 'mark'; b.setAttribute('aria-label', s.jp); b.innerHTML = '<i></i><span>' + s.jp + '</span>';
    b.addEventListener('click', function () { focus(i); }); wrapMarks.appendChild(b); s.el = b;
    var c = document.createElement('div'); c.className = 'card'; c.innerHTML = '<h3>' + s.jp + '</h3><p class="en">' + s.en + '</p><p>' + s.txt + '</p>' + (s.href ? '<a class="more" href="' + s.href + '">More <b>›</b></a>' : '<span class="soon">COMING SOON</span>') + '';
    c.addEventListener('click', function (e) { if (e.target.closest('a')) return; focus(i); }); cardsEl.appendChild(c); s.card = c;
  });

  /* ---------- カメラ：慣性つきの周回、イージングつきの移動 ---------- */
  var cam = { az: .6, pol: .22, dist: 7, tx: 0, ty: .05, tz: 0 };           // 現在値
  var goal = { az: .6, pol: .78, dist: 5.0, tx: 0, ty: .0, tz: 0 };         // 目標値
  var idle = 0, active = -1, introT = 0, introDone = false;
  var CLAMP = { pmin: .25, pmax: 1.38, dmin: .8, dmax: 6.2 };
  function focus(i) {
    active = i; idle = 0; var p = spots[i].pos;
    goal.tx = p.x; goal.ty = p.y - .3; goal.tz = p.z; goal.dist = 1.3; goal.pol = 1.0;
    spots.forEach(function (s, k) { s.card.classList.toggle('on', k === i); s.el.classList.toggle('on', k === i); });
    spots[i].card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  function overview() { active = -1; goal.tx = 0; goal.ty = 0; goal.tz = 0; goal.dist = 5.0; goal.pol = .78; spots.forEach(function (s) { s.card.classList.remove('on'); s.el.classList.remove('on'); }); }
  document.getElementById('reset').addEventListener('click', overview);

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
    if (!introDone) { introT += dt / 3.6; var e = ease(Math.min(1, introT)); goal.dist = 8 + (5.0 - 8) * e; goal.pol = .22 + (.78 - .22) * e; goal.az = .6 + (1 - e) * 1.6; if (introT >= 1) { introDone = true; titleEl.classList.add('out'); } }
    else { idle += dt; if (idle > 6 && active < 0) goal.az += dt * .05; }
    var k = introDone ? 5.2 : 9;
    cam.az = damp(cam.az, goal.az, k, dt); cam.pol = damp(cam.pol, goal.pol, k, dt); cam.dist = damp(cam.dist, goal.dist, k, dt);
    cam.tx = damp(cam.tx, goal.tx, 4.4, dt); cam.ty = damp(cam.ty, goal.ty, 4.4, dt); cam.tz = damp(cam.tz, goal.tz, 4.4, dt);
    var sp = Math.sin(cam.pol), cp = Math.cos(cam.pol);
    camera.position.set(cam.tx + cam.dist * sp * Math.sin(cam.az), cam.ty + cam.dist * cp, cam.tz + cam.dist * sp * Math.cos(cam.az));
    camera.lookAt(cam.tx, cam.ty, cam.tz);

    // 炎のゆらぎ
    var fl = 1 + Math.sin(t * 7.1) * .06 + Math.sin(t * 13.3) * .05 + Math.sin(t * 3.7) * .04;
    fire.intensity = 5.5 * fl; glow.emissiveIntensity = 1.2 + Math.sin(t * 2.2) * .35;
    lanterns.forEach(function (l, i) { l.material.emissiveIntensity = .85 + Math.sin(t * 2 + i) * .08; });
    // 人影
    folks.forEach(function (f) {
      f.t += dt * f.spd; var ph = f.t % 2, p = ph < 1 ? ph : 2 - ph, a = f.path[0], b = f.path[1];
      f.g.position.set(a[0] + (b[0] - a[0]) * p, a[1] + Math.abs(Math.sin(t * 9 + f.spd * 50)) * .006, a[2] + (b[2] - a[2]) * p); f.g.rotation.y = ph < 1 ? Math.atan2(b[0] - a[0], b[2] - a[2]) : Math.atan2(a[0] - b[0], a[2] - b[2]);
    });
    // 湯気
    steam.forEach(function (s) {
      s.t = (s.t + dt * .22) % 1; var h = s.t;
      s.s.position.set(.2 + .38 + Math.sin(h * 6 + s.t * 20) * .05 * h, 1.3 + h * 1.0, .1 + Math.cos(h * 5) * .05 * h);
      s.s.material.opacity = Math.sin(Math.min(1, h) * Math.PI) * .32; var sc = .12 + h * .5; s.s.scale.set(sc, sc, sc);
    });
    kettle.rotation.y = Math.sin(t * .4) * .04; kagi.rotation.y = Math.sin(t * .35) * .02;

    // 印の位置
    spots.forEach(function (s) {
      tmp.copy(s.pos); tmp.project(camera);
      var vis = tmp.z < 1 && Math.abs(tmp.x) < 1.2 && Math.abs(tmp.y) < 1.2;
      s.el.style.opacity = vis && introDone ? '1' : '0'; s.el.style.pointerEvents = vis && introDone ? 'auto' : 'none';
      s.el.style.transform = 'translate(' + ((tmp.x * .5 + .5) * innerWidth).toFixed(1) + 'px,' + ((-tmp.y * .5 + .5) * innerHeight).toFixed(1) + 'px)';
    });
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.load) document.fonts.load('800 40px "Shippori Mincho"').finally(function () { requestAnimationFrame(frame); }); else requestAnimationFrame(frame);
  document.body.classList.add('ready');
})();
