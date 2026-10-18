<?php

declare(strict_types=1);

/*
 * Italian validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => ':attribute deve essere accettato.',
    'after' => ':attribute deve essere una data successiva al :date.',
    'after_or_equal' => ':attribute deve essere una data uguale o successiva al :date.',
    'alpha_dash' => ':attribute può contenere solo lettere, numeri e trattini.',
    'array' => ':attribute deve essere un elenco.',
    'before' => ':attribute deve essere una data precedente al :date.',
    'before_or_equal' => ':attribute deve essere una data uguale o precedente al :date.',
    'between' => [
        'numeric' => ':attribute deve essere compreso tra :min e :max.',
        'string' => ':attribute deve contenere tra :min e :max caratteri.',
        'array' => ':attribute deve contenere tra :min e :max elementi.',
        'file' => ':attribute deve pesare tra :min e :max kilobyte.',
    ],
    'boolean' => ':attribute deve essere vero o falso.',
    'confirmed' => 'La conferma di :attribute non corrisponde.',
    'current_password' => 'La password non è corretta.',
    'date' => ':attribute deve essere una data valida.',
    'different' => ':attribute e :other devono essere diversi.',
    'digits' => ':attribute deve contenere :digits cifre.',
    'distinct' => ':attribute contiene un valore duplicato.',
    'email' => ':attribute deve essere un indirizzo e-mail valido.',
    'exists' => 'Il valore selezionato per :attribute non è valido.',
    'file' => ':attribute deve essere un file.',
    'filled' => ':attribute deve avere un valore.',
    'gt' => [
        'numeric' => ':attribute deve essere maggiore di :value.',
        'string' => ':attribute deve contenere più di :value caratteri.',
        'array' => ':attribute deve contenere più di :value elementi.',
        'file' => ':attribute deve pesare più di :value kilobyte.',
    ],
    'gte' => [
        'numeric' => ':attribute deve essere maggiore o uguale a :value.',
        'string' => ':attribute deve contenere almeno :value caratteri.',
        'array' => ':attribute deve contenere almeno :value elementi.',
        'file' => ':attribute deve pesare almeno :value kilobyte.',
    ],
    'image' => ':attribute deve essere un’immagine.',
    'in' => 'Il valore selezionato per :attribute non è valido.',
    'integer' => ':attribute deve essere un numero intero.',
    'lt' => [
        'numeric' => ':attribute deve essere minore di :value.',
        'string' => ':attribute deve contenere meno di :value caratteri.',
        'array' => ':attribute deve contenere meno di :value elementi.',
        'file' => ':attribute deve pesare meno di :value kilobyte.',
    ],
    'lte' => [
        'numeric' => ':attribute deve essere minore o uguale a :value.',
        'string' => ':attribute non può superare :value caratteri.',
        'array' => ':attribute non può contenere più di :value elementi.',
        'file' => ':attribute non può superare :value kilobyte.',
    ],
    'max' => [
        'numeric' => ':attribute non può essere maggiore di :max.',
        'string' => ':attribute non può superare :max caratteri.',
        'array' => ':attribute non può contenere più di :max elementi.',
        'file' => ':attribute non può superare :max kilobyte.',
    ],
    'mimes' => ':attribute deve essere un file di tipo: :values.',
    'mimetypes' => ':attribute deve essere un file di tipo: :values.',
    'min' => [
        'numeric' => ':attribute deve essere almeno :min.',
        'string' => ':attribute deve contenere almeno :min caratteri.',
        'array' => ':attribute deve contenere almeno :min elementi.',
        'file' => ':attribute deve pesare almeno :min kilobyte.',
    ],
    'numeric' => ':attribute deve essere un numero.',
    'password' => [
        'letters' => ':attribute deve contenere almeno una lettera.',
        'mixed' => ':attribute deve contenere almeno una lettera maiuscola e una minuscola.',
        'numbers' => ':attribute deve contenere almeno un numero.',
        'symbols' => ':attribute deve contenere almeno un simbolo.',
        'uncompromised' => 'Il valore di :attribute è comparso in una fuga di dati. Scegline un altro.',
    ],
    'regex' => 'Il formato di :attribute non è valido.',
    'required' => 'Il campo :attribute è obbligatorio.',
    'required_if' => 'Il campo :attribute è obbligatorio quando :other è :value.',
    'required_with' => 'Il campo :attribute è obbligatorio quando è presente :values.',
    'same' => ':attribute e :other devono coincidere.',
    'size' => [
        'numeric' => ':attribute deve essere :size.',
        'string' => ':attribute deve contenere :size caratteri.',
        'array' => ':attribute deve contenere :size elementi.',
        'file' => ':attribute deve pesare :size kilobyte.',
    ],
    'string' => ':attribute deve essere un testo.',
    'unique' => 'Il valore di :attribute è già in uso.',
    'uploaded' => 'Impossibile caricare :attribute.',
    'url' => ':attribute deve essere un URL valido.',

    'attributes' => [],
];
