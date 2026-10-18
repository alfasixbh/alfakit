<?php

declare(strict_types=1);

/*
 * Simplified Chinese storefront strings. Keys match lang/en/shop.php (tests/Feature/ShopTranslationParityTest.php).
 */
return [
    'attributes' => [
        'name' => '姓名',
        'rating' => '评分',
        'review' => '评价',
    ],

    'locale' => [
        'label' => '语言',
    ],

    'strip' => [
        'eyebrow' => '基于 AlfaKit 构建',
        'title' => '一份面板定义，三种前端。',
        'body' => '你在这里看到的一切都由同一份 PHP 架构渲染。切换渲染器后，页面会以 React、Vue 或 Svelte 重新加载，标记、样式和行为完全相同。',
        'cta' => '切换渲染器',
        'hint' => '你正在查看 :renderer 版本。',
        'mascot_alt' => 'AlfaKit 的狐狸吉祥物',
    ],

    'newsletter' => [
        'heading' => '来自工坊的信',
        'body' => '新香上市时给你写一封短信，每月最多两次。',
        'label' => '邮箱地址',
        'placeholder' => 'you@example.com',
        'submit' => '订阅',
        'duplicate' => '该地址已在订阅列表中。',
        'thanks' => [
            'title' => '订阅成功',
            'body' => 'Maison Alfa 的下一封信会第一时间送到你手中。',
        ],
    ],

    'product' => [
        'back' => '全部商品',
        'by' => ':brand 出品',
        'sku' => '货号',
        'gallery' => '图库',
        'image_of' => ':name，第 :index 张图',
        'sizes' => '规格',
        'choose_size' => '选择规格',
        'stock' => [
            'in' => '有货',
            'low' => '仅剩 :count 件',
            'out' => '已售罄',
        ],
        'notes' => [
            'heading' => '香调构成',
            'top' => '前调',
            'heart' => '中调',
            'base' => '后调',
        ],
        'details' => [
            'heading' => '详情',
            'concentration' => '浓度',
            'audience' => '适用人群',
            'size' => '规格',
            'category' => '分类',
            'tags' => '标签',
        ],
        'enquire' => '咨询这款香氛',
        'track' => '订单跟踪',
        'reviews' => [
            'heading' => '评价',
            'count' => '{0} 暂无评价|{1} 1 条评价|[2,*] :count 条评价',
            'average' => ':average / 5 分',
            'empty' => '暂无评价。来做第一个分享使用感受的人吧。',
            'verified' => '已验证购买',
            'guest' => '访客',
            'write' => '写评价',
            'write_help' => '评价由团队审阅，通常在一天内从管理面板发布。',
        ],
        'related' => '你可能还喜欢',
        'compare' => '原价 :price',
        'currency_note' => '价格以美元计，含税。',
    ],

    'review' => [
        'fields' => [
            'rating' => '你的评分',
            'name' => '你的姓名',
            'email' => '邮箱',
            'email_help' => '不会公开显示。如果你在本店购买过这款香氛，你的评价会标记为已验证购买。',
            'title' => '标题',
            'body' => '你的评价',
        ],
        'submit' => '提交评价',
        'thanks' => [
            'title' => '谢谢你，:name',
            'body' => '你的评价已提交给团队，在管理面板中审核通过后即会显示。',
        ],
    ],

    'contact' => [
        'heading' => '联系我们',
        'intro' => '关于订单的问题、找不到的香氛、批发或媒体合作：麦纳麦的团队会阅读每一条消息，并在两个工作日内回复。',
        'form_heading' => '发送消息',
        'form_help' => '这是一个 AlfaKit 独立表单：校验在服务器端运行，选择主题后会显示订单号字段，提交按钮有频率限制。',
        'details' => [
            'heading' => '精品店',
            'email' => '邮箱',
            'phone' => '电话',
            'hours' => '营业时间',
            'hours_value' => '周六至周四，10:00 至 22:00',
            'address' => 'Bahrain Bay，麦纳麦',
        ],
        'fields' => [
            'name' => '你的姓名',
            'email' => '邮箱',
            'topic' => '主题',
            'order_number' => '订单号',
            'message' => '消息',
            'message_help' => '至少 20 个字符。请写明你咨询的香氛或订单。',
        ],
        'topics' => [
            'order' => '订单',
            'product' => '商品',
            'wholesale' => '批发',
            'press' => '媒体',
            'other' => '其他',
        ],
        'prefill' => '我想进一步了解 :product。',
        'submit' => '发送消息',
        'mail_subject' => 'Maison Alfa 联系表单：:topic',
        'thanks' => [
            'title' => '谢谢你，:name',
            'body' => '我们会在两个工作日内回复到 :email。',
        ],
        'rate_limited' => '你已经发送了好几条消息',
    ],

    'track' => [
        'heading' => '订单跟踪',
        'intro' => '输入结账时使用的邮箱和确认邮件中的订单号。你将看到该账户下的所有订单，以及所查订单的完整物流过程。',
        'fields' => [
            'email' => '结账时使用的邮箱',
            'number' => '订单号',
            'submit' => '查找我的订单',
        ],
        'sample' => [
            'heading' => '用真实订单试试',
            'body' => '这是一家演示商店，这里有一个可供查询的示例订单：',
            'use' => '使用此订单',
        ],
        'not_found' => [
            'heading' => '找不到该订单',
            'body' => '请检查邮箱和订单号，或使用下方的示例订单。',
        ],
        'orders' => [
            'heading' => '你的订单',
            'description' => ':name 的全部订单。点击订单查看其时间线。',
            'number' => '订单',
            'placed' => '下单时间',
            'items' => '商品',
            'status' => '状态',
            'total' => '合计',
            'search' => '按订单号搜索',
        ],
        'timeline' => [
            'heading' => '订单 :number',
            'description' => '从结账到送货上门的每一步。',
            'steps' => '时间线',
            'carrier' => '承运商',
            'tracking' => '运单号',
            'ship_to' => '收货地址',
            'no_shipment' => '尚未发货',
            'no_tracking' => '发货后可查看',
        ],
        'components_note' => '订单表格和时间线是 AlfaKit 的独立组件：在商店布局中渲染的一个 Table 和一个 Infolist。',
    ],
];
