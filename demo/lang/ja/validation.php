<?php

declare(strict_types=1);

/*
 * Japanese validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => ':attribute を承認してください。',
    'after' => ':attribute には :date より後の日付を指定してください。',
    'after_or_equal' => ':attribute には :date 以降の日付を指定してください。',
    'alpha_dash' => ':attribute には英数字とハイフンのみ使用できます。',
    'array' => ':attribute はリストで指定してください。',
    'before' => ':attribute には :date より前の日付を指定してください。',
    'before_or_equal' => ':attribute には :date 以前の日付を指定してください。',
    'between' => [
        'numeric' => ':attribute は :min から :max の間で指定してください。',
        'string' => ':attribute は :min 文字から :max 文字の間で入力してください。',
        'array' => ':attribute は :min 個から :max 個の項目を指定してください。',
        'file' => ':attribute は :min KB から :max KB の間にしてください。',
    ],
    'boolean' => ':attribute は true か false を指定してください。',
    'confirmed' => ':attribute の確認が一致しません。',
    'current_password' => 'パスワードが正しくありません。',
    'date' => ':attribute には有効な日付を指定してください。',
    'different' => ':attribute と :other には異なる値を指定してください。',
    'digits' => ':attribute は :digits 桁で入力してください。',
    'distinct' => ':attribute に重複した値があります。',
    'email' => ':attribute には有効なメールアドレスを入力してください。',
    'exists' => '選択された :attribute は無効です。',
    'file' => ':attribute にはファイルを指定してください。',
    'filled' => ':attribute に値を入力してください。',
    'gt' => [
        'numeric' => ':attribute は :value より大きくしてください。',
        'string' => ':attribute は :value 文字より多く入力してください。',
        'array' => ':attribute は :value 個より多くの項目を指定してください。',
        'file' => ':attribute は :value KB より大きくしてください。',
    ],
    'gte' => [
        'numeric' => ':attribute は :value 以上にしてください。',
        'string' => ':attribute は :value 文字以上で入力してください。',
        'array' => ':attribute は :value 個以上の項目を指定してください。',
        'file' => ':attribute は :value KB 以上にしてください。',
    ],
    'image' => ':attribute には画像を指定してください。',
    'in' => '選択された :attribute は無効です。',
    'integer' => ':attribute には整数を指定してください。',
    'lt' => [
        'numeric' => ':attribute は :value より小さくしてください。',
        'string' => ':attribute は :value 文字未満で入力してください。',
        'array' => ':attribute は :value 個未満の項目を指定してください。',
        'file' => ':attribute は :value KB 未満にしてください。',
    ],
    'lte' => [
        'numeric' => ':attribute は :value 以下にしてください。',
        'string' => ':attribute は :value 文字以下で入力してください。',
        'array' => ':attribute は :value 個以下の項目を指定してください。',
        'file' => ':attribute は :value KB 以下にしてください。',
    ],
    'max' => [
        'numeric' => ':attribute は :max 以下にしてください。',
        'string' => ':attribute は :max 文字以下で入力してください。',
        'array' => ':attribute は :max 個以下の項目を指定してください。',
        'file' => ':attribute は :max KB 以下にしてください。',
    ],
    'mimes' => ':attribute には次の形式のファイルを指定してください: :values。',
    'mimetypes' => ':attribute には次の形式のファイルを指定してください: :values。',
    'min' => [
        'numeric' => ':attribute は :min 以上にしてください。',
        'string' => ':attribute は :min 文字以上で入力してください。',
        'array' => ':attribute は :min 個以上の項目を指定してください。',
        'file' => ':attribute は :min KB 以上にしてください。',
    ],
    'numeric' => ':attribute には数値を指定してください。',
    'password' => [
        'letters' => ':attribute には英字を 1 文字以上含めてください。',
        'mixed' => ':attribute には大文字と小文字をそれぞれ 1 文字以上含めてください。',
        'numbers' => ':attribute には数字を 1 文字以上含めてください。',
        'symbols' => ':attribute には記号を 1 文字以上含めてください。',
        'uncompromised' => ':attribute はデータ漏洩で見つかった値です。別の値を指定してください。',
    ],
    'regex' => ':attribute の形式が正しくありません。',
    'required' => ':attribute は必須です。',
    'required_if' => ':other が :value の場合、:attribute は必須です。',
    'required_with' => ':values がある場合、:attribute は必須です。',
    'same' => ':attribute と :other が一致しません。',
    'size' => [
        'numeric' => ':attribute は :size にしてください。',
        'string' => ':attribute は :size 文字で入力してください。',
        'array' => ':attribute は :size 個の項目を指定してください。',
        'file' => ':attribute は :size KB にしてください。',
    ],
    'string' => ':attribute には文字列を指定してください。',
    'unique' => ':attribute はすでに使用されています。',
    'uploaded' => ':attribute をアップロードできませんでした。',
    'url' => ':attribute には有効な URL を指定してください。',

    'attributes' => [],
];
