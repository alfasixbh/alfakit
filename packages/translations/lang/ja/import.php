<?php

declare(strict_types=1);

return [
    'label' => ':labelをインポート',
    'column_number' => '列 :number',
    'modal' => [
        'heading' => ':labelをインポート',
        'max_rows' => 'ファイルには最大 :count 行まで含めることができます。',
        'submit' => 'インポート',
        'file' => 'CSV ファイル',
        'columns' => '列',
        'skip_column' => 'インポートしない',
        'example' => 'サンプル CSV をダウンロード',
    ],
    'validation' => [
        'max_rows' => 'ファイルに含められるのは最大 :count 行です。',
    ],
    'notifications' => [
        'started' => [
            'title' => 'インポートを開始しました',
            'body' => ':count 行をインポートしています。完了したら通知します。',
        ],
        'completed' => [
            'title' => 'インポートが完了しました',
            'body' => '{0} インポートされた行はありません。|[1,*] :count 行をインポートしました。',
            'failed' => ':count 行が失敗しました。',
            'download_failed_rows' => '失敗した行をダウンロード',
        ],
    ],
    'failures' => [
        'record_not_found' => '更新するレコードが見つかりませんでした。',
        'relationship_not_found' => '「:value」に一致する :attribute がありません。',
        'unauthorized' => 'このレコードを更新する権限がありません。',
        'unexpected' => 'この行をインポートできませんでした。',
    ],
    'failed_rows' => [
        'error' => 'エラー',
    ],
];
