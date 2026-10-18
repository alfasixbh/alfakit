<?php

declare(strict_types=1);

return [
    'label' => '导入:label',
    'column_number' => '第 :number 列',
    'modal' => [
        'heading' => '导入:label',
        'max_rows' => '文件最多可包含 :count 行。',
        'submit' => '导入',
        'file' => 'CSV 文件',
        'columns' => '列',
        'skip_column' => '不导入',
        'example' => '下载示例 CSV',
    ],
    'validation' => [
        'max_rows' => '文件最多只能包含 :count 行。',
    ],
    'notifications' => [
        'started' => [
            'title' => '导入已开始',
            'body' => '正在导入 :count 行。完成后会通知你。',
        ],
        'completed' => [
            'title' => '导入已完成',
            'body' => '{0} 没有导入任何行。|[1,*] 已导入 :count 行。',
            'failed' => ':count 行导入失败。',
            'download_failed_rows' => '下载失败的行',
        ],
    ],
    'failures' => [
        'record_not_found' => '未找到要更新的记录。',
        'relationship_not_found' => '没有与“:value”匹配的 :attribute。',
        'unauthorized' => '你无权更新此记录。',
        'unexpected' => '无法导入该行。',
    ],
    'failed_rows' => [
        'error' => '错误',
    ],
];
