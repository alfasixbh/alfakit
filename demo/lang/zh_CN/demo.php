<?php

declare(strict_types=1);

/*
 * Simplified Chinese demo strings. Keys must match lang/en/demo.php (tests/Feature/TranslationParityTest.php).
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => '香水与生活方式，甄选自巴林。',

    'navigation' => [
        'catalog' => '商品目录',
        'sales' => '销售',
        'customers' => '客户',
        'marketing' => '营销',
        'reports' => '报表',
        'settings' => '设置',
        'showcase' => '组件展示',
        'support' => '客服支持',
        'content' => '内容',
        'system' => '系统',
    ],

    'switcher' => [
        'label' => '渲染器',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer（当前）',
    ],

    'design' => [
        'theme' => '主题',
        'mobile_preset' => '移动端预设',
        'mobile_on' => '手机上使用底部导航',
        'mobile_off' => '手机上使用抽屉菜单',
    ],

    'footer' => [
        'note' => 'AlfaKit 演示 · 每小时重置',
        'docs' => '文档',
    ],

    'meta' => [
        'site' => 'AlfaKit 演示',
        'title' => 'Maison Alfa · AlfaKit 演示',
        'panel_title' => 'Maison Alfa 管理后台 · AlfaKit 演示',
        'description' => '一家用 AlfaKit 构建的虚构香水店：同一份 Laravel 管理面板定义，分别用 React、Vue 和 Svelte 渲染。使用共享演示账号登录；所有数据每小时重置一次。',
    ],

    'reset' => [
        'in' => ':minutes 分钟后重置',
        'soon' => '不到一分钟后重置',
        'title' => '演示数据库和上传的文件会在每个整点恢复。',
    ],

    'profile' => [
        'locked_heading' => '这是共享的演示账号',
        'locked_body' => '其邮箱地址和密码保持不变，以便下一位访客登录。你仍然可以修改显示名称。',
        'mfa_heading' => '双重身份验证',
        'mfa_body' => '共享账号已关闭此设置。可在“设置 › 员工”中模拟某位同事，体验身份验证器应用和邮件验证码。',
    ],

    'errors' => [
        'back_home' => '返回商店',
        'open_admin' => '打开管理面板',
        '403' => ['title' => '此账号无权访问', 'body' => '你在该门店的角色不包含此页面。请切换门店或向店主申请访问权限。'],
        '404' => ['title' => '页面未找到', 'body' => '该页面可能已移动，或者记录已在每小时重置时被删除。'],
        '419' => ['title' => '页面已过期', 'body' => '会话已超时。请刷新页面后重试。'],
        '429' => ['title' => '请放慢速度', 'body' => '短时间内请求过多。请稍候再试。'],
        '500' => ['title' => '出错了', 'body' => '错误已记录。请稍后重试。'],
        '503' => ['title' => '马上回来', 'body' => '演示正在刷新，一分钟后即可恢复。'],
    ],

    'login' => [
        'about' => 'Maison Alfa 是一家虚构的香水店，其管理面板使用 AlfaKit 构建，并由 React、Vue 或 Svelte 渲染。',
        'heading' => '演示账号',
        'hint' => '使用 :email 和密码 :password 登录。你所做的一切更改都会每小时重置。',
        'fill' => '使用演示账号',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => '首页',
            'contact' => '联系我们',
            'track' => '订单跟踪',
            'admin' => '打开管理面板',
        ],
        'hero' => [
            'eyebrow' => 'AlfaKit 演示商店',
            'title' => '有故事的香气，有骨架的软件。',
            'body' => 'Maison Alfa 是一家虚构的香水品牌，用来展示 AlfaKit 能渲染什么：一个 Laravel 应用、一份管理面板定义、三种前端。先逛逛商店，再用 React、Vue 或 Svelte 打开同一个面板。',
            'cta' => '打开管理面板',
            'secondary' => '阅读文档',
        ],
        'featured' => '本季精选',
        'from' => ':price 起',
        'notes' => '前调 :top · 中调 :heart · 后调 :base',
        'by' => ':brand 出品',
        'empty' => '暂无精选商品。运行 php artisan demo:reset 为商店填充数据。',
        'footer' => [
            'beta' => 'AlfaKit 公开测试版',
            'built' => '由 Alfa Six 使用 AlfaKit 构建。虚构的商店，真实的软件。',
            'renderer' => '由 :renderer 渲染',
        ],
    ],

    'product_status' => [
        'draft' => '草稿',
        'active' => '在售',
        'archived' => '已归档',
    ],
    'order_status' => [
        'pending' => '待处理',
        'paid' => '已付款',
        'processing' => '处理中',
        'shipped' => '已发货',
        'delivered' => '已送达',
        'cancelled' => '已取消',
        'refunded' => '已退款',
    ],
    'payment_method' => [
        'card' => '银行卡',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => '银行转账',
        'cash_on_delivery' => '货到付款',
    ],
    'payment_status' => [
        'pending' => '待处理',
        'captured' => '已收款',
        'failed' => '失败',
        'refunded' => '已退款',
    ],
    'shipment_status' => [
        'pending' => '待处理',
        'in_transit' => '运输中',
        'delivered' => '已送达',
        'returned' => '已退回',
    ],
    'review_status' => [
        'pending' => '待审核',
        'approved' => '已通过',
        'rejected' => '已拒绝',
    ],
    'discount_type' => [
        'percentage' => '百分比',
        'fixed' => '固定金额',
        'free_shipping' => '免运费',
    ],
    'staff_role' => [
        'owner' => '店主',
        'manager' => '经理',
        'staff' => '员工',
    ],
    'concentration' => [
        'extrait' => '香精（Extrait）',
        'parfum' => '香精（Parfum）',
        'eau_de_parfum' => '淡香精',
        'eau_de_toilette' => '淡香水',
        'body_mist' => '身体香氛喷雾',
        'candle' => '香薰蜡烛',
        'diffuser' => '藤条香薰',
    ],
    'audience' => [
        'unisex' => '中性',
        'women' => '女士',
        'men' => '男士',
    ],

    'timeline' => [
        'placed' => '已下单',
        'paid' => '已收款',
        'processing' => '已拣货打包',
        'shipped' => '已交付 :carrier',
        'delivered' => '已送达',
        'cancelled' => '客户已取消',
        'refunded' => '已退款',
    ],
];
