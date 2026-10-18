<?php

declare(strict_types=1);

/*
 * French validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => 'Le champ :attribute doit être accepté.',
    'after' => 'Le champ :attribute doit être une date postérieure au :date.',
    'after_or_equal' => 'Le champ :attribute doit être une date postérieure ou égale au :date.',
    'alpha_dash' => 'Le champ :attribute ne peut contenir que des lettres, des chiffres et des tirets.',
    'array' => 'Le champ :attribute doit être une liste.',
    'before' => 'Le champ :attribute doit être une date antérieure au :date.',
    'before_or_equal' => 'Le champ :attribute doit être une date antérieure ou égale au :date.',
    'between' => [
        'numeric' => 'La valeur de :attribute doit être comprise entre :min et :max.',
        'string' => 'Le champ :attribute doit contenir entre :min et :max caractères.',
        'array' => 'Le champ :attribute doit contenir entre :min et :max éléments.',
        'file' => 'La taille de :attribute doit être comprise entre :min et :max kilo-octets.',
    ],
    'boolean' => 'Le champ :attribute doit être vrai ou faux.',
    'confirmed' => 'La confirmation de :attribute ne correspond pas.',
    'current_password' => 'Le mot de passe est incorrect.',
    'date' => 'Le champ :attribute doit être une date valide.',
    'different' => 'Les champs :attribute et :other doivent être différents.',
    'digits' => 'Le champ :attribute doit contenir :digits chiffres.',
    'distinct' => 'Le champ :attribute contient une valeur en double.',
    'email' => 'Le champ :attribute doit être une adresse e-mail valide.',
    'exists' => 'La valeur sélectionnée pour :attribute n’est pas valide.',
    'file' => 'Le champ :attribute doit être un fichier.',
    'filled' => 'Le champ :attribute doit avoir une valeur.',
    'gt' => [
        'numeric' => 'La valeur de :attribute doit être supérieure à :value.',
        'string' => 'Le champ :attribute doit contenir plus de :value caractères.',
        'array' => 'Le champ :attribute doit contenir plus de :value éléments.',
        'file' => 'La taille de :attribute doit être supérieure à :value kilo-octets.',
    ],
    'gte' => [
        'numeric' => 'La valeur de :attribute doit être supérieure ou égale à :value.',
        'string' => 'Le champ :attribute doit contenir au moins :value caractères.',
        'array' => 'Le champ :attribute doit contenir au moins :value éléments.',
        'file' => 'La taille de :attribute doit être d’au moins :value kilo-octets.',
    ],
    'image' => 'Le champ :attribute doit être une image.',
    'in' => 'La valeur sélectionnée pour :attribute n’est pas valide.',
    'integer' => 'Le champ :attribute doit être un nombre entier.',
    'lt' => [
        'numeric' => 'La valeur de :attribute doit être inférieure à :value.',
        'string' => 'Le champ :attribute doit contenir moins de :value caractères.',
        'array' => 'Le champ :attribute doit contenir moins de :value éléments.',
        'file' => 'La taille de :attribute doit être inférieure à :value kilo-octets.',
    ],
    'lte' => [
        'numeric' => 'La valeur de :attribute doit être inférieure ou égale à :value.',
        'string' => 'Le champ :attribute ne doit pas dépasser :value caractères.',
        'array' => 'Le champ :attribute ne doit pas contenir plus de :value éléments.',
        'file' => 'La taille de :attribute ne doit pas dépasser :value kilo-octets.',
    ],
    'max' => [
        'numeric' => 'La valeur de :attribute ne doit pas dépasser :max.',
        'string' => 'Le champ :attribute ne doit pas dépasser :max caractères.',
        'array' => 'Le champ :attribute ne doit pas contenir plus de :max éléments.',
        'file' => 'La taille de :attribute ne doit pas dépasser :max kilo-octets.',
    ],
    'mimes' => 'Le champ :attribute doit être un fichier de type : :values.',
    'mimetypes' => 'Le champ :attribute doit être un fichier de type : :values.',
    'min' => [
        'numeric' => 'La valeur de :attribute doit être d’au moins :min.',
        'string' => 'Le champ :attribute doit contenir au moins :min caractères.',
        'array' => 'Le champ :attribute doit contenir au moins :min éléments.',
        'file' => 'La taille de :attribute doit être d’au moins :min kilo-octets.',
    ],
    'numeric' => 'Le champ :attribute doit être un nombre.',
    'password' => [
        'letters' => 'Le champ :attribute doit contenir au moins une lettre.',
        'mixed' => 'Le champ :attribute doit contenir au moins une majuscule et une minuscule.',
        'numbers' => 'Le champ :attribute doit contenir au moins un chiffre.',
        'symbols' => 'Le champ :attribute doit contenir au moins un symbole.',
        'uncompromised' => 'La valeur de :attribute est apparue dans une fuite de données. Choisissez-en une autre.',
    ],
    'regex' => 'Le format de :attribute n’est pas valide.',
    'required' => 'Le champ :attribute est obligatoire.',
    'required_if' => 'Le champ :attribute est obligatoire quand :other vaut :value.',
    'required_with' => 'Le champ :attribute est obligatoire quand :values est présent.',
    'same' => 'Les champs :attribute et :other doivent correspondre.',
    'size' => [
        'numeric' => 'La valeur de :attribute doit être :size.',
        'string' => 'Le champ :attribute doit contenir :size caractères.',
        'array' => 'Le champ :attribute doit contenir :size éléments.',
        'file' => 'La taille de :attribute doit être de :size kilo-octets.',
    ],
    'string' => 'Le champ :attribute doit être un texte.',
    'unique' => 'La valeur de :attribute est déjà utilisée.',
    'uploaded' => 'Le fichier :attribute n’a pas pu être envoyé.',
    'url' => 'Le champ :attribute doit être une URL valide.',

    'attributes' => [],
];
