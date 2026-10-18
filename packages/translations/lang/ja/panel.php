<?php

declare(strict_types=1);

return [
    'dashboard' => [
        'title' => 'ダッシュボード',
        'customize' => [
            'span' => '{1} :count 列|[2,*] :count 列',
            'span_full' => '全幅',
            'invalid' => 'このダッシュボードのレイアウトは無効です。',
        ],
    ],
    'global_search' => [
        'placeholder' => '検索…',
        'no_results' => '結果が見つかりません。',
    ],
    'resources' => [
        'list' => '一覧',
        'create' => [
            'title' => ':labelを作成',
            'breadcrumb' => '作成',
        ],
        'edit' => [
            'title' => ':labelを編集',
            'breadcrumb' => '編集',
        ],
        'view' => [
            'title' => ':labelを表示',
            'breadcrumb' => '表示',
        ],
        'api' => [
            'failed' => 'リクエストに失敗しました',
            'unreachable' => 'データソースに接続できませんでした。もう一度お試しください。',
            'error' => 'データソースがエラーを返しました (:status)。もう一度お試しください。',
            'invalid' => 'データソースがデータを拒否しました。',
        ],
    ],
    'tenancy' => [
        'switch' => 'チームを切り替え',
        'register' => '新規チーム',
        'profile' => 'チーム設定',
    ],
    'errors' => [
        'default' => [
            'title' => 'エラーが発生しました',
            'body' => 'リクエストを完了できませんでした。もう一度お試しください。',
        ],
        403 => [
            'title' => 'アクセスが拒否されました',
            'body' => 'この操作を行う権限がありません。',
        ],
        404 => [
            'title' => '見つかりません',
            'body' => 'お探しのページまたはレコードは存在しません。',
        ],
    ],
    'command_palette' => [
        'placeholder' => 'コマンドを入力または検索…',
        'create' => '新規 :label',
    ],
    'realtime' => [
        'conflict' => [
            'refused_title' => '保存されませんでした：レコードが変更されています',
            'refused_body' => '開いた後に他のユーザーがこのレコードを保存しました。変更を確認してから再度保存するか、自分の変更を保持してください。',
            'yes' => 'はい',
            'no' => 'いいえ',
        ],
    ],
    'themes' => [
        'neutral' => [
            'label' => 'ニュートラル',
            'description' => '定番のデザイン: サイドバーの横にインセットされたコンテンツ、シンプルなヘッダー、枠線付きのカード。',
        ],
        'alfakit' => [
            'label' => 'AlfaKit',
            'description' => 'AlfaKit ブランドを象徴するデザイン: 温かみのあるクリーム地に Alfa Navy と Fox Orange、Montserrat の見出しと Inter の本文、ピル型ナビゲーションのフローティングサイドバー、各ページのヒーローバナー、浮き上がったカード、塗りつぶし入力欄、ピル型ボタン。',
        ],
        'minimal' => [
            'label' => 'ミニマル',
            'description' => 'サイドバーなし: ナビゲーションは上部に下線付きタブとして並びます。細線のフラットな面、下線付きの入力欄、角張ったボタン、コンパクト。',
        ],
        'soft' => [
            'label' => 'ソフト',
            'description' => '細いアイコンレール、大きなセリフ体の見出し、色付きの枠なしカード、角丸の塗りつぶし入力欄、ストライプのテーブル。',
        ],
        'corporate' => [
            'label' => 'コーポレート',
            'description' => 'アクセントバー付きナビゲーションのネイビーのサイドバー、全幅のタイトル帯、角張った枠線付きの面、密なストライプのテーブル。',
        ],
        'filament' => [
            'label' => 'Filament スタイル',
            'description' => 'グレーのキャンバス、透明なサイドバー、リング付きの白いカード、アンバーのアクセントと Inter。FilamentPHP 風。',
        ],
    ],
    'pwa' => [
        'offline' => [
            'title' => 'オフライン',
            'heading' => 'オフラインです',
            'body' => '接続を確認してください。オンラインに戻ると、このページは自動的に再読み込みされます。',
            'retry' => '再試行',
        ],
    ],
];
