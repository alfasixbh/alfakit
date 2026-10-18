<?php

declare(strict_types=1);

/*
 * Arabic validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Attribute names come from the field
 * labels, which are already translated.
 */
return [
    'accepted' => 'يجب قبول :attribute.',
    'after' => 'يجب أن يكون :attribute تاريخًا بعد :date.',
    'after_or_equal' => 'يجب أن يكون :attribute تاريخًا مساويًا لـ :date أو بعده.',
    'alpha_dash' => 'يجب ألا يحتوي :attribute إلا على حروف وأرقام وشرطات.',
    'array' => 'يجب أن يكون :attribute قائمة.',
    'before' => 'يجب أن يكون :attribute تاريخًا قبل :date.',
    'before_or_equal' => 'يجب أن يكون :attribute تاريخًا مساويًا لـ :date أو قبله.',
    'between' => [
        'numeric' => 'يجب أن تكون قيمة :attribute بين :min و:max.',
        'string' => 'يجب أن يكون طول :attribute بين :min و:max حرفًا.',
        'array' => 'يجب أن يحتوي :attribute على :min إلى :max عنصرًا.',
        'file' => 'يجب أن يكون حجم :attribute بين :min و:max كيلوبايت.',
    ],
    'boolean' => 'يجب أن تكون قيمة :attribute صحيحة أو خاطئة.',
    'confirmed' => 'تأكيد :attribute غير مطابق.',
    'current_password' => 'كلمة المرور غير صحيحة.',
    'date' => 'يجب أن يكون :attribute تاريخًا صحيحًا.',
    'different' => 'يجب أن يختلف :attribute عن :other.',
    'digits' => 'يجب أن يتكون :attribute من :digits أرقام.',
    'distinct' => 'للحقل :attribute قيمة مكررة.',
    'email' => 'يجب أن يكون :attribute عنوان بريد إلكتروني صحيحًا.',
    'exists' => 'القيمة المختارة في :attribute غير صالحة.',
    'file' => 'يجب أن يكون :attribute ملفًا.',
    'filled' => 'يجب أن يحتوي :attribute على قيمة.',
    'gt' => [
        'numeric' => 'يجب أن تكون قيمة :attribute أكبر من :value.',
        'string' => 'يجب أن يكون طول :attribute أكبر من :value حرفًا.',
        'array' => 'يجب أن يحتوي :attribute على أكثر من :value عنصرًا.',
        'file' => 'يجب أن يكون حجم :attribute أكبر من :value كيلوبايت.',
    ],
    'gte' => [
        'numeric' => 'يجب أن تكون قيمة :attribute مساوية لـ :value أو أكبر.',
        'string' => 'يجب ألا يقل طول :attribute عن :value حرفًا.',
        'array' => 'يجب أن يحتوي :attribute على :value عنصرًا أو أكثر.',
        'file' => 'يجب ألا يقل حجم :attribute عن :value كيلوبايت.',
    ],
    'image' => 'يجب أن يكون :attribute صورة.',
    'in' => 'القيمة المختارة في :attribute غير صالحة.',
    'integer' => 'يجب أن يكون :attribute عددًا صحيحًا.',
    'lt' => [
        'numeric' => 'يجب أن تكون قيمة :attribute أقل من :value.',
        'string' => 'يجب أن يكون طول :attribute أقل من :value حرفًا.',
        'array' => 'يجب أن يحتوي :attribute على أقل من :value عنصرًا.',
        'file' => 'يجب أن يكون حجم :attribute أقل من :value كيلوبايت.',
    ],
    'lte' => [
        'numeric' => 'يجب أن تكون قيمة :attribute مساوية لـ :value أو أقل.',
        'string' => 'يجب ألا يزيد طول :attribute عن :value حرفًا.',
        'array' => 'يجب ألا يحتوي :attribute على أكثر من :value عنصرًا.',
        'file' => 'يجب ألا يزيد حجم :attribute عن :value كيلوبايت.',
    ],
    'max' => [
        'numeric' => 'يجب ألا تزيد قيمة :attribute عن :max.',
        'string' => 'يجب ألا يزيد طول :attribute عن :max حرفًا.',
        'array' => 'يجب ألا يحتوي :attribute على أكثر من :max عنصرًا.',
        'file' => 'يجب ألا يزيد حجم :attribute عن :max كيلوبايت.',
    ],
    'mimes' => 'يجب أن يكون :attribute ملفًا من النوع: :values.',
    'mimetypes' => 'يجب أن يكون :attribute ملفًا من النوع: :values.',
    'min' => [
        'numeric' => 'يجب ألا تقل قيمة :attribute عن :min.',
        'string' => 'يجب ألا يقل طول :attribute عن :min حرفًا.',
        'array' => 'يجب أن يحتوي :attribute على :min عنصرًا على الأقل.',
        'file' => 'يجب ألا يقل حجم :attribute عن :min كيلوبايت.',
    ],
    'numeric' => 'يجب أن يكون :attribute رقمًا.',
    'password' => [
        'letters' => 'يجب أن يحتوي :attribute على حرف واحد على الأقل.',
        'mixed' => 'يجب أن يحتوي :attribute على حرف كبير وحرف صغير على الأقل.',
        'numbers' => 'يجب أن يحتوي :attribute على رقم واحد على الأقل.',
        'symbols' => 'يجب أن يحتوي :attribute على رمز واحد على الأقل.',
        'uncompromised' => 'ظهرت قيمة :attribute في تسريب بيانات. اختر قيمة أخرى.',
    ],
    'regex' => 'صيغة :attribute غير صالحة.',
    'required' => 'حقل :attribute مطلوب.',
    'required_if' => 'حقل :attribute مطلوب عندما يكون :other هو :value.',
    'required_with' => 'حقل :attribute مطلوب عند وجود :values.',
    'same' => 'يجب أن يتطابق :attribute مع :other.',
    'size' => [
        'numeric' => 'يجب أن تكون قيمة :attribute :size.',
        'string' => 'يجب أن يكون طول :attribute :size حرفًا.',
        'array' => 'يجب أن يحتوي :attribute على :size عنصرًا.',
        'file' => 'يجب أن يكون حجم :attribute :size كيلوبايت.',
    ],
    'string' => 'يجب أن يكون :attribute نصًا.',
    'unique' => 'قيمة :attribute مستخدمة من قبل.',
    'uploaded' => 'تعذّر رفع :attribute.',
    'url' => 'يجب أن يكون :attribute رابطًا صحيحًا.',

    'attributes' => [],
];
