<?php

declare(strict_types=1);

return [
    'label' => '导出:label',
    'bulk_label' => '导出所选',
    'modal' => [
        'heading' => '导出:label',
        'submit' => '导出',
        'columns' => '列',
        'description' => '导出在后台运行。文件准备好后会通知你。',
        'column_labels' => '列标签',
    ],
    'notifications' => [
        'started' => [
            'title' => '导出已开始',
            'body' => '正在导出 :count 行。文件准备好后会通知你。',
        ],
        'completed' => [
            'title' => '导出已完成',
            'body' => '{0} 没有导出任何行。|[1,*] 已导出 :count 行。',
            'failed' => ':count 行导出失败。',
            'download_csv' => '下载 .csv',
            'download_xlsx' => '下载 .xlsx',
        ],
        'max_rows' => [
            'title' => '行数过多',
            'body' => '一次最多只能导出 :count 行。',
        ],
    ],
];
