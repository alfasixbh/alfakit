<?php

declare(strict_types=1);

/*
 * Russian validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => 'Необходимо принять «:attribute».',
    'after' => '«:attribute» должно быть датой после :date.',
    'after_or_equal' => '«:attribute» должно быть датой не раньше :date.',
    'alpha_dash' => '«:attribute» может содержать только буквы, цифры и дефисы.',
    'array' => '«:attribute» должно быть списком.',
    'before' => '«:attribute» должно быть датой до :date.',
    'before_or_equal' => '«:attribute» должно быть датой не позже :date.',
    'between' => [
        'numeric' => '«:attribute» должно быть от :min до :max.',
        'string' => '«:attribute» должно содержать от :min до :max символов.',
        'array' => '«:attribute» должно содержать от :min до :max элементов.',
        'file' => 'Размер «:attribute» должен быть от :min до :max КБ.',
    ],
    'boolean' => '«:attribute» должно быть «да» или «нет».',
    'confirmed' => 'Подтверждение «:attribute» не совпадает.',
    'current_password' => 'Неверный пароль.',
    'date' => '«:attribute» должно быть корректной датой.',
    'different' => '«:attribute» и «:other» должны различаться.',
    'digits' => '«:attribute» должно состоять из :digits цифр.',
    'distinct' => '«:attribute» содержит повторяющееся значение.',
    'email' => '«:attribute» должно быть корректным адресом электронной почты.',
    'exists' => 'Выбранное значение «:attribute» недопустимо.',
    'file' => '«:attribute» должно быть файлом.',
    'filled' => '«:attribute» должно быть заполнено.',
    'gt' => [
        'numeric' => '«:attribute» должно быть больше :value.',
        'string' => '«:attribute» должно содержать больше :value символов.',
        'array' => '«:attribute» должно содержать больше :value элементов.',
        'file' => 'Размер «:attribute» должен быть больше :value КБ.',
    ],
    'gte' => [
        'numeric' => '«:attribute» должно быть не меньше :value.',
        'string' => '«:attribute» должно содержать не меньше :value символов.',
        'array' => '«:attribute» должно содержать не меньше :value элементов.',
        'file' => 'Размер «:attribute» должен быть не меньше :value КБ.',
    ],
    'image' => '«:attribute» должно быть изображением.',
    'in' => 'Выбранное значение «:attribute» недопустимо.',
    'integer' => '«:attribute» должно быть целым числом.',
    'lt' => [
        'numeric' => '«:attribute» должно быть меньше :value.',
        'string' => '«:attribute» должно содержать меньше :value символов.',
        'array' => '«:attribute» должно содержать меньше :value элементов.',
        'file' => 'Размер «:attribute» должен быть меньше :value КБ.',
    ],
    'lte' => [
        'numeric' => '«:attribute» должно быть не больше :value.',
        'string' => '«:attribute» должно содержать не больше :value символов.',
        'array' => '«:attribute» должно содержать не больше :value элементов.',
        'file' => 'Размер «:attribute» должен быть не больше :value КБ.',
    ],
    'max' => [
        'numeric' => '«:attribute» не может быть больше :max.',
        'string' => '«:attribute» не может содержать больше :max символов.',
        'array' => '«:attribute» не может содержать больше :max элементов.',
        'file' => 'Размер «:attribute» не может превышать :max КБ.',
    ],
    'mimes' => '«:attribute» должно быть файлом типа: :values.',
    'mimetypes' => '«:attribute» должно быть файлом типа: :values.',
    'min' => [
        'numeric' => '«:attribute» должно быть не меньше :min.',
        'string' => '«:attribute» должно содержать не меньше :min символов.',
        'array' => '«:attribute» должно содержать не меньше :min элементов.',
        'file' => 'Размер «:attribute» должен быть не меньше :min КБ.',
    ],
    'numeric' => '«:attribute» должно быть числом.',
    'password' => [
        'letters' => '«:attribute» должно содержать хотя бы одну букву.',
        'mixed' => '«:attribute» должно содержать хотя бы одну заглавную и одну строчную букву.',
        'numbers' => '«:attribute» должно содержать хотя бы одну цифру.',
        'symbols' => '«:attribute» должно содержать хотя бы один символ.',
        'uncompromised' => 'Значение «:attribute» обнаружено в утечке данных. Выберите другое.',
    ],
    'regex' => 'Неверный формат «:attribute».',
    'required' => 'Поле «:attribute» обязательно.',
    'required_if' => 'Поле «:attribute» обязательно, когда «:other» равно :value.',
    'required_with' => 'Поле «:attribute» обязательно, если указано :values.',
    'same' => '«:attribute» и «:other» должны совпадать.',
    'size' => [
        'numeric' => '«:attribute» должно быть равно :size.',
        'string' => '«:attribute» должно содержать :size символов.',
        'array' => '«:attribute» должно содержать :size элементов.',
        'file' => 'Размер «:attribute» должен быть :size КБ.',
    ],
    'string' => '«:attribute» должно быть текстом.',
    'unique' => 'Значение «:attribute» уже занято.',
    'uploaded' => 'Не удалось загрузить «:attribute».',
    'url' => '«:attribute» должно быть корректным URL.',

    'attributes' => [],
];
