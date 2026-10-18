<?php

declare(strict_types=1);

/*
 * Persian validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => ':attribute باید پذیرفته شود.',
    'after' => ':attribute باید تاریخی پس از :date باشد.',
    'after_or_equal' => ':attribute باید تاریخی برابر یا پس از :date باشد.',
    'alpha_dash' => ':attribute فقط می‌تواند شامل حروف، اعداد و خط تیره باشد.',
    'array' => ':attribute باید یک فهرست باشد.',
    'before' => ':attribute باید تاریخی پیش از :date باشد.',
    'before_or_equal' => ':attribute باید تاریخی برابر یا پیش از :date باشد.',
    'between' => [
        'numeric' => ':attribute باید بین :min و :max باشد.',
        'string' => ':attribute باید بین :min و :max نویسه باشد.',
        'array' => ':attribute باید بین :min و :max مورد داشته باشد.',
        'file' => 'حجم :attribute باید بین :min و :max کیلوبایت باشد.',
    ],
    'boolean' => ':attribute باید درست یا نادرست باشد.',
    'confirmed' => 'تأیید :attribute مطابقت ندارد.',
    'current_password' => 'رمز عبور نادرست است.',
    'date' => ':attribute باید تاریخ معتبری باشد.',
    'different' => ':attribute و :other باید متفاوت باشند.',
    'digits' => ':attribute باید :digits رقم باشد.',
    'distinct' => ':attribute مقدار تکراری دارد.',
    'email' => ':attribute باید نشانی ایمیل معتبری باشد.',
    'exists' => 'مقدار انتخاب‌شده برای :attribute نامعتبر است.',
    'file' => ':attribute باید یک فایل باشد.',
    'filled' => ':attribute باید مقدار داشته باشد.',
    'gt' => [
        'numeric' => ':attribute باید بزرگ‌تر از :value باشد.',
        'string' => ':attribute باید بیش از :value نویسه باشد.',
        'array' => ':attribute باید بیش از :value مورد داشته باشد.',
        'file' => 'حجم :attribute باید بیش از :value کیلوبایت باشد.',
    ],
    'gte' => [
        'numeric' => ':attribute باید بزرگ‌تر یا برابر با :value باشد.',
        'string' => ':attribute باید دست‌کم :value نویسه باشد.',
        'array' => ':attribute باید دست‌کم :value مورد داشته باشد.',
        'file' => 'حجم :attribute باید دست‌کم :value کیلوبایت باشد.',
    ],
    'image' => ':attribute باید یک تصویر باشد.',
    'in' => 'مقدار انتخاب‌شده برای :attribute نامعتبر است.',
    'integer' => ':attribute باید یک عدد صحیح باشد.',
    'lt' => [
        'numeric' => ':attribute باید کوچک‌تر از :value باشد.',
        'string' => ':attribute باید کمتر از :value نویسه باشد.',
        'array' => ':attribute باید کمتر از :value مورد داشته باشد.',
        'file' => 'حجم :attribute باید کمتر از :value کیلوبایت باشد.',
    ],
    'lte' => [
        'numeric' => ':attribute باید کوچک‌تر یا برابر با :value باشد.',
        'string' => ':attribute نباید بیش از :value نویسه باشد.',
        'array' => ':attribute نباید بیش از :value مورد داشته باشد.',
        'file' => 'حجم :attribute نباید بیش از :value کیلوبایت باشد.',
    ],
    'max' => [
        'numeric' => ':attribute نباید بزرگ‌تر از :max باشد.',
        'string' => ':attribute نباید بیش از :max نویسه باشد.',
        'array' => ':attribute نباید بیش از :max مورد داشته باشد.',
        'file' => 'حجم :attribute نباید بیش از :max کیلوبایت باشد.',
    ],
    'mimes' => ':attribute باید فایلی از این نوع باشد: :values.',
    'mimetypes' => ':attribute باید فایلی از این نوع باشد: :values.',
    'min' => [
        'numeric' => ':attribute باید دست‌کم :min باشد.',
        'string' => ':attribute باید دست‌کم :min نویسه باشد.',
        'array' => ':attribute باید دست‌کم :min مورد داشته باشد.',
        'file' => 'حجم :attribute باید دست‌کم :min کیلوبایت باشد.',
    ],
    'numeric' => ':attribute باید یک عدد باشد.',
    'password' => [
        'letters' => ':attribute باید دست‌کم یک حرف داشته باشد.',
        'mixed' => ':attribute باید دست‌کم یک حرف بزرگ و یک حرف کوچک داشته باشد.',
        'numbers' => ':attribute باید دست‌کم یک رقم داشته باشد.',
        'symbols' => ':attribute باید دست‌کم یک نماد داشته باشد.',
        'uncompromised' => 'مقدار :attribute در یک نشت داده دیده شده است. مقدار دیگری انتخاب کنید.',
    ],
    'regex' => 'قالب :attribute نامعتبر است.',
    'required' => 'فیلد :attribute الزامی است.',
    'required_if' => 'وقتی :other برابر :value است، فیلد :attribute الزامی است.',
    'required_with' => 'وقتی :values وجود دارد، فیلد :attribute الزامی است.',
    'same' => ':attribute و :other باید یکسان باشند.',
    'size' => [
        'numeric' => ':attribute باید :size باشد.',
        'string' => ':attribute باید :size نویسه باشد.',
        'array' => ':attribute باید :size مورد داشته باشد.',
        'file' => 'حجم :attribute باید :size کیلوبایت باشد.',
    ],
    'string' => ':attribute باید متن باشد.',
    'unique' => ':attribute قبلاً استفاده شده است.',
    'uploaded' => 'بارگذاری :attribute ناموفق بود.',
    'url' => ':attribute باید نشانی اینترنتی معتبری باشد.',

    'attributes' => [],
];
