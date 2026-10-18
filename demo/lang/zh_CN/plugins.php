<?php

declare(strict_types=1);

/*
 * Simplified Chinese strings of the first-party plugin integration. Keys match lang/en/plugins.php.
 */
return [
    'commands' => [
        'group' => 'Maison Alfa',
        'order_board' => '打开订单看板',
        'calendar' => '打开门店日历',
        'returns' => '审核退货',
        'category_tree' => '整理分类树',
        'new_product' => '添加商品',
        'storefront' => '打开商店前台',
    ],

    'board' => [
        'title' => '订单看板',
        'subheading' => '沿履约流程拖动订单，或使用键盘移动（空格、方向键、空格）。最近 60 天。',
        'open' => '看板',
        'timeline_note' => '由 :user 在订单看板上移动',
    ],

    'calendar' => [
        'title' => '日历',
        'subheading' => '本门店的促销、发货、送达和定时发布的页面。',
        'this_week' => '本周',
        'new_promotion' => '策划促销',
        'hint' => '拖动促销可移动它，拖动其末端可调整时长，点击可编辑，选择日期可策划新的促销。',
        'fields' => [
            'value' => '数值（% 或金额）',
        ],
        'legend' => [
            'label' => '图例',
            'percentage' => '促销：百分比折扣',
            'fixed' => '促销：立减金额',
            'free_shipping' => '促销：免运费',
            'shipped' => '包裹已离开精品店',
            'delivered' => '已送达',
            'publish' => '定时发布的页面',
        ],
        'events' => [
            'shipped' => ':number 已发货（:carrier）',
            'delivered' => ':number 已送达',
            'publish' => '发布：:title',
        ],
    ],

    'returns' => [
        'label' => '退货',
        'plural' => '退货',
        'workflow' => '退货审批',
        'subheading' => '客服从订单发起退货并提交；店主或经理在“审批”中批准；已批准的退货会退款。',
        'empty' => '暂无退货',
        'request' => '申请退货',
        'request_heading' => '订单 :number 的退货',
        'created' => '退货 :number 已创建。填写完整后请提交审批。',
        'timeline_note' => '通过退货 :number 退款',
        'states' => [
            'requested' => '已申请',
            'awaiting_approval' => '待审批',
            'approved' => '已批准',
            'rejected' => '已拒绝',
            'refunded' => '已退款',
            'closed' => '已关闭',
        ],
        'transitions' => [
            'submit' => '提交审批',
            'refund' => '退款',
            'reopen' => '重新打开',
            'close' => '关闭',
        ],
        'steps' => [
            'manager' => '经理审批',
        ],
        'reasons' => [
            'damaged' => '运输途中损坏',
            'wrong_item' => '发错商品',
            'not_as_described' => '与描述不符',
            'allergy' => '皮肤过敏',
            'changed_mind' => '改变主意',
        ],
        'fields' => [
            'number' => '退货',
            'state' => '状态',
            'reason' => '原因',
            'amount' => '退款金额',
            'details' => '详情',
            'requested_by' => '发起人',
            'refund_reference' => '退款参考号',
        ],
        'sections' => [
            'workflow' => '工作流',
            'history' => '历史',
            'details' => '退货',
        ],
    ],

    'invoices' => [
        'issue' => '开具发票',
        'open' => '打开发票',
        'issue_description' => '根据订单明细创建发票，增值税按门店税率计算。',
        'notes' => '订单 :number 的发票。感谢你在 Maison Alfa 购物。',
        'terms' => '请于 14 天内付款。AlfaKit 演示的示例文档。',
    ],

    'comments' => [
        'section' => '内部评论',
        'section_description' => '仅员工可见。输入 @ 可提及同事，对方会在铃铛中收到通知。',
    ],

    'activity' => [
        'section' => '审计记录',
    ],

    'helpdesk' => [
        'greeting' => '你好！关于我们的香氛或你的订单，有任何问题都可以问我们。',
    ],

    'tree' => [
        'title' => '分类树',
        'subheading' => '拖动分类可嵌套或重新排序（也可以使用方向按钮），然后保存。分类由所有门店共享。',
        'open' => '树状视图',
    ],

    'tags' => [
        'segments' => '客户分群',
    ],

    'media' => [
        'gallery' => '生活方式图库',
        'gallery_description' => '存放在媒体库中的额外图片（与上方的商品图片分开）。',
    ],

    'views' => [
        'low_stock' => '库存不足',
        'featured' => '精选',
        'drafts' => '草稿',
    ],

    'ai' => [
        'summarise_reviews' => '总结评价',
        'summarise_heading' => '顾客如何评价 :name',
        'summarise_prompt' => '请用三个简短的要点总结这些关于香水“:name”的顾客评价：他们喜爱什么、批评什么，以及适合什么样的人。',
    ],

    'settings' => [
        'title' => '品牌设置',
        'subheading' => '由 Maison Alfa 的所有门店共享。商店前台会显示公告。',
        'sections' => [
            'brand' => '品牌与商店前台',
            'notifications' => '通知',
        ],
        'fields' => [
            'house_name' => '品牌名称',
            'announcement' => '商店前台公告',
            'announcement_help' => '显示在每个商店页面的顶部。留空则隐藏。',
            'support_hours' => '客服时间',
            'price_display' => '商店前台的价格',
            'low_stock_alerts' => '库存不足提醒',
            'weekly_report' => '每周销售报告',
            'report_recipients' => '报告收件人',
            'report_recipients_help' => '邮箱地址（演示只会把邮件写入日志）。',
        ],
        'price_display' => [
            'tax_inclusive' => '含增值税',
            'tax_exclusive' => '不含增值税',
        ],
    ],

    'backups' => [
        'read_only' => '公开演示中为只读：创建、下载和删除备份均已关闭。演示数据库每小时重建一次。',
    ],

    'billing' => [
        'compare_plans' => '比较套餐',
        'compare_plans_body' => 'Billing 插件的套餐页面列出了每个套餐及其功能。演示中从不收取任何费用。',
        'see_plans' => '查看套餐',
        'checkout_disabled' => '公开演示中已关闭结账',
        'checkout_disabled_body' => '你选择了 :plan 套餐。真实的商店此时会打开 Stripe Checkout；演示从不连接任何支付服务商。',
        'contact' => '联系我们',
        'plans' => [
            'boutique' => '一家精品店及其网店。',
            'maison' => '多家精品店，共享商品目录和报表。',
            'enterprise' => '加盟、定制集成和 SSO。',
        ],
        'features' => [
            'boutique' => ['1 家门店', '5 个员工账号', '邮件支持'],
            'maison' => ['不限门店', '不限员工', '客服工单和数据分析', '优先支持'],
            'enterprise' => ['专属客户成功经理', '定制集成', '单点登录'],
        ],
    ],

    'storefront' => [
        'pages' => '关于我们',
        'wholesale' => '批发',
        'support' => '客服支持',
        'chat' => '在线咨询',
        'wholesale_title' => '批发咨询',
        'wholesale_intro' => '酒店、水疗中心、买手店和企业礼品：此表单在面板中使用 Forms 插件构建（两个步骤、一个条件问题、垃圾信息防护）。',
        'wholesale_unavailable' => '批发咨询暂停受理。',
        'support_title' => '客户服务',
        'support_intro' => 'Helpdesk 插件的客户门户：提交工单、跟进对话、为回复评分。',
        'new_checkout' => '新版结账（测试版）',
        'cms_intro' => '此页面由 CMS 插件管理：区块、草稿、实时预览，以及为已登录员工提供的编辑栏。',
    ],
];
