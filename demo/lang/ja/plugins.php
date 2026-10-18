<?php

declare(strict_types=1);

/*
 * Japanese strings of the first-party plugin integration. Keys match lang/en/plugins.php.
 */
return [
    'commands' => [
        'group' => 'Maison Alfa',
        'order_board' => '注文ボードを開く',
        'calendar' => 'ストアのカレンダーを開く',
        'returns' => '返品を確認',
        'category_tree' => 'カテゴリツリーを整理',
        'new_product' => '商品を追加',
        'storefront' => 'ストアフロントを開く',
    ],

    'board' => [
        'title' => '注文ボード',
        'subheading' => '注文を出荷フローに沿ってドラッグするか、キーボード（Space、矢印キー、Space）で移動します。直近 60 日分。',
        'open' => 'ボード',
        'timeline_note' => ':user が注文ボードで移動',
    ],

    'calendar' => [
        'title' => 'カレンダー',
        'subheading' => 'このストアのキャンペーン、発送、配達、公開予定のページ。',
        'this_week' => '今週',
        'new_promotion' => 'キャンペーンを計画',
        'hint' => 'キャンペーンをドラッグして移動、終端をドラッグして期間を変更、クリックして編集、日付を選択して新規に計画できます。',
        'fields' => [
            'value' => '値（% または金額）',
        ],
        'legend' => [
            'label' => '凡例',
            'percentage' => 'キャンペーン: 割合割引',
            'fixed' => 'キャンペーン: 金額割引',
            'free_shipping' => 'キャンペーン: 送料無料',
            'shipped' => 'ブティックから発送',
            'delivered' => '配達済み',
            'publish' => '公開予定のページ',
        ],
        'events' => [
            'shipped' => ':number 発送（:carrier）',
            'delivered' => ':number 配達済み',
            'publish' => '公開: :title',
        ],
    ],

    'returns' => [
        'label' => '返品',
        'plural' => '返品',
        'workflow' => '返品承認',
        'subheading' => 'サポートが注文から返品を作成して申請し、オーナーまたはマネージャーが承認画面で承認します。承認された返品は返金されます。',
        'empty' => '返品はまだありません',
        'request' => '返品を申請',
        'request_heading' => '注文 :number の返品',
        'created' => '返品 :number を作成しました。内容がそろったら承認を申請してください。',
        'timeline_note' => '返品 :number により返金',
        'states' => [
            'requested' => '申請済み',
            'awaiting_approval' => '承認待ち',
            'approved' => '承認済み',
            'rejected' => '却下',
            'refunded' => '返金済み',
            'closed' => '完了',
        ],
        'transitions' => [
            'submit' => '承認を申請',
            'refund' => '返金',
            'reopen' => '再開',
            'close' => '完了にする',
        ],
        'steps' => [
            'manager' => 'マネージャー承認',
        ],
        'reasons' => [
            'damaged' => '輸送中の破損',
            'wrong_item' => '商品違い',
            'not_as_described' => '説明と異なる',
            'allergy' => '肌の反応',
            'changed_mind' => '気が変わった',
        ],
        'fields' => [
            'number' => '返品',
            'state' => '状態',
            'reason' => '理由',
            'amount' => '返金額',
            'details' => '詳細',
            'requested_by' => '作成者',
            'refund_reference' => '返金参照番号',
        ],
        'sections' => [
            'workflow' => 'ワークフロー',
            'history' => '履歴',
            'details' => '返品',
        ],
    ],

    'invoices' => [
        'issue' => '請求書を発行',
        'open' => '請求書を開く',
        'issue_description' => '注文明細から、ストアの税率に基づく付加価値税を含む請求書を作成します。',
        'notes' => '注文 :number の請求書です。Maison Alfa をご利用いただきありがとうございます。',
        'terms' => 'お支払い期限は 14 日以内です。AlfaKit デモのサンプル書類です。',
    ],

    'comments' => [
        'section' => '社内コメント',
        'section_description' => 'スタッフにのみ表示されます。@ を入力すると同僚をメンションでき、ベルで通知されます。',
    ],

    'activity' => [
        'section' => '監査ログ',
    ],

    'helpdesk' => [
        'greeting' => 'こんにちは。香りやご注文について何でもお尋ねください。',
    ],

    'tree' => [
        'title' => 'カテゴリツリー',
        'subheading' => 'カテゴリをドラッグして入れ子にしたり並べ替えたりし（矢印ボタンも使えます）、保存してください。カテゴリはすべてのストアで共有されます。',
        'open' => 'ツリー表示',
    ],

    'tags' => [
        'segments' => 'セグメント',
    ],

    'media' => [
        'gallery' => 'ライフスタイルギャラリー',
        'gallery_description' => 'メディアライブラリに保存された追加画像（上の商品画像とは別）。',
    ],

    'views' => [
        'low_stock' => '在庫僅少',
        'featured' => 'おすすめ',
        'drafts' => '下書き',
    ],

    'ai' => [
        'summarise_reviews' => 'レビューを要約',
        'summarise_heading' => ':name についてのお客様の声',
        'summarise_prompt' => '香水「:name」に寄せられたこれらのレビューを、気に入られている点、批判されている点、どんな人に合うかの 3 つの短い箇条書きで要約してください。',
    ],

    'settings' => [
        'title' => 'メゾンの設定',
        'subheading' => 'Maison Alfa のすべてのストアで共有されます。ストアフロントにお知らせが表示されます。',
        'sections' => [
            'brand' => 'メゾンとストアフロント',
            'notifications' => '通知',
        ],
        'fields' => [
            'house_name' => 'メゾン名',
            'announcement' => 'ストアフロントのお知らせ',
            'announcement_help' => 'ストアの全ページ上部に表示されます。空欄にすると非表示になります。',
            'support_hours' => 'サポート受付時間',
            'price_display' => 'ストアフロントの価格表示',
            'low_stock_alerts' => '在庫僅少アラート',
            'weekly_report' => '週次売上レポート',
            'report_recipients' => 'レポートの送信先',
            'report_recipients_help' => 'メールアドレス（デモではメールはログにのみ書き込まれます）。',
        ],
        'price_display' => [
            'tax_inclusive' => '税込み',
            'tax_exclusive' => '税抜き',
        ],
    ],

    'backups' => [
        'read_only' => '公開デモでは読み取り専用です。バックアップの作成、ダウンロード、削除は無効になっています。デモのデータベースは 1 時間ごとに再構築されます。',
    ],

    'billing' => [
        'compare_plans' => 'プランを比較',
        'compare_plans_body' => 'Billing プラグインのプランページには、各プランと機能が一覧表示されます。デモで支払いが発生することはありません。',
        'see_plans' => 'プランを見る',
        'checkout_disabled' => '公開デモでは決済が無効になっています',
        'checkout_disabled_body' => ':plan プランを選択しました。実際のショップならここで Stripe Checkout が開きますが、デモが決済プロバイダーに接続することはありません。',
        'contact' => 'お問い合わせ',
        'plans' => [
            'boutique' => 'ブティック 1 店舗とそのオンラインショップ。',
            'maison' => 'カタログとレポートを共有する複数のブティック。',
            'enterprise' => 'フランチャイズ、カスタム連携、SSO。',
        ],
        'features' => [
            'boutique' => ['ストア 1 店舗', 'スタッフアカウント 5 件', 'メールサポート'],
            'maison' => ['ストア無制限', 'スタッフ無制限', 'ヘルプデスクと分析', '優先サポート'],
            'enterprise' => ['専任サクセスマネージャー', 'カスタム連携', 'シングルサインオン'],
        ],
    ],

    'storefront' => [
        'pages' => '私たちについて',
        'wholesale' => '卸売',
        'support' => 'サポート',
        'chat' => 'チャットで相談',
        'wholesale_title' => '卸売のお問い合わせ',
        'wholesale_intro' => 'ホテル、スパ、コンセプトストア、法人ギフト向け。このフォームはパネル上で Forms プラグインを使って作成されています（2 ステップ、条件付きの質問、スパム対策）。',
        'wholesale_unavailable' => '卸売のお問い合わせは現在受付を停止しています。',
        'support_title' => 'カスタマーケア',
        'support_intro' => 'Helpdesk プラグインのカスタマーポータル。チケットを作成し、やり取りを確認し、回答を評価できます。',
        'new_checkout' => '新しい決済画面（ベータ）',
        'cms_intro' => 'このページは CMS プラグインで管理されています。ブロック、下書き、ライブプレビュー、サインイン中のスタッフ向け編集バー。',
    ],
];
