<?php

declare(strict_types=1);

/*
 * Dutch validation messages for the demo (Laravel ships English only). Covers the rules the
 * demo's forms use; anything else falls back to English. Keys match lang/ar/validation.php.
 */
return [
    'accepted' => ':attribute moet worden geaccepteerd.',
    'after' => ':attribute moet een datum na :date zijn.',
    'after_or_equal' => ':attribute moet een datum op of na :date zijn.',
    'alpha_dash' => ':attribute mag alleen letters, cijfers en streepjes bevatten.',
    'array' => ':attribute moet een lijst zijn.',
    'before' => ':attribute moet een datum vóór :date zijn.',
    'before_or_equal' => ':attribute moet een datum op of vóór :date zijn.',
    'between' => [
        'numeric' => ':attribute moet tussen :min en :max liggen.',
        'string' => ':attribute moet tussen :min en :max tekens lang zijn.',
        'array' => ':attribute moet tussen :min en :max items bevatten.',
        'file' => ':attribute moet tussen :min en :max kilobyte groot zijn.',
    ],
    'boolean' => ':attribute moet waar of onwaar zijn.',
    'confirmed' => 'De bevestiging van :attribute komt niet overeen.',
    'current_password' => 'Het wachtwoord is onjuist.',
    'date' => ':attribute moet een geldige datum zijn.',
    'different' => ':attribute en :other moeten verschillend zijn.',
    'digits' => ':attribute moet :digits cijfers bevatten.',
    'distinct' => ':attribute bevat een dubbele waarde.',
    'email' => ':attribute moet een geldig e-mailadres zijn.',
    'exists' => 'De gekozen waarde voor :attribute is ongeldig.',
    'file' => ':attribute moet een bestand zijn.',
    'filled' => ':attribute moet een waarde hebben.',
    'gt' => [
        'numeric' => ':attribute moet groter zijn dan :value.',
        'string' => ':attribute moet meer dan :value tekens bevatten.',
        'array' => ':attribute moet meer dan :value items bevatten.',
        'file' => ':attribute moet groter zijn dan :value kilobyte.',
    ],
    'gte' => [
        'numeric' => ':attribute moet groter dan of gelijk aan :value zijn.',
        'string' => ':attribute moet minstens :value tekens bevatten.',
        'array' => ':attribute moet minstens :value items bevatten.',
        'file' => ':attribute moet minstens :value kilobyte groot zijn.',
    ],
    'image' => ':attribute moet een afbeelding zijn.',
    'in' => 'De gekozen waarde voor :attribute is ongeldig.',
    'integer' => ':attribute moet een geheel getal zijn.',
    'lt' => [
        'numeric' => ':attribute moet kleiner zijn dan :value.',
        'string' => ':attribute moet minder dan :value tekens bevatten.',
        'array' => ':attribute moet minder dan :value items bevatten.',
        'file' => ':attribute moet kleiner zijn dan :value kilobyte.',
    ],
    'lte' => [
        'numeric' => ':attribute moet kleiner dan of gelijk aan :value zijn.',
        'string' => ':attribute mag niet meer dan :value tekens bevatten.',
        'array' => ':attribute mag niet meer dan :value items bevatten.',
        'file' => ':attribute mag niet groter zijn dan :value kilobyte.',
    ],
    'max' => [
        'numeric' => ':attribute mag niet groter zijn dan :max.',
        'string' => ':attribute mag niet meer dan :max tekens bevatten.',
        'array' => ':attribute mag niet meer dan :max items bevatten.',
        'file' => ':attribute mag niet groter zijn dan :max kilobyte.',
    ],
    'mimes' => ':attribute moet een bestand zijn van het type: :values.',
    'mimetypes' => ':attribute moet een bestand zijn van het type: :values.',
    'min' => [
        'numeric' => ':attribute moet minstens :min zijn.',
        'string' => ':attribute moet minstens :min tekens bevatten.',
        'array' => ':attribute moet minstens :min items bevatten.',
        'file' => ':attribute moet minstens :min kilobyte groot zijn.',
    ],
    'numeric' => ':attribute moet een getal zijn.',
    'password' => [
        'letters' => ':attribute moet minstens één letter bevatten.',
        'mixed' => ':attribute moet minstens één hoofdletter en één kleine letter bevatten.',
        'numbers' => ':attribute moet minstens één cijfer bevatten.',
        'symbols' => ':attribute moet minstens één symbool bevatten.',
        'uncompromised' => ':attribute is opgedoken in een datalek. Kies een andere waarde.',
    ],
    'regex' => 'Het formaat van :attribute is ongeldig.',
    'required' => ':attribute is verplicht.',
    'required_if' => ':attribute is verplicht als :other :value is.',
    'required_with' => ':attribute is verplicht als :values aanwezig is.',
    'same' => ':attribute en :other moeten overeenkomen.',
    'size' => [
        'numeric' => ':attribute moet :size zijn.',
        'string' => ':attribute moet :size tekens lang zijn.',
        'array' => ':attribute moet :size items bevatten.',
        'file' => ':attribute moet :size kilobyte groot zijn.',
    ],
    'string' => ':attribute moet tekst zijn.',
    'unique' => ':attribute is al in gebruik.',
    'uploaded' => ':attribute kon niet worden geüpload.',
    'url' => ':attribute moet een geldige URL zijn.',

    'attributes' => [],
];
