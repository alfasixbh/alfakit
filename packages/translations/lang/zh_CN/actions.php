<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => '确定要执行此操作吗？',
        'confirm' => '确认',
        'submit' => '提交',
        'cancel' => '取消',
        'close' => '关闭',
    ],
    'create' => [
        'label' => '新建:label',
        'modal' => [
            'heading' => '创建:label',
            'submit' => '创建',
        ],
        'notification' => '已创建',
        'create_another' => '创建并继续创建',
    ],
    'edit' => [
        'label' => '编辑',
        'modal' => [
            'heading' => '编辑:label',
            'submit' => '保存',
        ],
        'notification' => '已保存',
    ],
    'view' => [
        'label' => '查看',
        'modal' => [
            'heading' => '查看:label',
        ],
    ],
    'delete' => [
        'label' => '删除',
        'modal' => [
            'heading' => '删除:label',
            'submit' => '删除',
        ],
        'notification' => '已删除',
        'bulk' => [
            'heading' => '删除所选记录',
            'notification' => '已删除',
        ],
    ],
    'restore' => [
        'label' => '恢复',
        'modal' => [
            'heading' => '恢复:label',
            'submit' => '恢复',
        ],
        'notification' => '已恢复',
        'bulk' => [
            'heading' => '恢复所选记录',
            'notification' => '已恢复',
        ],
    ],
    'force_delete' => [
        'label' => '强制删除',
        'modal' => [
            'heading' => '永久删除:label',
            'description' => '此操作无法撤销。',
            'submit' => '删除',
        ],
        'notification' => '已永久删除',
        'bulk' => [
            'heading' => '永久删除所选记录',
            'notification' => '已永久删除',
        ],
    ],
    'replicate' => [
        'label' => '复制',
        'modal' => [
            'heading' => '复制:label',
            'submit' => '复制',
        ],
        'notification' => '已复制',
    ],
    'attach' => [
        'label' => '附加',
        'modal' => [
            'heading' => '附加:label',
            'submit' => '附加',
        ],
        'notification' => '已附加',
    ],
    'detach' => [
        'label' => '取消附加',
        'modal' => [
            'heading' => '取消附加:label',
            'submit' => '取消附加',
        ],
        'notification' => '已取消附加',
    ],
    'associate' => [
        'label' => '关联',
        'modal' => [
            'heading' => '关联:label',
            'submit' => '关联',
        ],
        'notification' => '已关联',
    ],
    'dissociate' => [
        'label' => '取消关联',
        'modal' => [
            'heading' => '取消关联:label',
            'submit' => '取消关联',
        ],
        'notification' => '已取消关联',
    ],
    'detach_bulk' => [
        'heading' => '解除关联所选记录',
        'notification' => '已解除关联',
    ],
    'dissociate_bulk' => [
        'heading' => '取消关联所选记录',
        'notification' => '已取消关联',
    ],
    'rate_limited' => [
        'title' => '尝试次数过多',
        'body' => '请等待 :seconds 秒后再试。|请等待 :seconds 秒后再试。',
    ],
    'password_confirmation' => [
        'incorrect' => '密码不正确。',
        'throttled' => '尝试次数过多。请在 :seconds 秒后重试。',
    ],
    'bulk' => [
        'unauthorized_records' => '已跳过 :count 条所选记录，因为你无权修改。|已跳过 :count 条所选记录，因为你无权修改。',
        'all_failed' => '无法处理该记录。|:count 条记录均无法处理。',
        'some_failed' => ':total 条记录中有 :failure 条无法处理。|:total 条记录中有 :failure 条无法处理。',
    ],
    'history' => [
        'label' => '历史记录',
        'modal' => [
            'heading' => ':label 的历史记录',
            'close' => '关闭',
        ],
        'empty' => '暂无版本。',
        'events' => [
            'created' => '已创建',
            'updated' => '已更新',
            'deleted' => '已删除',
            'restored' => '已恢复',
            'reverted' => '已恢复较早的版本',
        ],
        'restore' => [
            'label' => '恢复此版本',
            'modal' => [
                'heading' => '恢复此版本？',
                'description' => '跟踪的字段将恢复为此版本中的值。当前值会保留在历史记录中。',
                'submit' => '恢复',
            ],
            'notification' => '已恢复版本',
        ],
    ],
    'undo' => [
        'done' => '已完成',
        'notification' => '已撤销',
        'expired' => '已无法撤销。',
        'conflict' => '记录此后已被修改，无法撤销。',
        'unavailable' => '记录已不存在，无法撤销。',
    ],
];
