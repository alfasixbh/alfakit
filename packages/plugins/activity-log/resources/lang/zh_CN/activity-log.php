<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => '活动',
        'plural_label' => '活动',
        'navigation_label' => '活动日志',
    ],

    'relation_manager' => [
        'title' => '活动',
    ],

    'fields' => [
        'log_name' => '日志',
        'event' => '事件',
        'description' => '描述',
        'subject' => '对象',
        'subject_type' => '对象类型',
        'causer' => '操作者',
        'created_at' => '日期',
        'created_from' => '开始日期',
        'created_until' => '结束日期',
        'changes' => '变更',
        'attribute' => '属性',
        'old' => '旧值',
        'new' => '新值',
        'property' => '属性',
        'value' => '值',
    ],

    'sections' => [
        'overview' => '概览',
        'changes' => '变更',
        'properties' => '属性',
    ],

    'filters' => [
        'created_from_indicator' => '自 :date 起',
        'created_until_indicator' => '截至 :date',
    ],

    'events' => [
        'created' => '已创建',
        'updated' => '已更新',
        'deleted' => '已删除',
        'restored' => '已恢复',
    ],

    'causer' => [
        'system' => '系统',
    ],

    'timeline' => [
        'label' => '活动',
        'empty' => '暂无活动。',
        'entry' => ':causer :event',
    ],

    'empty' => [
        'heading' => '暂无活动',
        'description' => '您的记录发生的变更将显示在这里。',
    ],
];
