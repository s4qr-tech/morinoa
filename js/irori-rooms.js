/* 囲炉裏ページの「触れる部屋」の中身。
   ここを書き換えるだけで、天守の各階・城下町のPC画面に事業内容／活動履歴／メンバー紹介などを割り振れます。
   at: 'tier0'〜'tier5'（天守の下から1〜6階）／ 'pc'（城下町のPC画面。ランダムな場所に置かれます）
   kind: ラベル（事業内容・活動履歴・メンバー など）  title / body: 見出しと本文  link: 任意（'service-ip.html' など） */
window.IRORI_ROOMS = [
  { at: 'tier0', kind: '事業内容', title: 'IP・デザイン', body: 'IPの企画・ブランド設計・デザインで、事業の物語を形にします。', link: 'service-ip.html' },
  { at: 'tier1', kind: '事業内容', title: '経営・事業開発', body: '経営戦略から事業再生・新規事業まで、再生と成長を支援します。', link: 'service-support.html' },
  { at: 'tier2', kind: '活動履歴', title: '活動履歴', body: 'これからの活動を、ここに積み上げていきます。' },
  { at: 'tier3', kind: '事例・実績', title: '事例・実績', body: '再生・IP・デザインの取り組みを、ここに並べていきます。' },
  { at: 'tier4', kind: 'メンバー', title: 'MORINOA 一座', body: '戦略を描く者と、現場で実行する者。二つの座が一体となって動きます。', link: 'index.html#org' },
  { at: 'tier5', kind: 'ご相談', title: '軍議を申し込む', body: '事業の悩みや構想を、まずはお聞かせください。', link: 'https://forms.gle/eSTg1UBF56mVySoMA' },
  { at: 'pc', kind: 'メンバー', title: '大老のデスク', body: 'プロフィールは準備中です。' },
  { at: 'pc', kind: 'メンバー', title: '老中のデスク', body: 'プロフィールは準備中です。' },
  { at: 'pc', kind: 'メンバー', title: '奥絵師のデスク', body: 'プロフィールは準備中です。' },
  { at: 'pc', kind: '活動履歴', title: '活動ログ', body: '準備中です。' },
  { at: 'pc', kind: '事例・実績', title: '事例の画面', body: '準備中です。' },
  { at: 'pc', kind: '事業内容', title: '事業の画面', body: '準備中です。' }
];
