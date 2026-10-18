<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => '应用健康状况',
        'navigation_label' => '健康状况',
        'last_ran' => '检查于 :time',
        'never_ran' => '尚未运行检查。',
    ],

    'results' => [
        'details' => '详情',
        'columns' => [
            'check' => '检查项',
            'status' => '状态',
            'summary' => '摘要',
            'message' => '消息',
            'meta' => '详情',
        ],
        'empty' => [
            'heading' => '暂无结果',
            'description' => '刷新以运行健康检查。',
        ],
    ],

    'statuses' => [
        'ok' => '正常',
        'warning' => '警告',
        'failed' => '失败',
        'crashed' => '崩溃',
        'skipped' => '已跳过',
        'unknown' => '未知',
    ],

    'actions' => [
        'refresh' => [
            'label' => '刷新',
            'notification' => '健康检查已刷新',
        ],
    ],

    'checks' => [
        'backups' => '备份',
        'cache' => '缓存',
        'cpu_load' => 'CPU 负载',
        'database' => '数据库',
        'database_connection_count' => '数据库连接数',
        'database_size' => '数据库大小',
        'database_table_size' => '数据表大小',
        'debug_mode' => '调试模式',
        'environment' => '环境',
        'flare_error_occurrence_count' => 'Flare 错误',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => '应用优化',
        'ping' => 'Ping',
        'queue' => '队列',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Redis 内存使用',
        'schedule' => '计划任务',
        'security_advisories' => '安全公告',
        'used_disk_space' => '已用磁盘空间',
    ],

    'widget' => [
        'label' => '应用健康状况',
        'ok' => '所有检查均已通过',
        'failing' => '{1} :count 项检查失败|[2,*] :count 项检查失败',
        'warnings' => '{1} :count 条警告|[2,*] :count 条警告',
        'never_ran' => '尚未检查',
    ],
];
