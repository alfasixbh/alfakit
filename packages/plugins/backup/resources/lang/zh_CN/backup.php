<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => '备份',
        'navigation_label' => '备份',
    ],

    'table' => [
        'heading' => '备份',
        'columns' => [
            'name' => '备份',
            'disk' => '磁盘',
            'date' => '日期',
            'size' => '大小',
        ],
        'filters' => [
            'disk' => '磁盘',
        ],
        'empty' => [
            'heading' => '暂无备份',
            'description' => '创建备份后将显示在这里。',
        ],
    ],

    'destinations' => [
        'heading' => '备份目标',
        'label' => ':disk 上的 :name',
        'healthy' => '正常',
        'unhealthy' => '异常',
        'unreachable' => '无法访问',
        'summary' => '{0} 无备份 · 已用 :size|{1} :count 个备份 · 已用 :size · 最新 :newest|[2,*] :count 个备份 · 已用 :size · 最新 :newest',
    ],

    'actions' => [
        'create' => [
            'label' => '创建备份',
            'modal_heading' => '创建备份',
            'modal_description' => '备份将在后台运行，完成后会显示在列表中。',
            'submit' => '创建备份',
            'option' => '备份内容',
            'options' => [
                'all' => '数据库和文件',
                'only_db' => '仅数据库',
                'only_files' => '仅文件',
            ],
            'notification' => '正在后台创建新备份',
        ],
        'download' => [
            'label' => '下载',
        ],
        'delete' => [
            'label' => '删除',
            'modal_heading' => '删除备份',
            'modal_description' => '确定删除 :name 吗？此操作无法撤销。',
            'submit' => '删除',
            'notification' => '备份已删除',
        ],
    ],
];
