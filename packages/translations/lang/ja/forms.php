<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'はい',
            'false' => 'いいえ',
        ],
        'placeholder' => '選択してください',
        'search_prompt' => '入力して検索…',
        'no_search_results' => '検索条件に一致する選択肢がありません。',
        'loading' => '読み込み中…',
    ],
    'key_value' => [
        'key' => 'キー',
        'value' => '値',
        'add' => '行を追加',
        'delete' => '行を削除',
        'reorder' => '並べ替え',
    ],
    'repeater' => [
        'cannot_add' => ':attributeに項目を追加することはできません。',
        'cannot_delete' => ':attributeから項目を削除することはできません。',
        'cannot_reorder' => ':attributeの項目は並べ替えできません。',
        'add' => ':labelに追加',
        'delete' => '削除',
        'clone' => '複製',
        'move_up' => '上へ移動',
        'move_down' => '下へ移動',
        'collapse' => '折りたたむ',
        'expand' => '展開',
        'reorder' => '並べ替え',
        'collapse_all' => 'すべて折りたたむ',
        'expand_all' => 'すべて展開',
    ],
    'wizard' => [
        'next' => '次へ',
        'previous' => '戻る',
        'submit' => '送信',
    ],
    'file_upload' => [
        'drop' => 'ファイルをドラッグ＆ドロップ、または',
        'browse' => '参照',
        'uploading' => 'アップロード中…',
        'remove' => '削除',
        'download' => 'ダウンロード',
        'too_large' => 'ファイルサイズが大きすぎます。',
        'invalid_type' => 'このファイル形式は許可されていません。',
        'too_small' => 'このファイルは小さすぎます。',
        'unavailable' => 'このアップロードは利用できなくなりました。もう一度アップロードしてください。',
        'invalid_dimensions' => '画像のサイズが許可されていません。',
        'invalid_aspect_ratio' => '画像のアスペクト比が許可されていません。',
        'chunk_failed' => 'アップロードが完了していません。もう一度ファイルをアップロードしてください。',
    ],
    'tags_input' => [
        'placeholder' => 'タグを追加…',
    ],
    'rich_editor' => [
        'link_prompt' => 'URLを入力',
        'insert_block' => ':blockを挿入',
        'edit_block' => ':blockを編集',
        'save_block' => '保存',
        'insert' => '挿入',
        'text_colors' => [
            'red' => '赤',
            'orange' => 'オレンジ',
            'amber' => 'アンバー',
            'green' => '緑',
            'teal' => 'ティール',
            'blue' => '青',
            'indigo' => 'インディゴ',
            'purple' => '紫',
            'pink' => 'ピンク',
            'gray' => 'グレー',
        ],
    ],
    'actions' => [
        'save' => '変更を保存',
        'create' => '作成',
        'create_another' => '作成して続けて作成',
        'cancel' => 'キャンセル',
        'saved' => '保存しました',
        'created' => '作成しました',
    ],
    'builder' => [
        'add' => ':label に追加',
        'block_max_items' => ':block は1回だけ使用できます。|:block は最大 :count 回まで使用できます。',
    ],
    'slider' => [
        'difference' => '値の差は :min から :max の範囲にしてください。',
    ],
    'modal_table_select' => [
        'heading' => ':label を選択',
        'select' => '選択',
    ],
    'translatable' => [
        'attribute' => ':attribute（:locale）',
        'editing_language' => '編集言語',
    ],
    'morph_to_select' => [
        'type' => '種類',
    ],
    'icon_picker' => [
        'invalid' => '選択したアイコンは使用できません。',
    ],
];
