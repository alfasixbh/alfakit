<?php

declare(strict_types=1);

/*
 * Japanese demo strings. Keys must match lang/en/demo.php (tests/Feature/TranslationParityTest.php).
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => 'バーレーンで厳選した香水とライフスタイル。',

    'navigation' => [
        'catalog' => 'カタログ',
        'sales' => '販売',
        'customers' => '顧客',
        'marketing' => 'マーケティング',
        'reports' => 'レポート',
        'settings' => '設定',
        'showcase' => 'ショーケース',
        'support' => 'サポート',
        'content' => 'コンテンツ',
        'system' => 'システム',
    ],

    'switcher' => [
        'label' => 'レンダラー',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer（現在）',
    ],

    'design' => [
        'theme' => 'テーマ',
        'mobile_preset' => 'モバイルプリセット',
        'mobile_on' => 'スマートフォンでは下部ナビゲーション',
        'mobile_off' => 'スマートフォンではドロワー',
    ],

    'footer' => [
        'note' => 'AlfaKit デモ · 1 時間ごとにリセット',
        'docs' => 'ドキュメント',
    ],

    'meta' => [
        'site' => 'AlfaKit デモ',
        'title' => 'Maison Alfa · AlfaKit デモ',
        'panel_title' => 'Maison Alfa 管理画面 · AlfaKit デモ',
        'description' => 'AlfaKit で構築した架空の香水ショップ。ひとつの Laravel 管理パネル定義を React、Vue、Svelte でレンダリングします。共有デモアカウントでサインインしてください。データは 1 時間ごとにリセットされます。',
    ],

    'reset' => [
        'in' => ':minutes 分後にリセット',
        'soon' => '1 分以内にリセット',
        'title' => 'デモのデータベースとアップロードファイルは毎正時に復元されます。',
    ],

    'profile' => [
        'locked_heading' => 'これは共有のデモアカウントです',
        'locked_body' => '次の訪問者がサインインできるよう、メールアドレスとパスワードは変更されません。表示名は変更できます。',
        'mfa_heading' => '二要素認証',
        'mfa_body' => '共有アカウントでは設定が無効になっています。認証アプリやメールのコードを試すには、設定 › スタッフから同僚になりすましてください。',
    ],

    'errors' => [
        'back_home' => 'ショップに戻る',
        'open_admin' => '管理パネルを開く',
        '403' => ['title' => 'このアカウントでは利用できません', 'body' => 'このストアでのあなたのロールには、このページが含まれていません。ストアを切り替えるか、オーナーにアクセスを依頼してください。'],
        '404' => ['title' => 'ページが見つかりません', 'body' => 'ページが移動したか、1 時間ごとのリセットでレコードが削除された可能性があります。'],
        '419' => ['title' => 'ページの有効期限切れ', 'body' => 'セッションがタイムアウトしました。ページを再読み込みしてもう一度お試しください。'],
        '429' => ['title' => '少しペースを落としてください', 'body' => '短時間にリクエストが多すぎます。しばらく待ってからもう一度お試しください。'],
        '500' => ['title' => '問題が発生しました', 'body' => 'エラーは記録されました。しばらくしてからもう一度お試しください。'],
        '503' => ['title' => 'まもなく再開します', 'body' => 'デモを更新しています。1 分ほどで再開します。'],
    ],

    'login' => [
        'about' => 'Maison Alfa は架空の香水ショップです。管理パネルは AlfaKit で構築され、React、Vue、Svelte のいずれかでレンダリングされます。',
        'heading' => 'デモアカウント',
        'hint' => ':email とパスワード :password でサインインしてください。変更内容はすべて 1 時間ごとにリセットされます。',
        'fill' => 'デモアカウントを使う',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => 'ホーム',
            'contact' => 'お問い合わせ',
            'track' => '注文を追跡',
            'admin' => '管理パネルを開く',
        ],
        'hero' => [
            'eyebrow' => 'AlfaKit デモショップ',
            'title' => '物語のある香り、芯のあるソフトウェア。',
            'body' => 'Maison Alfa は、AlfaKit がレンダリングできるものを紹介するための架空の香水メゾンです。ひとつの Laravel アプリケーション、ひとつの管理パネル定義、3 つのフロントエンド。ショップを見てから、同じパネルを React、Vue、Svelte で開いてみてください。',
            'cta' => '管理パネルを開く',
            'secondary' => 'ドキュメントを読む',
        ],
        'featured' => '今シーズンのおすすめ',
        'from' => ':price から',
        'notes' => 'トップ :top · ミドル :heart · ラスト :base',
        'by' => ':brand',
        'empty' => 'おすすめ商品はまだありません。php artisan demo:reset を実行してショップにデータを投入してください。',
        'footer' => [
            'beta' => 'AlfaKit パブリックベータ',
            'built' => 'Alfa Six が AlfaKit で構築。架空のショップ、本物のソフトウェア。',
            'renderer' => ':renderer でレンダリング',
        ],
    ],

    'product_status' => [
        'draft' => '下書き',
        'active' => '公開中',
        'archived' => 'アーカイブ済み',
    ],
    'order_status' => [
        'pending' => '保留中',
        'paid' => '支払い済み',
        'processing' => '処理中',
        'shipped' => '発送済み',
        'delivered' => '配達済み',
        'cancelled' => 'キャンセル',
        'refunded' => '返金済み',
    ],
    'payment_method' => [
        'card' => 'カード',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => '銀行振込',
        'cash_on_delivery' => '代金引換',
    ],
    'payment_status' => [
        'pending' => '保留中',
        'captured' => '売上確定',
        'failed' => '失敗',
        'refunded' => '返金済み',
    ],
    'shipment_status' => [
        'pending' => '保留中',
        'in_transit' => '輸送中',
        'delivered' => '配達済み',
        'returned' => '返送済み',
    ],
    'review_status' => [
        'pending' => '承認待ち',
        'approved' => '承認済み',
        'rejected' => '却下',
    ],
    'discount_type' => [
        'percentage' => '割合',
        'fixed' => '固定額',
        'free_shipping' => '送料無料',
    ],
    'staff_role' => [
        'owner' => 'オーナー',
        'manager' => 'マネージャー',
        'staff' => 'スタッフ',
    ],
    'concentration' => [
        'extrait' => 'エクストレ・ド・パルファム',
        'parfum' => 'パルファム',
        'eau_de_parfum' => 'オードパルファム',
        'eau_de_toilette' => 'オードトワレ',
        'body_mist' => 'ボディミスト',
        'candle' => 'アロマキャンドル',
        'diffuser' => 'リードディフューザー',
    ],
    'audience' => [
        'unisex' => 'ユニセックス',
        'women' => 'ウィメンズ',
        'men' => 'メンズ',
    ],

    'timeline' => [
        'placed' => '注文受付',
        'paid' => '支払い確定',
        'processing' => 'ピッキング・梱包済み',
        'shipped' => ':carrier に引き渡し',
        'delivered' => '配達済み',
        'cancelled' => 'お客様によるキャンセル',
        'refunded' => '返金処理済み',
    ],
];
