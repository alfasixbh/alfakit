<?php

declare(strict_types=1);

return [
    'dashboard' => [
        'title' => '仪表盘',
        'customize' => [
            'span' => '{1} :count 列|[2,*] :count 列',
            'span_full' => '全宽',
            'invalid' => '此仪表盘布局无效。',
        ],
    ],
    'global_search' => [
        'placeholder' => '搜索…',
        'no_results' => '未找到结果。',
    ],
    'resources' => [
        'list' => '列表',
        'create' => [
            'title' => '创建:label',
            'breadcrumb' => '创建',
        ],
        'edit' => [
            'title' => '编辑:label',
            'breadcrumb' => '编辑',
        ],
        'view' => [
            'title' => '查看:label',
            'breadcrumb' => '查看',
        ],
        'api' => [
            'failed' => '请求失败',
            'unreachable' => '无法连接数据源，请重试。',
            'error' => '数据源返回错误 (:status)，请重试。',
            'invalid' => '数据源拒绝了这些数据。',
        ],
    ],
    'tenancy' => [
        'switch' => '切换团队',
        'register' => '新建团队',
        'profile' => '团队设置',
    ],
    'errors' => [
        'default' => [
            'title' => '出了点问题',
            'body' => '无法完成请求，请重试。',
        ],
        403 => [
            'title' => '拒绝访问',
            'body' => '你无权执行此操作。',
        ],
        404 => [
            'title' => '未找到',
            'body' => '你要查找的页面或记录不存在。',
        ],
    ],
    'command_palette' => [
        'placeholder' => '输入命令或搜索…',
        'create' => '新建:label',
    ],
    'realtime' => [
        'conflict' => [
            'refused_title' => '未保存：记录已被修改',
            'refused_body' => '您打开此记录后，其他人保存了它。请查看其更改，然后重新保存或保留您的更改。',
            'yes' => '是',
            'no' => '否',
        ],
    ],
    'themes' => [
        'neutral' => [
            'label' => '中性',
            'description' => '经典风格：侧边栏旁的内嵌内容、简洁的标题和带边框的卡片。',
        ],
        'alfakit' => [
            'label' => 'AlfaKit',
            'description' => 'AlfaKit 品牌的标志性设计：暖奶油色背景上的 Alfa Navy 与 Fox Orange、Montserrat 标题与 Inter 正文、带胶囊式导航的浮动侧边栏、每页的横幅、浮起的卡片、填充式输入框和胶囊按钮。',
        ],
        'minimal' => [
            'label' => '极简',
            'description' => '无侧边栏：导航以带下划线的标签横跨顶部。细线平面、下划线输入框、方形按钮，紧凑。',
        ],
        'soft' => [
            'label' => '柔和',
            'description' => '纤细的图标栏、大号衬线标题、无边框着色卡片、圆角填充输入框和条纹表格。',
        ],
        'corporate' => [
            'label' => '商务',
            'description' => '带强调条导航的海军蓝侧边栏、全宽标题带、方形带边框的表面和紧凑的条纹表格。',
        ],
        'filament' => [
            'label' => 'Filament 风格',
            'description' => '灰色画布、透明侧边栏、带描边的白色卡片、琥珀色点缀和 Inter 字体，类似 FilamentPHP。',
        ],
    ],
    'pwa' => [
        'offline' => [
            'title' => '离线',
            'heading' => '你已离线',
            'body' => '请检查网络连接。恢复联网后，此页面会自动重新加载。',
            'retry' => '重试',
        ],
    ],
];
