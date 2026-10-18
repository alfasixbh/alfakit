<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => '供应商',
    'plural' => '供应商',
    'navigation' => '供应商',
    'intro' => '供应商数据存放在外部 API 中（由演示在 /demo-api/suppliers 提供），而不是数据库里。该 API 会自行校验：试试输入一个已存在的名称。',
    'fields' => [
        'name' => '名称',
        'email' => '订货邮箱',
        'country' => '国家',
        'category' => '类别',
        'status' => '状态',
        'lead_time_days' => '交货周期',
        'rating' => '评分',
        'notes' => '备注',
        'updated_at' => '更新时间',
    ],
    'sections' => [
        'supplier' => '供应商',
        'terms' => '条款',
    ],
    'lead_time' => '{1} :count 天|[2,*] :count 天',
    'categories' => [
        'oud' => '沉香',
        'florals' => '花香原料',
        'resins' => '树脂',
        'citrus' => '柑橘',
        'packaging' => '包装',
    ],
    'statuses' => [
        'active' => '启用',
        'paused' => '已暂停',
    ],
    'helper' => [
        'country' => '两位 ISO 代码，例如 FR。',
    ],
];
