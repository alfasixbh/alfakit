<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => '是',
            'false' => '否',
        ],
        'placeholder' => '请选择',
        'search_prompt' => '输入以搜索…',
        'no_search_results' => '没有与搜索匹配的选项。',
        'loading' => '加载中…',
    ],
    'key_value' => [
        'key' => '键',
        'value' => '值',
        'add' => '添加行',
        'delete' => '删除行',
        'reorder' => '重新排序',
    ],
    'repeater' => [
        'cannot_add' => '无法向:attribute添加项目。',
        'cannot_delete' => '无法从:attribute删除项目。',
        'cannot_reorder' => '无法对:attribute中的项目重新排序。',
        'add' => '添加到:label',
        'delete' => '删除',
        'clone' => '复制',
        'move_up' => '上移',
        'move_down' => '下移',
        'collapse' => '折叠',
        'expand' => '展开',
        'reorder' => '重新排序',
        'collapse_all' => '全部折叠',
        'expand_all' => '全部展开',
    ],
    'wizard' => [
        'next' => '下一步',
        'previous' => '上一步',
        'submit' => '提交',
    ],
    'file_upload' => [
        'drop' => '拖放文件或',
        'browse' => '浏览',
        'uploading' => '上传中…',
        'remove' => '移除',
        'download' => '下载',
        'too_large' => '文件过大。',
        'invalid_type' => '不允许上传此类型的文件。',
        'too_small' => '此文件太小。',
        'unavailable' => '此上传已失效，请重新上传文件。',
        'invalid_dimensions' => '不允许此图片尺寸。',
        'invalid_aspect_ratio' => '不允许此图片宽高比。',
        'chunk_failed' => '上传不完整。请重新上传文件。',
        'types' => [
            'images' => '图片',
            'videos' => '视频',
            'audio' => '音频',
            'text' => '文本文件',
        ],
    ],
    'tags_input' => [
        'placeholder' => '添加标签…',
    ],
    'rich_editor' => [
        'link_prompt' => '输入 URL',
        'insert_block' => '插入:block',
        'edit_block' => '编辑:block',
        'save_block' => '保存',
        'insert' => '插入',
        'text_colors' => [
            'red' => '红色',
            'orange' => '橙色',
            'amber' => '琥珀色',
            'green' => '绿色',
            'teal' => '青绿色',
            'blue' => '蓝色',
            'indigo' => '靛蓝',
            'purple' => '紫色',
            'pink' => '粉色',
            'gray' => '灰色',
        ],
    ],
    'actions' => [
        'save' => '保存更改',
        'create' => '创建',
        'create_another' => '创建并继续创建',
        'cancel' => '取消',
        'saved' => '已保存',
        'created' => '已创建',
    ],
    'builder' => [
        'add' => '添加到:label',
        'block_max_items' => ':block 只能使用一次。|:block 最多可使用 :count 次。',
    ],
    'slider' => [
        'difference' => '数值之间的差距必须在 :min 到 :max 之间。',
    ],
    'modal_table_select' => [
        'heading' => '选择:label',
        'select' => '选择',
    ],
    'translatable' => [
        'attribute' => ':attribute（:locale）',
        'editing_language' => '编辑语言',
    ],
    'morph_to_select' => [
        'type' => '类型',
    ],
    'icon_picker' => [
        'invalid' => '所选图标不可用。',
    ],
];
