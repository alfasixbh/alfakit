<?php

declare(strict_types=1);

return [
    'label' => 'メールテンプレート',
    'plural_label' => 'メールテンプレート',
    'navigation' => 'メールテンプレート',
    'sections' => [
        'template' => 'メール',
        'template_description' => 'このバージョンのメールと言語を選択してください。',
        'content' => '内容',
        'content_description' => '件名または内容を空にすると、メール本来のものが使われます。',
    ],
    'fields' => [
        'key' => 'メール',
        'locale' => '言語',
        'subject' => '件名',
        'subject_help' => '差し込みタグはここでも使えます（例: :example）。',
        'subject_help_without_example' => '差し込みタグはここでも使えます。',
        'body' => '内容',
        'body_help' => 'ツールバーから差し込みタグを挿入します。送信時に実際の値に置き換えられます。',
        'merge_tags' => 'このメールの差し込みタグ:',
        'status' => '状態',
        'updated_at' => '更新日時',
    ],
    'statuses' => [
        'customized' => 'カスタマイズ済み',
        'default' => 'デフォルト',
    ],
    'empty' => [
        'heading' => 'カスタマイズされたメールはありません',
        'description' => 'メールをカスタマイズすると、1つの言語で件名と内容を変更できます。',
    ],
    'actions' => [
        'preview' => [
            'label' => 'プレビュー',
            'close' => '閉じる',
            'subject' => '件名:',
            'light' => 'ライト',
            'dark' => 'ダーク',
            'frame' => 'メールのプレビュー（:variant）',
            'error' => 'このメールをプレビューできませんでした。',
        ],
        'send_test' => [
            'label' => 'テスト送信',
            'modal_heading' => 'テストメールを送信しますか？',
            'modal_description' => '保存済みのバージョンがサンプルデータとともにあなた自身のアドレス :email に送信されます。',
            'submit' => 'テスト送信',
            'sent' => ':email にテストメールを送信しました。',
            'no_email' => 'アカウントにテスト送信先のメールアドレスがありません。',
        ],
        'reset' => [
            'label' => 'デフォルトに戻す',
            'modal_heading' => 'デフォルトのメールに戻しますか？',
            'modal_description' => 'メールは本来の件名と内容に戻ります。以前のバージョンは履歴に残ります。',
            'submit' => '戻す',
            'done' => 'メールをデフォルトに戻しました。',
        ],
    ],
    'test' => [
        'subject' => '[テスト] :subject',
    ],
    'validation' => [
        'unique' => 'このメールにはこの言語のテンプレートが既にあります。',
        'unknown_tags' => ':tags はこのメールの差し込みタグではありません。|:tags はこのメールの差し込みタグではありません。',
    ],
];
