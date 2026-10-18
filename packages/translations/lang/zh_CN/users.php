<?php

declare(strict_types=1);

return [
    'model_label' => '用户',
    'plural_model_label' => '用户',
    'never' => '从未',
    'sections' => [
        'account' => '账户',
        'security' => '安全',
    ],
    'fields' => [
        'name' => '姓名',
        'email' => '电子邮件地址',
        'password' => '密码',
        'password_help' => '留空以保留当前密码。',
        'password_confirmation' => '确认密码',
        'current_password' => '当前密码',
        'new_password' => '新密码',
        'password_change_required' => '要求设置新密码',
        'password_change_required_help' => '用户下次登录时必须设置新密码。',
        'roles' => '角色',
        'status' => '状态',
        'ban_reason' => '原因',
        'created_at' => '创建时间',
        'last_login_at' => '上次登录',
        'last_login_ip' => '上次登录 IP',
        'two_factor' => '双重身份验证',
    ],
    'status' => [
        'active' => '正常',
        'invited' => '已邀请',
        'suspended' => '已停用',
        'banned' => '已封禁',
    ],
    'actions' => [
        'invite' => [
            'label' => '邀请用户',
            'heading' => '邀请用户',
            'description' => '对方将收到一封包含设置密码链接的电子邮件。',
            'submit' => '发送邀请',
            'done' => '邀请已发送',
        ],
        'resend_invitation' => [
            'label' => '重新发送邀请',
            'done' => '邀请已重新发送',
        ],
        'suspend' => [
            'label' => '停用',
            'description' => '该用户将被登出，在你恢复之前无法登录。',
            'done' => '用户已停用',
        ],
        'unsuspend' => [
            'label' => '恢复',
            'done' => '用户可以重新登录',
        ],
        'ban' => [
            'label' => '封禁',
            'description' => '该用户将被登出并禁止访问面板。原因仅对管理员可见。',
            'done' => '用户已封禁',
        ],
        'unban' => [
            'label' => '解除封禁',
            'done' => '已解除封禁',
        ],
        'require_password_change' => [
            'label' => '要求设置新密码',
            'description' => '用户必须先设置新密码才能再次使用面板。',
            'done' => '系统将要求该用户设置新密码',
        ],
        'reset_two_factor' => [
            'label' => '重置双重身份验证',
            'description' => '关闭所有第二重验证方式和恢复代码。用户使用密码登录后可重新设置。',
            'done' => '双重身份验证已重置',
        ],
        'revoke_session' => [
            'label' => '登出某个会话',
            'session' => '会话',
            'done' => '会话已登出',
        ],
        'revoke_sessions' => [
            'label' => '在所有设备上登出',
            'description' => '结束该用户在所有设备上的全部会话。',
            'done' => '已在所有设备上登出',
        ],
    ],
    'blocked' => [
        'suspended' => '你的账户已被停用，请联系管理员。',
        'banned' => '你的账户已被封禁。',
    ],
    'invitation' => [
        'title' => '接受邀请',
        'heading' => '欢迎使用 :app',
        'submit' => '设置密码并登录',
        'accepted' => '欢迎！你的密码已设置。',
        'invalid' => '此邀请链接无效或已被使用。',
        'mail' => [
            'subject' => '你被邀请加入 :app',
            'greeting' => '你好！',
            'intro' => '你已被邀请加入 :app。请设置密码以激活账户。',
            'action' => '接受邀请',
            'expiry' => '此链接将在 :days 天后失效。',
        ],
    ],
    'change_password' => [
        'title' => '设置新密码',
        'heading' => '设置新密码',
        'description' => '管理员要求你在继续之前更改密码。',
        'submit' => '保存密码',
        'done' => '你的密码已更改。',
    ],
    'sessions' => [
        'heading' => '会话',
        'description' => '该用户已登录的浏览器和设备。',
        'empty' => '没有活动会话',
        'device' => '设备',
        'ip_address' => 'IP 地址',
        'last_active' => '上次活动',
        'unknown_device' => '未知设备',
    ],
];
