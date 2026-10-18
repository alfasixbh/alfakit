<?php

declare(strict_types=1);

/*
 * Spanish validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => 'Debes aceptar :attribute.',
    'after' => ':attribute debe ser una fecha posterior a :date.',
    'after_or_equal' => ':attribute debe ser una fecha posterior o igual a :date.',
    'alpha_dash' => ':attribute solo puede contener letras, números y guiones.',
    'array' => ':attribute debe ser una lista.',
    'before' => ':attribute debe ser una fecha anterior a :date.',
    'before_or_equal' => ':attribute debe ser una fecha anterior o igual a :date.',
    'between' => [
        'numeric' => ':attribute debe estar entre :min y :max.',
        'string' => ':attribute debe tener entre :min y :max caracteres.',
        'array' => ':attribute debe tener entre :min y :max elementos.',
        'file' => ':attribute debe pesar entre :min y :max kilobytes.',
    ],
    'boolean' => ':attribute debe ser verdadero o falso.',
    'confirmed' => 'La confirmación de :attribute no coincide.',
    'current_password' => 'La contraseña es incorrecta.',
    'date' => ':attribute debe ser una fecha válida.',
    'different' => ':attribute y :other deben ser distintos.',
    'digits' => ':attribute debe tener :digits dígitos.',
    'distinct' => ':attribute tiene un valor duplicado.',
    'email' => ':attribute debe ser una dirección de correo válida.',
    'exists' => 'El valor seleccionado en :attribute no es válido.',
    'file' => ':attribute debe ser un archivo.',
    'filled' => ':attribute debe tener un valor.',
    'gt' => [
        'numeric' => ':attribute debe ser mayor que :value.',
        'string' => ':attribute debe tener más de :value caracteres.',
        'array' => ':attribute debe tener más de :value elementos.',
        'file' => ':attribute debe pesar más de :value kilobytes.',
    ],
    'gte' => [
        'numeric' => ':attribute debe ser mayor o igual que :value.',
        'string' => ':attribute debe tener al menos :value caracteres.',
        'array' => ':attribute debe tener al menos :value elementos.',
        'file' => ':attribute debe pesar al menos :value kilobytes.',
    ],
    'image' => ':attribute debe ser una imagen.',
    'in' => 'El valor seleccionado en :attribute no es válido.',
    'integer' => ':attribute debe ser un número entero.',
    'lt' => [
        'numeric' => ':attribute debe ser menor que :value.',
        'string' => ':attribute debe tener menos de :value caracteres.',
        'array' => ':attribute debe tener menos de :value elementos.',
        'file' => ':attribute debe pesar menos de :value kilobytes.',
    ],
    'lte' => [
        'numeric' => ':attribute debe ser menor o igual que :value.',
        'string' => ':attribute no debe superar los :value caracteres.',
        'array' => ':attribute no debe tener más de :value elementos.',
        'file' => ':attribute no debe superar los :value kilobytes.',
    ],
    'max' => [
        'numeric' => ':attribute no debe ser mayor que :max.',
        'string' => ':attribute no debe superar los :max caracteres.',
        'array' => ':attribute no debe tener más de :max elementos.',
        'file' => ':attribute no debe superar los :max kilobytes.',
    ],
    'mimes' => ':attribute debe ser un archivo de tipo: :values.',
    'mimetypes' => ':attribute debe ser un archivo de tipo: :values.',
    'min' => [
        'numeric' => ':attribute debe ser al menos :min.',
        'string' => ':attribute debe tener al menos :min caracteres.',
        'array' => ':attribute debe tener al menos :min elementos.',
        'file' => ':attribute debe pesar al menos :min kilobytes.',
    ],
    'numeric' => ':attribute debe ser un número.',
    'password' => [
        'letters' => ':attribute debe contener al menos una letra.',
        'mixed' => ':attribute debe contener al menos una mayúscula y una minúscula.',
        'numbers' => ':attribute debe contener al menos un número.',
        'symbols' => ':attribute debe contener al menos un símbolo.',
        'uncompromised' => 'El valor de :attribute ha aparecido en una filtración de datos. Elige otro.',
    ],
    'regex' => 'El formato de :attribute no es válido.',
    'required' => 'El campo :attribute es obligatorio.',
    'required_if' => 'El campo :attribute es obligatorio cuando :other es :value.',
    'required_with' => 'El campo :attribute es obligatorio cuando :values está presente.',
    'same' => ':attribute y :other deben coincidir.',
    'size' => [
        'numeric' => ':attribute debe ser :size.',
        'string' => ':attribute debe tener :size caracteres.',
        'array' => ':attribute debe tener :size elementos.',
        'file' => ':attribute debe pesar :size kilobytes.',
    ],
    'string' => ':attribute debe ser un texto.',
    'unique' => 'El valor de :attribute ya está en uso.',
    'uploaded' => 'No se pudo subir :attribute.',
    'url' => ':attribute debe ser una URL válida.',

    'attributes' => [],
];
