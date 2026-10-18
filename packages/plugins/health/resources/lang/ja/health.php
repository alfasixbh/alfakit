<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'アプリケーションの状態',
        'navigation_label' => 'ヘルス',
        'last_ran' => ':time にチェック済み',
        'never_ran' => 'チェックはまだ実行されていません。',
    ],

    'results' => [
        'details' => '詳細',
        'columns' => [
            'check' => 'チェック',
            'status' => 'ステータス',
            'summary' => '概要',
            'message' => 'メッセージ',
            'meta' => '詳細',
        ],
        'empty' => [
            'heading' => '結果はまだありません',
            'description' => '更新するとヘルスチェックを実行します。',
        ],
    ],

    'statuses' => [
        'ok' => 'OK',
        'warning' => '警告',
        'failed' => '失敗',
        'crashed' => 'クラッシュ',
        'skipped' => 'スキップ',
        'unknown' => '不明',
    ],

    'actions' => [
        'refresh' => [
            'label' => '更新',
            'notification' => 'ヘルスチェックを更新しました',
        ],
    ],

    'checks' => [
        'backups' => 'バックアップ',
        'cache' => 'キャッシュ',
        'cpu_load' => 'CPU 負荷',
        'database' => 'データベース',
        'database_connection_count' => 'データベース接続数',
        'database_size' => 'データベースのサイズ',
        'database_table_size' => 'テーブルのサイズ',
        'debug_mode' => 'デバッグモード',
        'environment' => '環境',
        'flare_error_occurrence_count' => 'Flare のエラー',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'アプリの最適化',
        'ping' => 'Ping',
        'queue' => 'キュー',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Redis のメモリ使用量',
        'schedule' => 'スケジュール',
        'security_advisories' => 'セキュリティ勧告',
        'used_disk_space' => 'ディスク使用量',
    ],

    'widget' => [
        'label' => 'アプリケーションの状態',
        'ok' => 'すべてのチェックに合格しました',
        'failing' => '{1} :count 件のチェックが失敗|[2,*] :count 件のチェックが失敗',
        'warnings' => '{1} :count 件の警告|[2,*] :count 件の警告',
        'never_ran' => '未チェック',
    ],
];
