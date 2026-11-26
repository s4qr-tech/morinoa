#!/usr/bin/env python3
"""日本語版の3ページから英語版（en/）を作る。

使い方:  python3 tools/build_en.py
日本語版を直したら、もう一度実行する。訳の対象の文章が変わっていると、
このスクリプトが「見つからない」と止まるので、下の対訳も直す。
縦書きの日本語（見出し・旗・名札・札・提灯など）は、わざと残している。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://morinoa.com/"
FORM = "https://forms.gle/eSTg1UBF56mVySoMA"
EN_CSS_VER = "20261126e"

DESC_TOP = ("MORINOA works with communities in Japan and abroad to create value by reviving, maintaining and "
            "sustaining businesses, through Creating Shared Value (CSV) management. Our two services are "
            "Management & Business Development and IP & Design.")
DESC_IP = ("IP & Design by MORINOA. We create new value through IP planning and development, brand architecture, "
           "design, and the reinterpretation of culture and local resources.")
DESC_SUP = ("Management & Business Development by MORINOA. Management strategy, turnarounds, new ventures, "
            "business restructuring and market development: we support revival and growth.")

# ---------- 全ページ共通（ヘッダー・メニュー・フッター） ----------
COMMON = [
    ('aria-label="MORINOA トップへ"', 'aria-label="MORINOA home"'),
    ('aria-label="メニューを開く"', 'aria-label="Open menu"'),
    ('aria-label="サイトメニュー"', 'aria-label="Site menu"'),
    ('>一座</a></li>', '>TROUPE</a></li>'),
    ('>MORINOAとは</a>', '>About MORINOA</a>'),
    ('>再生までの五手</a>', '>Five Moves to Revival</a>'),
    ('>一座</a>\n', '>The Troupe</a>\n'),
    ('>ご相談・お問い合わせ</a>', '>Contact</a>'),
    ('<p class="menu-head">事業</p>', '<p class="menu-head">SERVICES</p>'),
    ('<p class="menu-head">つながる</p>', '<p class="menu-head">CONNECT</p>'),
    ('<span class="menu-num">壱</span>IP・デザイン', '<span class="menu-num" lang="ja">壱</span>IP &amp; Design'),
    ('<span class="menu-num">弐</span>経営・事業開発', '<span class="menu-num" lang="ja">弐</span>Management &amp; Business Development'),
    ('<span class="menu-num">参</span>IRORI', '<span class="menu-num" lang="ja">参</span>IRORI (Japanese)'),
    ('<a href="%s">軍議を申し込む →</a>' % FORM, '<a href="%s">Request a War Council →</a>' % FORM),
    ('<p class="foot-copy">合同会社モリノア｜建て直す。盛り直す。事業の再生・維持・持続を通じて、国内外の地域とともに価値をつくり、CSV経営を目指す会社。</p>',
     '<p class="foot-copy">MORINOA LLC｜Rebuild. Revive. We create value with communities in Japan and abroad by reviving, maintaining and sustaining businesses, through Creating Shared Value management.</p>'),
    ('<span>建て直す。盛り直す。</span>\n    </div>', '<span>Rebuild. Revive.</span>\n    </div>'),
    ('content="ja_JP"', 'content="en_US"'),
    ('content="MORINOAのロゴ｜建て直す。盛り直す。"', 'content="MORINOA logo｜Rebuild. Revive."'),
]

TOP = [
    ('MORINOA｜建て直す。盛り直す。— 事業再生とCSV経営の一座', 'MORINOA｜Rebuild. Revive. Business turnaround and CSV management'),
    ('MORINOA（モリノア）は、事業の再生・維持・持続を通じて、国内外の地域とともに価値をつくり、CSV経営を目指す会社。経営・事業開発とIP・デザインの二つの事業を展開します。', DESC_TOP.replace("&", "&amp;")),
    # 構造化データ
    ('"slogan": "建て直す。盛り直す。"', '"slogan": "Rebuild. Revive."'),
    ('"description": "事業の再生・維持・持続を通じて、国内外の地域とともに価値をつくり、CSV経営を目指す会社。"',
     '"description": "A company that creates value with communities in Japan and abroad by reviving, maintaining and sustaining businesses, through Creating Shared Value management."'),
    ('"@id": "https://morinoa.com/#website",\n      "url": "https://morinoa.com/",',
     '"@id": "https://morinoa.com/en/#website",\n      "url": "https://morinoa.com/en/",'),
    ('"inLanguage": "ja"', '"inLanguage": "en"'),
    # 左端の縦書き（そのまま残す）
    ('<div class="rail" aria-hidden="true">', '<div class="rail" aria-hidden="true" lang="ja">'),
    # ヒーロー
    ('<span class="hero-tag">関わるすべての人と地域に価値を育てる</span>', '<span class="hero-tag">Growing value for every person and community involved</span>'),
    ('<h1>その事業、<br>まだ死んでいない。<br><span class="em">再生には、戦略がいる。</span></h1>',
     '<h1>Your business<br>isn’t dead yet.<br><span class="em">Revival takes strategy.</span></h1>'),
    # 英語版のトップ最上部は、収まりを良くするため標語の１行を出さない（ご要望）
    ('      <p class="hero-motto">建て直す。盛り直す。MORINOA。</p>\n', ''),
    ('MORINOAは、一座で現場に入り、戦略と実行の両輪で事業を立て直す。\n        関わるすべての人とともに、事業の持続的な成長と社会的・経済的価値の創出を目指します。',
     'MORINOA works on site as one troupe, rebuilding businesses with strategy and execution.\n        With everyone involved, we pursue lasting growth and social and economic value.'),
    ('<a class="btn btn-primary" href="#contact">軍議を申し込む →</a>', '<a class="btn btn-primary" href="#contact">Request a War Council →</a>'),
    ('>事業内容を見る</a>', '>Our Services</a>'),
    ('alt="MORINOA ロゴ"', 'alt="MORINOA logo"'),
    ('<p class="hero-name-jp">', '<p class="hero-name-jp" lang="ja">'),
    # ABOUT
    ('<h2 class="sec-title">MORINOAとは</h2>', '<h2 class="sec-title">About MORINOA</h2>'),
    ('モリンガの木のようにやせた土地でも育つ「再生力」と、ノアの箱舟のように大切なものを「守り抜き、次に繋ぐ力」。ふたつを掛け合わせた名が、MORINOAです。',
     'The moringa tree grows even in poor soil: the power to regenerate. Noah’s ark kept what mattered safe: the power to protect it and pass it on. MORINOA is a name that joins the two.'),
    ('<h3 class="tate-copy reveal" aria-label="建て直す。盛り直す。">', '<h3 class="tate-copy reveal" lang="ja" aria-label="建て直す。盛り直す。">'),
    ('<div class="tate-body">', '<div class="tate-body">\n        <p class="en-motto reveal">Rebuild. Revive.</p>'),
    ('<p class="tate-kicker">志</p>', '<p class="tate-kicker">PURPOSE</p>'),
    ('傾いた事業をもう一度立たせ、そこに集う人と地域を盛り上げる。事業の再生を通じて、国内外の地域とともに、社会の価値と企業の利益を同時につくるCSV経営を実践します。',
     'We put struggling businesses back on their feet and bring energy to the people and places around them. Through each revival, we practice Creating Shared Value (CSV) management with communities in Japan and abroad, building social value and business profit together.'),
    ('<p class="tate-kicker">構え</p>', '<p class="tate-kicker">STANCE</p>'),
    ('止血して終わりの再生では、また傾きます。MORINOAは再生のあとに、維持のしくみと持続の文化まで設計します。',
     'A turnaround that only stops the bleeding will falter again. After revival, MORINOA also designs the systems that maintain it and the culture that sustains it.'),
    ('<li><span class="hata"><i aria-hidden="true"></i><b>再生</b></span></li>', '<li><span class="hata"><i aria-hidden="true"></i><b lang="ja">再生</b></span><span class="hata-en">Revive</span></li>'),
    ('<li><span class="hata"><i aria-hidden="true"></i><b>維持</b></span></li>', '<li><span class="hata"><i aria-hidden="true"></i><b lang="ja">維持</b></span><span class="hata-en">Maintain</span></li>'),
    ('<li><span class="hata"><i aria-hidden="true"></i><b>持続</b></span></li>', '<li><span class="hata"><i aria-hidden="true"></i><b lang="ja">持続</b></span><span class="hata-en">Sustain</span></li>'),
    ('評論家ではなく、<br>共に進む。', 'Not critics.<br>We march with you.'),
    ('分析レポートを置いて帰るコンサルではありません。戦略を描く者と現場で実行する者が一体の「一座」として、\n            カウンターの中にも、商談の席にも立ちます。自ら店を営む現場知と、深く学ぶ専門知。その両輪が私たちの強みです。',
     'We are not consultants who drop off a report and leave. As one troupe, where those who draw the strategy and those who carry it out work as one,\n            we stand behind the counter and sit at the negotiating table. Hands-on knowledge from running our own venue and deep specialist study: these two wheels are our strength.'),
    ('alt="MORINOAの家紋"', 'alt="MORINOA family crest"'),
    # 一座
    ('<h2 class="sec-title">MORINOA 一座</h2>', '<h2 class="sec-title">The MORINOA Troupe</h2>'),
    ('<p class="mekuru">捲るべし</p>', '<p class="mekuru">Flip the tags</p>'),
    ('戦略と実行を分業しない。それぞれの座が現場に立つ、それがMORINOAの強みです。',
     'Strategy and execution are never split apart. Every seat in the troupe works on site. That is MORINOA’s strength.'),
    ('aria-label="将軍の名札。押すと本人の写真に切り替わります"', 'aria-label="Shogun name tag. Press to see the photo"'),
    ('aria-label="大老の名札。押すと本人の写真に切り替わります"', 'aria-label="Tairo name tag. Press to see the photo"'),
    ('<div class="org-title">将軍</div>\n            <div class="org-role">代表</div>\n            <div class="org-item">兜</div>',
     '<div class="org-title" lang="ja">将軍</div>\n            <div class="org-role"><b>Shogun</b>Representative</div>\n            <div class="org-item">Helmet</div>'),
    ('<div class="org-title">大老</div>\n            <div class="org-role">戦略</div>\n            <div class="org-item">軍配</div>',
     '<div class="org-title" lang="ja">大老</div>\n            <div class="org-role"><b>Tairo</b>Strategy</div>\n            <div class="org-item">War fan</div>'),
    ('<div class="org-title">老中</div>\n            <div class="org-role">分析</div>\n            <div class="org-item">印籠</div>',
     '<div class="org-title" lang="ja">老中</div>\n            <div class="org-role"><b>Roju</b>Analysis</div>\n            <div class="org-item">Seal case</div>'),
    ('<div class="org-title">奥絵師</div>\n            <div class="org-role">デザイン</div>\n            <div class="org-item">筆と扇子</div>',
     '<div class="org-title" lang="ja">奥絵師</div>\n            <div class="org-role"><b>Oku-eshi</b>Design</div>\n            <div class="org-item">Brush &amp; fan</div>'),
    ('alt="将軍 西出 航一"', 'alt="Shogun, Koichi Nishide"'),
    ('alt="大老 大家 颯"', 'alt="Tairo, Sou Daike"'),
    ('<div class="fuda-name">', '<div class="fuda-name">'),
    # SERVICE
    ('<h2 class="sec-title">二つの事業<span class="bar-sep">｜</span><span class="nb">経営・事業開発と</span><span class="nb">IP・デザイン</span></h2>',
     '<h2 class="sec-title">Our Two Services</h2>'),
    ('再生を軸に、店を営んで磨いた現場知とIP・デザインの物語で、事業に「もう一度、人が集まる理由」をつくります。',
     'With revival at the core, we combine hands-on knowledge from running our own venue with the storytelling of IP and design, giving people a reason to gather around your business again.'),
    ('<h3>IP・デザイン</h3>', '<h3>IP &amp; Design</h3>'),
    ('IPの企画・ブランド設計・デザインで、事業の物語を形にします。', 'IP planning, brand architecture and design that give your business story a shape.'),
    ('<h3>経営・事業開発</h3>', '<h3>Management &amp; Business Development</h3>'),
    ('経営戦略から事業再生・新規事業まで、再生と成長を支援します。', 'From strategy to turnarounds and new ventures, we support revival and growth.'),
    ('<span class="svc-more">詳しく見る →</span>', '<span class="svc-more">Learn more →</span>'),
    # FLOW
    ('<h2 class="sec-title">再生までの五手</h2>', '<h2 class="sec-title">Five Moves to Revival</h2>'),
    ('初回のご相談から改善の定着まで。一手ずつ、確実に進めます。', 'From the first consultation to lasting improvement, we advance one sure move at a time.'),
    ('<h3>相談</h3>\n        <p>現状とお悩みを伺います。初回相談は無料です。</p>', '<h3>Consult</h3>\n        <p>We hear where you stand and what troubles you. The first consultation is free.</p>'),
    ('<h3>分析</h3>\n        <p>財務・メニュー・導線を診断し、傾きの正体を特定します。</p>', '<h3>Analyze</h3>\n        <p>We examine finances, menu and customer flow to find the real cause of the decline.</p>'),
    ('<h3>戦略設計</h3>\n        <p>再生の道筋を一枚の戦略図に。優先順位を明確にします。</p>', '<h3>Strategize</h3>\n        <p>We put the path to revival on a one-page strategy map with clear priorities.</p>'),
    ('<h3>実行</h3>\n        <p>現場に入り込み、施策をともに動かします。</p>', '<h3>Execute</h3>\n        <p>We step onto the floor and put the plan into motion with you.</p>'),
    ('<h3>改善</h3>\n        <p>数字を見ながら磨き込み、維持と持続のしくみへ。</p>', '<h3>Improve</h3>\n        <p>We refine by the numbers and build systems that maintain and sustain results.</p>'),
    # CONTACT
    ('<h2 class="display">守るために、<br>攻める。</h2>', '<h2 class="display">We attack<br>to protect.</h2>'),
    ('事業の相談は、早いほど打てる手が多くなります。\n        「まだ大丈夫」のうちに、一度お話ししませんか。初回のご相談は無料です。',
     'The earlier you talk to us, the more moves you have.\n        Why not talk while things still feel manageable? The first consultation is free.'),
    ('aria-label="Instagramで問い合わせ"><span class="dot"></span>Instagramで問い合わせ', 'aria-label="Contact us on Instagram"><span class="dot"></span>Contact us on Instagram'),
    ('<p class="h3">軍議のお申し込み</p>', '<p class="h3">Request a War Council</p>'),
    ('お名前・ご連絡先・ご相談内容を、専用フォームからお送りください。', 'Send your name, contact details and topic through our form. The form is currently in Japanese.'),
    ('<a class="btn btn-primary" id="gunji-form" href="%s">軍議を申し込む →</a>' % FORM,
     '<a class="btn btn-primary" id="gunji-form" href="%s">Open the form (Japanese) →</a>' % FORM),
    ('1〜3営業日以内にご返信いたします。', 'We reply within 1–3 business days (Japan time).'),
]

SERVICE_COMMON = [
    ('<span>／</span><a href="index.html#service">SERVICE</a>', '<span>／</span><a href="index.html#service">SERVICE</a>'),
    ('<a class="btn btn-primary" href="index.html#contact">軍議を申し込む →</a>', '<a class="btn btn-primary" href="index.html#contact">Request a War Council →</a>'),
    ('>他の事業も見る</a>', '>Our other service</a>'),
]

IP = SERVICE_COMMON + [
    ('IP・デザイン｜MORINOA', 'IP &amp; Design｜MORINOA'),
    ('MORINOAのIP・デザイン。IPの企画・開発、ブランド設計、デザイン、文化・地域資源の再解釈を通じて、新たな価値を創出する事業。', DESC_IP.replace("&", "&amp;")),
    ('"name":"IP・デザイン","description":"IPの企画・開発、ブランド設計、デザイン、文化・地域資源の再解釈を通じて、新たな価値を創出する。"',
     '"name":"IP & Design","description":"We create new value through IP planning and development, brand architecture, design, and the reinterpretation of culture and local resources."'),
    ('"position":3,"name":"IP・デザイン"', '"position":3,"name":"IP & Design"'),
    ('>再生までの三手</a>', '>Our process</a>'),
    ('<span>IP・デザイン</span>', '<span>IP &amp; Design</span>'),
    ('<div class="chochin-set" aria-hidden="true">', '<div class="chochin-set" aria-hidden="true" lang="ja">'),
    ('<span class="hero-mark" aria-hidden="true">壱</span>', '<span class="hero-mark" aria-hidden="true" lang="ja">壱</span>'),
    ('<h1>IP・デザイン</h1>\n    <p class="en">IP &amp; DESIGN</p>', '<h1>IP &amp; Design</h1>'),
    ('ブランドの文化・地域資源の再解釈を通じて、新たな価値を創出する事業。<br>\n      装飾ではなく、<strong>事業の物語そのもの</strong>をIP化します。',
     'We create new value by reinterpreting brand culture and local resources.<br>\n      Not decoration: we turn <strong>your business story itself</strong> into IP.'),
    ('こんな課題はありませんか', 'Does this sound familiar?'),
    ('<h3>他店と同じに見える</h3>\n        <p>商品や味には自信があるのに、ブランドとしての「顔」がなく、価格でしか比較されない。</p>',
     '<h3>You look like everyone else</h3>\n        <p>You trust your product and flavor, but without a brand “face,” people compare you on price alone.</p>'),
    ('<h3>SNSが続かない</h3>\n        <p>投稿はしているが反応が薄い。何を発信すればいいのか、軸が定まっていない。</p>',
     '<h3>Social media stalls</h3>\n        <p>You post, but the response is weak. There is no clear core to decide what to share.</p>'),
    ('<h3>常連客への「その先」がない</h3>\n        <p>グッズ化やキャラクター展開など、ファンをもっと深く巻き込む手段を持てていない。</p>',
     '<h3>No next step for regulars</h3>\n        <p>You have no way yet to draw fans in more deeply, such as merchandise or characters.</p>'),
    ('<h2 class="sec-title">提供内容</h2>', '<h2 class="sec-title">What we offer</h2>'),
    ('<h3>ブランド・キャラクター開発</h3>\n        <p>事業の背景にある物語を掘り起こし、覚えてもらえる「顔」となるキャラクターとブランド世界観を設計します。</p>',
     '<h3>Brand &amp; character development</h3>\n        <p>We uncover the story behind your business and design a character and brand world that become a face people remember.</p>'),
    ('<h3>デザイン制作</h3>\n        <p>ロゴ・メニュー・パッケージ・店内ビジュアルまで、世界観を一貫させたデザインに落とし込みます。</p>',
     '<h3>Design production</h3>\n        <p>From logos and menus to packaging and in-store visuals, we carry one consistent world through every design.</p>'),
    ('<h3>SNS・コンテンツ展開</h3>\n        <p>「何を、なぜ発信するか」の軸を設計し、単発ではなく積み上がるコンテンツ運用に変えます。</p>',
     '<h3>Social media &amp; content</h3>\n        <p>We define what to share and why, turning one-off posts into content that builds over time.</p>'),
    ('<h2 class="sec-title">進め方は三手</h2>', '<h2 class="sec-title">Three Moves</h2>'),
    ('<span class="frow-no">一</span>', '<span class="frow-no" lang="ja">一</span>'),
    ('<span class="frow-no">二</span>', '<span class="frow-no" lang="ja">二</span>'),
    ('<span class="frow-no">三</span>', '<span class="frow-no" lang="ja">三</span>'),
    ('<h3 class="frow-t">掘る</h3>', '<h3 class="frow-t">Dig</h3>'),
    ('事業の歴史・強み・お客様との関係性を伺い、まだ言葉になっていない魅力を掘り起こします。',
     'We ask about your history, strengths and customer relationships, and unearth appeal not yet put into words.'),
    ('<span class="frow-s">ヒアリング</span>', '<span class="frow-s">Interview</span>'),
    ('<h3 class="frow-t">描く</h3>', '<h3 class="frow-t">Draw</h3>'),
    ('軸となる物語とキャラクターを奥絵師が形にし、ロゴ・販促物・SNSなど各接点へ一貫して展開します。',
     'Our Oku-eshi shapes the core story and character, then carries them consistently into logos, promotions and social media.'),
    ('<span class="frow-s">世界観・デザイン</span>', '<span class="frow-s">World &amp; design</span>'),
    ('<h3 class="frow-t">磨く</h3>', '<h3 class="frow-t">Polish</h3>'),
    ('公開して終わりにせず、反応を見ながらコンテンツと展開を継続的に磨き込みます。',
     'Launch is not the end. We keep refining the content and rollout as we watch the response.'),
    ('<span class="frow-s">運用・磨き込み</span>', '<span class="frow-s">Run &amp; refine</span>'),
    ('<span class="wl-title">MORINOAの世界をのぞく</span>', '<span class="wl-title">Peek into the world of MORINOA</span>'),
    ('<span class="wl-sub">めぐる城下町｜一座が町を訪ね、使い、伝え、また城へ巡る物語</span>',
     '<span class="wl-sub">The castle town｜A tale of the troupe visiting the town and returning to the castle</span>'),
    ('<span class="svc-more">絵巻を見る →</span>', '<span class="svc-more">View the scroll (Japanese) →</span>'),
    ('まずは、事業の物語を聞かせてください。', 'First, tell us your business story.'),
    ('日々の制作や活動は、Instagramで発信しています。', 'We share our daily work on Instagram.'),
]

SUPPORT = SERVICE_COMMON + [
    ('経営・事業開発｜MORINOA', 'Management &amp; Business Development｜MORINOA'),
    ('MORINOAの経営・事業開発。経営戦略、事業再生、新規事業開発、事業構造の再設計、市場開拓など、企業・事業の再生と成長を支援する事業。', DESC_SUP.replace("&", "&amp;")),
    ('"name":"経営・事業開発","description":"経営戦略、事業再生、新規事業開発、事業構造の再設計、市場開拓など、企業・事業の再生と成長を支援する。"',
     '"name":"Management & Business Development","description":"Management strategy, turnarounds, new ventures, business restructuring and market development that support revival and growth."'),
    ('"position":3,"name":"経営・事業開発"', '"position":3,"name":"Management & Business Development"'),
    ('<span>経営・事業開発</span>', '<span>Management &amp; Business Development</span>'),
    ('<span class="hero-mark" aria-hidden="true">弐</span>', '<span class="hero-mark" aria-hidden="true" lang="ja">弐</span>'),
    ('<h1>経営・事業開発</h1>\n    <p class="en">MANAGEMENT &amp; BUSINESS DEVELOPMENT</p>', '<h1>Management &amp; Business Development</h1>'),
    ('経営戦略、事業再生、新規事業開発、事業構造の再設計、市場開拓など、企業・事業の再生と成長を支援する事業。\n      <strong>戦略図を描き、実行まで伴走します。</strong>',
     'Management strategy, turnarounds, new ventures, business restructuring and market development: we support the revival and growth of companies and their businesses.\n      <strong>We draw the strategy map and stay with you through execution.</strong>'),
    ('<h2 class="sec-title">支援の例</h2>', '<h2 class="sec-title">How we help</h2>'),
    ('<h3>飲食店のオペレーション支援</h3>\n        <p>仕込み・動線・シフト・提供までを現場で見直し、少ない人数でも回り、利益が残る店の動きをつくります。</p>',
     '<h3>Restaurant &amp; bar operations</h3>\n        <p>On site, we rework prep, floor flow, shifts and service so a small team can run the venue and still keep a profit.</p>'),
    ('<h3>カクテルレシピの開発</h3>\n        <p>現場で培った技術で、店やブランドの看板となる一杯を設計。原価と提供の手間まで含めて仕上げます。</p>',
     '<h3>Cocktail recipe development</h3>\n        <p>With skills built behind the bar, we design a signature drink for your venue or brand, accounting for cost and serving effort.</p>'),
    ('<h3>酒類メーカーのマーケティング支援</h3>\n        <p>日本市場への導入から、飲食店での扱われ方、発信の設計まで。現場目線でブランドの居場所をつくります。</p>',
     '<h3>Marketing for beverage makers</h3>\n        <p>From entering the Japanese market to how bars and restaurants handle your product and how you communicate, we build your brand’s place from the floor’s point of view.</p>'),
    ('<h3>収益構造の分析と再設計</h3>\n        <p>原価率・人件費率・客単価・回転率を分解し、赤字の本当の原因を特定して道筋を描きます。</p>',
     '<h3>Profit structure review</h3>\n        <p>We break down cost ratio, labor ratio, spend per guest and turnover, find the real cause of losses and chart a way forward.</p>'),
    ('<h3>メニュー・価格の再構築</h3>\n        <p>看板商品を軸に、原価と手間のバランスが取れたメニュー構成へ再設計します。</p>',
     '<h3>Menu &amp; pricing redesign</h3>\n        <p>Built around your signature items, we redesign the menu to balance cost and effort.</p>'),
    ('<h3>実行フェーズの現場伴走</h3>\n        <p>戦略図を渡すだけで終わりません。現場に入り込み、施策が定着するまで伴走します。</p>',
     '<h3>Hands-on execution support</h3>\n        <p>We don’t stop at handing over a strategy map. We work on site until the changes take hold.</p>'),
    ('<h2 class="sec-title">再生までの五手</h2>', '<h2 class="sec-title">Five Moves to Revival</h2>'),
    ('<h3>相談</h3>\n          <p>現状とお悩みを伺います。初回相談は無料です。</p>', '<h3>Consult</h3>\n          <p>We hear where you stand and what troubles you. The first consultation is free.</p>'),
    ('<h3>分析</h3>\n          <p>財務・メニュー・導線を診断し、傾きの正体を特定します。</p>', '<h3>Analyze</h3>\n          <p>We examine finances, menu and customer flow to find the real cause of the decline.</p>'),
    ('<h3>戦略設計</h3>\n          <p>再生の道筋を一枚の戦略図に。優先順位を明確にします。</p>', '<h3>Strategize</h3>\n          <p>We put the path to revival on a one-page strategy map with clear priorities.</p>'),
    ('<h3>実行</h3>\n          <p>現場に入り込み、施策をともに動かします。</p>', '<h3>Execute</h3>\n          <p>We step onto the floor and put the plan into motion with you.</p>'),
    ('<h3>改善</h3>\n          <p>数字を見ながら磨き込み、維持と持続のしくみへ。</p>', '<h3>Improve</h3>\n          <p>We refine by the numbers and build systems that maintain and sustain results.</p>'),
    ('<h2>その事業、まだ死んでいない。</h2>', '<h2>Your business isn’t dead yet.</h2>'),
    ('「まだ大丈夫」のうちに、一度お話ししませんか。初回のご相談は無料です。', 'Why not talk while things still feel manageable? The first consultation is free.'),
]

PAGES = {"index.html": TOP, "service-ip.html": IP, "service-support.html": SUPPORT}


def url(name, lang):
    path = "" if name == "index.html" else name
    return SITE + ("en/" if lang == "en" else "") + path


def build(name, pairs):
    html = (ROOT / name).read_text(encoding="utf-8")
    missing = []
    # ページ固有 → 共通の順（固有の長い文を先に置き換える）
    for old, new in pairs + COMMON:
        if old not in html:
            if (old, new) in pairs:
                missing.append(old)
            continue
        html = html.replace(old, new)

    html = html.replace('<html lang="ja">', '<html lang="en">', 1)
    # 飾りの漢字と人名は日本語のまま残し、日本語だと分かる印を付ける
    html = re.sub(r'<(span|div) class="(svc-num|step-kanji|detail-flow-num)"((?:(?!lang=)[^>])*)>', r'<\1 class="\2" lang="ja"\3>', html)
    html = re.sub(r'(<div class="fuda-name"><b)>', r'\1 lang="ja">', html)

    # 言語切り替え：EN → JPN
    ja_href = "../" if name == "index.html" else "../" + name
    html, n = re.subn(r'<a class="nav-cta lang-switch"[^>]*>EN</a>',
                      '<a class="nav-cta lang-switch" href="%s" hreflang="ja" aria-label="JPN: Japanese version">JPN</a>' % ja_href, html)
    if n != 1:
        missing.append("言語切り替えボタン")

    # canonical・OGP は英語版の自分自身を指す
    html = html.replace('<link rel="canonical" href="%s">' % url(name, "ja"), '<link rel="canonical" href="%s">' % url(name, "en"))
    html = html.replace('<meta property="og:url" content="%s">' % url(name, "ja"), '<meta property="og:url" content="%s">' % url(name, "en"))
    html = html.replace('content="%sogp.png"' % SITE, 'content="%sogp-en.png"' % SITE)
    # 構造化データ内のページURL
    if name != "index.html":
        html = html.replace('"url":"%s"' % url(name, "ja"), '"url":"%s"' % url(name, "en"))
        html = html.replace('"item":"%s"' % url(name, "ja"), '"item":"%s"' % url(name, "en"))
        html = html.replace('"item":"https://morinoa.com/"', '"item":"https://morinoa.com/en/"')
        html = html.replace('"item":"https://morinoa.com/#service"', '"item":"https://morinoa.com/en/#service"')

    # 共用ファイルは一つ上の階層を参照する
    html = re.sub(r'(href|src)="((?:css|js)/[^"]+|[\w-]+\.(?:png|jpg|svg|ico))"', r'\1="../\2"', html)
    # 英語版がまだないページは日本語版へ
    html = html.replace('href="irori.html"', 'href="../irori.html"').replace('href="world.html"', 'href="../world.html"')
    # 英語版だけの調整CSSを、最後に読み込む
    html = html.replace("</head>", '<link rel="stylesheet" href="../css/en.css?v=%s">\n</head>' % EN_CSS_VER)

    if missing:
        sys.exit("%s: 対訳の元の文が見つかりません:\n  - %s" % (name, "\n  - ".join(m[:90] for m in missing)))
    out = ROOT / "en" / name
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")

    # 残っている日本語を一覧にする（lang="ja" を付けた残し分は除く）
    body = re.sub(r"<(script|style)\b.*?</\1>|<!--.*?-->", "", html, flags=re.S)
    body = re.sub(r'<(\w+)[^>]*\slang="ja"[^>]*>.*?</\1>', "", body, flags=re.S)
    left = sorted(set(re.findall(r"[ぁ-んァ-ヶ一-龥][ぁ-んァ-ヶ一-龥ー。、・ 　]*", body)))
    print("%-22s ok  残る日本語: %s" % ("en/" + name, " / ".join(left) if left else "なし"))


if __name__ == "__main__":
    for page, table in PAGES.items():
        build(page, table)
