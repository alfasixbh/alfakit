<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'バックアップ',
        'navigation_label' => 'バックアップ',
    ],

    'table' => [
        'heading' => 'バックアップ',
        'columns' => [
            'name' => 'バックアップ',
            'disk' => 'ディスク',
            'date' => '日時',
            'size' => 'サイズ',
        ],
        'filters' => [
            'disk' => 'ディスク',
        ],
        'empty' => [
            'heading' => 'バックアップはまだありません',
            'description' => 'バックアップを作成するとここに表示されます。',
        ],
    ],

    'destinations' => [
        'heading' => 'バックアップ先',
        'label' => ':disk 上の :name',
        'healthy' => '正常',
        'unhealthy' => '異常',
        'unreachable' => '接続不可',
        'summary' => '{0} バックアップなし · 使用量 :size|{1} :count 件のバックアップ · 使用量 :size · 最新 :newest|[2,*] :count 件のバックアップ · 使用量 :size · 最新 :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'バックアップを作成',
            'modal_heading' => 'バックアップの作成',
            'modal_description' => 'バックアップはバックグラウンドで実行され、完了するとリストに表示されます。',
            'submit' => 'バックアップを作成',
            'option' => 'バックアップ対象',
            'options' => [
                'all' => 'データベースとファイル',
                'only_db' => 'データベースのみ',
                'only_files' => 'ファイルのみ',
            ],
            'notification' => 'バックグラウンドで新しいバックアップを作成しています',
        ],
        'download' => [
            'label' => 'ダウンロード',
        ],
        'delete' => [
            'label' => '削除',
            'modal_heading' => 'バックアップの削除',
            'modal_description' => ':name を削除しますか？この操作は元に戻せません。',
            'submit' => '削除',
            'notification' => 'バックアップを削除しました',
        ],
    ],
];
