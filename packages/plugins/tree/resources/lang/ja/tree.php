<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => '並び順を保存しました',
    ],

    'validation' => [
        'invalid' => 'ツリーを読み取れませんでした。',
        'unknown_record' => 'ツリー内のレコードが存在しません。ページを再読み込みしてもう一度お試しください。',
        'duplicate_record' => 'ツリー内に同じレコードが複数回含まれています。',
        'unknown_parent' => '親レコードが存在しません。ページを再読み込みしてもう一度お試しください。',
        'cycle' => 'レコードを自分自身の中に移動することはできません。',
        'max_depth' => 'ツリーの深さは最大 :depth 階層までです。',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'ツリー',
        'expand_all' => 'すべて展開',
        'collapse_all' => 'すべて折りたたむ',
        'expand' => ':title を展開',
        'collapse' => ':title を折りたたむ',
        'move_up' => ':title を上へ移動',
        'move_down' => ':title を下へ移動',
        'indent' => ':title を上の項目の中へ移動',
        'outdent' => ':title を親の外へ移動',
        'save' => '並び順を保存',
        'saving' => '保存しています…',
        'discard' => '変更を破棄',
        'unsaved' => '並び順に未保存の変更があります。',
        'save_failed' => '並び順を保存できませんでした。',
        'empty' => 'レコードはまだありません',
        'moved' => ':title を :count 件中 :position 番目、階層 :level に移動しました。',
    ],

];
