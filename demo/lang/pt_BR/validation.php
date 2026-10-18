<?php

declare(strict_types=1);

/*
 * Brazilian Portuguese validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => 'O campo :attribute precisa ser aceito.',
    'after' => 'O campo :attribute deve ser uma data posterior a :date.',
    'after_or_equal' => 'O campo :attribute deve ser uma data igual ou posterior a :date.',
    'alpha_dash' => 'O campo :attribute só pode conter letras, números e hifens.',
    'array' => 'O campo :attribute deve ser uma lista.',
    'before' => 'O campo :attribute deve ser uma data anterior a :date.',
    'before_or_equal' => 'O campo :attribute deve ser uma data igual ou anterior a :date.',
    'between' => [
        'numeric' => 'O campo :attribute deve estar entre :min e :max.',
        'string' => 'O campo :attribute deve ter entre :min e :max caracteres.',
        'array' => 'O campo :attribute deve ter entre :min e :max itens.',
        'file' => 'O campo :attribute deve ter entre :min e :max kilobytes.',
    ],
    'boolean' => 'O campo :attribute deve ser verdadeiro ou falso.',
    'confirmed' => 'A confirmação de :attribute não confere.',
    'current_password' => 'A senha está incorreta.',
    'date' => 'O campo :attribute deve ser uma data válida.',
    'different' => 'Os campos :attribute e :other devem ser diferentes.',
    'digits' => 'O campo :attribute deve ter :digits dígitos.',
    'distinct' => 'O campo :attribute tem um valor duplicado.',
    'email' => 'O campo :attribute deve ser um endereço de e-mail válido.',
    'exists' => 'O valor selecionado em :attribute é inválido.',
    'file' => 'O campo :attribute deve ser um arquivo.',
    'filled' => 'O campo :attribute deve ter um valor.',
    'gt' => [
        'numeric' => 'O campo :attribute deve ser maior que :value.',
        'string' => 'O campo :attribute deve ter mais de :value caracteres.',
        'array' => 'O campo :attribute deve ter mais de :value itens.',
        'file' => 'O campo :attribute deve ter mais de :value kilobytes.',
    ],
    'gte' => [
        'numeric' => 'O campo :attribute deve ser maior ou igual a :value.',
        'string' => 'O campo :attribute deve ter pelo menos :value caracteres.',
        'array' => 'O campo :attribute deve ter pelo menos :value itens.',
        'file' => 'O campo :attribute deve ter pelo menos :value kilobytes.',
    ],
    'image' => 'O campo :attribute deve ser uma imagem.',
    'in' => 'O valor selecionado em :attribute é inválido.',
    'integer' => 'O campo :attribute deve ser um número inteiro.',
    'lt' => [
        'numeric' => 'O campo :attribute deve ser menor que :value.',
        'string' => 'O campo :attribute deve ter menos de :value caracteres.',
        'array' => 'O campo :attribute deve ter menos de :value itens.',
        'file' => 'O campo :attribute deve ter menos de :value kilobytes.',
    ],
    'lte' => [
        'numeric' => 'O campo :attribute deve ser menor ou igual a :value.',
        'string' => 'O campo :attribute não pode ter mais de :value caracteres.',
        'array' => 'O campo :attribute não pode ter mais de :value itens.',
        'file' => 'O campo :attribute não pode ter mais de :value kilobytes.',
    ],
    'max' => [
        'numeric' => 'O campo :attribute não pode ser maior que :max.',
        'string' => 'O campo :attribute não pode ter mais de :max caracteres.',
        'array' => 'O campo :attribute não pode ter mais de :max itens.',
        'file' => 'O campo :attribute não pode ter mais de :max kilobytes.',
    ],
    'mimes' => 'O campo :attribute deve ser um arquivo do tipo: :values.',
    'mimetypes' => 'O campo :attribute deve ser um arquivo do tipo: :values.',
    'min' => [
        'numeric' => 'O campo :attribute deve ser pelo menos :min.',
        'string' => 'O campo :attribute deve ter pelo menos :min caracteres.',
        'array' => 'O campo :attribute deve ter pelo menos :min itens.',
        'file' => 'O campo :attribute deve ter pelo menos :min kilobytes.',
    ],
    'numeric' => 'O campo :attribute deve ser um número.',
    'password' => [
        'letters' => 'O campo :attribute deve conter pelo menos uma letra.',
        'mixed' => 'O campo :attribute deve conter pelo menos uma letra maiúscula e uma minúscula.',
        'numbers' => 'O campo :attribute deve conter pelo menos um número.',
        'symbols' => 'O campo :attribute deve conter pelo menos um símbolo.',
        'uncompromised' => 'O valor de :attribute apareceu em um vazamento de dados. Escolha outro.',
    ],
    'regex' => 'O formato de :attribute é inválido.',
    'required' => 'O campo :attribute é obrigatório.',
    'required_if' => 'O campo :attribute é obrigatório quando :other é :value.',
    'required_with' => 'O campo :attribute é obrigatório quando :values está presente.',
    'same' => 'Os campos :attribute e :other devem coincidir.',
    'size' => [
        'numeric' => 'O campo :attribute deve ser :size.',
        'string' => 'O campo :attribute deve ter :size caracteres.',
        'array' => 'O campo :attribute deve ter :size itens.',
        'file' => 'O campo :attribute deve ter :size kilobytes.',
    ],
    'string' => 'O campo :attribute deve ser um texto.',
    'unique' => 'O valor de :attribute já está em uso.',
    'uploaded' => 'Não foi possível enviar :attribute.',
    'url' => 'O campo :attribute deve ser uma URL válida.',

    'attributes' => [],
];
