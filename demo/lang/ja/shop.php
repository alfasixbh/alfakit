<?php

declare(strict_types=1);

/*
 * Japanese storefront strings. Keys match lang/en/shop.php (tests/Feature/ShopTranslationParityTest.php).
 */
return [
    'attributes' => [
        'name' => '名前',
        'rating' => '評価',
        'review' => 'レビュー',
    ],

    'locale' => [
        'label' => '言語',
    ],

    'strip' => [
        'eyebrow' => 'AlfaKit で構築',
        'title' => 'ひとつのパネル定義、3 つのフロントエンド。',
        'body' => 'ここに表示されているものはすべて同じ PHP スキーマからレンダリングされています。レンダラーを切り替えると、同じマークアップ、同じスタイル、同じ動作のまま React、Vue、Svelte でページが再読み込みされます。',
        'cta' => 'レンダラーを切り替える',
        'hint' => '現在 :renderer 版を表示しています。',
        'mascot_alt' => 'AlfaKit のキツネのマスコット',
    ],

    'newsletter' => [
        'heading' => 'アトリエからの便り',
        'body' => '新しい香りが届いたときにお知らせします。月に 2 回まで。',
        'label' => 'メールアドレス',
        'placeholder' => 'you@example.com',
        'submit' => '登録する',
        'duplicate' => 'このアドレスはすでに登録されています。',
        'thanks' => [
            'title' => '登録が完了しました',
            'body' => 'Maison Alfa からの次の便りを真っ先にお届けします。',
        ],
    ],

    'product' => [
        'back' => 'すべての商品',
        'by' => ':brand',
        'sku' => '品番',
        'gallery' => 'ギャラリー',
        'image_of' => ':name、画像 :index',
        'sizes' => 'サイズ',
        'choose_size' => 'サイズを選択',
        'stock' => [
            'in' => '在庫あり',
            'low' => '残りわずか（:count 点）',
            'out' => '完売',
        ],
        'notes' => [
            'heading' => '香りの構成',
            'top' => 'トップノート',
            'heart' => 'ミドルノート',
            'base' => 'ラストノート',
        ],
        'details' => [
            'heading' => '詳細',
            'concentration' => '濃度',
            'audience' => '対象',
            'size' => 'サイズ',
            'category' => 'カテゴリ',
            'tags' => 'タグ',
        ],
        'enquire' => 'この香りについて問い合わせる',
        'track' => '注文を追跡',
        'reviews' => [
            'heading' => 'レビュー',
            'count' => '{0} レビューはまだありません|{1} レビュー 1 件|[2,*] レビュー :count 件',
            'average' => '5 点中 :average 点',
            'empty' => 'レビューはまだありません。最初に香りの印象を投稿してみませんか。',
            'verified' => '購入者のレビュー',
            'guest' => 'ゲスト',
            'write' => 'レビューを書く',
            'write_help' => 'レビューはスタッフが確認し、通常 1 日以内に管理パネルから公開されます。',
        ],
        'related' => 'こちらもおすすめ',
        'compare' => '通常価格 :price',
        'currency_note' => '価格は米ドル表示、税込みです。',
    ],

    'review' => [
        'fields' => [
            'rating' => 'あなたの評価',
            'name' => 'お名前',
            'email' => 'メール',
            'email_help' => '公開されることはありません。当店でこの香りをご購入いただいた場合、レビューは購入者のレビューとして表示されます。',
            'title' => '見出し',
            'body' => 'レビュー本文',
        ],
        'submit' => 'レビューを送信',
        'thanks' => [
            'title' => ':name さん、ありがとうございます',
            'body' => 'レビューはスタッフに届きました。管理パネルで承認されると表示されます。',
        ],
    ],

    'contact' => [
        'heading' => 'メゾンへのお問い合わせ',
        'intro' => 'ご注文について、見つからない香り、卸売、プレス関係など、マナーマのチームがすべてのメッセージに目を通し、2 営業日以内にご返信します。',
        'form_heading' => 'メッセージを送る',
        'form_help' => 'これは AlfaKit のスタンドアロンフォームです。検証はサーバーで行われ、トピックを選ぶと注文番号の欄が表示され、送信ボタンには回数制限があります。',
        'details' => [
            'heading' => 'ブティック',
            'email' => 'メール',
            'phone' => '電話',
            'hours' => '営業時間',
            'hours_value' => '土曜〜木曜、10:00〜22:00',
            'address' => 'Bahrain Bay、マナーマ',
        ],
        'fields' => [
            'name' => 'お名前',
            'email' => 'メール',
            'topic' => 'トピック',
            'order_number' => '注文番号',
            'message' => 'メッセージ',
            'message_help' => '20 文字以上。お問い合わせの香りや注文を明記してください。',
        ],
        'topics' => [
            'order' => 'ご注文について',
            'product' => '商品について',
            'wholesale' => '卸売',
            'press' => 'プレス',
            'other' => 'その他',
        ],
        'prefill' => ':product について詳しく知りたいです。',
        'submit' => 'メッセージを送信',
        'mail_subject' => 'Maison Alfa へのお問い合わせ: :topic',
        'thanks' => [
            'title' => ':name さん、ありがとうございます',
            'body' => '2 営業日以内に :email 宛てにご返信します。',
        ],
        'rate_limited' => 'すでに複数のメッセージを送信されています',
    ],

    'track' => [
        'heading' => '注文を追跡',
        'intro' => 'ご購入時のメールアドレスと、確認メールに記載の注文番号を入力してください。そのアカウントのすべての注文と、指定した注文の配送状況をご確認いただけます。',
        'fields' => [
            'email' => 'ご購入時のメールアドレス',
            'number' => '注文番号',
            'submit' => '注文を検索',
        ],
        'sample' => [
            'heading' => '実際の注文で試す',
            'body' => 'これはデモショップです。検索できるサンプル注文はこちら:',
            'use' => 'この注文を使う',
        ],
        'not_found' => [
            'heading' => '注文が見つかりませんでした',
            'body' => 'メールアドレスと注文番号をご確認いただくか、下のサンプル注文をお使いください。',
        ],
        'orders' => [
            'heading' => 'ご注文一覧',
            'description' => ':name さんのすべての注文です。注文をクリックすると経過を確認できます。',
            'number' => '注文',
            'placed' => '注文日',
            'items' => '商品数',
            'status' => 'ステータス',
            'total' => '合計',
            'search' => '注文番号で検索',
        ],
        'timeline' => [
            'heading' => '注文 :number',
            'description' => 'ご購入からお届けまでのすべてのステップ。',
            'steps' => '経過',
            'carrier' => '配送業者',
            'tracking' => '追跡番号',
            'ship_to' => 'お届け先',
            'no_shipment' => '未発送',
            'no_tracking' => '発送後に表示されます',
        ],
        'components_note' => '注文テーブルと経過表示は AlfaKit のスタンドアロンコンポーネントです。ショップのレイアウト内で Table と Infolist をレンダリングしています。',
    ],
];
