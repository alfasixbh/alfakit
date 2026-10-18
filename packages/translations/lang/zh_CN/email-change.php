<?php

declare(strict_types=1);

return [
    'sent' => '我们已向 :email 发送链接。打开链接后你的邮箱地址将会更改。',
    'pending_heading' => '邮箱更改待确认',
    'pending' => '打开我们发送到 :email 的链接以确认新地址。',
    'cancel' => '取消更改',
    'cancelled' => '已取消邮箱更改。',
    'verified' => '你的邮箱地址已更改。',
    'blocked' => '邮箱更改已取消。',
    'invalid' => '此链接已失效。',
    'verify_mail' => [
        'subject' => '确认你的新邮箱地址',
        'intro' => '点击下面的按钮,将此地址用于你的账户。',
        'action' => '确认邮箱地址',
        'expiry' => '{1} 链接将在 :minutes 分钟后过期。|[2,*] 链接将在 :minutes 分钟后过期。',
        'ignore' => '如果你没有请求此更改,可以忽略此邮件。',
    ],
    'notice_mail' => [
        'subject' => '已请求更改邮箱',
        'intro' => '有人请求将你账户的邮箱地址更改为 :email。',
        'no_action' => '如果是你本人操作,无需任何处理。否则请取消更改并修改密码。',
        'action' => '取消更改',
    ],
];
