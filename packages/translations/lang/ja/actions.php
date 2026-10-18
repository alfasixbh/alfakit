<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => 'この操作を実行してもよろしいですか？',
        'confirm' => '確認',
        'submit' => '送信',
        'cancel' => 'キャンセル',
        'close' => '閉じる',
    ],
    'create' => [
        'label' => ':labelを新規作成',
        'modal' => [
            'heading' => ':labelを作成',
            'submit' => '作成',
        ],
        'notification' => '作成しました',
        'create_another' => '作成して続けて作成',
    ],
    'edit' => [
        'label' => '編集',
        'modal' => [
            'heading' => ':labelを編集',
            'submit' => '保存',
        ],
        'notification' => '保存しました',
    ],
    'view' => [
        'label' => '表示',
        'modal' => [
            'heading' => ':labelを表示',
        ],
    ],
    'delete' => [
        'label' => '削除',
        'modal' => [
            'heading' => ':labelを削除',
            'submit' => '削除',
        ],
        'notification' => '削除しました',
        'bulk' => [
            'heading' => '選択したレコードを削除',
            'notification' => '削除しました',
        ],
    ],
    'restore' => [
        'label' => '復元',
        'modal' => [
            'heading' => ':labelを復元',
            'submit' => '復元',
        ],
        'notification' => '復元しました',
        'bulk' => [
            'heading' => '選択したレコードを復元',
            'notification' => '復元しました',
        ],
    ],
    'force_delete' => [
        'label' => '完全に削除',
        'modal' => [
            'heading' => ':labelを完全に削除',
            'description' => 'この操作は元に戻せません。',
            'submit' => '削除',
        ],
        'notification' => '完全に削除しました',
        'bulk' => [
            'heading' => '選択したレコードを完全に削除',
            'notification' => '完全に削除しました',
        ],
    ],
    'replicate' => [
        'label' => '複製',
        'modal' => [
            'heading' => ':labelを複製',
            'submit' => '複製',
        ],
        'notification' => '複製しました',
    ],
    'attach' => [
        'label' => '紐付け',
        'modal' => [
            'heading' => ':labelを紐付け',
            'submit' => '紐付け',
        ],
        'notification' => '紐付けました',
    ],
    'detach' => [
        'label' => '紐付け解除',
        'modal' => [
            'heading' => ':labelの紐付けを解除',
            'submit' => '解除',
        ],
        'notification' => '紐付けを解除しました',
    ],
    'associate' => [
        'label' => '関連付け',
        'modal' => [
            'heading' => ':labelを関連付け',
            'submit' => '関連付け',
        ],
        'notification' => '関連付けました',
    ],
    'dissociate' => [
        'label' => '関連付け解除',
        'modal' => [
            'heading' => ':labelの関連付けを解除',
            'submit' => '解除',
        ],
        'notification' => '関連付けを解除しました',
    ],
    'detach_bulk' => [
        'heading' => '選択したレコードの関連付けを解除',
        'notification' => '関連付けを解除しました',
    ],
    'dissociate_bulk' => [
        'heading' => '選択したレコードの紐付けを解除',
        'notification' => '紐付けを解除しました',
    ],
    'rate_limited' => [
        'title' => '試行回数が多すぎます',
        'body' => ':seconds 秒待ってからもう一度お試しください。|:seconds 秒待ってからもう一度お試しください。',
    ],
    'password_confirmation' => [
        'incorrect' => 'パスワードが正しくありません。',
        'throttled' => '試行回数が多すぎます。:seconds 秒後にもう一度お試しください。',
    ],
    'bulk' => [
        'unauthorized_records' => '変更する権限がないため、選択した :count 件のレコードをスキップしました。|変更する権限がないため、選択した :count 件のレコードをスキップしました。',
        'all_failed' => 'レコードを処理できませんでした。|:count 件のレコードをいずれも処理できませんでした。',
        'some_failed' => ':total 件中 :failure 件を処理できませんでした。|:total 件中 :failure 件を処理できませんでした。',
    ],
    'history' => [
        'label' => '履歴',
        'modal' => [
            'heading' => ':label の履歴',
            'close' => '閉じる',
        ],
        'empty' => 'まだバージョンはありません。',
        'events' => [
            'created' => '作成',
            'updated' => '更新',
            'deleted' => '削除',
            'restored' => '復元',
            'reverted' => '以前のバージョンを復元',
        ],
        'restore' => [
            'label' => 'このバージョンを復元',
            'modal' => [
                'heading' => 'このバージョンを復元しますか？',
                'description' => '追跡対象のフィールドがこのバージョンの値に戻ります。現在の値は履歴に残ります。',
                'submit' => '復元',
            ],
            'notification' => 'バージョンを復元しました',
        ],
    ],
    'undo' => [
        'done' => '完了',
        'notification' => '元に戻しました',
        'expired' => 'これはもう元に戻せません。',
        'conflict' => 'レコードがその後変更されたため、元に戻せません。',
        'unavailable' => 'レコードが存在しないため、元に戻せません。',
    ],
];
