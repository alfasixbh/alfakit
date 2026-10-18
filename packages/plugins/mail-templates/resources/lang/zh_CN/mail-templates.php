<?php

declare(strict_types=1);

return [
    'label' => '邮件模板',
    'plural_label' => '邮件模板',
    'navigation' => '邮件模板',
    'sections' => [
        'template' => '邮件',
        'template_description' => '选择此版本对应的邮件和语言。',
        'content' => '内容',
        'content_description' => '将主题或内容留空即保留邮件原有内容。',
    ],
    'fields' => [
        'key' => '邮件',
        'locale' => '语言',
        'subject' => '主题',
        'subject_help' => '合并标签在这里同样可用，例如 {{ name }}。',
        'body' => '内容',
        'body_help' => '从工具栏插入合并标签；发送邮件时会替换为实际值。',
        'merge_tags' => '此邮件的合并标签：',
        'status' => '状态',
        'updated_at' => '更新时间',
    ],
    'statuses' => [
        'customized' => '已自定义',
        'default' => '默认',
    ],
    'empty' => [
        'heading' => '没有自定义的邮件',
        'description' => '自定义一封邮件，以更改其某一种语言的主题和内容。',
    ],
    'actions' => [
        'preview' => [
            'label' => '预览',
            'close' => '关闭',
            'subject' => '主题：',
            'light' => '浅色',
            'dark' => '深色',
            'frame' => '邮件预览（:variant）',
            'error' => '无法预览此邮件。',
        ],
        'send_test' => [
            'label' => '发送测试',
            'modal_heading' => '发送测试邮件？',
            'modal_description' => '已保存的版本将附带示例数据发送到你自己的地址 :email。',
            'submit' => '发送测试',
            'sent' => '测试邮件已发送至 :email。',
            'no_email' => '你的账户没有可接收测试的邮箱地址。',
        ],
        'reset' => [
            'label' => '恢复默认',
            'modal_heading' => '恢复为默认邮件？',
            'modal_description' => '邮件将恢复为原有的主题和内容。之前的版本会保留在历史记录中。',
            'submit' => '恢复',
            'done' => '邮件已恢复为默认。',
        ],
    ],
    'test' => [
        'subject' => '[测试] :subject',
    ],
    'validation' => [
        'unique' => '此邮件在该语言下已有模板。',
        'unknown_tags' => ':tags 不是此邮件的合并标签。|:tags 不是此邮件的合并标签。',
    ],
];
