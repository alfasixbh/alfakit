<?php

declare(strict_types=1);

/*
 * Simplified Chinese validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => '必须接受 :attribute。',
    'after' => ':attribute 必须是 :date 之后的日期。',
    'after_or_equal' => ':attribute 必须是 :date 当天或之后的日期。',
    'alpha_dash' => ':attribute 只能包含字母、数字和连字符。',
    'array' => ':attribute 必须是列表。',
    'before' => ':attribute 必须是 :date 之前的日期。',
    'before_or_equal' => ':attribute 必须是 :date 当天或之前的日期。',
    'between' => [
        'numeric' => ':attribute 必须介于 :min 和 :max 之间。',
        'string' => ':attribute 的长度必须介于 :min 到 :max 个字符之间。',
        'array' => ':attribute 必须包含 :min 到 :max 项。',
        'file' => ':attribute 的大小必须介于 :min 到 :max KB 之间。',
    ],
    'boolean' => ':attribute 必须为真或假。',
    'confirmed' => ':attribute 的确认不匹配。',
    'current_password' => '密码不正确。',
    'date' => ':attribute 必须是有效日期。',
    'different' => ':attribute 和 :other 必须不同。',
    'digits' => ':attribute 必须是 :digits 位数字。',
    'distinct' => ':attribute 中有重复的值。',
    'email' => ':attribute 必须是有效的邮箱地址。',
    'exists' => '所选的 :attribute 无效。',
    'file' => ':attribute 必须是文件。',
    'filled' => ':attribute 必须有值。',
    'gt' => [
        'numeric' => ':attribute 必须大于 :value。',
        'string' => ':attribute 必须多于 :value 个字符。',
        'array' => ':attribute 必须多于 :value 项。',
        'file' => ':attribute 必须大于 :value KB。',
    ],
    'gte' => [
        'numeric' => ':attribute 必须大于或等于 :value。',
        'string' => ':attribute 至少需要 :value 个字符。',
        'array' => ':attribute 至少需要 :value 项。',
        'file' => ':attribute 至少需要 :value KB。',
    ],
    'image' => ':attribute 必须是图片。',
    'in' => '所选的 :attribute 无效。',
    'integer' => ':attribute 必须是整数。',
    'lt' => [
        'numeric' => ':attribute 必须小于 :value。',
        'string' => ':attribute 必须少于 :value 个字符。',
        'array' => ':attribute 必须少于 :value 项。',
        'file' => ':attribute 必须小于 :value KB。',
    ],
    'lte' => [
        'numeric' => ':attribute 必须小于或等于 :value。',
        'string' => ':attribute 不能超过 :value 个字符。',
        'array' => ':attribute 不能超过 :value 项。',
        'file' => ':attribute 不能超过 :value KB。',
    ],
    'max' => [
        'numeric' => ':attribute 不能大于 :max。',
        'string' => ':attribute 不能超过 :max 个字符。',
        'array' => ':attribute 不能超过 :max 项。',
        'file' => ':attribute 不能超过 :max KB。',
    ],
    'mimes' => ':attribute 必须是以下类型的文件：:values。',
    'mimetypes' => ':attribute 必须是以下类型的文件：:values。',
    'min' => [
        'numeric' => ':attribute 至少为 :min。',
        'string' => ':attribute 至少需要 :min 个字符。',
        'array' => ':attribute 至少需要 :min 项。',
        'file' => ':attribute 至少需要 :min KB。',
    ],
    'numeric' => ':attribute 必须是数字。',
    'password' => [
        'letters' => ':attribute 至少包含一个字母。',
        'mixed' => ':attribute 至少包含一个大写字母和一个小写字母。',
        'numbers' => ':attribute 至少包含一个数字。',
        'symbols' => ':attribute 至少包含一个符号。',
        'uncompromised' => ':attribute 出现在数据泄露中，请换一个。',
    ],
    'regex' => ':attribute 的格式无效。',
    'required' => ':attribute 为必填项。',
    'required_if' => '当 :other 为 :value 时，:attribute 为必填项。',
    'required_with' => '当存在 :values 时，:attribute 为必填项。',
    'same' => ':attribute 和 :other 必须一致。',
    'size' => [
        'numeric' => ':attribute 必须为 :size。',
        'string' => ':attribute 必须是 :size 个字符。',
        'array' => ':attribute 必须包含 :size 项。',
        'file' => ':attribute 必须为 :size KB。',
    ],
    'string' => ':attribute 必须是文本。',
    'unique' => ':attribute 已被使用。',
    'uploaded' => ':attribute 上传失败。',
    'url' => ':attribute 必须是有效的 URL。',

    'attributes' => [],
];
