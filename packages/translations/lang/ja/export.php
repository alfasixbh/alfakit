<?php

declare(strict_types=1);

return [
    'label' => ':labelをエクスポート',
    'bulk_label' => '選択項目をエクスポート',
    'modal' => [
        'heading' => ':labelをエクスポート',
        'submit' => 'エクスポート',
        'columns' => '列',
        'description' => 'エクスポートはバックグラウンドで実行されます。ファイルの準備ができたら通知します。',
        'column_labels' => '列ラベル',
    ],
    'notifications' => [
        'started' => [
            'title' => 'エクスポートを開始しました',
            'body' => ':count 行をエクスポートしています。ファイルの準備ができたら通知します。',
        ],
        'completed' => [
            'title' => 'エクスポートが完了しました',
            'body' => '{0} エクスポートされた行はありません。|[1,*] :count 行をエクスポートしました。',
            'failed' => ':count 行が失敗しました。',
            'download_csv' => '.csv をダウンロード',
            'download_xlsx' => '.xlsx をダウンロード',
        ],
        'max_rows' => [
            'title' => '行数が多すぎます',
            'body' => '一度にエクスポートできるのは最大 :count 行です。',
        ],
    ],
];
