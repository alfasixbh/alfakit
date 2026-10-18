<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'アクティビティ',
        'plural_label' => 'アクティビティ',
        'navigation_label' => 'アクティビティログ',
    ],

    'relation_manager' => [
        'title' => 'アクティビティ',
    ],

    'fields' => [
        'log_name' => 'ログ',
        'event' => 'イベント',
        'description' => '説明',
        'subject' => '対象',
        'subject_type' => '対象の種類',
        'causer' => '実行者',
        'created_at' => '日時',
        'created_from' => '開始日',
        'created_until' => '終了日',
        'changes' => '変更内容',
        'attribute' => '属性',
        'old' => '変更前の値',
        'new' => '変更後の値',
        'property' => 'プロパティ',
        'value' => '値',
    ],

    'sections' => [
        'overview' => '概要',
        'changes' => '変更内容',
        'properties' => 'プロパティ',
    ],

    'filters' => [
        'created_from_indicator' => ':date から',
        'created_until_indicator' => ':date まで',
    ],

    'events' => [
        'created' => '作成',
        'updated' => '更新',
        'deleted' => '削除',
        'restored' => '復元',
    ],

    'causer' => [
        'system' => 'システム',
    ],

    'timeline' => [
        'label' => 'アクティビティ',
        'empty' => 'アクティビティはまだありません。',
        'entry' => ':causer が:event',
    ],

    'empty' => [
        'heading' => 'アクティビティはまだありません',
        'description' => 'レコードへの変更がここに表示されます。',
    ],
];
