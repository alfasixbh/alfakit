<?php

declare(strict_types=1);

/*
 * Turkish validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => ':attribute kabul edilmelidir.',
    'after' => ':attribute, :date tarihinden sonra olmalıdır.',
    'after_or_equal' => ':attribute, :date tarihi veya sonrası olmalıdır.',
    'alpha_dash' => ':attribute yalnızca harf, rakam ve tire içerebilir.',
    'array' => ':attribute bir liste olmalıdır.',
    'before' => ':attribute, :date tarihinden önce olmalıdır.',
    'before_or_equal' => ':attribute, :date tarihi veya öncesi olmalıdır.',
    'between' => [
        'numeric' => ':attribute, :min ile :max arasında olmalıdır.',
        'string' => ':attribute, :min ile :max karakter arasında olmalıdır.',
        'array' => ':attribute, :min ile :max öğe arasında içermelidir.',
        'file' => ':attribute, :min ile :max kilobayt arasında olmalıdır.',
    ],
    'boolean' => ':attribute doğru veya yanlış olmalıdır.',
    'confirmed' => ':attribute onayı eşleşmiyor.',
    'current_password' => 'Parola yanlış.',
    'date' => ':attribute geçerli bir tarih olmalıdır.',
    'different' => ':attribute ile :other farklı olmalıdır.',
    'digits' => ':attribute :digits haneli olmalıdır.',
    'distinct' => ':attribute yinelenen bir değer içeriyor.',
    'email' => ':attribute geçerli bir e-posta adresi olmalıdır.',
    'exists' => 'Seçilen :attribute geçersiz.',
    'file' => ':attribute bir dosya olmalıdır.',
    'filled' => ':attribute bir değer içermelidir.',
    'gt' => [
        'numeric' => ':attribute, :value değerinden büyük olmalıdır.',
        'string' => ':attribute, :value karakterden uzun olmalıdır.',
        'array' => ':attribute, :value öğeden fazla içermelidir.',
        'file' => ':attribute, :value kilobayttan büyük olmalıdır.',
    ],
    'gte' => [
        'numeric' => ':attribute, :value veya daha büyük olmalıdır.',
        'string' => ':attribute en az :value karakter olmalıdır.',
        'array' => ':attribute en az :value öğe içermelidir.',
        'file' => ':attribute en az :value kilobayt olmalıdır.',
    ],
    'image' => ':attribute bir görsel olmalıdır.',
    'in' => 'Seçilen :attribute geçersiz.',
    'integer' => ':attribute bir tam sayı olmalıdır.',
    'lt' => [
        'numeric' => ':attribute, :value değerinden küçük olmalıdır.',
        'string' => ':attribute, :value karakterden kısa olmalıdır.',
        'array' => ':attribute, :value öğeden az içermelidir.',
        'file' => ':attribute, :value kilobayttan küçük olmalıdır.',
    ],
    'lte' => [
        'numeric' => ':attribute, :value veya daha küçük olmalıdır.',
        'string' => ':attribute en fazla :value karakter olabilir.',
        'array' => ':attribute en fazla :value öğe içerebilir.',
        'file' => ':attribute en fazla :value kilobayt olabilir.',
    ],
    'max' => [
        'numeric' => ':attribute, :max değerinden büyük olamaz.',
        'string' => ':attribute en fazla :max karakter olabilir.',
        'array' => ':attribute en fazla :max öğe içerebilir.',
        'file' => ':attribute en fazla :max kilobayt olabilir.',
    ],
    'mimes' => ':attribute şu türde bir dosya olmalıdır: :values.',
    'mimetypes' => ':attribute şu türde bir dosya olmalıdır: :values.',
    'min' => [
        'numeric' => ':attribute en az :min olmalıdır.',
        'string' => ':attribute en az :min karakter olmalıdır.',
        'array' => ':attribute en az :min öğe içermelidir.',
        'file' => ':attribute en az :min kilobayt olmalıdır.',
    ],
    'numeric' => ':attribute bir sayı olmalıdır.',
    'password' => [
        'letters' => ':attribute en az bir harf içermelidir.',
        'mixed' => ':attribute en az bir büyük ve bir küçük harf içermelidir.',
        'numbers' => ':attribute en az bir rakam içermelidir.',
        'symbols' => ':attribute en az bir sembol içermelidir.',
        'uncompromised' => ':attribute bir veri sızıntısında görüldü. Lütfen başka bir değer seçin.',
    ],
    'regex' => ':attribute biçimi geçersiz.',
    'required' => ':attribute alanı zorunludur.',
    'required_if' => ':other :value olduğunda :attribute alanı zorunludur.',
    'required_with' => ':values varsa :attribute alanı zorunludur.',
    'same' => ':attribute ile :other eşleşmelidir.',
    'size' => [
        'numeric' => ':attribute :size olmalıdır.',
        'string' => ':attribute :size karakter olmalıdır.',
        'array' => ':attribute :size öğe içermelidir.',
        'file' => ':attribute :size kilobayt olmalıdır.',
    ],
    'string' => ':attribute bir metin olmalıdır.',
    'unique' => ':attribute zaten kullanılıyor.',
    'uploaded' => ':attribute yüklenemedi.',
    'url' => ':attribute geçerli bir URL olmalıdır.',

    'attributes' => [],
];
