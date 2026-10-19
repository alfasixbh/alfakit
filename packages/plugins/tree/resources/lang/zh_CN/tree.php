<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => '顺序已保存',
    ],

    // Node buttons: they name the node, like the move buttons.
    'actions' => [
        'view' => '查看 :title',
        'edit' => '编辑 :title',
        'delete' => '删除 :title',
    ],

    'validation' => [
        'invalid' => '无法读取树结构。',
        'unknown_record' => '树中的某条记录已不存在。请重新加载页面后重试。',
        'duplicate_record' => '某条记录在树中出现了多次。',
        'unknown_parent' => '某条父记录已不存在。请重新加载页面后重试。',
        'cycle' => '记录不能移动到其自身内部。',
        'max_depth' => '树的深度最多为 :depth 级。',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => '树',
        'expand_all' => '全部展开',
        'collapse_all' => '全部折叠',
        'expand' => '展开 :title',
        'collapse' => '折叠 :title',
        'move_up' => '上移 :title',
        'move_down' => '下移 :title',
        'indent' => '将 :title 移入上方项目',
        'outdent' => '将 :title 移出其父项目',
        'save' => '保存顺序',
        'saving' => '正在保存…',
        'discard' => '放弃更改',
        'unsaved' => '顺序有未保存的更改。',
        'save_failed' => '无法保存顺序。',
        'empty' => '暂无记录',
        'moved' => ':title 已移至第 :position 位（共 :count 项），层级 :level。',
    ],

];
