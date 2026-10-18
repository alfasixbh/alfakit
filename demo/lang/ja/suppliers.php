<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => '仕入先',
    'plural' => '仕入先',
    'navigation' => '仕入先',
    'intro' => '仕入先はデータベースではなく外部 API（デモが /demo-api/suppliers で提供）にあります。API は独自に検証を行います。既存の名前を入力してみてください。',
    'fields' => [
        'name' => '名前',
        'email' => '発注用メール',
        'country' => '国',
        'category' => 'カテゴリ',
        'status' => 'ステータス',
        'lead_time_days' => 'リードタイム',
        'rating' => '評価',
        'notes' => 'メモ',
        'updated_at' => '更新日時',
    ],
    'sections' => [
        'supplier' => '仕入先',
        'terms' => '取引条件',
    ],
    'lead_time' => '{1} :count 日|[2,*] :count 日',
    'categories' => [
        'oud' => 'ウード',
        'florals' => 'フローラル',
        'resins' => 'レジン',
        'citrus' => 'シトラス',
        'packaging' => 'パッケージ',
    ],
    'statuses' => [
        'active' => '有効',
        'paused' => '一時停止',
    ],
    'helper' => [
        'country' => '2 文字の ISO コード（例: FR）。',
    ],
];
